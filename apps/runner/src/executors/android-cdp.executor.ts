import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { execSync, exec } from 'child_process';
import Redis from 'ioredis';
import { BaseExecutor, ExecutionResult, RecordingJobData } from './base.executor';

const API_INTERNAL_URL = process.env.API_INTERNAL_URL || 'http://localhost:3000';
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

interface RecordingEvent {
  type: string;
  timestamp: string;
  data: Record<string, any>;
}

interface AndroidConfig {
  deviceSerial?: string;   // ADB serial (USB) or IP:port (wireless)
  cdpPort?: number;        // Local port to forward CDP to (default 9222)
  batchInterval?: number;
  screenshotInterval?: number;
  deviceProfile?: string;
  viewport?: { width: number; height: number };
}

export class AndroidCdpExecutor extends BaseExecutor {
  private eventBuffer: RecordingEvent[] = [];
  private requestStartTimes = new Map<string, number>();
  private stopped = false;

  async execute(jobData: RecordingJobData | any): Promise<ExecutionResult> {
    const { testRunId, environmentBaseUrl, config = {} } = jobData;
    const androidConfig = config as AndroidConfig;
    const cdpPort = androidConfig.cdpPort || 9222;
    const batchInterval = androidConfig.batchInterval ?? 3000;
    const startTime = Date.now();

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    const redis = new Redis(REDIS_PORT, REDIS_HOST, { maxRetriesPerRequest: null });
    const timers: NodeJS.Timeout[] = [];
    let adbForwarded = false;

    try {
      await this.updateTestRunStatus(testRunId, 'running');

      // 1. Detect device
      const deviceSerial = androidConfig.deviceSerial || this.detectDevice();
      console.log(`[AndroidCDP] Using device: ${deviceSerial}`);

      // 2. Ensure Chrome is running with debug enabled on the device
      this.launchChromeOnDevice(deviceSerial, environmentBaseUrl);

      // 3. Forward CDP port via ADB
      this.forwardCdpPort(deviceSerial, cdpPort);
      adbForwarded = true;
      console.log(`[AndroidCDP] CDP forwarded to localhost:${cdpPort}`);

      // 4. Wait for Chrome to be ready
      await this.waitForCdp(cdpPort);

      // 5. Connect Playwright via CDP
      browser = await chromium.connectOverCDP(`http://localhost:${cdpPort}`);
      console.log(`[AndroidCDP] Connected to device Chrome via CDP`);

      // Get the existing context and page (Chrome on device already has one)
      const contexts = browser.contexts();
      context = contexts[0] || await browser.newContext();
      const pages = context.pages();
      let page: Page;

      if (pages.length > 0) {
        page = pages[0];
        // Navigate to the target URL if not already there
        const currentUrl = page.url();
        if (!currentUrl.includes(environmentBaseUrl.replace(/https?:\/\//, ''))) {
          await page.goto(environmentBaseUrl, { waitUntil: 'domcontentloaded' });
        }
      } else {
        page = await context.newPage();
        await page.goto(environmentBaseUrl, { waitUntil: 'domcontentloaded' });
      }

      this.attachPageListeners(page, testRunId);
      await this.injectClickTracker(page);
      await this.capturePageLoadTiming(page);

      // Periodic event batch flush
      const batchTimer = setInterval(async () => {
        await this.flushEvents(testRunId);
      }, batchInterval);
      timers.push(batchTimer);

      // Periodic click collection
      const clickCollectTimer = setInterval(async () => {
        if (this.stopped) return;
        try {
          await this.collectClicks(page);
        } catch {
          // Page may have navigated
        }
      }, 1000);
      timers.push(clickCollectTimer);

      // Poll Redis for stop signal
      const stopPollTimer = setInterval(async () => {
        try {
          const stopKey = await redis.get(`recording:stop:${testRunId}`);
          if (stopKey !== null) {
            console.log('[AndroidCDP] Stop signal received from Redis');
            this.stopped = true;
          }
        } catch (err) {
          console.error('[AndroidCDP] Redis poll error:', (err as Error).message);
        }
      }, 2000);
      timers.push(stopPollTimer);

      // Listen for new pages/tabs
      context.on('page', (newPage: Page) => {
        console.log('[AndroidCDP] New page/tab detected on device');
        this.attachPageListeners(newPage, testRunId);
        this.injectClickTracker(newPage).catch(() => {});
      });

      // Wait until stopped
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.stopped) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 500);
        timers.push(checkInterval);
      });

      // Final click collection
      try {
        await this.collectClicks(page);
      } catch {
        // Page may be closed
      }

      // Flush remaining events
      await this.flushEvents(testRunId);
    } catch (err) {
      const error = err as Error;
      console.error('[AndroidCDP] Execution error:', error.message);
      await this.flushEvents(testRunId).catch(() => {});
    } finally {
      for (const timer of timers) {
        clearInterval(timer);
      }
      // Don't close browser — it's Chrome on the device, just disconnect
      if (browser) {
        try { browser.close(); } catch { /* disconnect only */ }
      }
      // Remove ADB port forward
      if (adbForwarded) {
        try {
          execSync(`adb forward --remove tcp:${cdpPort}`, { timeout: 5000 });
        } catch { /* ignore */ }
      }
      await redis.quit().catch(() => {});
    }

    const durationMs = Date.now() - startTime;

    const summary = {
      durationMs,
      stoppedAt: new Date().toISOString(),
      device: androidConfig.deviceSerial || 'auto',
    };

    await this.updateTestRunStatus(testRunId, 'completed', summary);

    return {
      testRunId,
      status: 'passed',
      stepResults: [],
      durationMs,
    };
  }

  // ── ADB Helpers ──

  private detectDevice(): string {
    try {
      const output = execSync('adb devices', { timeout: 5000 }).toString();
      const lines = output.trim().split('\n').slice(1); // skip header
      const devices = lines
        .map(line => line.split('\t'))
        .filter(parts => parts[1]?.trim() === 'device')
        .map(parts => parts[0].trim());

      if (devices.length === 0) {
        throw new Error('No Android devices connected. Connect via USB or run "adb connect <ip>:5555"');
      }
      if (devices.length > 1) {
        console.warn(`[AndroidCDP] Multiple devices found: ${devices.join(', ')}. Using first: ${devices[0]}`);
      }
      return devices[0];
    } catch (err) {
      if ((err as Error).message.includes('No Android devices')) throw err;
      throw new Error(`ADB not found or not working: ${(err as Error).message}. Install Android SDK platform-tools.`);
    }
  }

  private launchChromeOnDevice(serial: string, url: string): void {
    try {
      // Launch Chrome with remote debugging enabled
      const serialFlag = `-s ${serial}`;
      execSync(
        `adb ${serialFlag} shell am start -n com.android.chrome/com.google.android.apps.chrome.Main -a android.intent.action.VIEW -d "${url}" --es "com.android.chrome.extra.EXTRA_DISABLE_FIRST_RUN_EXPERIENCE" "true"`,
        { timeout: 10000 },
      );
      // Enable devtools socket
      execSync(
        `adb ${serialFlag} shell "echo chrome --remote-debugging-port=0 | su 0 sh" 2>/dev/null || true`,
        { timeout: 5000 },
      );
      console.log(`[AndroidCDP] Launched Chrome on device with URL: ${url}`);
    } catch (err) {
      console.warn(`[AndroidCDP] Chrome launch warning: ${(err as Error).message}`);
      // Chrome may already be running, continue
    }
  }

  private forwardCdpPort(serial: string, localPort: number): void {
    try {
      // Remove any existing forward on this port
      try {
        execSync(`adb -s ${serial} forward --remove tcp:${localPort}`, { timeout: 5000 });
      } catch { /* ignore */ }

      execSync(
        `adb -s ${serial} forward tcp:${localPort} localabstract:chrome_devtools_remote`,
        { timeout: 5000 },
      );
    } catch (err) {
      throw new Error(`Failed to forward CDP port: ${(err as Error).message}`);
    }
  }

  private async waitForCdp(port: number, maxRetries = 15): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const res = await fetch(`http://localhost:${port}/json/version`);
        if (res.ok) {
          const info = await res.json() as Record<string, string>;
          console.log(`[AndroidCDP] Chrome version: ${info['Browser'] || 'unknown'}`);
          return;
        }
      } catch {
        // Not ready yet
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error(`Chrome DevTools not responding on port ${port} after ${maxRetries}s. Make sure Chrome is running on the device.`);
  }

  // ── Event tracking (same as RecordingExecutor) ──

  private attachPageListeners(page: Page, testRunId: string): void {
    page.on('request', (request) => {
      this.requestStartTimes.set(request.url() + request.method(), Date.now());
    });

    page.on('response', (response) => {
      try {
        const request = response.request();
        const key = request.url() + request.method();
        const startTime = this.requestStartTimes.get(key);
        const responseTimeMs = startTime ? Date.now() - startTime : undefined;
        this.requestStartTimes.delete(key);

        this.pushEvent('network', {
          method: request.method(),
          url: request.url(),
          statusCode: response.status(),
          responseTimeMs,
          requestSize: request.postDataBuffer()?.length ?? 0,
          responseSize: response.headers()['content-length']
            ? parseInt(response.headers()['content-length'], 10)
            : undefined,
          resourceType: request.resourceType(),
        });
      } catch {
        // Ignore detached request errors
      }
    });

    page.on('framenavigated', async (frame) => {
      if (frame !== page.mainFrame()) return;

      const url = frame.url();
      let title = '';
      try { title = await page.title(); } catch { /* not ready */ }

      this.pushEvent('navigation', { url, title });
      await this.capturePageLoadTiming(page);
      await this.injectClickTracker(page).catch(() => {});
    });

    page.on('console', async (msg) => {
      const level = msg.type();
      this.pushEvent('console', { level, message: msg.text() });

      if (level === 'error' || level === 'warning') {
        try {
          const buffer = await page.screenshot({ fullPage: false });
          const storageKey = await this.uploadScreenshot(buffer, testRunId);
          this.pushEvent('screenshot', {
            storageKey,
            trigger: 'error',
            pageUrl: page.url(),
            errorMessage: msg.text(),
          });
        } catch { /* screenshot may fail */ }
      }
    });

    page.on('pageerror', async (error) => {
      this.pushEvent('error', {
        message: error.message,
        stack: error.stack,
        pageUrl: page.url(),
      });

      try {
        const buffer = await page.screenshot({ fullPage: false });
        const storageKey = await this.uploadScreenshot(buffer, testRunId);
        this.pushEvent('screenshot', {
          storageKey,
          trigger: 'error',
          pageUrl: page.url(),
          errorMessage: error.message,
        });
      } catch { /* device may not support screenshot */ }
    });

    page.on('popup', async (popup) => {
      this.attachPageListeners(popup, testRunId);
      try {
        await popup.waitForLoadState('domcontentloaded');
        await this.injectClickTracker(popup);
      } catch { /* popup may close quickly */ }
    });
  }

  private async capturePageLoadTiming(page: Page): Promise<void> {
    try {
      const navTiming = await page.evaluate(
        `JSON.parse(JSON.stringify(performance.getEntriesByType('navigation')[0]))`,
      ) as Record<string, number> | null;

      if (navTiming) {
        this.pushEvent('page_load', {
          url: page.url(),
          domContentLoadedMs: Math.round(navTiming.domContentLoadedEventEnd - navTiming.startTime),
          loadCompleteMs: Math.round(navTiming.loadEventEnd - navTiming.startTime),
        });
      }
    } catch { /* not available */ }
  }

  private async injectClickTracker(page: Page): Promise<void> {
    try {
      await page.evaluate(`(() => {
        if (window.__qaRevelClicksInitialized) return;
        window.__qaRevelClicks = [];
        window.__qaRevelClicksInitialized = true;

        document.addEventListener(
          'click',
          function(e) {
            var target = e.target;
            var selector = '';
            if (target.id) {
              selector = '#' + target.id;
            } else if (target.className && typeof target.className === 'string') {
              selector = target.tagName.toLowerCase() + '.' + target.className.trim().split(/\\s+/).join('.');
            } else {
              selector = target.tagName.toLowerCase();
            }
            window.__qaRevelClicks.push({
              selector: selector,
              targetTag: (target.tagName || 'unknown').toLowerCase(),
              targetText: (target.textContent || '').trim().substring(0, 100),
              x: e.clientX,
              y: e.clientY,
              pageUrl: window.location.href,
              timestamp: new Date().toISOString(),
            });
          },
          true
        );
      })()`);
    } catch { /* context may not be available */ }
  }

  private async collectClicks(page: Page): Promise<void> {
    try {
      const clicks = await page.evaluate(
        `(window.__qaRevelClicks || []).splice(0)`,
      ) as Array<Record<string, any>>;

      for (const click of clicks) {
        this.pushEvent('click', click);
      }
    } catch { /* context may not be available */ }
  }

  private pushEvent(type: string, data: Record<string, any>): void {
    this.eventBuffer.push({
      type,
      timestamp: new Date().toISOString(),
      data,
    });
  }

  private async flushEvents(testRunId: string): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = this.eventBuffer.splice(0);

    try {
      const url = `${API_INTERNAL_URL}/api/recordings/${testRunId}/events`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });

      if (!response.ok) {
        console.error(`[AndroidCDP] Failed to flush events: ${response.status} ${response.statusText}`);
        this.eventBuffer.unshift(...events);
      }
    } catch (err) {
      console.error('[AndroidCDP] Event flush error:', (err as Error).message);
      this.eventBuffer.unshift(...events);
    }
  }
}

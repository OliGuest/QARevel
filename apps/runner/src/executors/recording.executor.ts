import { chromium, Browser, BrowserContext, Page } from 'playwright';
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

export class RecordingExecutor extends BaseExecutor {
  private eventBuffer: RecordingEvent[] = [];
  private requestStartTimes = new Map<string, number>();
  private stopped = false;

  async execute(jobData: RecordingJobData | any): Promise<ExecutionResult> {
    const { testRunId, environmentBaseUrl, config = {} } = jobData as RecordingJobData;
    const batchInterval = config?.batchInterval ?? 3000;
    const startTime = Date.now();

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    const redis = new Redis(REDIS_PORT, REDIS_HOST, { maxRetriesPerRequest: null });
    const timers: NodeJS.Timeout[] = [];

    try {
      await this.updateTestRunStatus(testRunId, 'running');

      browser = await chromium.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      browser.on('disconnected', () => {
        console.log('[RecordingExecutor] Browser disconnected by user');
        this.stopped = true;
      });

      context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
      });

      const page = await context.newPage();
      this.attachPageListeners(page, testRunId);

      await page.goto(environmentBaseUrl, { waitUntil: 'domcontentloaded' });
      await this.injectClickTracker(page);

      // Capture navigation performance for the initial load
      await this.capturePageLoadTiming(page);

      // Periodic event batch flush
      const batchTimer = setInterval(async () => {
        await this.flushEvents(testRunId);
      }, batchInterval);
      timers.push(batchTimer);

      // Periodic click collection for automation recording
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
            console.log('[RecordingExecutor] Stop signal received from Redis');
            this.stopped = true;
          }
        } catch (err) {
          console.error('[RecordingExecutor] Redis poll error:', (err as Error).message);
        }
      }, 2000);
      timers.push(stopPollTimer);

      // Listen for popups (new tabs/windows)
      context.on('page', (newPage: Page) => {
        console.log('[RecordingExecutor] New page/popup detected');
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
        // Page may be closed already
      }

      // Flush remaining events
      await this.flushEvents(testRunId);
    } catch (err) {
      const error = err as Error;
      console.error('[RecordingExecutor] Execution error:', error.message);
      await this.flushEvents(testRunId).catch(() => {});
    } finally {
      for (const timer of timers) {
        clearInterval(timer);
      }
      if (context) {
        await context.close().catch(() => {});
      }
      if (browser) {
        await browser.close().catch(() => {});
      }
      await redis.quit().catch(() => {});
    }

    const durationMs = Date.now() - startTime;

    const summary = {
      durationMs,
      stoppedAt: new Date().toISOString(),
    };

    await this.updateTestRunStatus(testRunId, 'completed', summary);

    return {
      testRunId,
      status: 'passed',
      stepResults: [],
      durationMs,
    };
  }

  private attachPageListeners(page: Page, testRunId: string): void {
    // Network request tracking
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
        // Ignore errors from detached requests
      }
    });

    // Navigation tracking (main frame only)
    page.on('framenavigated', async (frame) => {
      if (frame !== page.mainFrame()) return;

      const url = frame.url();
      let title = '';
      try {
        title = await page.title();
      } catch {
        // Page may not be ready
      }

      this.pushEvent('navigation', {
        url,
        title,
      });

      // Capture page load timing
      await this.capturePageLoadTiming(page);

      // Re-inject click tracker after navigation
      await this.injectClickTracker(page).catch(() => {});
    });

    // Console error tracking — screenshot only on errors
    page.on('console', async (msg) => {
      const level = msg.type();
      this.pushEvent('console', {
        level,
        message: msg.text(),
      });

      // Screenshot only on errors
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
        } catch {
          // Page may not be ready for screenshot
        }
      }
    });

    // Page crash/error — always screenshot
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
      } catch {
        // Page may be crashed
      }
    });

    // Popup tracking
    page.on('popup', async (popup) => {
      this.attachPageListeners(popup, testRunId);
      try {
        await popup.waitForLoadState('domcontentloaded');
        await this.injectClickTracker(popup);
      } catch {
        // Popup may close quickly
      }
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
    } catch {
      // Page context may not be available
    }
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
    } catch {
      // Page context may not be available
    }
  }

  private async collectClicks(page: Page): Promise<void> {
    try {
      const clicks = await page.evaluate(
        `(window.__qaRevelClicks || []).splice(0)`,
      ) as Array<Record<string, any>>;

      for (const click of clicks) {
        this.pushEvent('click', click);
      }
    } catch {
      // Page context may not be available
    }
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
        console.error(
          `[RecordingExecutor] Failed to flush events: ${response.status} ${response.statusText}`,
        );
        this.eventBuffer.unshift(...events);
      }
    } catch (err) {
      console.error('[RecordingExecutor] Event flush error:', (err as Error).message);
      this.eventBuffer.unshift(...events);
    }
  }
}

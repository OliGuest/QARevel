import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { BaseExecutor, ExecutionResult, StepResult, JobData, resolveDeviceProfile } from './base.executor';

export class PlaywrightExecutor extends BaseExecutor {
  async execute(jobData: JobData): Promise<ExecutionResult> {
    const { testRunId, steps, envVars = {}, config = {} } = jobData;
    const stepResults: StepResult[] = [];
    const startTime = Date.now();

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;
    let overallStatus: 'passed' | 'failed' | 'error' = 'passed';

    try {
      await this.updateTestRunStatus(testRunId, 'running');

      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const device = resolveDeviceProfile(config);
      const contextOptions: Record<string, unknown> = {
        viewport: device.viewport,
      };
      if (device.userAgent) contextOptions.userAgent = device.userAgent;
      if (device.isMobile !== undefined) contextOptions.isMobile = device.isMobile;
      if (device.hasTouch !== undefined) contextOptions.hasTouch = device.hasTouch;
      if (device.deviceScaleFactor !== undefined) contextOptions.deviceScaleFactor = device.deviceScaleFactor;

      if (config.recordVideo) {
        contextOptions.recordVideo = {
          dir: `/tmp/videos/${testRunId}`,
          size: device.viewport,
        };
      }

      context = await browser.newContext(contextOptions);
      page = await context.newPage();

      for (const step of steps) {
        const stepStart = Date.now();
        let result: StepResult = {
          testStepId: step.id,
          stepNumber: step.stepNumber,
          status: 'passed',
        };

        try {
          await this.executeStep(page, step, envVars);

          result.actualResult = `Step ${step.stepNumber} completed successfully`;
          result.durationMs = Date.now() - stepStart;
        } catch (err) {
          const error = err as Error;
          result.status = step.isOptional ? 'skipped' : 'failed';
          result.errorMessage = error.message;
          result.durationMs = Date.now() - stepStart;

          // Capture screenshot on failure
          try {
            const screenshotBuffer = await page.screenshot({ fullPage: true });
            result.screenshotKey = await this.uploadScreenshot(screenshotBuffer, testRunId);
          } catch (screenshotErr) {
            console.error('[PlaywrightExecutor] Failed to capture failure screenshot:', screenshotErr);
          }

          if (!step.isOptional) {
            overallStatus = 'failed';
          }
        }

        stepResults.push(result);
        await this.sendStepResult(testRunId, result);

        // Stop execution on non-optional failure
        if (result.status === 'failed' && !step.isOptional) {
          // Mark remaining steps as skipped
          for (const remaining of steps.slice(steps.indexOf(step) + 1)) {
            const skippedResult: StepResult = {
              testStepId: remaining.id,
              stepNumber: remaining.stepNumber,
              status: 'skipped',
              actualResult: 'Skipped due to previous step failure',
            };
            stepResults.push(skippedResult);
            await this.sendStepResult(testRunId, skippedResult);
          }
          break;
        }
      }
    } catch (err) {
      const error = err as Error;
      console.error('[PlaywrightExecutor] Execution error:', error.message);
      overallStatus = 'error';
    } finally {
      if (context) {
        await context.close().catch(() => {});
      }
      if (browser) {
        await browser.close().catch(() => {});
      }
    }

    const durationMs = Date.now() - startTime;
    const passed = stepResults.filter((r) => r.status === 'passed').length;
    const failed = stepResults.filter((r) => r.status === 'failed').length;
    const skipped = stepResults.filter((r) => r.status === 'skipped').length;
    const errored = stepResults.filter((r) => r.status === 'error').length;

    const summary = {
      total: stepResults.length,
      passed,
      failed,
      skipped,
      errored,
    };

    await this.updateTestRunStatus(testRunId, overallStatus, summary);

    return {
      testRunId,
      status: overallStatus,
      stepResults,
      durationMs,
    };
  }

  private async executeStep(
    page: Page,
    step: JobData['steps'][0],
    envVars: Record<string, string>,
  ): Promise<void> {
    const action = step.action.toLowerCase();
    const timeout = step.timeoutMs || 10000;
    const selector = step.selector ? this.interpolateValue(step.selector, envVars) : undefined;
    const inputData = step.inputData || {};

    // Interpolate all string values in inputData
    const interpolatedData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(inputData)) {
      interpolatedData[key] = typeof value === 'string' ? this.interpolateValue(value, envVars) : value;
    }

    switch (action) {
      case 'navigate': {
        const url = (interpolatedData.url as string) || selector || '';
        await page.goto(url, { timeout, waitUntil: 'domcontentloaded' });
        break;
      }

      case 'click': {
        if (!selector) throw new Error('Click action requires a selector');
        await page.click(selector, { timeout });
        break;
      }

      case 'fill': {
        if (!selector) throw new Error('Fill action requires a selector');
        const value = (interpolatedData.value as string) || '';
        await page.fill(selector, value, { timeout });
        break;
      }

      case 'type': {
        if (!selector) throw new Error('Type action requires a selector');
        const text = (interpolatedData.value as string) || '';
        await page.locator(selector).pressSequentially(text, { timeout });
        break;
      }

      case 'select': {
        if (!selector) throw new Error('Select action requires a selector');
        const optionValue = (interpolatedData.value as string) || '';
        await page.selectOption(selector, optionValue, { timeout });
        break;
      }

      case 'wait': {
        const ms = (interpolatedData.duration as number) || timeout;
        await page.waitForTimeout(ms);
        break;
      }

      case 'wait_for_selector': {
        if (!selector) throw new Error('wait_for_selector action requires a selector');
        await page.waitForSelector(selector, { timeout });
        break;
      }

      case 'assert_visible': {
        if (!selector) throw new Error('assert_visible action requires a selector');
        const element = page.locator(selector);
        await element.waitFor({ state: 'visible', timeout });
        break;
      }

      case 'assert_hidden': {
        if (!selector) throw new Error('assert_hidden action requires a selector');
        const element = page.locator(selector);
        await element.waitFor({ state: 'hidden', timeout });
        break;
      }

      case 'assert_text': {
        if (!selector) throw new Error('assert_text action requires a selector');
        const expectedText = (interpolatedData.text as string) || step.expectedResult || '';
        const element = page.locator(selector);
        await element.waitFor({ state: 'visible', timeout });
        const actualText = await element.textContent();
        if (!actualText?.includes(expectedText)) {
          throw new Error(`Expected text "${expectedText}" but got "${actualText}"`);
        }
        break;
      }

      case 'assert_url': {
        const expectedUrl = (interpolatedData.url as string) || step.expectedResult || '';
        const currentUrl = page.url();
        if (!currentUrl.includes(expectedUrl)) {
          throw new Error(`Expected URL to contain "${expectedUrl}" but got "${currentUrl}"`);
        }
        break;
      }

      case 'screenshot': {
        const buffer = await page.screenshot({ fullPage: true });
        const key = await this.uploadScreenshot(buffer, inputData.testRunId as string || 'unknown');
        console.log(`[PlaywrightExecutor] Screenshot saved: ${key}`);
        break;
      }

      case 'press': {
        const key = (interpolatedData.key as string) || '';
        await page.keyboard.press(key);
        break;
      }

      case 'hover': {
        if (!selector) throw new Error('Hover action requires a selector');
        await page.hover(selector, { timeout });
        break;
      }

      case 'scroll': {
        const x = (interpolatedData.x as number) || 0;
        const y = (interpolatedData.y as number) || 500;
        await page.mouse.wheel(x, y);
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}

/**
 * Visual Regression Tests for TripPlanner
 *
 * Covers all 4 tabs (interactive, trips, itineraries, integrations),
 * theme toggle, settings modal, sidebar states, chat input/send,
 * and responsive viewports (mobile + tablet).
 */

import { createTestSuite, createTestRunner } from '../../src/test-runner/index.js';
import { VisualDiffReporter } from '../../src/test-runner/reporters/VisualDiffReporter.js';
import { GitHubPRReporter } from '../../src/test-runner/reporters/GitHubPRReporter.js';
import { createVisualAssertions } from '../../src/test-runner/assertions/visual.js';
import { VISUAL_THRESHOLDS } from '../../src/visual/constants.js';

const API_URL = process.env.API_URL || 'http://localhost:3012';
const APP_URL = process.env.BROWSER_APP_URL || 'http://localhost:3010';
const UPDATE_BASELINES = process.env.UPDATE_BASELINES === 'true';
const GITHUB_RUN_ID = process.env.GITHUB_RUN_ID;
const GITHUB_RUN_NUMBER = process.env.GITHUB_RUN_NUMBER;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;

const SCREENSHOTS_DIR = process.env.SCREENSHOTS_DIR
  ? `${process.env.SCREENSHOTS_DIR}/visual-test`
  : 'temp/screenshots/visual-test';

if (UPDATE_BASELINES) {
  console.log('');
  console.log('UPDATE_BASELINES=true - All baselines will be updated');
  console.log('WARNING: This will overwrite existing baselines!');
  console.log('');
}

async function main() {
  const { suite, client } = createTestSuite(
    'TripPlanner Visual Regression',
    API_URL
  );

  const visualReporter = new VisualDiffReporter('./temp/test-results');
  const visual = createVisualAssertions('tripplanner-visual', visualReporter);

  // Suite setup — wait for app to be ready
  suite.beforeAll(async () => {
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`Retry attempt ${attempt}/${maxRetries}...`);
        }

        await client.navigate(APP_URL);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await client.waitForSelector('[data-element="app-container"]', { timeout: 30000 });
        console.log('TripPlanner loaded');
        return;
      } catch (error) {
        lastError = error as Error;
        console.log(`Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }

    throw new Error(`Failed to load TripPlanner after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  });

  // ── Dashboard ──────────────────────────────────────────────────────────

  suite.test('Dashboard - Initial Load', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const result = await client.screenshot({
      name: 'dashboard-initial',
      viewport: 'desktop',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'dashboard-initial-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // ── Tab tests (desktop) ────────────────────────────────────────────────

  suite.test('Interactive Tab - Layout', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]');

    await client.click('[data-element="interactive-tab"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = await client.screenshot({
      name: 'interactive-tab',
      viewport: 'desktop',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'interactive-tab-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  suite.test('Trips Tab - Layout', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]');

    await client.click('[data-element="trips-tab"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = await client.screenshot({
      name: 'trips-tab',
      viewport: 'desktop',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'trips-tab-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  suite.test('Itineraries Tab - Layout', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]');

    await client.click('[data-element="itineraries-tab"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = await client.screenshot({
      name: 'itineraries-tab',
      viewport: 'desktop',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'itineraries-tab-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  suite.test('Integrations Tab - Layout', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]');

    await client.click('[data-element="integrations-tab"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = await client.screenshot({
      name: 'integrations-tab',
      viewport: 'desktop',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'integrations-tab-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // ── Interactive states ──────────────────────────────────────────────────

  suite.test('Theme - Light Mode', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]');

    const themeToggleExists = await client.elementExists('[data-element="theme-toggle"]');
    if (themeToggleExists) {
      await client.click('[data-element="theme-toggle"]');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const result = await client.screenshot({
      name: 'theme-light',
      viewport: 'desktop',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'theme-light-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });

    if (themeToggleExists) {
      await client.click('[data-element="theme-toggle"]');
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  });

  suite.test('Settings Modal', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]');

    const settingsExists = await client.elementExists('[data-element="settings-toggle"]');
    if (settingsExists) {
      await client.click('[data-element="settings-toggle"]');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const result = await client.screenshot({
      name: 'settings-modal',
      viewport: 'desktop',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'settings-modal-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });

    await client.pressKey('Escape');
    await new Promise(resolve => setTimeout(resolve, 300));
  });

  suite.test('Sidebar - Collapsed', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]');

    const sidebarToggleExists = await client.elementExists('[data-element="sidebar-toggle"]');
    if (sidebarToggleExists) {
      await client.click('[data-element="sidebar-toggle"]');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const result = await client.screenshot({
      name: 'sidebar-collapsed',
      viewport: 'desktop',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'sidebar-collapsed-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });

    if (sidebarToggleExists) {
      await client.click('[data-element="sidebar-toggle"]');
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  });

  suite.test('Chat Input - Focus State', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]');

    await client.click('[data-element="interactive-tab"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    const chatInputExists = await client.elementExists('[data-element="chat-input"]');
    if (chatInputExists) {
      await client.click('[data-element="chat-input"]');
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    const result = await client.screenshot({
      name: 'chat-input-focus',
      viewport: 'desktop',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'chat-input-focus-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  suite.test('Chat Send Flow', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]');

    await client.click('[data-element="interactive-tab"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    const chatInputExists = await client.elementExists('[data-element="chat-input"]');
    if (chatInputExists) {
      await client.type('[data-element="chat-input"]', 'Test message for visual regression');
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    const result = await client.screenshot({
      name: 'chat-send-flow',
      viewport: 'desktop',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'chat-send-flow-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // ── Combined state ─────────────────────────────────────────────────────

  suite.test('Combined - Sidebar + Chat', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]');

    await client.click('[data-element="interactive-tab"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = await client.screenshot({
      name: 'combined-sidebar-chat',
      viewport: 'desktop',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'combined-sidebar-chat-desktop', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // ── Responsive — Mobile ────────────────────────────────────────────────

  suite.test('Interactive Tab - Mobile', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]');

    await client.click('[data-element="interactive-tab"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = await client.screenshot({
      name: 'interactive-mobile',
      viewport: 'mobile',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'interactive-mobile', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  suite.test('Trips Tab - Mobile', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]');

    await client.click('[data-element="trips-tab"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = await client.screenshot({
      name: 'trips-mobile',
      viewport: 'mobile',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'trips-mobile', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  suite.test('Dashboard - Mobile', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const result = await client.screenshot({
      name: 'dashboard-mobile',
      viewport: 'mobile',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'dashboard-mobile', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // ── Responsive — Tablet ────────────────────────────────────────────────

  suite.test('Interactive Tab - Tablet', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]');

    await client.click('[data-element="interactive-tab"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = await client.screenshot({
      name: 'interactive-tablet',
      viewport: 'tablet',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'interactive-tablet', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  suite.test('Dashboard - Tablet', async ({ assert }) => {
    await client.navigate(APP_URL);
    await client.waitForSelector('[data-element="app-container"]');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const result = await client.screenshot({
      name: 'dashboard-tablet',
      viewport: 'tablet',
      fullPage: true,
      path: SCREENSHOTS_DIR,
    });

    assert.screenshotCaptured(result);
    await visual.matchesBaseline(result.path, 'dashboard-tablet', {
      threshold: VISUAL_THRESHOLDS.STANDARD,
      updateBaseline: UPDATE_BASELINES,
    });
  });

  // ── Run ────────────────────────────────────────────────────────────────

  const reporters: any[] = ['console', visualReporter];

  if (GITHUB_RUN_ID) {
    reporters.push(
      new GitHubPRReporter({
        outputPath: './temp/test-results/github-pr-comment.md',
        runId: GITHUB_RUN_ID,
        runNumber: GITHUB_RUN_NUMBER,
        repository: GITHUB_REPOSITORY,
      })
    );
  }

  const runner = createTestRunner({
    reporters,
    verbose: true,
  });

  const result = await runner.run(suite);
  const exitCode = result.summary.failed > 0 ? 1 : 0;

  console.log('');
  console.log(`TripPlanner Visual Regression: ${exitCode === 0 ? 'PASSED' : 'FAILED'}`);
  console.log(`  ${result.summary.passed} passed, ${result.summary.failed} failed, ${result.summary.skipped} skipped`);
  console.log('');

  process.exit(exitCode);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

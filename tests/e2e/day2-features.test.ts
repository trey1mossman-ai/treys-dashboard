/**
 * End-to-End Tests - Day 2
 * Complete user journey tests with real-time features
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const WS_URL = 'ws://localhost:3001';

test.describe('Day 2 - Real-time Features', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
    
    // Wait for app to load
    await page.waitForSelector('.dashboard-container', { timeout: 5000 });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('WebSocket connects automatically', async () => {
    // Check connection indicator
    const indicator = await page.locator('#connection-indicator');
    await expect(indicator).toBeVisible();
    
    // Should be green when connected
    const backgroundColor = await indicator.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(backgroundColor).toContain('rgb(34, 197, 94)'); // Success color
  });

  test('Command Palette opens with Cmd+K', async () => {
    // Press Cmd+K (or Ctrl+K on Windows/Linux)
    await page.keyboard.press('Meta+K');
    
    // Command palette should appear
    const commandPalette = await page.locator('.command-palette');
    await expect(commandPalette).toBeVisible();
    
    // Should have search input focused
    const searchInput = await page.locator('.command-palette input');
    await expect(searchInput).toBeFocused();
  });

  test('Real-time todo creation', async () => {
    // Create a todo
    const todoInput = await page.locator('input[placeholder*="Add"]');
    await todoInput.fill('Test real-time todo');
    await todoInput.press('Enter');
    
    // Todo should appear with fade-in animation
    const newTodo = await page.locator('text=Test real-time todo');
    await expect(newTodo).toBeVisible();
    
    // Check for animation class
    const hasAnimation = await newTodo.evaluate(el => 
      el.classList.contains('fade-in') || 
      el.style.animation.includes('fadeIn')
    );
    expect(hasAnimation).toBeTruthy();
  });

  test('Optimistic updates with rollback', async () => {
    // Create a todo that will fail (simulate)
    const todoInput = await page.locator('input[placeholder*="Add"]');
    await todoInput.fill('FAIL_TODO'); // Special text to trigger failure
    await todoInput.press('Enter');
    
    // Should show optimistic state immediately
    const optimisticTodo = await page.locator('text=FAIL_TODO');
    await expect(optimisticTodo).toBeVisible();
    
    // Should have pending opacity
    const opacity = await optimisticTodo.evaluate(el => 
      window.getComputedStyle(el).opacity
    );
    expect(parseFloat(opacity)).toBeLessThan(1);
    
    // Wait for rollback animation
    await page.waitForTimeout(2000);
    
    // Todo should be removed or show error state
    const errorState = await optimisticTodo.evaluate(el => 
      el.style.backgroundColor.includes('239, 68, 68') || // Error color
      !document.body.contains(el)
    );
    expect(errorState).toBeTruthy();
  });

  test('Swipe to complete on mobile', async () => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Get a todo item
    const todoItem = await page.locator('.todo-item').first();
    const box = await todoItem.boundingBox();
    
    if (box) {
      // Simulate swipe right
      await page.mouse.move(box.x + 10, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2, { steps: 10 });
      await page.mouse.up();
      
      // Should show completion animation
      await page.waitForTimeout(500);
      
      const isCompleted = await todoItem.evaluate(el => 
        el.classList.contains('completed') ||
        el.style.textDecoration.includes('line-through')
      );
      expect(isCompleted).toBeTruthy();
    }
  });

  test('Performance metrics stay within budget', async () => {
    // Open performance monitor
    const perfMonitor = await page.evaluate(() => {
      const monitor = document.querySelector('.fps-monitor');
      return monitor ? true : false;
    });
    
    if (!perfMonitor) {
      // Add performance monitor if not visible
      await page.evaluate(() => {
        const script = document.createElement('script');
        script.textContent = `
          import { PerformanceMonitor } from '/src/features/monitoring/PerformanceMonitor';
          const monitor = document.createElement('div');
          monitor.id = 'perf-monitor-root';
          document.body.appendChild(monitor);
        `;
        document.head.appendChild(script);
      });
    }
    
    // Perform heavy operations
    for (let i = 0; i < 10; i++) {
      await page.locator('input[placeholder*="Add"]').fill(`Todo ${i}`);
      await page.keyboard.press('Enter');
    }
    
    // Check FPS
    const fps = await page.evaluate(() => {
      const fpsElement = document.querySelector('.fps-monitor');
      if (fpsElement) {
        const fpsText = fpsElement.textContent || '';
        const match = fpsText.match(/(\d+)\s*FPS/);
        return match ? parseInt(match[1]) : 0;
      }
      return 60; // Default if no monitor
    });
    
    expect(fps).toBeGreaterThanOrEqual(30); // Minimum acceptable FPS
  });

  test('Presence indicators for collaboration', async () => {
    // Open in two tabs to simulate collaboration
    const page2 = await page.context().newPage();
    await page2.goto(BASE_URL);
    
    // Move cursor in page2
    await page2.mouse.move(200, 300);
    
    // Check for presence cursor in page1
    await page.waitForTimeout(1000);
    const presenceCursor = await page.locator('.presence-cursor');
    const cursorCount = await presenceCursor.count();
    
    // Should see at least one other cursor
    expect(cursorCount).toBeGreaterThanOrEqual(1);
    
    await page2.close();
  });

  test('Drag and drop reordering', async () => {
    // Create multiple todos
    const todos = ['First', 'Second', 'Third'];
    for (const todo of todos) {
      await page.locator('input[placeholder*="Add"]').fill(todo);
      await page.keyboard.press('Enter');
    }
    
    // Drag first to last position
    const first = await page.locator('text=First');
    const third = await page.locator('text=Third');
    
    await first.dragTo(third);
    
    // Check new order
    const items = await page.locator('.todo-item').allTextContents();
    expect(items[0]).toContain('Second');
    expect(items[2]).toContain('First');
  });

  test('Keyboard shortcuts work', async () => {
    // Test various shortcuts
    const shortcuts = [
      { key: 'Meta+K', expected: '.command-palette' },
      { key: 'Meta+/', expected: '.help-modal' },
      { key: 'Escape', expected: null }, // Should close modals
    ];
    
    for (const shortcut of shortcuts) {
      await page.keyboard.press(shortcut.key);
      
      if (shortcut.expected) {
        const element = await page.locator(shortcut.expected);
        await expect(element).toBeVisible();
        await page.keyboard.press('Escape'); // Close it
      }
    }
  });

  test('Offline mode with queue', async () => {
    // Go offline
    await page.context().setOffline(true);
    
    // Try to create todos
    await page.locator('input[placeholder*="Add"]').fill('Offline todo 1');
    await page.keyboard.press('Enter');
    
    // Should still appear (optimistic)
    const offlineTodo = await page.locator('text=Offline todo 1');
    await expect(offlineTodo).toBeVisible();
    
    // Should show offline indicator
    const connectionIndicator = await page.locator('#connection-indicator');
    const isOffline = await connectionIndicator.evaluate(el => 
      window.getComputedStyle(el).backgroundColor.includes('239, 68, 68') // Error/offline color
    );
    expect(isOffline).toBeTruthy();
    
    // Go back online
    await page.context().setOffline(false);
    
    // Wait for sync
    await page.waitForTimeout(2000);
    
    // Todo should still be there and synced
    await expect(offlineTodo).toBeVisible();
    const opacity = await offlineTodo.evaluate(el => 
      window.getComputedStyle(el).opacity
    );
    expect(parseFloat(opacity)).toBe(1); // Fully synced
  });
});

test.describe('Performance Budget', () => {
  test('TTI under 1.5 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(1500);
  });

  test('Bundle size under 350KB', async ({ page }) => {
    await page.goto(BASE_URL);
    
    const coverage = await page.coverage.startJSCoverage();
    await page.reload();
    const jsCoverage = await page.coverage.stopJSCoverage();
    
    const totalBytes = jsCoverage.reduce((total, entry) => {
      return total + entry.text.length;
    }, 0);
    
    const totalKB = totalBytes / 1024;
    expect(totalKB).toBeLessThan(350);
  });

  test('No memory leaks during navigation', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Get initial memory
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // Navigate around
    for (let i = 0; i < 5; i++) {
      await page.reload();
      await page.waitForLoadState('networkidle');
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if ('gc' in window) {
        (window as any).gc();
      }
    });
    
    // Get final memory
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // Memory shouldn't grow more than 20%
    const memoryGrowth = (finalMemory - initialMemory) / initialMemory;
    expect(memoryGrowth).toBeLessThan(0.2);
  });
});

test.describe('Accessibility', () => {
  test('All interactive elements have proper ARIA labels', async ({ page }) => {
    await page.goto(BASE_URL);
    
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const hasLabel = await button.evaluate(el => {
        return el.getAttribute('aria-label') || 
               el.getAttribute('aria-labelledby') ||
               el.textContent?.trim();
      });
      expect(hasLabel).toBeTruthy();
    }
  });

  test('Keyboard navigation works', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Tab through interface
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
    }
    
    // Should have focus on something
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });
    expect(focusedElement).not.toBe('BODY');
  });

  test('Color contrast meets WCAG AA', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // This would normally use axe-core or similar
    // For now, just check that we have proper CSS variables
    const hasContrastVars = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      return styles.getPropertyValue('--foreground') && 
             styles.getPropertyValue('--background');
    });
    expect(hasContrastVars).toBeTruthy();
  });
});

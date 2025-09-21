import { test, expect } from '@playwright/test';

/**
 * Critical Path E2E Tests
 * Team Lead: Claude - Day 6 Implementation
 * Testing the most important user journeys
 */

test.describe('Critical User Paths', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to be ready
    await page.waitForSelector('[data-testid="dashboard-container"]', { 
      timeout: 10000 
    });
  });

  test('Dashboard loads within 2 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    
    // Wait for main content to be visible
    await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000); // Must load in under 2 seconds
  });

  test('AI Assistant dock opens and accepts input', async ({ page }) => {
    // Find and click the assistant dock button
    const assistantButton = page.locator('[data-testid="assistant-dock-button"]');
    await expect(assistantButton).toBeVisible();
    await assistantButton.click();
    
    // Verify assistant panel opens
    const assistantPanel = page.locator('[data-testid="assistant-panel"]');
    await expect(assistantPanel).toBeVisible();
    
    // Type a message
    const inputField = page.locator('[data-testid="assistant-input"]');
    await inputField.fill('Create a note: Test note from E2E');
    
    // Submit the message
    await inputField.press('Enter');
    
    // Verify response appears
    await expect(page.locator('[data-testid="assistant-response"]')).toBeVisible({
      timeout: 5000
    });
  });

  test('Create and complete agenda item', async ({ page }) => {
    // Navigate to agenda section
    const agendaSection = page.locator('[data-testid="agenda-section"]');
    await expect(agendaSection).toBeVisible();
    
    // Click add agenda button
    const addButton = page.locator('[data-testid="add-agenda-button"]');
    await addButton.click();
    
    // Fill in agenda form
    const titleInput = page.locator('[data-testid="agenda-title-input"]');
    await titleInput.fill('E2E Test Meeting');
    
    const startTimeInput = page.locator('[data-testid="agenda-start-time"]');
    await startTimeInput.fill('10:00');
    
    const endTimeInput = page.locator('[data-testid="agenda-end-time"]');
    await endTimeInput.fill('11:00');
    
    // Submit form
    const submitButton = page.locator('[data-testid="agenda-submit-button"]');
    await submitButton.click();
    
    // Verify item appears in list
    await expect(page.locator('text=E2E Test Meeting')).toBeVisible();
    
    // Complete the item
    const checkbox = page.locator('[data-testid="agenda-checkbox"]').first();
    await checkbox.click();
    
    // Verify strikethrough animation
    await expect(page.locator('.completed')).toBeVisible();
  });

  test('Sticky notes can be created and moved', async ({ page }) => {
    // Find notes section
    const notesBoard = page.locator('[data-testid="notes-board"]');
    await expect(notesBoard).toBeVisible();
    
    // Click add note button
    const addNoteButton = page.locator('[data-testid="add-note-button"]');
    await addNoteButton.click();
    
    // Type note content
    const noteContent = page.locator('[data-testid="note-content"]').first();
    await noteContent.fill('This is a test sticky note');
    
    // Verify note appears
    await expect(page.locator('text=This is a test sticky note')).toBeVisible();
    
    // Test drag and drop (simplified)
    const note = page.locator('[data-testid="sticky-note"]').first();
    const boundingBox = await note.boundingBox();
    if (boundingBox) {
      // Drag note to new position
      await note.dragTo(notesBoard, {
        targetPosition: { x: 200, y: 200 }
      });
      
      // Verify note moved
      const newBoundingBox = await note.boundingBox();
      expect(newBoundingBox?.x).not.toBe(boundingBox.x);
    }
  });

  test('Mobile touch targets are at least 44px', async ({ page, browserName }, testInfo) => {
    // Skip on desktop browsers
    if (!testInfo.project.name.includes('Mobile')) {
      test.skip();
    }
    
    // Get all interactive elements
    const buttons = await page.locator('button, a, [role="button"]').all();
    
    for (const button of buttons) {
      const boundingBox = await button.boundingBox();
      if (boundingBox) {
        // Check minimum size for touch targets
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
        expect(boundingBox.width).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('Event system fires correctly', async ({ page }) => {
    // Set up event listener
    await page.evaluate(() => {
      window.eventsFired = [];
      ['agenda:created', 'note:created', 'action:executed'].forEach(event => {
        window.addEventListener(event, (e) => {
          window.eventsFired.push(event);
        });
      });
    });
    
    // Trigger an agenda creation
    const addButton = page.locator('[data-testid="add-agenda-button"]');
    await addButton.click();
    
    const titleInput = page.locator('[data-testid="agenda-title-input"]');
    await titleInput.fill('Event Test Item');
    
    const submitButton = page.locator('[data-testid="agenda-submit-button"]');
    await submitButton.click();
    
    // Check if event was fired
    const eventsFired = await page.evaluate(() => window.eventsFired);
    expect(eventsFired).toContain('agenda:created');
  });

  test('Performance: No layout shifts during interactions', async ({ page }) => {
    // Monitor for layout shifts
    await page.evaluate(() => {
      window.layoutShifts = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
            window.layoutShifts += entry.value;
          }
        }
      }).observe({ entryTypes: ['layout-shift'] });
    });
    
    // Perform various interactions
    await page.locator('[data-testid="assistant-dock-button"]').click();
    await page.locator('[data-testid="add-agenda-button"]').click();
    await page.locator('[data-testid="add-note-button"]').click();
    
    // Check cumulative layout shift
    const cls = await page.evaluate(() => window.layoutShifts);
    expect(cls).toBeLessThan(0.1); // Good CLS score
  });
});

test.describe('PWA Features', () => {
  test('Service worker registers successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check if service worker is registered
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return registration !== undefined;
      }
      return false;
    });
    
    expect(swRegistered).toBeTruthy();
  });

  test('App is installable', async ({ page }) => {
    await page.goto('/');
    
    // Check for manifest
    const manifest = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]');
      return link !== null;
    });
    
    expect(manifest).toBeTruthy();
  });
});

test.describe('Accessibility', () => {
  test('All images have alt text', async ({ page }) => {
    await page.goto('/');
    
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });

  test('Keyboard navigation works', async ({ page }) => {
    await page.goto('/');
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocused).toBeTruthy();
    
    // Continue tabbing
    await page.keyboard.press('Tab');
    const secondFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(secondFocused).toBeTruthy();
    
    // Ensure focus is visible
    const focusVisible = await page.evaluate(() => {
      const styles = window.getComputedStyle(document.activeElement!);
      return styles.outline !== 'none' || styles.boxShadow !== 'none';
    });
    expect(focusVisible).toBeTruthy();
  });
});
import { test, expect } from '@playwright/test';

test.describe('Dual Payment Smoke Tests', () => {
  const BASE_URL = process.env.BASE_URL || 'https://shortformfactory.com';

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/order`);
    await page.waitForSelector('#serviceSelect', { state: 'visible' });
  });

  test('Stripe card flow: select, pay, redirect, thank-you hydration', async ({ page }) => {
    // Select service and package
    await page.selectOption('#serviceSelect', 'aiReel');
    await expect(page.locator('input[name="sff-package"][value="standard"]')).toBeVisible();
    await page.click('input[name="sff-package"][value="standard"]');

    // Add an add-on
    await page.check('.addon-checkbox input[value="rush"]');

    // Choose Stripe
    await page.click('input[name="paymentMethod"][value="stripe"]');
    await page.waitForTimeout(500); // allow UI to update
    await expect(page.locator('#stripePayButton')).toBeVisible();
    await expect(page.locator('#stripePayButton')).toBeEnabled();

    // Click Stripe button and wait for session creation
    const [sessionResponse] = await Promise.all([
      page.waitForResponse('/api/stripe/create-session'),
      page.click('#stripePayButton')
    ]);

    const sessionData = await sessionResponse.json();
    expect(sessionData).toHaveProperty('sessionId');
    expect(sessionData.sessionId).toMatch(/^cs_test_/);

    // Verify order snapshot saved
    const snapshot = await page.evaluate(() => {
      const raw = sessionStorage.getItem('sff_last_order');
      return raw ? JSON.parse(raw) : null;
    });
    expect(snapshot).toMatchObject({
      provider: 'stripe',
      service: 'aiReel',
      package: 'standard',
      addons: ['rush'],
      sessionId: sessionData.sessionId
    });

    // Stripe Checkout redirect (we won't complete payment, just verify redirect)
    const stripeCheckoutUrl = `https://checkout.stripe.com/pay/${sessionData.sessionId}`;
    await page.goto(stripeCheckoutUrl);
    await expect(page.locator('body')).toContainText('Stripe Checkout');

    // Simulate success redirect (normally Stripe would redirect)
    await page.goto(`${BASE_URL}/thank-you?provider=stripe&session_id=${sessionData.sessionId}`);
    await expect(page.locator('#orderSummary')).toBeVisible();
    await expect(page.locator('#summaryService')).toHaveText('AI Reel Edit');
    await expect(page.locator('#summaryPackage')).toHaveText('Standard');
    await expect(page.locator('#summaryAddons')).toContainText('Rush');
    await expect(page.locator('#summaryProvider')).toHaveText('Stripe (Card)');
    await expect(page.locator('#summaryOrderID')).toHaveText(sessionData.sessionId);
  });

  test('PayPal flow: select, pay, redirect, thank-you hydration', async ({ page }) => {
    // Select service and package
    await page.selectOption('#serviceSelect', 'socialEdit');
    await page.click('input[name="sff-package"][value="premium"]');

    // Choose PayPal
    await page.click('input[name="paymentMethod"][value="paypal"]');
    await expect(page.locator('#paypal-button-container')).toBeVisible();

    // Wait for PayPal SDK to render buttons
    await page.waitForSelector('iframe[name^="__privateStripeMetricsController"]', { state: 'hidden' });
    await page.waitForTimeout(2000); // allow PayPal buttons to render

    // Verify PayPal button appears (we won't complete real payment)
    const paypalButton = page.frameLocator('iframe').locator('button[role="link"]');
    // Note: In real automation you'd need to handle PayPal popup; here we just verify presence
    expect(await paypalButton.count()).toBeGreaterThan(0);

    // Simulate PayPal success (normally PayPal would redirect)
    await page.goto(`${BASE_URL}/thank-you?provider=paypal&orderID=TEST_PAYPAL_123`);
    await expect(page.locator('#orderSummary')).toBeVisible();
    await expect(page.locator('#summaryService')).toHaveText('Social Media Edit');
    await expect(page.locator('#summaryPackage')).toHaveText('Premium');
    await expect(page.locator('#summaryProvider')).toHaveText('PayPal');
    await expect(page.locator('#summaryOrderID')).toHaveText('TEST_PAYPAL_123');
  });

  test('Payment method toggling and UI state', async ({ page }) => {
    await page.selectOption('#serviceSelect', 'aiReel');
    await page.click('input[name="sff-package"][value="basic"]');

    // Default should be PayPal
    await expect(page.locator('#paypal-button-container')).toBeVisible();
    await expect(page.locator('#stripePayButton')).toBeVisible(); // always in DOM
    await expect(page.locator('#stripePayButton')).toBeDisabled();

    // Switch to Stripe
    await page.click('input[name="paymentMethod"][value="stripe"]');
    await page.waitForTimeout(500);
    await expect(page.locator('#stripePayButton')).toBeEnabled();
    await expect(page.locator('#paypal-button-container')).toBeVisible(); // container stays, buttons hidden by CSS

    // Switch back to PayPal
    await page.click('input[name="paymentMethod"][value="paypal"]');
    await page.waitForTimeout(500);
    await expect(page.locator('#stripePayButton')).toBeDisabled();
    await expect(page.locator('#paypal-button-container')).toBeVisible();
  });

  test('Intake button locked until payment confirmed', async ({ page }) => {
    await page.selectOption('#serviceSelect', 'aiReel');
    await page.click('input[name="sff-package"][value="basic"]');

    const intakeBtn = page.locator('#submitIntakeButton');
    await expect(intakeBtn).toBeDisabled();

    // Simulate payment confirmation
    await page.evaluate(() => sessionStorage.setItem('sff_payment_confirmed', 'true'));
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(intakeBtn).toBeEnabled();
  });

  test('Order snapshot persists across page reload', async ({ page }) => {
    await page.selectOption('#serviceSelect', 'aiReel');
    await page.click('input[name="sff-package"][value="standard"]');
    await page.check('.addon-checkbox input[value="extraClip"]');
    await page.click('input[name="paymentMethod"][value="stripe"]');

    // Trigger snapshot via Stripe button click (but don't follow redirect)
    const [sessionResponse] = await Promise.all([
      page.waitForResponse('/api/stripe/create-session'),
      page.click('#stripePayButton')
    ]);

    const sessionData = await sessionResponse.json();

    // Reload page and verify snapshot still exists
    await page.reload();
    await page.waitForLoadState('networkidle');

    const snapshot = await page.evaluate(() => {
      const raw = sessionStorage.getItem('sff_last_order');
      return raw ? JSON.parse(raw) : null;
    });

    expect(snapshot).toMatchObject({
      provider: 'stripe',
      service: 'aiReel',
      package: 'standard',
      addons: ['extraClip'],
      sessionId: sessionData.sessionId
    });
  });
});

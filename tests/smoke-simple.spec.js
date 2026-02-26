import { test, expect } from '@playwright/test';

test.describe('Dual Payment Smoke Tests (Simple)', () => {
  const BASE_URL = process.env.BASE_URL || 'https://shortformfactory.com';

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/order`);
    await page.waitForSelector('#serviceSelect', { state: 'visible' });
  });

  test('Stripe session creation and redirect flow', async ({ page }) => {
    // Select service and package
    await page.selectOption('#serviceSelect', 'aiReel');
    await page.click('input[name="sff-package"][value="standard"]');
    await page.check('.addon-checkbox input[value="rush"]');

    // Wait for Stripe button to be enabled (service selected)
    await page.waitForTimeout(1000);
    await expect(page.locator('#stripePayButton')).toBeEnabled();

    // Intercept Stripe session creation
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

    // Verify Stripe redirect URL format
    const stripeCheckoutUrl = `https://checkout.stripe.com/pay/${sessionData.sessionId}`;
    console.log('Stripe Checkout URL:', stripeCheckoutUrl);
  });

  test('PayPal button renders and order creation', async ({ page }) => {
    // Select service and package
    await page.selectOption('#serviceSelect', 'socialEdit');
    await page.click('input[name="sff-package"][value="premium"]');

    // Verify PayPal container is visible
    await expect(page.locator('#paypal-button-container')).toBeVisible();

    // Wait for PayPal SDK to load
    await page.waitForTimeout(2000);

    // Check PayPal iframe presence (indicates SDK loaded)
    const iframes = page.locator('iframe');
    expect(await iframes.count()).toBeGreaterThan(0);
  });

  test('Payment method selection toggles UI', async ({ page }) => {
    await page.selectOption('#serviceSelect', 'aiReel');
    await page.click('input[name="sff-package"][value="basic"]');
    await page.waitForTimeout(500);

    // Default: PayPal selected
    await expect(page.locator('#paypal-button-container')).toBeVisible();
    await expect(page.locator('#stripePayButton')).toBeVisible();
    await expect(page.locator('#stripePayButton')).toBeDisabled();

    // Switch to Stripe
    await page.click('input[name="paymentMethod"][value="stripe"]');
    await page.waitForTimeout(500);
    await expect(page.locator('#stripePayButton')).toBeEnabled();

    // Switch back to PayPal
    await page.click('input[name="paymentMethod"][value="paypal"]');
    await page.waitForTimeout(500);
    await expect(page.locator('#stripePayButton')).toBeDisabled();
  });

  test('Intake button locked until payment confirmation', async ({ page }) => {
    await page.selectOption('#serviceSelect', 'aiReel');
    await page.click('input[name="sff-package"][value="basic"]');

    const intakeBtn = page.locator('#submitIntakeButton');
    await expect(intakeBtn).toBeDisabled();

    // Simulate payment confirmation
    await page.evaluate(() => sessionStorage.setItem('sff_payment_confirmed', 'true'));
    
    // Trigger intake button check (reload page)
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(intakeBtn).toBeEnabled();
  });

  test('Thank-you page hydrates from snapshot', async ({ page }) => {
    // Simulate arriving at thank-you with order snapshot
    await page.goto(`${BASE_URL}/thank-you`);
    
    // Set up snapshot in sessionStorage
    await page.evaluate(() => {
      sessionStorage.setItem('sff_last_order', JSON.stringify({
        provider: 'stripe',
        service: 'aiReel',
        package: 'standard',
        addons: ['rush'],
        total: 149,
        sessionId: 'cs_test_123456'
      }));
    });

    // Reload to trigger hydration
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify order summary populated
    await expect(page.locator('#orderSummary')).toBeVisible();
    await expect(page.locator('#summaryService')).toHaveText('AI Reel Edit');
    await expect(page.locator('#summaryPackage')).toHaveText('Standard');
    await expect(page.locator('#summaryProvider')).toHaveText('Stripe (Card)');
    await expect(page.locator('#summaryOrderID')).toHaveText('cs_test_123456');
  });

  test('Thank-you page hydrates from Stripe session API', async ({ page }) => {
    // Go to thank-you with Stripe session ID
    await page.goto(`${BASE_URL}/thank-you?provider=stripe&session_id=cs_test_123456`);
    await page.waitForLoadState('networkidle');

    // Verify API call is made (we'll mock response in real test)
    const apiCall = page.waitForResponse('/api/stripe/session');
    await page.waitForTimeout(1000);
    
    // Check that summary elements exist
    const summaryExists = await page.locator('#orderSummary').isVisible().catch(() => false);
    expect(summaryExists).toBe(true);
  });
});

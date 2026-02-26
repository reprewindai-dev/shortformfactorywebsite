(function() {
  "use strict";

  const TALLY_FORM_URL = "https://tally.so/r/b5jRve";

  // PaymentState - Session storage wrapper for payment status management
  const PaymentState = {
    STORAGE_KEY: 'sff_payment_confirmed',
    ORDER_ID_KEY: 'sff_order_id',

    set: function(confirmed) {
      sessionStorage.setItem(this.STORAGE_KEY, confirmed ? 'true' : 'false');
    },

    get: function() {
      return sessionStorage.getItem(this.STORAGE_KEY) === 'true';
    },

    setOrderID: function(orderID) {
      sessionStorage.setItem(this.ORDER_ID_KEY, orderID);
    },

    getOrderID: function() {
      return sessionStorage.getItem(this.ORDER_ID_KEY);
    },

    clear: function() {
      sessionStorage.removeItem(this.STORAGE_KEY);
      sessionStorage.removeItem(this.ORDER_ID_KEY);
    }
  };

  // Make PaymentState globally accessible
  window.PaymentState = PaymentState;

  const ORDER_SNAPSHOT_KEY = 'sff_last_order';

  function saveOrderSnapshot(payload) {
    try {
      const snapshot = {
        ...payload,
        timestamp: Date.now()
      };
      sessionStorage.setItem(ORDER_SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch (err) {
      console.warn('[Checkout] Unable to persist order snapshot:', err);
    }
  }

  function getOrderData() {
    if (window.SFFOrder && window.SFFOrder.ready) {
      return {
        service: window.SFFOrder.service,
        package: window.SFFOrder.package,
        addons: window.SFFOrder.addons || [],
        addonDetails: window.SFFOrder.addonDetails || [],
        total: window.SFFOrder.total || 0
      };
    }

    const serviceSelect = document.getElementById("serviceSelect");
    const selectedPackageRadio = document.querySelector('input[name="sff-package"]:checked');
    const addonCheckboxes = document.querySelectorAll('.addon-checkbox input[type="checkbox"]:checked');

    if (!serviceSelect || !selectedPackageRadio) {
      return null;
    }

    const service = serviceSelect.value;
    const packageType = selectedPackageRadio.value;
    const selectedAddons = Array.from(addonCheckboxes);
    const addons = selectedAddons.map(cb => cb.value);
    const addonDetails = selectedAddons.map(cb => ({
      id: cb.value,
      name: cb.dataset.name || cb.value,
      price: parseFloat(cb.dataset.price || '0')
    }));

    const addonSum = addonDetails.reduce((sum, item) => sum + (Number.isFinite(item.price) ? item.price : 0), 0);
    return {
      service,
      package: packageType,
      addons,
      addonDetails,
      total: window.SFFOrder?.total || addonSum
    };
  }

  function snapshotOrder(provider, extra = {}) {
    const orderState = getOrderData();
    if (!orderState) return;
    saveOrderSnapshot({
      provider,
      ...orderState,
      ...extra
    });
  }

  function showError(message, debugId = null) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'payment-notification error';

    let content = message;
    if (debugId) {
      content += `<br><small style="opacity:0.8;font-size:12px;">Debug ID: ${debugId}</small>`;
    }

    errorDiv.innerHTML = content;
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4d4f;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 400px;
      font-size: 14px;
      line-height: 1.4;
    `;

    document.body.appendChild(errorDiv);

    setTimeout(() => {
      errorDiv.style.opacity = '0';
      errorDiv.style.transition = 'opacity 0.3s ease';
      setTimeout(() => errorDiv.remove(), 300);
    }, 8000);
  }

  function showLoading(message) {
    const existing = document.getElementById('paypal-loading');
    if (existing) existing.remove();

    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'paypal-loading';
    loadingDiv.innerHTML = `<span style="margin-right:8px;">⏳</span>${message}`;
    loadingDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #1890ff;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-size: 14px;
    `;
    document.body.appendChild(loadingDiv);
    return loadingDiv;
  }

  function hideLoading() {
    const loading = document.getElementById('paypal-loading');
    if (loading) loading.remove();
  }

  function initPayPalButtons() {
    if (typeof paypal === "undefined") {
      console.error("[PayPal Client] SDK not loaded");
      return;
    }

    const container = document.getElementById("paypal-button-container");
    if (!container) return;

    container.innerHTML = '';

    paypal.Buttons({
      createOrder: async function() {
        const orderData = getOrderData();
        if (!orderData?.service || !orderData?.package) {
          showError("Please select a service and package");
          throw new Error("Missing selection");
        }

        console.log("[PayPal Client] Creating order:", orderData);

        try {
          const res = await fetch("/api/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData)
          });

          const data = await res.json();

          if (!res.ok || !data.orderID) {
            const errorMsg = data.error || "Order creation failed";
            const debugId = data.debug_id || null;

            console.error("[PayPal Client] Create order failed:", data);
            showError(errorMsg, debugId);
            throw new Error(errorMsg);
          }

          console.log("[PayPal Client] Order created:", data.orderID);
          return data.orderID;
        } catch (err) {
          console.error("[PayPal Client] Create order error:", err);
          if (!err.message.includes("Missing selection")) {
            if (!document.querySelector('.payment-notification')) {
              showError("Failed to create order. Please try again.");
            }
          }
          throw err;
        }
      },

      onApprove: async function(data) {
        console.log("[PayPal Client] Payment approved, capturing order:", data.orderID);
        const loading = showLoading("Processing payment...");

        try {
          const res = await fetch("/api/capture-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderID: data.orderID })
          });

          const captureData = await res.json();
          hideLoading();

          if (!res.ok || !captureData.success) {
            const errorMsg = captureData.error || "Payment capture failed";
            const debugId = captureData.debug_id || null;

            console.error("[PayPal Client] Capture failed:", captureData);
            showError(`${errorMsg}. Order ID: ${data.orderID}`, debugId);
            return;
          }

          if (captureData.status === "COMPLETED") {
            console.log("[PayPal Client] Payment completed successfully");

            PaymentState.set(true);
            PaymentState.setOrderID(data.orderID);
            sessionStorage.setItem("sff_order_id", data.orderID);

            snapshotOrder('paypal', { orderID: data.orderID });

            window.location.href = TALLY_FORM_URL;
          } else {
            console.warn("[PayPal Client] Unexpected capture status:", captureData.status);
            showError(`Payment status: ${captureData.status}. Contact support with Order ID: ${data.orderID}`);
          }
        } catch (err) {
          hideLoading();
          console.error("[PayPal Client] Capture error:", err);
          showError(`Payment verification failed. Contact support with Order ID: ${data.orderID}`);
        }
      },

      onCancel: function() {
        console.log("[PayPal Client] Payment cancelled by user");
        showError("Payment cancelled. You can retry anytime.");
      },

      onError: function(err) {
        console.error("[PayPal Client] PayPal SDK error:", err);
        showError("PayPal encountered an error. Please refresh and try again.");
      },

      style: {
        layout: "vertical",
        color: "gold",
        shape: "rect",
        label: "paypal"
      }
    }).render("#paypal-button-container");

    const oldBtn = document.getElementById("payButton");
    if (oldBtn) oldBtn.style.display = "none";
  }

  function setStripeButtonState(isLoading, label) {
    const btn = document.getElementById('stripePayButton');
    if (!btn) return;
    btn.disabled = isLoading;
    btn.textContent = isLoading ? (label || 'Processing...') : 'Pay with Card';
  }

  const StripeCheckout = {
    stripe: null,
    publishableKey: null,

    async ensureClient() {
      if (this.stripe) return this.stripe;
      const res = await fetch('/api/stripe/config');
      const data = await res.json();
      if (!res.ok || !data.publishableKey) {
        throw new Error(data.error || 'Stripe is not configured.');
      }
      this.publishableKey = data.publishableKey;
      if (typeof Stripe === 'undefined') {
        throw new Error('Stripe.js failed to load.');
      }
      this.stripe = Stripe(this.publishableKey);
      return this.stripe;
    },

    async handleStripeCheckout() {
      try {
        const orderState = getOrderData();
        if (!orderState || !orderState.service || !orderState.package) {
          showError('Select a service and package before paying.');
          return;
        }
        if (!orderState.total || orderState.total <= 0) {
          showError('Your total must be greater than $0 to continue.');
          return;
        }

        setStripeButtonState(true, 'Connecting to Stripe...');

        const response = await fetch('/api/stripe/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service: orderState.service,
            package: orderState.package,
            addons: orderState.addons || []
          })
        });

        const data = await response.json();
        if (!response.ok || !data.sessionId) {
          throw new Error(data.error || 'Unable to start Stripe checkout.');
        }

        snapshotOrder('stripe', { sessionId: data.sessionId });

        const stripe = await this.ensureClient();
        const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
        if (result && result.error) {
          throw new Error(result.error.message || 'Stripe checkout cancelled.');
        }
      } catch (error) {
        console.error('[Stripe] Checkout error:', error);
        showError(error.message || 'Stripe checkout failed. Please try again.');
      } finally {
        setStripeButtonState(false);
      }
    }
  };

  window.SFFCheckout = StripeCheckout;

  // Load PayPal SDK dynamically with client ID from config
  async function loadPayPalSDK() {
    const container = document.getElementById("paypal-button-container");
    if (!container) {
      console.log("[PayPal Client] No button container found, skipping SDK load");
      return;
    }

    // Check if SDK already loaded (from static script tag)
    if (typeof paypal !== "undefined") {
      console.log("[PayPal Client] SDK already loaded, initializing buttons");
      initPayPalButtons();
      return;
    }

    console.log("[PayPal Client] Fetching PayPal config...");

    try {
      const configRes = await fetch("/api/paypal/config");
      const config = await configRes.json();

      if (!configRes.ok || !config.clientId) {
        console.error("[PayPal Client] Failed to get PayPal config:", config);
        showError("PayPal configuration error. Please try again later.");
        return;
      }

      console.log(`[PayPal Client] Config loaded - Mode: ${config.mode}`);

      // Create and load PayPal SDK script
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${config.clientId}&currency=${config.currency}`;
      script.async = true;

      script.onload = function() {
        console.log("[PayPal Client] SDK loaded successfully");
        initPayPalButtons();
      };

      script.onerror = function() {
        console.error("[PayPal Client] Failed to load PayPal SDK");
        showError("Failed to load PayPal. Please refresh the page.");
      };

      document.head.appendChild(script);

    } catch (err) {
      console.error("[PayPal Client] Config fetch error:", err);
      // Fall back to checking if SDK was loaded via static script tag
      if (typeof paypal !== "undefined") {
        initPayPalButtons();
      } else {
        showError("PayPal is temporarily unavailable. Please try again later.");
      }
    }
  }

  // Initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadPayPalSDK);
  } else {
    loadPayPalSDK();
  }
})();

/* =========================================================
   Event checkout page logic
   - reads cart saved by event-tickets.js (localStorage)
   - renders order summary, runs countdown, step accordion
   ========================================================= */
(function () {
    "use strict";

    function decodeJwtPayload(token) {
        var parts = token ? token.split(".") : [];
        if (parts.length < 2) { return null; }

        try {
            var payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            var decoded = atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "="));
            return JSON.parse(decoded);
        } catch (err) {
            return null;
        }
    }

    function isLoggedIn() {
        var token = null;
        try {
            token = localStorage.getItem("token") || localStorage.getItem("customer_token");
        } catch (err) {
            token = null;
        }

        if (!token) { return false; }

        var payload = decodeJwtPayload(token);
        if (!payload || typeof payload.exp !== "number") { return true; }

        return payload.exp * 1000 > Date.now();
    }

    function redirectToLogin() {
        var target = "/login?returnUrl=" + encodeURIComponent("/event-checkout");

        try {
            if (window.parent && window.parent !== window && window.parent.location.origin === window.location.origin) {
                window.parent.location.href = target;
                return;
            }
        } catch (err) { /* parent not reachable - use local navigation */ }

        window.location.href = target;
    }

    if (!isLoggedIn()) {
        redirectToLogin();
        return;
    }

    var page = document.querySelector(".event-checkout-page");
    if (!page) { return; }

    function money(n) { return "$" + (Math.round(n * 100) / 100).toFixed(2); }
    function set(sel, val) { var el = page.querySelector(sel); if (el) { el.textContent = val; } }
    function getValue(sel) { var el = page.querySelector(sel); return el && el.value ? el.value.trim() : ""; }
    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    function getDigits(value) { return String(value || "").replace(/\D/g, ""); }
    function isValidEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
    function getStep(stepNumber) { return page.querySelector('.ck-step[data-step="' + stepNumber + '"]'); }
    function getStepError(step) {
        var error = step ? step.querySelector(".ck-step-error") : null;
        if (!error && step) {
            error = document.createElement("div");
            error.className = "ck-step-error";
            var body = step.querySelector(".ck-step-body");
            if (body) { body.insertBefore(error, body.firstChild); }
        }
        return error;
    }
    function clearStepError(step) {
        if (!step) { return; }
        step.classList.remove("ck-invalid");
        step.querySelectorAll(".ck-invalid-field").forEach(function (field) {
            field.classList.remove("ck-invalid-field");
        });
        var error = step.querySelector(".ck-step-error");
        if (error) { error.textContent = ""; }
    }
    function setStepError(step, message, field) {
        if (!step) { return false; }
        clearStepError(step);
        step.classList.add("ck-invalid", "open");
        if (field) { field.classList.add("ck-invalid-field"); field.focus(); }
        var error = getStepError(step);
        if (error) { error.textContent = message; }
        return false;
    }
    function openStep(step) {
        if (!step) { return; }
        step.classList.add("open");
        try { step.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) { step.scrollIntoView(); }
    }
    function validateStep(stepNumber, shouldFocus) {
        var step = getStep(stepNumber);
        if (!step) { return true; }

        clearStepError(step);

        if (stepNumber === 1) {
            var phone = step.querySelector('input[type="tel"]');
            var digits = getDigits(phone && phone.value);
            if (!digits) {
                if (shouldFocus) { return setStepError(step, "Please enter your mobile number.", phone); }
                return false;
            }
            if (digits.length < 7 || digits.length > 15) {
                if (shouldFocus) { return setStepError(step, "Please enter a valid mobile number.", phone); }
                return false;
            }
        }

        if (stepNumber === 2) {
            var name = step.querySelector("input:not([type]), input[type='text']");
            var email = step.querySelector('input[type="email"]');
            if (!name || name.value.trim().length < 2) {
                if (shouldFocus) { return setStepError(step, "Please enter your full name.", name); }
                return false;
            }
            if (!email || !isValidEmail(email.value.trim())) {
                if (shouldFocus) { return setStepError(step, "Please enter a valid email address.", email); }
                return false;
            }
        }

        if (stepNumber === 3) {
            var selectedPayment = step.querySelector('input[name="pay"]:checked');
            if (!selectedPayment) {
                if (shouldFocus) { return setStepError(step, "Please select a payment option.", step.querySelector('input[name="pay"]')); }
                return false;
            }
        }

        if (stepNumber === 4) {
            var agree = step.querySelector(".ck-agree");
            if (agree && !agree.checked) {
                if (shouldFocus) { return setStepError(step, "Please accept the Terms & Conditions to continue.", agree); }
                return false;
            }
        }

        step.classList.add("done");
        return true;
    }
    function validateCheckout() {
        for (var stepNumber = 1; stepNumber <= 4; stepNumber++) {
            if (!validateStep(stepNumber, true)) {
                openStep(getStep(stepNumber));
                return false;
            }
        }
        return true;
    }
    function getApiBaseUrl() {
        if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
            return "http://localhost:5145/api";
        }

        return "https://api.chaodesi.com/api";
    }
    function getToken() {
        try { return localStorage.getItem("token") || localStorage.getItem("customer_token") || ""; } catch (e) { return ""; }
    }
    function getLocal(key) {
        try { return localStorage.getItem(key) || ""; } catch (e) { return ""; }
    }
    function getEventDetailUrl() {
        var listingId = cart && cart.event && cart.event.listingId ? cart.event.listingId : "";
        return listingId ? "/event-details?id=" + encodeURIComponent(listingId) : "/event-details";
    }
    async function sendPaymentSuccessEmail(amounts) {
        var token = getToken();
        if (!token) { throw new Error("Please login again before booking this ticket."); }
        if (!cart || !cart.event || !cart.event.listingId) {
            throw new Error("Event details are missing. Please go back to the event page and try again.");
        }

        var response = await fetch(getApiBaseUrl() + "/EventTickets/payment-success", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                listingId: Number(cart.event.listingId),
                eventTitle: cart.event.title || "",
                eventDate: cart.event.date || "",
                eventTime: cart.event.time || "",
                venue: cart.event.venue || cart.event.address || "",
                name: getValue('.ck-step[data-step="2"] input:first-child') || getLocal("fullName") || getLocal("customer_name"),
                email: getValue('.ck-step[data-step="2"] input[type="email"]') || getLocal("email"),
                mobileNumber: getValue('.ck-step[data-step="1"] input[type="tel"]') || getLocal("mobileNumber") || getLocal("mobile_number"),
                subtotalAmount: Math.round(amounts.subtotal * 100) / 100,
                feeAmount: Math.round((amounts.transactionFee + amounts.convenienceFee) * 100) / 100,
                taxAmount: Math.round(amounts.tax * 100) / 100,
                totalAmount: Math.round(amounts.total * 100) / 100,
                currency: "USD",
                paymentProvider: "Demo",
                items: cart.items.map(function (item) {
                    return {
                        name: item.name,
                        quantity: item.qty,
                        price: item.price
                    };
                })
            })
        });

        var result = null;
        try { result = await response.json(); } catch (e) { result = null; }

        if (!response.ok) {
            var message = "Unable to save ticket booking.";
            if (result && result.message) { message = result.message; }
            throw new Error(message);
        }

        return result || {};
    }

    var gatewayModal = null;
    var gatewayProcessing = false;

    function getCheckoutAmounts() {
        return {
            subtotal: sub,
            transactionFee: txFee,
            convenienceFee: conv,
            tax: tax,
            total: total
        };
    }

    function getCheckoutCustomer() {
        return {
            name: getValue('.ck-step[data-step="2"] input:first-child') || getLocal("fullName") || getLocal("customer_name") || "Suresh Demo",
            email: getValue('.ck-step[data-step="2"] input[type="email"]') || getLocal("email") || "customer@example.com"
        };
    }
    function getSelectedPaymentMode() {
        var selected = page.querySelector('input[name="pay"]:checked');
        var label = selected ? selected.closest(".ck-pay") : null;
        var text = label ? label.textContent.toLowerCase() : "";

        if (text.indexOf("net banking") >= 0) { return "bank"; }
        if (text.indexOf("wallet") >= 0 || text.indexOf("upi") >= 0) { return "upi"; }
        return "card";
    }

    function ensureGatewayModal() {
        if (gatewayModal) { return gatewayModal; }

        var customer = getCheckoutCustomer();
        gatewayModal = document.createElement("div");
        gatewayModal.className = "ck-gateway-backdrop";
        gatewayModal.setAttribute("aria-hidden", "true");
        gatewayModal.innerHTML =
            '<div class="ck-gateway" role="dialog" aria-modal="true" aria-labelledby="ck-gateway-title">' +
                '<button class="ck-gateway-close" type="button" aria-label="Close payment popup">&times;</button>' +
                '<div class="ck-gateway-head">' +
                    '<span class="ck-gateway-brand">stripe</span>' +
                    '<div><h3 id="ck-gateway-title">Demo secure payment</h3><p class="ck-gateway-subtitle">Use test payment details to complete this booking.</p></div>' +
                '</div>' +
                '<div class="ck-gateway-form">' +
                    '<div class="ck-gateway-total"><span>Amount</span><b class="ck-gateway-amount">$0.00</b></div>' +
                    '<div class="ck-gateway-method ck-gateway-card">' +
                        '<label>Card number<input class="ck-gw-card" inputmode="numeric" value="4242 4242 4242 4242"></label>' +
                        '<div class="ck-gateway-row">' +
                            '<label>Expiry<input class="ck-gw-exp" value="12/30"></label>' +
                            '<label>CVC<input class="ck-gw-cvc" inputmode="numeric" value="123"></label>' +
                            '<label>ZIP<input class="ck-gw-zip" inputmode="numeric" value="10001"></label>' +
                        '</div>' +
                        '<label>Name on card<input class="ck-gw-name" value="' + escapeHtml(customer.name) + '"></label>' +
                    '</div>' +
                    '<div class="ck-gateway-method ck-gateway-bank" hidden>' +
                        '<label>Select bank<select class="ck-gw-bank"><option value="">Choose bank</option><option selected>Chase Bank</option><option>Bank of America</option><option>Wells Fargo</option><option>Citi Bank</option></select></label>' +
                        '<label>Account holder<input class="ck-gw-bank-name" value="' + escapeHtml(customer.name) + '"></label>' +
                        '<label>Demo login ID<input class="ck-gw-bank-login" value="demo_user_1022"></label>' +
                    '</div>' +
                    '<div class="ck-gateway-method ck-gateway-upi" hidden>' +
                        '<label>UPI ID<input class="ck-gw-upi" value="suresh@upi"></label>' +
                        '<label>Wallet provider<select class="ck-gw-wallet"><option selected>PhonePe</option><option>Google Pay</option><option>Paytm Wallet</option><option>Amazon Pay</option></select></label>' +
                        '<label>Registered mobile<input class="ck-gw-upi-mobile" inputmode="numeric" value="' + escapeHtml(getDigits(getValue('.ck-step[data-step="1"] input[type="tel"]')) || "9876543210") + '"></label>' +
                    '</div>' +
                    '<label>Email receipt<input class="ck-gw-email" type="email" value="' + escapeHtml(customer.email) + '"></label>' +
                    '<div class="ck-gateway-error" aria-live="polite"></div>' +
                    '<button class="ck-btn ck-gateway-pay" type="button">Pay now</button>' +
                    '<p class="ck-gateway-note">Demo mode. No real payment will be charged.</p>' +
                '</div>' +
                '<div class="ck-gateway-success" hidden>' +
                    '<span class="ck-success-icon"><i class="material-icons">check</i></span>' +
                    '<h3>Payment successful</h3>' +
                    '<p>Your demo payment is complete. Ticket confirmation has been generated.</p>' +
                    '<button class="ck-btn ck-gateway-done" type="button">Done</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(gatewayModal);

        gatewayModal.querySelector(".ck-gateway-close").addEventListener("click", closeGatewayModal);
        gatewayModal.addEventListener("click", function (event) {
            if (event.target === gatewayModal) { closeGatewayModal(); }
        });
        gatewayModal.querySelector(".ck-gateway-pay").addEventListener("click", function () {
            processGatewayPayment(getCheckoutAmounts());
        });
        gatewayModal.querySelector(".ck-gateway-done").addEventListener("click", finishPaymentFlow);

        return gatewayModal;
    }

    function closeGatewayModal() {
        if (!gatewayModal || gatewayProcessing) { return; }
        gatewayModal.classList.remove("open");
        gatewayModal.setAttribute("aria-hidden", "true");
    }

    function openGatewayModal(amounts) {
        var modal = ensureGatewayModal();
        var customer = getCheckoutCustomer();
        var paymentMode = getSelectedPaymentMode();
        var modeText = paymentMode === "bank" ? "Net Banking" : paymentMode === "upi" ? "Wallet / UPI" : "Credit / Debit Card";
        modal.querySelector(".ck-gateway-amount").textContent = money(amounts.total);
        modal.querySelector(".ck-gateway-pay").textContent = "Pay " + money(amounts.total);
        modal.querySelector(".ck-gateway-brand").textContent = paymentMode === "bank" ? "bank" : paymentMode === "upi" ? "upi" : "stripe";
        modal.querySelector("#ck-gateway-title").textContent = modeText + " demo payment";
        modal.querySelector(".ck-gateway-subtitle").textContent = "Use the prefilled " + modeText.toLowerCase() + " details to complete this booking.";
        modal.querySelectorAll(".ck-gateway-method").forEach(function (section) {
            section.hidden = true;
        });
        modal.querySelector(".ck-gateway-" + paymentMode).hidden = false;
        if (modal.querySelector(".ck-gw-name")) { modal.querySelector(".ck-gw-name").value = customer.name; }
        if (modal.querySelector(".ck-gw-bank-name")) { modal.querySelector(".ck-gw-bank-name").value = customer.name; }
        if (modal.querySelector(".ck-gw-upi-mobile")) {
            modal.querySelector(".ck-gw-upi-mobile").value = getDigits(getValue('.ck-step[data-step="1"] input[type="tel"]')) || "9876543210";
        }
        modal.querySelector(".ck-gw-email").value = customer.email;
        modal.querySelector(".ck-gateway-error").textContent = "";
        modal.querySelector(".ck-gateway-form").hidden = false;
        modal.querySelector(".ck-gateway-success").hidden = true;
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
        var dialog = modal.querySelector(".ck-gateway");
        if (dialog) { dialog.scrollTop = 0; }
    }

    function validateGatewayFields(modal) {
        var paymentMode = getSelectedPaymentMode();
        var card = modal.querySelector(".ck-gw-card");
        var expiry = modal.querySelector(".ck-gw-exp");
        var cvc = modal.querySelector(".ck-gw-cvc");
        var name = modal.querySelector(".ck-gw-name");
        var bank = modal.querySelector(".ck-gw-bank");
        var bankName = modal.querySelector(".ck-gw-bank-name");
        var bankLogin = modal.querySelector(".ck-gw-bank-login");
        var upi = modal.querySelector(".ck-gw-upi");
        var wallet = modal.querySelector(".ck-gw-wallet");
        var upiMobile = modal.querySelector(".ck-gw-upi-mobile");
        var email = modal.querySelector(".ck-gw-email");
        var error = modal.querySelector(".ck-gateway-error");

        modal.querySelectorAll(".ck-gateway-invalid").forEach(function (field) {
            field.classList.remove("ck-gateway-invalid");
        });
        error.textContent = "";

        if (paymentMode === "card") {
            if (getDigits(card.value).length < 12) {
                card.classList.add("ck-gateway-invalid");
                card.focus();
                error.textContent = "Please enter a valid card number.";
                return false;
            }
            if (!/^\d{2}\s*\/\s*\d{2}$/.test(expiry.value.trim())) {
                expiry.classList.add("ck-gateway-invalid");
                expiry.focus();
                error.textContent = "Please enter expiry as MM/YY.";
                return false;
            }
            if (getDigits(cvc.value).length < 3) {
                cvc.classList.add("ck-gateway-invalid");
                cvc.focus();
                error.textContent = "Please enter a valid CVC.";
                return false;
            }
            if (!name.value.trim()) {
                name.classList.add("ck-gateway-invalid");
                name.focus();
                error.textContent = "Please enter the card holder name.";
                return false;
            }
        }
        if (paymentMode === "bank") {
            if (!bank.value) {
                bank.classList.add("ck-gateway-invalid");
                bank.focus();
                error.textContent = "Please select your bank.";
                return false;
            }
            if (!bankName.value.trim()) {
                bankName.classList.add("ck-gateway-invalid");
                bankName.focus();
                error.textContent = "Please enter the account holder name.";
                return false;
            }
            if (!bankLogin.value.trim()) {
                bankLogin.classList.add("ck-gateway-invalid");
                bankLogin.focus();
                error.textContent = "Please enter the demo banking login ID.";
                return false;
            }
        }
        if (paymentMode === "upi") {
            if (!/^[\w.-]+@[\w.-]+$/.test(upi.value.trim())) {
                upi.classList.add("ck-gateway-invalid");
                upi.focus();
                error.textContent = "Please enter a valid UPI ID.";
                return false;
            }
            if (!wallet.value) {
                wallet.classList.add("ck-gateway-invalid");
                wallet.focus();
                error.textContent = "Please select a wallet provider.";
                return false;
            }
            if (getDigits(upiMobile.value).length < 7) {
                upiMobile.classList.add("ck-gateway-invalid");
                upiMobile.focus();
                error.textContent = "Please enter a valid registered mobile number.";
                return false;
            }
        }
        if (!isValidEmail(email.value.trim())) {
            email.classList.add("ck-gateway-invalid");
            email.focus();
            error.textContent = "Please enter a valid receipt email.";
            return false;
        }

        return true;
    }

    async function processGatewayPayment(amounts) {
        var modal = ensureGatewayModal();
        var pay = modal.querySelector(".ck-gateway-pay");
        var close = modal.querySelector(".ck-gateway-close");

        if (gatewayProcessing || !validateGatewayFields(modal)) { return; }

        gatewayProcessing = true;
        pay.disabled = true;
        close.disabled = true;
        pay.textContent = "Processing...";

        await new Promise(function (resolve) { window.setTimeout(resolve, 1100); });

        try {
            await sendPaymentSuccessEmail(amounts);
        } catch (error) {
            var errorMessage = error && error.message ? error.message : "Unable to generate ticket confirmation email.";
            modal.querySelector(".ck-gateway-error").textContent = errorMessage;
            gatewayProcessing = false;
            pay.disabled = false;
            close.disabled = false;
            pay.textContent = "Pay " + money(amounts.total);
            return;
        }

        gatewayProcessing = false;
        pay.disabled = false;
        close.disabled = false;
        modal.querySelector(".ck-gateway-form").hidden = true;
        modal.querySelector(".ck-gateway-success").hidden = false;
    }

    function finishPaymentFlow() {
        var detailUrl = getEventDetailUrl();
        try { localStorage.removeItem("chaodesi_event_cart"); } catch (e) {}
        window.location.href = detailUrl;
    }

    // ---- Load cart (fallback to a sample order) ----
    var cart = null;
    try { cart = JSON.parse(localStorage.getItem("chaodesi_event_cart")); } catch (e) { cart = null; }
    if (!cart || !cart.items || !cart.items.length) {
        cart = {
            event: {
                title: "Chicago Bike Trails Festival 2026",
                date: "Sat, 11 Mar 2026",
                time: "6:00 AM",
                venue: "Lakefront Trail \u2014 North Entrance, Chicago, IL",
                organizer: "Richflayer Events"
            },
            items: [
                { name: "VIP Pass", price: 134.10, qty: 1 },
                { name: "Premium (Orchestra & Boxes)", price: 92.76, qty: 1 }
            ],
            rates: { tx: 0.09, tax: 0.091, conv: 4.00 }
        };
    }

    // ---- Event meta ----
    if (cart.event) {
        if (cart.event.title) { set(".ck-ev-title", cart.event.title); }
        if (cart.event.organizer) { set(".ck-ev-org-name", cart.event.organizer); }
        if (cart.event.venue || cart.event.address) { set(".ck-ev-venue span", cart.event.venue || cart.event.address); }
        if (cart.event.time) { set(".ck-datebox i", cart.event.time); }
        if (cart.event.date) {
            var date = new Date(cart.event.date);
            if (!Number.isNaN(date.getTime())) {
                set(".ck-datebox b", String(date.getDate()).padStart(2, "0"));
                set(".ck-datebox span", date.toLocaleDateString("en-US", { month: "short" }));
            }
        }
    }

    // ---- Tickets + fee breakdown ----
    var rates = cart.rates || { tx: 0.09, tax: 0.091, conv: 4.00 };
    var sub = 0, rows = "";
    cart.items.forEach(function (it) {
        var amt = it.price * it.qty;
        sub += amt;
        rows += '<div class="ck-li"><div><b>' + it.name + '</b><small>' + it.qty +
            " x " + it.price.toFixed(2) + '</small></div><span>' + money(amt) + "</span></div>";
    });
    var ticketsEl = page.querySelector(".ck-tickets");
    if (ticketsEl) { ticketsEl.innerHTML = rows; }

    var txFee = sub * rates.tx;
    var conv = cart.items.length ? rates.conv : 0;
    var tax = sub * rates.tax;
    var total = sub + txFee + conv + tax;

    set(".ck-tx", money(txFee));
    set(".ck-conv", money(conv));
    set(".ck-tax", money(tax));
    set(".ck-total", money(total));

    // ---- Countdown timer (10 minutes) ----
    var timeLeft = 10 * 60;
    var timerEl = page.querySelector(".ck-timer");
    if (timerEl) {
        var tick = function () {
            var m = Math.floor(timeLeft / 60);
            var s = timeLeft % 60;
            timerEl.textContent = m + ":" + (s < 10 ? "0" + s : s);
            if (timeLeft <= 0) { clearInterval(iv); return; }
            timeLeft--;
        };
        tick();
        var iv = setInterval(tick, 1000);
    }

    // ---- Step accordion ----
    page.querySelectorAll(".ck-step-head").forEach(function (head) {
        head.addEventListener("click", function () {
            head.parentNode.classList.toggle("open");
        });
    });
    page.querySelectorAll(".ck-next").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var step = btn.closest(".ck-step");
            var stepNumber = Number(step && step.getAttribute("data-step"));
            if (!validateStep(stepNumber, true)) {
                openStep(step);
                return;
            }
            step.classList.remove("open");
            var next = step.nextElementSibling;
            while (next && !next.classList.contains("ck-step")) { next = next.nextElementSibling; }
            if (next) { next.classList.add("open"); }
        });
    });

    // ---- Pay action ----
    var payBtn = page.querySelector(".ck-pay-now");
    if (payBtn) {
        payBtn.addEventListener("click", function () {
            if (!validateCheckout()) {
                alert("Please complete all checkout details before payment.");
                return;
            }
            openGatewayModal(getCheckoutAmounts());
        });
    }
})();

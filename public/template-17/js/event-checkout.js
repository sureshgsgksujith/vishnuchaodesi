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
        if (!token || !cart || !cart.event || !cart.event.listingId) { return; }

        var response = await fetch(getApiBaseUrl() + "/EventTickets/payment-success", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                listingId: Number(cart.event.listingId),
                eventTitle: cart.event.title || "",
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
            step.classList.remove("open");
            step.classList.add("done");
            var next = step.nextElementSibling;
            while (next && !next.classList.contains("ck-step")) { next = next.nextElementSibling; }
            if (next) { next.classList.add("open"); }
        });
    });

    // ---- Pay action ----
    var payBtn = page.querySelector(".ck-pay-now");
    if (payBtn) {
        payBtn.addEventListener("click", async function () {
            var agree = page.querySelector(".ck-agree");
            if (agree && !agree.checked) {
                var terms = agree.closest(".ck-step");
                if (terms) { terms.classList.add("open"); }
                alert("Please accept the Terms & Conditions to continue.");
                return;
            }
            payBtn.disabled = true;
            payBtn.textContent = "Processing...";

            try {
                var paymentResult = await sendPaymentSuccessEmail({
                    subtotal: sub,
                    transactionFee: txFee,
                    convenienceFee: conv,
                    tax: tax,
                    total: total
                });
                if (paymentResult && paymentResult.emailSent === false) {
                    alert("Payment successful and booking saved. Email could not be sent now; please check dashboard for booking details.");
                } else {
                    alert("Payment successful. Ticket confirmation email has been sent.");
                }
            } catch (error) {
                alert("Payment processed, but booking confirmation failed: " + (error && error.message ? error.message : "Please contact support."));
            } finally {
                var detailUrl = getEventDetailUrl();
                try { localStorage.removeItem("chaodesi_event_cart"); } catch (e) {}
                window.location.href = detailUrl;
            }
        });
    }
})();

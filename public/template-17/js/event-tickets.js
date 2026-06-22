/* =========================================================
   Event ticket selection popup -> checkout flow
   Used by event-details.html (#ticketModal)
   ========================================================= */
(function () {
    "use strict";

    // Fee configuration (kept here so it can later be driven by the backend)
    var RATES = { tx: 0.09, tax: 0.091, conv: 4.00 };

    // Static event meta carried to the checkout page
    var EVENT = {
        title: "Chicago Bike Trails Festival 2026",
        date: "Sat, 11 Mar 2026",
        time: "6:00 AM",
        venue: "Lakefront Trail \u2014 North Entrance",
        address: "28800 Orchard Lake Road, Suite 180, Farmington Hills, Chicago, IL",
        organizer: "Richflayer Events",
        artist: "Chao Desi Sports"
    };

    var modal = document.getElementById("ticketModal");
    if (!modal) { return; }

    function money(n) { return "$" + (Math.round(n * 100) / 100).toFixed(2); }

    function getRows() { return modal.querySelectorAll(".edt-row"); }

    function goToCheckout() {
        try {
            if (window.parent && window.parent !== window && window.parent.location.origin === window.location.origin) {
                window.parent.location.href = "/event-checkout";
                return;
            }
        } catch (err) { /* parent not reachable - use local navigation */ }

        window.location.href = "/event-checkout";
    }

    function recalc() {
        var count = 0, sub = 0, items = [];
        getRows().forEach(function (row) {
            var qty = parseInt(row.querySelector(".edt-qty").textContent, 10) || 0;
            if (qty > 0) {
                var price = parseFloat(row.getAttribute("data-price"));
                var name = (row.getAttribute("data-name") || "").replace(/&amp;/g, "&");
                count += qty;
                sub += price * qty;
                items.push({ name: name, price: price, qty: qty });
            }
        });

        var fee = count ? (sub * RATES.tx + sub * RATES.tax + RATES.conv) : 0;

        modal.querySelector(".edt-count").textContent = count;
        modal.querySelector(".edt-total").textContent = money(sub);
        modal.querySelector(".edt-fee").textContent = money(fee);

        var checkout = modal.querySelector(".edt-checkout");
        checkout.disabled = count === 0;

        window.__edCart = {
            event: EVENT,
            items: items,
            subtotal: Math.round(sub * 100) / 100,
            fee: Math.round(fee * 100) / 100,
            rates: RATES
        };
    }

    modal.addEventListener("click", function (e) {
        var plus = e.target.closest(".edt-plus");
        var minus = e.target.closest(".edt-minus");
        var checkout = e.target.closest(".edt-checkout");

        if (plus) {
            var q = plus.parentNode.querySelector(".edt-qty");
            var v = (parseInt(q.textContent, 10) || 0);
            if (v < 10) { q.textContent = v + 1; }
            recalc();
            return;
        }
        if (minus) {
            var q2 = minus.parentNode.querySelector(".edt-qty");
            var v2 = (parseInt(q2.textContent, 10) || 0);
            if (v2 > 0) { q2.textContent = v2 - 1; }
            recalc();
            return;
        }
        if (checkout && !checkout.disabled) {
            try {
                localStorage.setItem("chaodesi_event_cart", JSON.stringify(window.__edCart));
            } catch (err) { /* storage unavailable - continue */ }
            goToCheckout();
        }
    });

    recalc();
})();

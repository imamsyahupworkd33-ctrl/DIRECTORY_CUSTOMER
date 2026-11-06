/**
 * AUTO-REFRESH (pelanggan) — data di dashboard ikut diperbarui otomatis saat admin mengubah sesuatu
 * (langganan, status request, koin, katalog/stok, harga, pengumuman). Butuh sql/koin-usdt-21-autorefresh.sql.
 * Ditunda sementara bila kotak dialog terbuka atau pelanggan sedang mengetik.
 */
(function () {
    const INTERVAL = 12000;
    let last = null, pending = new Set(), busyFetch = false, fails = 0, timer = null;

    const safe = fn => { try { const r = typeof fn === "function" ? fn() : null; if (r && r.catch) r.catch(e => console.warn("autorefresh:", e)); } catch (e) { console.warn("autorefresh:", e); } };
    const modalOpen = () => { const m = document.getElementById("modalOverlay"); return !!(m && m.classList.contains("show")); };
    const typing = () => {
        const a = document.activeElement; if (!a) return false;
        if (a.tagName === "TEXTAREA" || a.tagName === "SELECT") return true;
        return a.tagName === "INPUT" && !["checkbox", "radio", "button", "submit"].includes(a.type);
    };

    function apply(scopes) {
        const has = (...s) => s.some(x => scopes.has(x));
        if (has("orders")) { safe(typeof loadMyOrders === "function" && loadMyOrders); safe(typeof loadArchiveNotice === "function" && loadArchiveNotice); }
        if (has("requests")) {
            safe(typeof loadRenewals === "function" && loadRenewals); safe(typeof loadBotOrders === "function" && loadBotOrders);
            safe(typeof loadCatalog === "function" && loadCatalog); safe(typeof loadSupply === "function" && loadSupply);
            safe(async () => { if (typeof loadOrderRequests === "function") { await loadOrderRequests(); if (typeof renderOrders === "function") renderOrders(); } });
            safe(typeof loadMyOrders === "function" && loadMyOrders);      // request disetujui = langganan berubah
        }
        if (has("coin")) safe(typeof loadCoin === "function" && loadCoin);
        if (has("catalog")) { safe(typeof loadCatalog === "function" && loadCatalog); safe(typeof loadSupply === "function" && loadSupply); }
        if (has("price")) {
            safe(async () => {
                if (typeof cuPriceInfo !== "undefined") cuPriceInfo = null;
                if (typeof ensurePriceInfo === "function") { await ensurePriceInfo(); if (typeof renderRateBar === "function") renderRateBar(); }
                if (typeof renderOrders === "function") renderOrders();
            });
            safe(typeof loadPanel === "function" && loadPanel);
        }
        if (has("announce")) safe(typeof loadAnnouncements === "function" && loadAnnouncements);
    }

    async function tick() {
        if (busyFetch || document.hidden || typeof supabaseClient === "undefined") return;
        busyFetch = true;
        try {
            const { data, error } = await supabaseClient.rpc("sync_get");
            if (error || !data) { if (++fails >= 3) stop(); return; }
            fails = 0;
            if (last === null) { last = data; return; }
            Object.keys(data).forEach(k => { if (data[k] !== last[k]) pending.add(k); });
            last = data;
            if (pending.size && !modalOpen() && !typing()) { const s = pending; pending = new Set(); apply(s); }
        } finally { busyFetch = false; }
    }
    function start() { if (!timer) timer = setInterval(tick, INTERVAL); tick(); }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
    window.addEventListener("online", tick);
    document.addEventListener("DOMContentLoaded", () => setTimeout(start, 2500));
})();

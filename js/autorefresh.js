/**
 * AUTO-REFRESH (pelanggan) — data di dashboard ikut diperbarui otomatis saat admin mengubah sesuatu
 * (langganan, status request, koin, katalog/stok, harga, pengumuman). Butuh sql/koin-usdt-21-autorefresh.sql;
 * migrations/005_hemat_egress.sql menambah versi PER PELANGGAN (cu_sync_get) sehingga pesanan pelanggan lain
 * tidak lagi membuat halaman ini memuat ulang.
 * Ditunda sementara bila kotak dialog terbuka atau pelanggan sedang mengetik.
 *
 * Hemat egress: cek versi tiap 30 dtk (dulu 12 dtk), berhenti total saat tab disembunyikan,
 * hanya bagian yang berubah yang dimuat ulang, perubahan global yang sering (langganan harian, antrian batch,
 * stok katalog) dibatasi paling cepat 1x per 1–2 menit.
 */
(function () {
    const INTERVAL = 30000;
    let last = null, pending = new Set(), busyFetch = false, fails = 0, timer = null, useCu = true;

    const safe = fn => { try { const r = typeof fn === "function" ? fn() : null; if (r && r.catch) r.catch(e => console.warn("autorefresh:", e)); } catch (e) { console.warn("autorefresh:", e); } };
    const modalOpen = () => { const m = document.getElementById("modalOverlay"); return !!(m && m.classList.contains("show")); };
    const typing = () => {
        const a = document.activeElement; if (!a) return false;
        if (a.tagName === "TEXTAREA" || a.tagName === "SELECT") return true;
        return a.tagName === "INPUT" && !["checkbox", "radio", "button", "submit"].includes(a.type);
    };

    /* pemanggilan dibatasi: fn paling cepat 1x per `gap` ms; panggilan di tengah jeda dijalankan di akhir jeda */
    const lastRun = {}, queued = {};
    function throttled(key, gap, fn) {
        const wait = (lastRun[key] || 0) + gap - Date.now();
        if (wait <= 0) { lastRun[key] = Date.now(); safe(fn); return; }
        if (queued[key]) return;
        queued[key] = setTimeout(() => { queued[key] = null; lastRun[key] = Date.now(); safe(fn); }, wait);
    }

    const L = {
        orders: () => { safe(typeof loadMyOrders === "function" && loadMyOrders); },
        archive: () => { safe(typeof loadArchiveNotice === "function" && loadArchiveNotice); },
        renewals: () => { safe(typeof loadRenewals === "function" && loadRenewals); },
        bot: () => { safe(typeof loadBotOrders === "function" && loadBotOrders); },
        catalog: () => { safe(typeof loadCatalog === "function" && loadCatalog); },
        supply: () => { safe(typeof loadSupply === "function" && loadSupply); },
        requests: () => { safe(async () => { if (typeof loadOrderRequests === "function") { await loadOrderRequests(); if (typeof renderOrders === "function") renderOrders(); } }); },
        coin: () => { safe(typeof loadCoin === "function" && loadCoin); },
        price: () => {
            ssCache.del("price");
            safe(async () => {
                if (typeof cuPriceInfo !== "undefined") cuPriceInfo = null;
                if (typeof ensurePriceInfo === "function") { await ensurePriceInfo(); if (typeof renderRateBar === "function") renderRateBar(); }
                if (typeof renderOrders === "function") renderOrders();
            });
        },
        panel: () => { ssCache.del("panel"); safe(() => typeof loadPanel === "function" && loadPanel(true)); },
        announce: () => { safe(typeof loadAnnouncements === "function" && loadAnnouncements); },
        botpkg: () => {            // proses 1F / 2F (nama, notes, harga) diubah admin
            ssCache.del("botpkg");
            safe(() => typeof ensureBotPkgs === "function" && ensureBotPkgs(true).then(() => { if (typeof renderPriceList === "function") renderPriceList(); if (typeof renderBotOrders === "function") renderBotOrders(); }));
        }
    };
    // pesanan bot saya masih menunggu dikirim? (nomor batch hanya berubah untuk pesanan yang masih di antrian)
    const hasQueuedBot = () => typeof myBotOrders !== "undefined" && myBotOrders.some(r => r.status === "approved" && !r.dikirim_at && !r.arsip);

    /* versi per tabel (migrasi 005) */
    function applyTables(ch) {
        const has = (...k) => k.some(x => ch.has(x));
        // milik sendiri: langsung
        if (has("my:bot_orders", "my:bot_queue")) L.bot();
        if (has("my:renewal_requests")) { L.renewals(); throttled("orders", 0, L.orders); }
        if (has("my:order_requests")) { L.requests(); throttled("orders", 0, L.orders); }
        if (has("my:catalog_orders", "my:preorder_orders", "my:farm_sales", "my:hav_sales")) throttled("catalog", 0, L.catalog);
        if (has("my:supply_orders")) L.supply();
        if (has("my:coin_topups", "my:coin_ledger")) L.coin();
        // global: dibatasi
        if (has("orders", "customer_order_labels")) throttled("orders", 60000, L.orders);
        if (has("archives")) { throttled("orders", 60000, L.orders); L.archive(); }
        if (has("bot_queue", "bot_batch_settings") && hasQueuedBot()) throttled("bot", 120000, L.bot);
        if (has("supply_batches", "supply_accounts")) { throttled("supply", 60000, L.supply); throttled("catalog", 60000, L.catalog); }
        if (has("catalog_items", "catalog_categories", "farm_batches", "farm_tokens", "hav_batches", "hav_keys", "preorder_items")) throttled("catalog", 60000, L.catalog);
        if (has("price_settings", "price_custom", "price_item", "price_special", "payment_settings", "referral_codes")) { L.price(); throttled("catalog", 0, L.catalog); }
        if (has("bot_packages", "price_item")) L.botpkg();
        if (has("panel_settings")) L.panel();
        if (has("announcements")) L.announce();
    }
    /* versi per kelompok (database belum menjalankan migrasi 005) — perilaku lama */
    function applyGroups(s) {
        const has = (...k) => k.some(x => s.has(x));
        if (has("orders")) { L.orders(); L.archive(); }
        if (has("requests")) { L.renewals(); L.bot(); L.catalog(); L.supply(); L.requests(); L.orders(); }
        if (has("coin")) L.coin();
        if (has("catalog")) { L.catalog(); L.supply(); }
        if (has("price")) { L.price(); L.panel(); }
        if (has("announce")) L.announce();
    }
    const isTableMode = data => Object.keys(data).some(k => k.startsWith("my:") || k === "bot_orders" || k === "announcements");

    async function readVersions() {
        if (useCu) {
            const r = await supabaseClient.rpc("cu_sync_get", { p_session_token: getSession() });
            if (!r.error) return r;
            if (/does not exist|schema cache|Could not find the function/i.test(r.error.message || "")) useCu = false;
            else return r;
        }
        return supabaseClient.rpc("sync_get");
    }
    async function tick() {
        if (busyFetch || document.visibilityState !== "visible" || typeof supabaseClient === "undefined") return;
        busyFetch = true;
        try {
            const { data, error } = await readVersions();
            if (error || !data) { if (++fails >= 3) stop(); return; }
            fails = 0; window.__syncActive = true;
            if (last === null) { last = data; return; }
            Object.keys(data).forEach(k => { if (data[k] !== last[k]) pending.add(k); });
            last = data;
            if (pending.size && !modalOpen() && !typing()) { const s = pending; pending = new Set(); (useCu || isTableMode(data) ? applyTables : applyGroups)(s); }
        } finally { busyFetch = false; }
    }
    function start() { if (!timer) timer = setInterval(tick, INTERVAL); tick(); }
    function stop() { if (timer) clearInterval(timer); timer = null; window.__syncActive = false; }
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") { if (!timer && fails < 3) start(); else tick(); }
        else if (timer) { clearInterval(timer); timer = null; }          // tab disembunyikan: berhenti total
    });
    window.addEventListener("online", tick);
    document.addEventListener("DOMContentLoaded", () => setTimeout(start, 2500));
})();

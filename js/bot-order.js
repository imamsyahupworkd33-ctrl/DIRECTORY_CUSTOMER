/**
 * Pesan BOT ORDER (BEM / SEM / LEM Bot) — pelanggan. Butuh sql/bot-order.sql.
 * Harga per tagar diatur admin (Price). Banyak tagar dalam 1 pesanan = 1 pesanan.
 * Alur: isi tagar -> pembayaran (QRIS/Binance/DANA/PayPal) -> OK -> antrian admin -> disetujui.
 */
Object.assign(TRANSLATIONS.id, {
    bo_btn: "Pesan Bot Order", bo_title: "Pesan Bot Order", bo_sub: "Pilih paket bot dan masukkan tagar. Harga dihitung per tagar.",
    bo_pkg: "Paket Bot", bo_per_tag: "/tagar", bo_tags_label: "Tagar (boleh banyak)", bo_tags_hint: "Satu tagar per baris atau pisahkan dengan koma. Tagar kembar otomatis diabaikan.",
    bo_tag_ph: "#tagar1\n#tagar2\n#tagar3", bo_note_label: "Catatan untuk admin (opsional)", bo_price_title: "Harga", bo_calc: "{n} tagar × {p}", bo_total: "Total",
    bo_unset: "Harga bot order belum diatur admin.", bo_send: "Pesan", bo_sending: "Mengirim…",
    bo_info: "Koin dipotong saat Anda menekan Ya. Pesanan menunggu konfirmasi admin; bila ditolak atau dibatalkan, koin dikembalikan.",
    bo_sent_title: "Bot Order Terkirim", bo_sent_text: "Pesanan {n} tagar ({pkg}) sebesar {total} sudah masuk antrian admin.", bo_close: "Tutup",
    bo_err_tag: "Isi minimal 1 tagar", bo_err_max: "Maksimal 500 tagar per pesanan", bo_err_price: "Harga Bot Order belum diatur admin",
    bo_list_title: "Bot Order Saya", bo_st_pending: "⏳ Menunggu konfirmasi", bo_st_approved: "✅ Disetujui", bo_st_rejected: "✖ Ditolak", bo_tags_n: "{n} tagar",
    bo_wa_text: "Halo Admin, saya sudah membayar Bot Order {pkg} ({n} tagar) sebesar {total}. Berikut bukti pembayarannya:"
});
Object.assign(TRANSLATIONS.en, {
    bo_btn: "Order Bot", bo_title: "Order Bot", bo_sub: "Choose a bot package and enter your tags. Priced per tag.",
    bo_pkg: "Bot Package", bo_per_tag: "/tag", bo_tags_label: "Tags (as many as you like)", bo_tags_hint: "One tag per line or separate with commas. Duplicate tags are ignored.",
    bo_tag_ph: "#tag1\n#tag2\n#tag3", bo_note_label: "Note for admin (optional)", bo_price_title: "Price", bo_calc: "{n} tags × {p}", bo_total: "Total",
    bo_unset: "Bot order price has not been set by the admin.", bo_send: "Order", bo_sending: "Sending…",
    bo_info: "Coins are deducted when you press Yes. The order awaits admin confirmation; if it is rejected or cancelled, the coins are refunded.",
    bo_sent_title: "Bot Order Sent", bo_sent_text: "Your order of {n} tags ({pkg}) totaling {total} is now in the admin queue.", bo_close: "Close",
    bo_err_tag: "Enter at least 1 tag", bo_err_max: "Maximum 500 tags per order", bo_err_price: "Bot order price has not been set by the admin",
    bo_list_title: "My Bot Orders", bo_st_pending: "⏳ Awaiting confirmation", bo_st_approved: "✅ Approved", bo_st_rejected: "✖ Rejected", bo_tags_n: "{n} tags",
    bo_wa_text: "Hello Admin, I have paid for Bot Order {pkg} ({n} tags), total {total}. Here is my payment proof:"
});
Object.assign(TRANSLATIONS.id, {
    bo_tab: "Bot Order", bo_list_empty: "Belum ada bot order.", bo_f_active: "Aktif", bo_f_archive: "Arsip",
    bo_st_kirim: "📮 Disetujui — sedang diproses", bo_st_sent: "✅ Sudah dikirim", bo_sent_on: "Dikirim {d}", bo_arch_tag: "Arsip"
});
Object.assign(TRANSLATIONS.en, {
    bo_tab: "Bot Orders", bo_list_empty: "No bot orders yet.", bo_f_active: "Active", bo_f_archive: "Archive",
    bo_st_kirim: "📮 Approved — being processed", bo_st_sent: "✅ Delivered", bo_sent_on: "Delivered {d}", bo_arch_tag: "Archived"
});
Object.assign(TRANSLATIONS.id, { bo_kind_bot: "Bot" });
Object.assign(TRANSLATIONS.en, { bo_kind_bot: "Bot" });
Object.assign(TRANSLATIONS.id, {
    bo_tags_view: "Lihat daftar tagar", bo_tags_loading: "Memuat daftar tagar…", bo_tags_copy: "Salin semua tagar", bo_tags_copied_toast: "Daftar tagar disalin", bo_tags_err: "Gagal memuat daftar tagar"
});
Object.assign(TRANSLATIONS.en, {
    bo_tags_view: "View tag list", bo_tags_loading: "Loading tag list…", bo_tags_copy: "Copy all tags", bo_tags_copied_toast: "Tag list copied", bo_tags_err: "Failed to load the tag list"
});
Object.assign(SERVER_ERROR_MAP, {
    "Harga Bot Order belum diatur admin": "bo_err_price", "Pilih proses pengiriman": "bo_err_proses", "Proses pengiriman tidak valid": "bo_err_proses",
    "Proses pengiriman ini sedang tidak tersedia": "bo_proses_off", "Pemesanan proses dan jenis ini sedang ditutup": "bo_combo_off", "Maksimal 500 tagar per pesanan": "bo_err_max", "Tagar wajib diisi": "bo_err_tag"
});

const BO_PKGS = ["BEM", "SEM", "LEM"];

/* ---------------- Proses pengiriman 1F / 2F Request (migrasi 007) ----------------
 * Pengaturan proses (nama, notes/rules, harga per jenis untuk pelanggan ini) di-cache 10 menit di sessionStorage;
 * cache dihapus otomatis saat admin mengubahnya (autorefresh.js, tabel bot_packages / price_item). */
let cuBotPkgs = null, cuBotPkgsMissing = false, _botPkgLoading = null;
function ensureBotPkgs(force) {
    if (cuBotPkgs && !force) return Promise.resolve(cuBotPkgs);
    const hit = force ? null : ssCache.get("botpkg"); if (hit) { cuBotPkgs = hit; return Promise.resolve(cuBotPkgs); }
    if (!_botPkgLoading) _botPkgLoading = cuRpc("cu_bot_packages").then(({ data, error }) => {
        _botPkgLoading = null;
        if (error) { cuBotPkgsMissing = /does not exist|schema cache|Could not find the function/i.test(error.message || ""); return cuBotPkgs || []; }
        cuBotPkgs = data || []; ssCache.set("botpkg", cuBotPkgs, 10 * 60000); return cuBotPkgs;
    });
    return _botPkgLoading;
}
const botPkgOf = pro => (cuBotPkgs || []).find(k => k.proses === pro) || null;
const botProName = pro => (botPkgOf(pro) && botPkgOf(pro).nama) || (pro ? pro + " Request" : "");
/** harga per tagar untuk kombinasi proses + jenis (sudah termasuk harga custom pelanggan; dihitung ulang di server) */
const boPrice = (pro, pkg) => { const k = botPkgOf(pro); return Number(k && k.harga && k.harga[pkg]) || 0; };
const boNormal = (pro, pkg) => { const k = botPkgOf(pro); return Number(k && k.normal && k.normal[pkg]) || 0; };

async function openBotOrderModal() {
    cuPriceInfo = null;
    await Promise.all([ensurePriceInfo(), ensureBotPkgs()]);     // ketersediaan BEM/SEM/LEM + proses (cache)
    const pkgs = cuBotPkgs || [];
    const st = { pro: "", pkg: "" };       // 1 pesanan = 1 proses + 1 jenis
    $("modalBox").innerHTML = `
        <div class="rn-head"><div class="rn-icon">🤖</div>
            <div><div class="modal-title" style="margin:0">${escapeHtml(t("bo_title"))}</div><div class="rn-sub">${escapeHtml(t("bo_sub_proses"))}</div></div></div>
        <div class="rn-block"><label class="rn-label" for="boProses">${escapeHtml(t("bo_proses_label"))}</label>
            ${pkgs.length ? `<select id="boProses" class="bo-proses-select"><option value="" selected disabled>${escapeHtml(t("bo_proses_ph"))}</option>
                ${pkgs.map(k => `<option value="${escapeHtml(k.proses)}">${escapeHtml(k.nama)}</option>`).join("")}</select>`
                : `<div class="price-none">${escapeHtml(t(cuBotPkgsMissing ? "rn_err_not_ready" : "bo_proses_none"))}</div>`}
            <div class="bo-rules" id="boRules" style="display:none;"></div></div>
        <div class="rn-block"><div class="rn-label">${escapeHtml(t("bo_pkg"))}</div>
            <div class="rn-pkgs" id="boPkgs">${BO_PKGS.map(p => `<button type="button" class="rn-pkg" data-pkg="${p}" style="display:none;"><b>${p} Bot</b><small class="rn-pkg-price" id="boPP_${p}">-</small></button>`).join("")}</div>
            <div class="price-none" id="boPkgNone"></div></div>
        <div class="rn-block"><label class="rn-label" for="boTags">${escapeHtml(t("bo_tags_label"))} <span class="no-count" id="boCount"></span></label>
            <textarea id="boTags" class="no-area" rows="5" placeholder="${escapeHtml(t("bo_tag_ph"))}" autocomplete="off"></textarea>
            <div class="rn-hint">${escapeHtml(t("bo_tags_hint"))}</div></div>
        <div class="rn-block"><label class="rn-label" for="boNote">${escapeHtml(t("bo_note_label"))}</label><textarea id="boNote" class="no-area" rows="2" maxlength="500"></textarea></div>
        <div class="rn-block price-box"><div class="rn-label">💰 ${escapeHtml(t("bo_price_title"))}</div><div class="price-lines" id="boPriceLines"></div></div>
        <div class="rn-info">ℹ️ ${escapeHtml(t("bo_info"))}</div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" id="boNo">${escapeHtml(t("rn_cancel"))}</button><button type="button" class="btn btn-gold" id="boYes">${escapeHtml(t("bo_send"))}</button></div>`;
    $("modalOverlay").classList.add("show");

    const sync = () => {
        const k = botPkgOf(st.pro);
        // notes / rules dari admin untuk proses yang dipilih
        $("boRules").style.display = k && k.notes ? "block" : "none";
        $("boRules").innerHTML = k && k.notes ? `<div class="bo-rules-title">📋 ${escapeHtml(t("bo_proses_rules"))} · ${escapeHtml(k.nama)}</div><div class="bo-rules-body">${linkify(k.notes)}</div>` : "";
        // tombol BEM / SEM / LEM: HANYA kombinasi yang aktif untuk proses ini yang tampil
        // (cu_bot_packages hanya mengirim kombinasi aktif & berharga; ketersediaan diatur per kombinasi di admin)
        let nOk = 0;
        BO_PKGS.forEach(p => {
            const btn = $("boPkgs").querySelector(`[data-pkg="${p}"]`), pr = boPrice(st.pro, p), nm = boNormal(st.pro, p);
            const ok = !!st.pro && pr > 0; if (ok) nOk++;
            btn.style.display = ok ? "" : "none"; btn.disabled = !ok; btn.classList.toggle("on", ok && st.pkg === p);
            $("boPP_" + p).innerHTML = ok ? (nm > pr ? `<s>${fmtRp(nm)}</s> ` : "") + "<b>" + fmtRp(pr) + "</b>" + escapeHtml(t("bo_per_tag")) : "";
        });
        $("boPkgNone").textContent = !st.pro ? t("bo_err_proses") : nOk ? "" : t("bo_combo_none");
        $("boPkgNone").style.display = !st.pro || !nOk ? "block" : "none";
        if (st.pkg && !(boPrice(st.pro, st.pkg) > 0)) st.pkg = "";
        if (!st.pkg && nOk === 1) st.pkg = BO_PKGS.find(p => boPrice(st.pro, p) > 0);      // hanya 1 jenis aktif: langsung terpilih
        const n = parseTags($("boTags").value).length, p = st.pro && st.pkg ? boPrice(st.pro, st.pkg) : 0;
        $("boCount").textContent = n ? "· " + t("bo_tags_n", { n }) : "";
        $("boPriceLines").innerHTML = !st.pro ? `<div class="price-none">${escapeHtml(t("bo_err_proses"))}</div>`
            : !st.pkg ? `<div class="price-none">${escapeHtml(t(nOk ? "bo_err_pkg" : "bo_combo_none"))}</div>`
            : `<div class="price-row sub"><span>${escapeHtml(botProName(st.pro))} · ${st.pkg} — ${escapeHtml(t("bo_calc", { n: n || 0, p: fmtRp(p) }))}</span><span>${fmtRp(p * n)}</span></div>
               <div class="price-row total"><span>${escapeHtml(t("bo_total"))}</span><b>${fmtRp(p * n)}</b></div>${priceExtraHtml(p * n)}`;
        $("boYes").disabled = !(st.pro && st.pkg);
    };
    if ($("boProses")) $("boProses").addEventListener("change", e => { st.pro = e.target.value; sync(); });
    $("boPkgs").addEventListener("click", e => { const c = e.target.closest(".rn-pkg"); if (c && !c.disabled) { st.pkg = c.dataset.pkg; sync(); } });
    $("boTags").addEventListener("input", sync);
    $("boNo").addEventListener("click", closeModal);
    sync();

    $("boYes").addEventListener("click", async () => {
        const tags = parseTags($("boTags").value), note = $("boNote").value.trim();
        if (!st.pro) { showToast(t("bo_err_proses"), "danger"); return; }
        if (!st.pkg) { showToast(t("bo_err_pkg"), "danger"); return; }
        const p = boPrice(st.pro, st.pkg);
        if (!p) { showToast(t("bo_err_price"), "danger"); return; }
        if (!tags.length) { showToast(t("bo_err_tag"), "danger"); $("boTags").focus(); return; }
        if (tags.length > 500) { showToast(t("bo_err_max"), "danger"); return; }
        const total = p * tags.length, label = st.pkg + " Bot · " + botProName(st.pro);

        if (!(await coinConfirm({ pkg: st.pkg, jumlah: tags.length, total,
            lines: [[t("bo_proses_label"), botProName(st.pro)], [t("bo_pkg"), st.pkg + " Bot"], [t("bo_tags_label"), t("bo_tags_n", { n: tags.length })]],
            waText: (tot) => t("bo_wa_text", { pkg: label, n: tags.length, total: tot }) }))) return;

        const btn = $("boYes"); btn.disabled = true; btn.textContent = t("bo_sending");
        const { data, error } = await cuRpc("cu_request_bot_order", { p_dashboard: st.pkg, p_proses: st.pro, p_tagar_list: tags, p_catatan: note || null });
        if (error) {
            btn.disabled = false; btn.textContent = t("bo_send");
            const m = error.message || "";
            showToast(/does not exist|schema cache|Could not find the function/i.test(m) ? t("rn_err_not_ready") : (translateServerError(m) || t("rn_err_generic")), "danger");
            if (/Proses pengiriman|Harga Bot Order/.test(m)) { ssCache.del("botpkg"); ensureBotPkgs(true).then(sync); }      // pengaturan berubah: ambil ulang
            return;
        }
        loadBotOrders(); if (typeof loadCoin === "function") loadCoin();
        $("modalBox").innerHTML = `<div class="modal-icon success">🤖</div><div class="modal-title">${escapeHtml(t("bo_sent_title"))}</div>
            <div class="modal-sub">${escapeHtml(t("bo_sent_text", { n: data.jumlah, pkg: label, total: fmtRp(data.total) }))}</div>
            <div class="modal-actions"><button type="button" class="btn btn-primary" id="boDone">${escapeHtml(t("bo_close"))}</button></div>`;
        $("boDone").addEventListener("click", closeModal);
    });
}

/* ---------------- Daftar bot order pelanggan (tab "Bot Order") ---------------- */
let myBotOrders = [], botFilter = "aktif", botKind = "all";   // botKind: all | bot | bulk (dipisah supaya tidak tertukar)
let botPkg = "all";
let botPro = "all";            // proses pengiriman: all | 1F | 2F (Bulk & order lama tidak punya proses)
const botProOk = (r, p = botPro) => p === "all" || r.proses === p;            // jenis: all | BEM | SEM | LEM (pesanan Bulk tampil di setiap jenis yang ada tagarnya)
/* pencarian tagar MILIK SENDIRI: semua tagar diambil 1x saat mulai mencari (cu_my_bot_tags_all), lalu disaring di browser */
let botQ = "", botAllTags = null, botAllTagsSig = null, botTagsLoading = null, botSearchTimer = null;
const botNorm = v => String(v || "").trim().replace(/^#+/, "").toLowerCase();
const botPkgKey = p => p.toLowerCase();                       // BEM -> bem (kolom n_bem / tagar per jenis)
const botPkgOk = (r, p = botPkg) => p === "all" || r.dashboard === p || (r.dashboard === "BULK" && Number(r["n_" + botPkgKey(p)]) > 0);
const botTagOpen = new Set(), botTagCache = {};   // daftar tagar lengkap dimuat hanya saat dibuka (seperti di dashboard admin)
const botFlat = d => Array.isArray(d) ? d : [...(d.bem || []), ...(d.sem || []), ...(d.lem || [])];
const botState = r => r.status === "approved" ? (r.dikirim_at ? "sent" : "kirim") : r.status;

async function loadBotOrders() {
    if (!$("botOrderList")) return;
    const { data, error } = await cuRpc("cu_my_bot_orders");
    myBotOrders = (!error && data) ? data : [];
    // daftar tagar untuk pencarian dibuang bila pesanan berubah (diambil ulang hanya saat pelanggan mencari lagi)
    const sig = myBotOrders.map(r => r.id + ":" + r.jumlah).join(",");
    if (botAllTagsSig !== null && sig !== botAllTagsSig) { botAllTags = null; if (botQ) botEnsureTags(); }
    botAllTagsSig = sig;
    if (!error && typeof botDailyOrdersChanged === "function") botDailyOrdersChanged(myBotOrders);   // total per hari ikut diperbarui bila ada pesanan baru
    // batch: tagar MILIK SENDIRI ada berapa di batch berapa (tanpa SQL 23 -> kosong, tampilan lama tetap jalan)
    const b = await cuRpc("cu_my_bot_batches");
    botBatchInfo = {}; if (!b.error && b.data) b.data.forEach(x => { botBatchInfo[x.order_id] = x; });
    renderBotOrders();
}
let botBatchInfo = {};
/** chip rincian batch untuk satu pesanan */
function botBatchHtml(r) {
    const bi = botBatchInfo[r.id]; if (!bi || !bi.batches || !bi.batches.length) return "";
    return `<div class="bo-batches">` + bi.batches.map(x => {
        const done = x.sent >= x.n, part = x.sent > 0 && !done;
        // batch = null -> tagar yang sudah terkirim (sudah keluar dari antrian batch)
        const nm = escapeHtml(x.dashboard) + (x.proses ? " · " + escapeHtml(x.proses) : "");
        if (x.batch == null) return `<span class="bo-bchip done">${nm}: ${escapeHtml(t("bo_tags_n", { n: x.n }))} ✅</span>`;
        return `<span class="bo-bchip ${done ? "done" : part ? "part" : ""}">${nm} · ${escapeHtml(t("bb_batch"))} ${x.batch}: ${escapeHtml(t("bo_tags_n", { n: x.n }))} ${done ? "✅" : part ? "⏳ " + x.sent + "/" + x.n : "⏳"}</span>`;
    }).join("") + `</div>`;
}
function renderBotOrders() {
    const box = $("botOrderList"); if (!box) return;
    const loc = numLocale();
    const fmt = (iso, withTime) => new Date(iso).toLocaleString(loc, withTime ? { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "short" });
    const kindOk = r => botKind === "all" || (botKind === "bulk") === (r.dashboard === "BULK");
    document.querySelectorAll("#botKind button").forEach(b => b.classList.toggle("on", b.dataset.bk === botKind));
    const match = (r, f) => kindOk(r) && botPkgOk(r) && botProOk(r) && (f === "all" ? true : f === "arsip" ? !!r.arsip : !r.arsip);
    document.querySelectorAll("#botFilter button").forEach(b => { b.classList.toggle("on", b.dataset.bf === botFilter); b.querySelector("i").textContent = myBotOrders.filter(r => match(r, b.dataset.bf)).length; });
    document.querySelectorAll("#botPkg button").forEach(b => { b.classList.toggle("on", b.dataset.bp === botPkg); b.querySelector("i").textContent = myBotOrders.filter(r => kindOk(r) && botProOk(r) && botPkgOk(r, b.dataset.bp) && !r.arsip).length; });
    document.querySelectorAll("#botPro button").forEach(b => { b.classList.toggle("on", b.dataset.bpr === botPro); b.querySelector("i").textContent = myBotOrders.filter(r => kindOk(r) && botPkgOk(r) && botProOk(r, b.dataset.bpr) && !r.arsip).length; });

    // badge tab: pesanan yang masih berjalan (menunggu / disetujui belum dikirim)
    const open = myBotOrders.filter(r => !r.arsip && (r.status === "pending" || botState(r) === "kirim")).length, bd = $("botTabBadge");
    if (bd) { bd.textContent = open; bd.style.display = open ? "inline-block" : "none"; }

    // saat mencari: semua status (aktif & arsip) pada jenis yang dipilih
    const list = botQ ? myBotOrders.filter(r => kindOk(r) && botPkgOk(r) && botProOk(r) && botHit(r)) : myBotOrders.filter(r => match(r, botFilter));
    botSearchInfo(list.length);
    $("botEmpty").style.display = list.length || botQ ? "none" : "block";
    const stl = { pending: "bo_st_pending", kirim: "bo_st_kirim", sent: "bo_st_sent", rejected: "bo_st_rejected", cancelled: "co_st_cancelled" };
    box.innerHTML = list.map(r => { const k = botState(r), open = botTagOpen.has(r.id), bi = botBatchInfo[r.id];
        const partial = bi && k === "kirim" && bi.sent > 0 && bi.sent < bi.total;
        const stText = partial ? t("bb_partial", { a: bi.sent, b: bi.total }) : t(stl[k] || "bo_st_pending"); return `
        <div class="bo-item bo-s-${k}"><div><b>${r.dashboard === "BULK" ? "🧺 " + escapeHtml(t("bk_label")) : escapeHtml(r.dashboard) + " Bot"}</b>${r.proses ? ` <span class="bo-pkgchip bo-prochip">📨 ${escapeHtml(botProName(r.proses))}</span>` : ""}${r.dashboard === "BULK" && botPkg !== "all" ? ` <span class="bo-pkgchip">${escapeHtml(t("bo_pkg_tags", { pkg: botPkg, n: r["n_" + botPkgKey(botPkg)] }))}</span>` : ""} · <button type="button" class="bo-count" data-botags="${r.id}" aria-expanded="${open}" title="${escapeHtml(t("bo_tags_view"))}">${open ? "▾" : "▸"} ${escapeHtml(t("bo_tags_n", { n: r.jumlah }))}</button>${r.arsip ? ` <span class="bo-arch">🗂️ ${escapeHtml(t("bo_arch_tag"))}</span>` : ""}
            <div class="bo-item-sub">${r.dashboard === "BULK" ? `BEM ${r.n_bem} · SEM ${r.n_sem} · LEM ${r.n_lem}` : escapeHtml(r.tagar_pertama || "") + (r.jumlah > 1 ? " …" : "")} · ${fmt(r.created_at, false)}</div>
            ${r.dikirim_at ? `<div class="bo-item-sub">${escapeHtml(t("bo_sent_on", { d: fmt(r.dikirim_at, true) }))}</div>` : ""}
            ${r.catatan_admin ? `<div class="bo-item-sub">💬 ${escapeHtml(r.catatan_admin)}</div>` : ""}${botBatchHtml(r)}${(() => { const h = botQ && botHit(r); return typeof h === "string" ? `<div class="bo-hit">🔎 ${escapeHtml(h)}</div>` : ""; })()}</div>
            <div style="text-align:right;"><b>${fmtRp(r.total_harga)}</b><div class="bo-item-sub bo-st">${escapeHtml(stText)}</div>${r.status === "pending" && !r.arsip && typeof cuCancelBtn === "function" ? cuCancelBtn("bot", r.id, r.total_harga) : ""}</div></div>${open ? botTagsPanel(r) : ""}`; }).join("");
}
function botTagsPanel(r) {
    const d = botTagCache[r.id];
    if (!d) return `<div class="bo-tags-panel"><div class="bo-item-sub">${escapeHtml(t("bo_tags_loading"))}</div></div>`;
    const copyBtn = part => `<button type="button" class="btn btn-ghost mini" data-botcopy="${r.id}" data-part="${part}">📋 ${escapeHtml(t("bo_tags_copy"))}</button>`;
    if (Array.isArray(d)) return `<div class="bo-tags-panel"><div class="bo-tags-head"><b>${escapeHtml(t("bo_tags_n", { n: d.length }))}</b> ${copyBtn("all")}</div>
        <ol class="bo-tags">${d.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ol></div>`;
    const part = (k, name) => (d[k] || []).length ? `<div class="bo-bulk-part"><div class="bo-tags-head"><b>${name} · ${escapeHtml(t("bo_tags_n", { n: d[k].length }))}</b></div><ol class="bo-tags">${d[k].map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ol></div>` : "";
    return `<div class="bo-tags-panel"><div class="bo-tags-head"><b>${escapeHtml(t("bo_tags_n", { n: botFlat(d).length }))}</b> ${copyBtn("all")}</div>${part("bem", "BEM")}${part("sem", "SEM")}${part("lem", "LEM")}</div>`;
}
/* klik "N tagar" -> buka/tutup daftar tagar pesanan ini; tombol salin menyalin semuanya */
document.addEventListener("click", async (e) => {
    const c = e.target.closest("[data-botcopy]");
    if (c) { const d = botTagCache[Number(c.dataset.botcopy)]; if (d) _payCopy(botFlat(d).join("\n"), c); return; }
    const b = e.target.closest("[data-botags]"); if (!b) return;
    const id = Number(b.dataset.botags);
    if (botTagOpen.has(id)) { botTagOpen.delete(id); renderBotOrders(); return; }
    botTagOpen.add(id); renderBotOrders();
    if (!botTagCache[id] && botAllTags && botAllTags.has(id)) { botTagCache[id] = botTagsOf(id); renderBotOrders(); return; }   // sudah ada dari pencarian: tanpa request
    if (!botTagCache[id]) {
        const { data, error } = await cuRpc("cu_bot_tags", { p_id: id });
        if (error || !data) {
            botTagOpen.delete(id); renderBotOrders();
            const m = (error && error.message) || "";
            showToast(/does not exist|schema cache|Could not find the function/i.test(m) ? t("rn_err_not_ready") : t("bo_tags_err"), "danger");
            return;
        }
        botTagCache[id] = data; renderBotOrders();
    }
});
document.addEventListener("click", (e) => { const k = e.target.closest("#botKind button[data-bk]"); if (k) { botKind = k.dataset.bk; renderBotOrders(); } });
document.addEventListener("click", (e) => { const f = e.target.closest("#botFilter button[data-bf]"); if (f) { botFilter = f.dataset.bf; renderBotOrders(); } });
document.addEventListener("click", (e) => { const p = e.target.closest("#botPkg button[data-bp]"); if (p) { botPkg = p.dataset.bp; renderBotOrders(); } });
document.addEventListener("click", (e) => { const p = e.target.closest("#botPro button[data-bpr]"); if (p) { botPro = p.dataset.bpr; renderBotOrders(); } });
// nama proses untuk label daftar & Daftar Harga (1 request kecil, di-cache 10 menit)
document.addEventListener("DOMContentLoaded", () => { ensureBotPkgs().then(() => { renderBotOrders(); if (typeof renderPriceList === "function") renderPriceList(); }); });
document.addEventListener("input", (e) => {
    if (e.target.id !== "botSearch") return;
    clearTimeout(botSearchTimer);
    botSearchTimer = setTimeout(async () => { botQ = botNorm(e.target.value); if (botQ) await botEnsureTags(); renderBotOrders(); }, 400);
});

/* ---------------- Pencarian tagar ---------------- */
/** ambil semua tagar milik sendiri SEKALI (dipakai ulang sampai daftar pesanan berubah) */
function botEnsureTags() {
    if (botAllTags) return Promise.resolve(botAllTags);
    if (botTagsLoading) return botTagsLoading;
    botSearchInfo(null, "bo_search_loading");
    botTagsLoading = cuRpc("cu_my_bot_tags_all").then(({ data, error }) => {
        botTagsLoading = null;
        if (error) {
            const m = error.message || "";
            showToast(/does not exist|schema cache|Could not find the function/i.test(m) ? t("rn_err_not_ready") : t("bo_search_err"), "danger");
            return null;
        }
        botAllTags = new Map((data || []).map(x => [x.id, { bem: x.bem || [], sem: x.sem || [], lem: x.lem || [] }]));
        return botAllTags;
    });
    return botTagsLoading;
}
/** format sama dengan botTagCache: array (Bot Order) atau {bem, sem, lem} (Bulk) */
function botTagsOf(id) {
    const x = botAllTags && botAllTags.get(id), r = myBotOrders.find(o => o.id === id);
    if (!x || !r) return null;
    return r.dashboard === "BULK" ? x : (x[botPkgKey(r.dashboard)] || []);
}
/** tagar yang cocok pada jenis yang dipilih (string), atau null */
function botHit(r) {
    if (!botQ) return null;
    const x = botAllTags && botAllTags.get(r.id);
    let tags;
    if (x) tags = botPkg === "all" ? [...x.bem, ...x.sem, ...x.lem] : (x[botPkgKey(botPkg)] || []);
    else if (botTagCache[r.id]) { const d = botTagCache[r.id]; tags = Array.isArray(d) ? d : botPkg === "all" ? botFlat(d) : (d[botPkgKey(botPkg)] || []); }
    else tags = [r.tagar_pertama];                       // data lengkap belum ada
    return tags.find(tg => botNorm(tg).includes(botQ)) || null;
}
function botSearchInfo(n, key) {
    const el = $("botSearchInfo"); if (!el) return;
    if (key) { el.textContent = t(key); el.style.display = "block"; return; }
    if (!botQ) { el.style.display = "none"; return; }
    el.textContent = n ? "🔎 " + t("bo_search_n", { n }) : t("bo_search_none");
    el.style.display = "block";
}
document.addEventListener("click", (e) => { if (e.target.closest("[data-bot-order]")) openBotOrderModal(); });
document.addEventListener("DOMContentLoaded", () => { loadBotOrders(); pollVisible(() => { if (!window.__syncActive) loadBotOrders(); }, 5 * 60000); });   // diperbarui auto-refresh; cadangan 5 menit (dulu tiap 1 menit)
document.addEventListener("langchange", renderBotOrders);


Object.assign(TRANSLATIONS.id, { bb_batch: "Batch", bb_partial: "Terkirim sebagian ({a}/{b} tagar)" });
Object.assign(TRANSLATIONS.en, { bb_batch: "Batch", bb_partial: "Partially sent ({a}/{b} tags)" });

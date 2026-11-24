/**
 * TOTAL TAGAR PER HARI (pelanggan) — tab Bot Order. Butuh migrations/003_cu_bot_daily.sql.
 * Angka dihitung di database (cu_bot_daily, group by tanggal); browser hanya menerima 1 baris per hari.
 * Dimuat saat tab Bot Order pertama kali dibuka, saat rentang hari diganti, dan saat daftar pesanan berubah.
 * Tidak ikut polling berkala.
 */
Object.assign(TRANSLATIONS.id, { bd_title: "Total Tagar per Hari", bd_days: "{n} hari", bd_total: "Total", bd_orders: "{n} pesanan", bd_empty: "Belum ada bot order pada rentang ini.", bd_note: "Pesanan yang ditolak tidak dihitung.", bd_err: "Gagal memuat total harian" });
Object.assign(TRANSLATIONS.en, { bd_title: "Tags per Day", bd_days: "{n} days", bd_total: "Total", bd_orders: "{n} orders", bd_empty: "No bot orders in this period.", bd_note: "Rejected orders are not counted.", bd_err: "Failed to load daily totals" });
if (TRANSLATIONS.vi) Object.assign(TRANSLATIONS.vi, { bd_title: "Tổng thẻ mỗi ngày", bd_days: "{n} ngày", bd_total: "Tổng", bd_orders: "{n} đơn", bd_empty: "Không có bot order trong khoảng này.", bd_note: "Đơn bị từ chối không được tính.", bd_err: "Không tải được tổng theo ngày" });
if (TRANSLATIONS.ar) Object.assign(TRANSLATIONS.ar, { bd_title: "إجمالي الوسوم يوميًا", bd_days: "{n} أيام", bd_total: "الإجمالي", bd_orders: "{n} طلبات", bd_empty: "لا توجد طلبات بوت في هذه الفترة.", bd_note: "الطلبات المرفوضة غير محسوبة.", bd_err: "تعذر تحميل الإجمالي اليومي" });
if (TRANSLATIONS.tr) Object.assign(TRANSLATIONS.tr, { bd_title: "Günlük Toplam Etiket", bd_days: "{n} gün", bd_total: "Toplam", bd_orders: "{n} sipariş", bd_empty: "Bu aralıkta bot siparişi yok.", bd_note: "Reddedilen siparişler sayılmaz.", bd_err: "Günlük toplamlar yüklenemedi" });

const BD = { days: 7, rows: null, loading: false, seq: 0, sig: null, pkg: "all" };   // pkg: all | BEM | SEM | LEM (hanya ganti tampilan, tanpa request)
const BD_RANGES = [7, 14, 30];

async function loadBotDaily() {
    if (!$("botDaily")) return;
    const seq = ++BD.seq; BD.loading = true; renderBotDaily();
    const { data, error } = await cuRpc("cu_bot_daily", { p_days: BD.days });
    if (seq !== BD.seq) return;                      // rentang sudah diganti lagi
    BD.loading = false; BD.rows = error ? "error" : (data || []);
    renderBotDaily();
}
function renderBotDaily() {
    const box = $("botDaily"); if (!box) return;
    const loc = typeof numLocale === "function" ? numLocale() : "id-ID";
    const raw = Array.isArray(BD.rows) ? BD.rows : [];
    const perPkg = raw.length > 0 && "bem" in raw[0];                  // migrasi 006 sudah dijalankan
    if (!perPkg) BD.pkg = "all";
    const k = BD.pkg.toLowerCase();
    const rows = raw.map(r => BD.pkg === "all" ? r : { tanggal: r.tanggal, tagar: r[k], pesanan: r["p_" + k] });
    const total = rows.reduce((a, r) => a + Number(r.tagar || 0), 0), totalOrd = rows.reduce((a, r) => a + Number(r.pesanan || 0), 0);
    const max = Math.max(1, ...rows.map(r => Number(r.tagar || 0)));
    const perPro = raw.length > 0 && "1f" in raw[0];                  // migrasi 009 sudah dijalankan
    if (!perPro && (BD.pkg === "1F" || BD.pkg === "2F")) BD.pkg = "all";
    const pkgTabs = perPkg ? `<div class="filter-tabs" id="bdPkg">${["all", "BEM", "SEM", "LEM", ...(perPro ? ["1F", "2F"] : [])].map(p => `<button type="button" data-bdp="${p}" class="${BD.pkg === p ? "on" : ""}">${p === "all" ? escapeHtml(t("filter_all")) : p}</button>`).join("")}</div>` : "";
    const day = d => new Date(d + "T00:00:00").toLocaleDateString(loc, { weekday: "short", day: "2-digit", month: "short" });
    let body;
    if (BD.rows === null) body = `<div class="bd-empty">…</div>`;
    else if (BD.rows === "error") body = `<div class="bd-empty">⚠ ${escapeHtml(t("bd_err"))}</div>`;
    else if (!total) body = `<div class="bd-empty">${escapeHtml(t("bd_empty"))}</div>`;
    else body = `<ol class="bd-list">${rows.map(r => `<li class="${r.tagar ? "" : "zero"}">
            <span class="bd-date">${escapeHtml(day(r.tanggal))}</span>
            <span class="bd-bar"><i style="width:${Math.round(Number(r.tagar || 0) / max * 100)}%"></i></span>
            <span class="bd-num"><b>${escapeHtml(t("bo_tags_n", { n: fmtNum(r.tagar) }))}</b>${r.pesanan ? `<small>${escapeHtml(t("bd_orders", { n: fmtNum(r.pesanan) }))}</small>` : ""}</span></li>`).join("")}</ol>`;
    box.innerHTML = `<div class="panel-title">📊 ${escapeHtml(t("bd_title"))}
            <span class="bd-sum">${escapeHtml(t("bd_total"))}: <b>${escapeHtml(t("bo_tags_n", { n: fmtNum(total) }))}</b> · ${escapeHtml(t("bd_orders", { n: fmtNum(totalOrd) }))}</span></div>
        ${pkgTabs}
        <div class="filter-tabs" id="bdRange">${BD_RANGES.map(n => `<button type="button" data-bd="${n}" class="${BD.days === n ? "on" : ""}" ${BD.loading ? "disabled" : ""}>${escapeHtml(t("bd_days", { n }))}</button>`).join("")}</div>
        ${body}
        <div class="bd-note">${escapeHtml(t("bd_note"))}</div>`;
}
/* dipanggil dari loadBotOrders: muat ulang total harian hanya bila daftar pesanan benar-benar berubah */
function botDailyOrdersChanged(list) {
    const sig = (list || []).map(r => r.id + ":" + r.status).join(",");
    const changed = BD.sig !== null && sig !== BD.sig;
    BD.sig = sig;
    if (changed && BD.rows !== null) loadBotDaily();
}

document.addEventListener("click", e => {
    const b = e.target.closest("#bdRange button[data-bd]");
    if (b && !BD.loading) { BD.days = Number(b.dataset.bd); loadBotDaily(); return; }
    const pk = e.target.closest("#bdPkg button[data-bdp]");
    if (pk) { BD.pkg = pk.dataset.bdp; renderBotDaily(); return; }
    // pertama kali tab Bot Order dibuka -> muat
    if (e.target.closest('#pTabs button[data-ptab="bot"]') && BD.rows === null && !BD.loading) loadBotDaily();
});
document.addEventListener("langchange", renderBotDaily);

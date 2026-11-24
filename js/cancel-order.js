/**
 * BATAL ORDER (pelanggan) — semua jenis order yang masih menunggu: Bot/Bulk, Pesanan Baru/Perpanjang,
 * Katalog (Koin/Voucher), Pre Order, Supply, Top Up. Butuh migrations/004_cu_cancel_order.sql.
 * Selalu lewat dialog konfirmasi. Status menjadi "cancelled" (data tidak dihapus); koin dikembalikan oleh server.
 * Kepemilikan & status dicek di database (cu_cancel_order), tombol di sini hanya tampilan.
 *
 * Pemakaian di HTML: <button data-cocancel="bot:12" data-refund="5000">…</button>
 */
Object.assign(TRANSLATIONS.id, {
    co_cancel_btn: "Batalkan", co_cancel_title: "Batalkan pesanan?", co_cancel_body: "Pesanan ini dibatalkan dan tidak akan diproses admin. Tindakan ini tidak bisa diurungkan.",
    co_cancel_refund: "🪙 {n} koin dikembalikan ke saldo Anda.", co_cancel_yes: "Ya, batalkan", co_cancel_no: "Tidak",
    co_cancelled_ok: "Pesanan dibatalkan", co_cancelled_refund: "Pesanan dibatalkan, {n} koin dikembalikan", co_cancel_err: "Gagal membatalkan: {m}",
    co_st_cancelled: "🚫 Dibatalkan", rq_cancel_title: "Batalkan request ini?",
    rn_status_cancelled: "Dibatalkan", supply_status_cancelled: "Dibatalkan"
});
Object.assign(TRANSLATIONS.en, {
    co_cancel_btn: "Cancel", co_cancel_title: "Cancel this order?", co_cancel_body: "This order will be cancelled and will not be processed by the admin. This cannot be undone.",
    co_cancel_refund: "🪙 {n} coins will be refunded to your balance.", co_cancel_yes: "Yes, cancel", co_cancel_no: "No",
    co_cancelled_ok: "Order cancelled", co_cancelled_refund: "Order cancelled, {n} coins refunded", co_cancel_err: "Could not cancel: {m}",
    co_st_cancelled: "🚫 Cancelled", rq_cancel_title: "Cancel this request?",
    rn_status_cancelled: "Cancelled", supply_status_cancelled: "Cancelled"
});
if (TRANSLATIONS.vi) Object.assign(TRANSLATIONS.vi, {
    co_cancel_btn: "Hủy", co_cancel_title: "Hủy đơn này?", co_cancel_body: "Đơn sẽ bị hủy và admin sẽ không xử lý. Không thể hoàn tác.",
    co_cancel_refund: "🪙 {n} xu sẽ được hoàn vào số dư của bạn.", co_cancel_yes: "Có, hủy", co_cancel_no: "Không",
    co_cancelled_ok: "Đã hủy đơn", co_cancelled_refund: "Đã hủy đơn, hoàn {n} xu", co_cancel_err: "Không hủy được: {m}",
    co_st_cancelled: "🚫 Đã hủy", rq_cancel_title: "Hủy yêu cầu này?",
    rn_status_cancelled: "Đã hủy", supply_status_cancelled: "Đã hủy"
});
if (TRANSLATIONS.ar) Object.assign(TRANSLATIONS.ar, {
    co_cancel_btn: "إلغاء", co_cancel_title: "إلغاء هذا الطلب؟", co_cancel_body: "سيتم إلغاء الطلب ولن يعالجه المشرف. لا يمكن التراجع.",
    co_cancel_refund: "🪙 ستُعاد {n} عملة إلى رصيدك.", co_cancel_yes: "نعم، ألغِ", co_cancel_no: "لا",
    co_cancelled_ok: "تم إلغاء الطلب", co_cancelled_refund: "تم إلغاء الطلب وإعادة {n} عملة", co_cancel_err: "تعذر الإلغاء: {m}",
    co_st_cancelled: "🚫 ملغى", rq_cancel_title: "إلغاء هذا الطلب؟",
    rn_status_cancelled: "ملغى", supply_status_cancelled: "ملغى"
});
if (TRANSLATIONS.tr) Object.assign(TRANSLATIONS.tr, {
    co_cancel_btn: "İptal et", co_cancel_title: "Sipariş iptal edilsin mi?", co_cancel_body: "Sipariş iptal edilir ve yönetici tarafından işlenmez. Bu işlem geri alınamaz.",
    co_cancel_refund: "🪙 {n} jeton bakiyenize iade edilir.", co_cancel_yes: "Evet, iptal et", co_cancel_no: "Hayır",
    co_cancelled_ok: "Sipariş iptal edildi", co_cancelled_refund: "Sipariş iptal edildi, {n} jeton iade edildi", co_cancel_err: "İptal edilemedi: {m}",
    co_st_cancelled: "🚫 İptal edildi", rq_cancel_title: "Bu talep iptal edilsin mi?",
    rn_status_cancelled: "İptal edildi", supply_status_cancelled: "İptal edildi"
});

/** tombol Batalkan (kosong di mode lihat admin) */
function cuCancelBtn(kind, id, refund, cls) {
    if (typeof isAdminView === "function" && isAdminView()) return "";
    return `<button type="button" class="btn btn-ghost mini co-cancel ${cls || ""}" data-cocancel="${kind}:${id}" data-refund="${Number(refund) || 0}">✖ ${escapeHtml(t("co_cancel_btn"))}</button>`;
}

/** dialog konfirmasi umum (dipakai juga untuk request langganan) */
function cuConfirm({ title, body, yes, onYes }) {
    $("modalBox").innerHTML = `<div class="modal-title">${escapeHtml(title)}</div>
        <div class="modal-sub">${body}</div>
        <button type="button" class="btn btn-danger btn-block" id="coYes">${escapeHtml(yes || t("co_cancel_yes"))}</button>
        <button type="button" class="btn btn-ghost btn-block" id="coNo" style="margin-top:8px">${escapeHtml(t("co_cancel_no"))}</button>`;
    $("modalOverlay").classList.add("show");
    $("coNo").addEventListener("click", closeModal);
    $("coYes").addEventListener("click", async e => {
        const btn = e.currentTarget; if (btn.disabled) return;
        btn.disabled = true; btn.textContent = "…";
        try { await onYes(); } finally { closeModal(); }
    });
}

/* muat ulang daftar yang terpengaruh setelah batal */
const CO_RELOAD = {
    bot: () => typeof loadBotOrders === "function" && loadBotOrders(),
    renewal: () => typeof loadRenewals === "function" && loadRenewals(),
    catalog: () => typeof loadCatalog === "function" && loadCatalog(),
    preorder: () => typeof loadCatalog === "function" && loadCatalog(),
    supply: () => typeof loadSupply === "function" && loadSupply(),
    topup: () => {}
};

function cuAskCancel(kind, id, refund) {
    cuConfirm({
        title: t("co_cancel_title"),
        body: escapeHtml(t("co_cancel_body")) + (refund > 0 ? `<br><b>${escapeHtml(t("co_cancel_refund", { n: fmtNum(refund) }))}</b>` : ""),
        onYes: async () => {
            const { data, error } = await cuRpc("cu_cancel_order", { p_kind: kind, p_id: id });
            if (error) {
                const m = (typeof translateServerError === "function" && translateServerError(error.message || "")) || error.message || "";
                showToast(t("co_cancel_err", { m }), "danger");
            } else {
                const n = Number(data && data.refund) || 0;
                showToast(n > 0 ? t("co_cancelled_refund", { n: fmtNum(n) }) : t("co_cancelled_ok"), "success");
            }
            // tetap muat ulang walau gagal (mis. admin baru saja memprosesnya) supaya status terbaru tampil
            (CO_RELOAD[kind] || (() => {}))();
            if (typeof loadCoin === "function") loadCoin();
        }
    });
}

document.addEventListener("click", e => {
    const b = e.target.closest("[data-cocancel]"); if (!b) return;
    e.preventDefault(); e.stopPropagation();           // jangan ikut membuka/menutup <details>
    const [kind, id] = b.dataset.cocancel.split(":");
    cuAskCancel(kind, Number(id), Number(b.dataset.refund) || 0);
});

/**
 * REQUEST LANGGANAN (pelanggan) — ajukan Tunda / Aktifkan kembali / Arsipkan untuk langganan harian. Butuh sql/koin-usdt-20-request-langganan.sql.
 * Tombol "📨 Request" ada di tiap langganan (tabel & box). Status request tampil di tab "📨 Request" (di samping tab Ditunda).
 */
Object.assign(TRANSLATIONS.id, {
    rq_btn: "Request", rq_tab: "Request", rq_title: "Request untuk langganan", rq_sub: "Admin akan memeriksa dan menyetujui request Anda.",
    rq_hold: "⏸ Tunda langganan", rq_activate: "▶ Aktifkan kembali", rq_archive: "📥 Arsipkan langganan", rq_note: "Catatan untuk admin (opsional)",
    rq_send: "Kirim Request", rq_sent: "Request terkirim, menunggu admin", rq_pending: "⏳ Request: {a}", rq_cancel: "Batalkan",
    rq_cancelled_ok: "Request dibatalkan", rq_st_pending: "Menunggu", rq_st_approved: "Disetujui", rq_st_rejected: "Ditolak", rq_st_cancelled: "Dibatalkan",
    rq_j_hold: "Tunda", rq_j_activate: "Aktifkan kembali", rq_j_archive: "Arsipkan", empty_req_title: "Belum ada request", empty_req_sub: "Gunakan tombol Request pada langganan untuk menunda, mengaktifkan kembali, atau mengarsipkan.",
    rq_admin_note: "Catatan admin", rq_hold_info: "Pengiriman harian dihentikan sementara sampai Anda aktifkan kembali.", rq_archive_info: "Langganan dipindahkan ke Arsip (riwayat) walau belum selesai."
});
Object.assign(TRANSLATIONS.en, {
    rq_btn: "Request", rq_tab: "Requests", rq_title: "Request for subscription", rq_sub: "The admin will review and approve your request.",
    rq_hold: "⏸ Put on hold", rq_activate: "▶ Reactivate", rq_archive: "📥 Archive subscription", rq_note: "Note for admin (optional)",
    rq_send: "Send Request", rq_sent: "Request sent, waiting for admin", rq_pending: "⏳ Request: {a}", rq_cancel: "Cancel",
    rq_cancelled_ok: "Request cancelled", rq_st_pending: "Pending", rq_st_approved: "Approved", rq_st_rejected: "Rejected", rq_st_cancelled: "Cancelled",
    rq_j_hold: "Hold", rq_j_activate: "Reactivate", rq_j_archive: "Archive", empty_req_title: "No requests yet", empty_req_sub: "Use the Request button on a subscription to hold, reactivate, or archive it.",
    rq_admin_note: "Admin note", rq_hold_info: "Daily delivery is paused until you reactivate it.", rq_archive_info: "The subscription moves to the Archive (history) even if it is not finished."
});
Object.assign(SERVER_ERROR_MAP, {
    "Masih ada request untuk langganan ini yang menunggu admin": "rq_err_dup", "Langganan ini sudah ditunda": "rq_err_held", "Langganan ini sudah aktif": "rq_err_active"
});
Object.assign(TRANSLATIONS.id, { rq_err_dup: "Masih ada request untuk langganan ini yang menunggu admin", rq_err_held: "Langganan ini sudah ditunda", rq_err_active: "Langganan ini sudah aktif" });
Object.assign(TRANSLATIONS.en, { rq_err_dup: "There is already a pending request for this subscription", rq_err_held: "This subscription is already on hold", rq_err_active: "This subscription is already active" });

let myOrderReqs = [];
const rqPendingOf = id => myOrderReqs.find(r => r.order_id === id && r.status === "pending");
const rqJenisLabel = j => t("rq_j_" + j);

async function loadOrderRequests() {
    const { data, error } = await cuRpc("cu_my_order_requests");
    myOrderReqs = error ? [] : (data || []);
    const c = document.getElementById("fcReq"); if (c) c.textContent = myOrderReqs.filter(r => r.status === "pending").length;
}
/** tombol / status request di tiap langganan (dipanggil dashboard.js) */
function reqButtonHtml(o) {
    if (typeof isAdminView === "function" && isAdminView()) return "";
    const p = rqPendingOf(o.id);
    return p ? `<span class="req-pending">${escapeHtml(t("rq_pending", { a: rqJenisLabel(p.jenis) }))}</span>`
             : `<button type="button" class="btn btn-ghost req-btn" data-reqorder="${o.id}">📨 ${escapeHtml(t("rq_btn"))}</button>`;
}
function openOrderRequestModal(id) {
    const o = allOrders.find(x => x.id === id); if (!o) return;
    const opts = [o.hold ? ["activate", t("rq_activate"), ""] : ["hold", t("rq_hold"), t("rq_hold_info")], ["archive", t("rq_archive"), t("rq_archive_info")]];
    $("modalBox").innerHTML = `
        <div class="rn-head"><div class="rn-icon">📨</div><div><div class="modal-title" style="margin:0">${escapeHtml(t("rq_title"))}</div>
            <div class="rn-sub"><b>${escapeHtml(o.tagar)}</b> · ${escapeHtml(o.dashboard)}</div></div></div>
        <div class="rn-hint" style="margin-bottom:8px;">${escapeHtml(t("rq_sub"))}</div>
        <div class="rq-opts">${opts.map(([k, l, d], i) => `<label class="rq-opt"><input type="radio" name="rqJenis" value="${k}" ${i === 0 ? "checked" : ""}> <span><b>${escapeHtml(l)}</b>${d ? `<small>${escapeHtml(d)}</small>` : ""}</span></label>`).join("")}</div>
        <div class="rn-block"><label class="rn-label" for="rqNote">${escapeHtml(t("rq_note"))}</label><textarea id="rqNote" class="no-area" rows="2" maxlength="300"></textarea></div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" id="rqNo">${escapeHtml(t("rn_cancel"))}</button><button type="button" class="btn btn-gold" id="rqYes">${escapeHtml(t("rq_send"))}</button></div>`;
    $("modalOverlay").classList.add("show");
    $("rqNo").addEventListener("click", closeModal);
    $("rqYes").addEventListener("click", async () => {
        const jenis = document.querySelector('input[name="rqJenis"]:checked').value, btn = $("rqYes"); btn.disabled = true;
        const { error } = await cuRpc("cu_request_order_action", { p_order_id: id, p_jenis: jenis, p_catatan: $("rqNote").value.trim() || null });
        if (error) {
            btn.disabled = false; const m = error.message || "";
            showToast(/does not exist|schema cache|Could not find the function/i.test(m) ? t("rn_err_not_ready") : (translateServerError(m) || t("rn_err_generic")), "danger"); return;
        }
        closeModal(); showToast(t("rq_sent"), "success"); await loadOrderRequests(); renderOrders();
    });
}
/** isi tab "Request": riwayat request pelanggan */
function renderRequestsList(list, empty) {
    document.getElementById("tagSearchResult").style.display = "none";
    if (!myOrderReqs.length) {
        const ti = document.getElementById("emptyTitle"), su = document.getElementById("emptySub");
        ti.dataset.i18n = "empty_req_title"; su.dataset.i18n = "empty_req_sub"; ti.textContent = t("empty_req_title"); su.textContent = t("empty_req_sub");
        empty.style.display = "block"; return;
    }
    empty.style.display = "none";
    const cls = { pending: "badge-hold", approved: "badge-ok", rejected: "badge-bad", cancelled: "badge-hold" };
    list.innerHTML = `<div class="order-box-list">` + myOrderReqs.map(r => `<div class="order-card req-card">
        <div class="row1"><span class="tagar-name">${escapeHtml(r.tagar || "-")}</span><span class="dash-chip">${escapeHtml(r.dashboard || "")}</span></div>
        <div class="row2"><span><b>${escapeHtml(rqJenisLabel(r.jenis))}</b> · ${fmtDate(r.created_at)}</span><span class="badge ${cls[r.status] || ""}">${escapeHtml(t("rq_st_" + r.status))}</span></div>
        ${r.catatan ? `<div class="rn-hint" style="margin-top:6px;">📝 ${escapeHtml(r.catatan)}</div>` : ""}
        ${r.catatan_admin ? `<div class="rn-hint" style="margin-top:6px;">💬 ${escapeHtml(t("rq_admin_note"))}: ${escapeHtml(r.catatan_admin)}</div>` : ""}
        ${r.status === "pending" && !(typeof isAdminView === "function" && isAdminView()) ? `<div class="renew-row"><button type="button" class="btn btn-ghost" data-reqcancel="${r.id}">${escapeHtml(t("rq_cancel"))}</button></div>` : ""}
    </div>`).join("") + `</div>`;
}
document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-reqorder]"); if (b) { openOrderRequestModal(Number(b.dataset.reqorder)); return; }
    const c = e.target.closest("[data-reqcancel]");
    if (c) {
        const { error } = await cuRpc("cu_cancel_order_request", { p_id: Number(c.dataset.reqcancel) });
        if (error) { showToast(translateServerError(error.message || "") || t("rn_err_generic"), "danger"); return; }
        showToast(t("rq_cancelled_ok"), "success"); await loadOrderRequests(); renderOrders();
    }
});

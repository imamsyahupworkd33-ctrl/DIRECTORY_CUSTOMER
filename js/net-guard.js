/**
 * Cegah request ganda di portal pelanggan: fungsi pemuat data dibungkus dedupeAsync (js/common.js).
 * Bila sebuah pemuat dipanggil lagi saat masih berjalan (klik cepat, auto-refresh + polling bersamaan),
 * tidak ada request baru; pemuat dijalankan sekali lagi setelah selesai supaya data tetap terbaru.
 * Dimuat PALING AKHIR, sebelum DOMContentLoaded, jadi semua pemanggilan memakai versi yang dibungkus.
 */
["loadMyOrders", "loadBotOrders", "loadCatalog", "loadSupply", "loadCoin", "loadRenewals",
 "loadOrderRequests", "loadAnnouncements", "loadArchiveNotice", "loadPanel", "loadBotDaily"].forEach(name => {
    if (typeof window[name] === "function" && !window[name]._raw) window[name] = dedupeAsync(window[name]);
});

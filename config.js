module.exports = {
    // Konfigurasi bot
    botName: "My Store Bot",
    ownerNumber: "62812xxxxxxx",
    storeName: "My Online Store",
    
    // Konfigurasi pesan
    messages: {
        welcome: "🛍️ *Selamat datang di {storeName}!*\n\nSilakan pilih menu:",
        menu: "📋 *MENU UTAMA*\n\n1. 🛒 Lihat Produk\n2. 🔍 Cari Produk\n3. 📦 Pesanan Saya\n4. ℹ️ Bantuan\n5. 👤 Profil",
        help: "🆘 *BANTUAN*\n\nKetik:\n• *menu* - Menu utama\n• *produk* - Lihat produk\n• *cari [nama]* - Cari produk\n• *pesanan* - Lihat pesanan\n• *bantuan* - Bantuan",
        productList: "📦 *DAFTAR PRODUK*\n\n",
        orderConfirmed: "✅ *PESANAN DITERIMA!*\n\nPesanan Anda sedang diproses.",
        outOfStock: "❌ Produk tidak tersedia.",
        invalidInput: "❌ Input tidak valid."
    }
};

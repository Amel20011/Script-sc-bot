const config = require('./config');
const products = require('./products');
const orders = require('./orders');

// State untuk setiap user
const userStates = {};

// Fungsi untuk mereset state user
function resetUserState(userId) {
    userStates[userId] = {
        menu: 'main',
        cart: [],
        currentProduct: null,
        checkoutStep: null
    };
}

// Handler pesan masuk
async function handleMessage(sock, message) {
    const from = message.key.remoteJid;
    const text = message.message.conversation || 
                 message.message.extendedTextMessage?.text || 
                 message.message.buttonsResponseMessage?.selectedButtonId || 
                 message.message.listResponseMessage?.singleSelectReply.selectedRowId || 
                 '';
    
    // Inisialisasi state jika belum ada
    if (!userStates[from]) {
        resetUserState(from);
    }
    
    const state = userStates[from];
    const userMessage = text.toLowerCase().trim();
    
    // Handler untuk command
    if (userMessage === 'menu' || userMessage === 'halo' || userMessage === 'hi' || userMessage === 'hello') {
        await sendMainMenu(sock, from);
        resetUserState(from);
    }
    else if (userMessage === 'produk' || userMessage === '1' || userMessage === 'lihat produk') {
        await sendProductCategories(sock, from);
    }
    else if (userMessage === 'cari' || userMessage === '2') {
        await sock.sendMessage(from, { 
            text: "🔍 *CARI PRODUK*\n\nKetik: *cari [nama produk]*\nContoh: *cari sepatu*" 
        });
    }
    else if (userMessage.startsWith('cari ')) {
        const searchTerm = userMessage.substring(5);
        await searchProducts(sock, from, searchTerm);
    }
    else if (userMessage === 'pesanan' || userMessage === '3' || userMessage === 'pesanan saya') {
        await showUserOrders(sock, from);
    }
    else if (userMessage === 'bantuan' || userMessage === '4' || userMessage === 'help') {
        await sock.sendMessage(from, { text: config.messages.help });
    }
    else if (userMessage === 'profil' || userMessage === '5') {
        await sock.sendMessage(from, { 
            text: `👤 *PROFIL*\n\nNomor: ${from}\nStatus: Customer\nTotal Pesanan: ${orders.getUserOrders(from).length}` 
        });
    }
    else if (userMessage === 'keranjang' || userMessage === 'cart') {
        await showCart(sock, from, state);
    }
    else if (userMessage === 'checkout' || userMessage === 'bayar') {
        await startCheckout(sock, from, state);
    }
    else if (userMessage === 'batal') {
        resetUserState(from);
        await sock.sendMessage(from, { text: "❌ Transaksi dibatalkan. Ketik *menu* untuk kembali." });
    }
    else if (state.checkoutStep) {
        await handleCheckoutStep(sock, from, state, userMessage);
    }
    else if (state.menu === 'product_detail') {
        await handleProductSelection(sock, from, state, userMessage);
    }
    else if (userMessage.startsWith('beli ')) {
        const productId = userMessage.substring(5).toUpperCase();
        await handleBuyProduct(sock, from, productId);
    }
    else {
        // Default response
        await sendMainMenu(sock, from);
    }
}

// Fungsi untuk mengirim menu utama
async function sendMainMenu(sock, to) {
    const message = config.messages.welcome.replace('{storeName}', config.storeName) + 
                   '\n\n' + config.messages.menu;
    
    await sock.sendMessage(to, { 
        text: message,
        footer: config.botName,
        buttons: [
            { buttonId: 'produk', buttonText: { displayText: '🛒 Lihat Produk' }, type: 1 },
            { buttonId: 'cari', buttonText: { displayText: '🔍 Cari Produk' }, type: 1 },
            { buttonId: 'pesanan', buttonText: { displayText: '📦 Pesanan Saya' }, type: 1 }
        ],
        headerType: 1
    });
}

// Fungsi untuk mengirim kategori produk
async function sendProductCategories(sock, to) {
    let message = "📁 *KATEGORI PRODUK*\n\n";
    products.categories.forEach((cat, index) => {
        const productCount = products.getProducts(cat.id).length;
        message += `${index + 1}. ${cat.name} (${productCount} produk)\n`;
    });
    
    await sock.sendMessage(to, {
        text: message + "\nKetik angka atau nama kategori untuk melihat produk.",
        footer: "Contoh: ketik '1' atau 'fashion'",
        buttons: [
            { buttonId: 'fashion', buttonText: { displayText: '👕 Fashion' }, type: 1 },
            { buttonId: 'elektronik', buttonText: { displayText: '📱 Elektronik' }, type: 1 },
            { buttonId: 'buku', buttonText: { displayText: '📚 Buku' }, type: 1 }
        ]
    });
}

// Fungsi untuk menampilkan produk berdasarkan kategori
async function showProductsByCategory(sock, to, category) {
    const productList = products.getProducts(category);
    
    if (productList.length === 0) {
        await sock.sendMessage(to, { text: "❌ Tidak ada produk dalam kategori ini." });
        return;
    }
    
    let message = `📦 *PRODUK ${category.toUpperCase()}*\n\n`;
    
    // Batasi maksimal 10 produk untuk ditampilkan
    const displayProducts = productList.slice(0, 10);
    
    displayProducts.forEach((product, index) => {
        message += `${index + 1}. *${product.name}*\n   💰 Rp ${product.price.toLocaleString()}\n   📦 Stock: ${product.stock}\n   ID: ${product.id}\n\n`;
    });
    
    message += "\nKetik *beli [ID]* untuk membeli.\nContoh: *beli PRD001*";
    
    if (productList.length > 10) {
        message += `\n\nDan ${productList.length - 10} produk lainnya...`;
    }
    
    await sock.sendMessage(to, { text: message });
}

// Fungsi untuk mencari produk
async function searchProducts(sock, to, searchTerm) {
    const allProducts = products.getProducts();
    const results = allProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (results.length === 0) {
        await sock.sendMessage(to, { 
            text: `❌ Tidak ditemukan produk dengan kata kunci "${searchTerm}"` 
        });
        return;
    }
    
    let message = `🔍 *HASIL PENCARIAN: "${searchTerm}"*\n\n`;
    
    results.forEach((product, index) => {
        message += `${index + 1}. *${product.name}*\n   💰 Rp ${product.price.toLocaleString()}\n   📦 Stock: ${product.stock}\n   🏷️ ${product.category}\n   ID: ${product.id}\n\n`;
    });
    
    message += "\nKetik *beli [ID]* untuk membeli.\nContoh: *beli PRD001*";
    
    await sock.sendMessage(to, { text: message });
}

// Handler untuk membeli produk
async function handleBuyProduct(sock, to, productId) {
    const product = products.getProductById(productId);
    
    if (!product) {
        await sock.sendMessage(to, { 
            text: "❌ Produk tidak ditemukan. Pastikan ID produk benar." 
        });
        return;
    }
    
    if (product.stock <= 0) {
        await sock.sendMessage(to, { 
            text: "❌ Maaf, produk ini sedang habis." 
        });
        return;
    }
    
    // Set state untuk user
    userStates[to] = {
        menu: 'product_detail',
        cart: userStates[to]?.cart || [],
        currentProduct: product,
        checkoutStep: null
    };
    
    await sock.sendMessage(to, {
        text: `🛒 *DETAIL PRODUK*\n\n` +
              `*Nama:* ${product.name}\n` +
              `*Harga:* Rp ${product.price.toLocaleString()}\n` +
              `*Stock:* ${product.stock}\n` +
              `*Kategori:* ${product.category}\n` +
              `*Deskripsi:* ${product.description}\n\n` +
              `Berapa jumlah yang ingin dibeli?\n` +
              `Ketik angka (contoh: 1, 2, 3) atau ketik *batal* untuk membatalkan.`,
        footer: "Max. pembelian: " + product.stock
    });
}

// Handler untuk seleksi produk
async function handleProductSelection(sock, to, state, quantity) {
    const product = state.currentProduct;
    const qty = parseInt(quantity);
    
    if (isNaN(qty) || qty < 1) {
        await sock.sendMessage(to, { 
            text: "❌ Jumlah tidak valid. Silakan ketik angka yang benar." 
        });
        return;
    }
    
    if (qty > product.stock) {
        await sock.sendMessage(to, { 
            text: `❌ Stock tidak mencukupi. Stock tersedia: ${product.stock}` 
        });
        return;
    }
    
    // Tambahkan ke keranjang
    state.cart.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: qty,
        subtotal: product.price * qty
    });
    
    state.menu = 'main';
    state.currentProduct = null;
    
    await sock.sendMessage(to, {
        text: `✅ *Ditambahkan ke keranjang!*\n\n` +
              `${product.name}\n` +
              `Jumlah: ${qty}\n` +
              `Subtotal: Rp ${(product.price * qty).toLocaleString()}\n\n` +
              `Keranjang: ${state.cart.length} item\n` +
              `Total: Rp ${state.cart.reduce((sum, item) => sum + item.subtotal, 0).toLocaleString()}\n\n` +
              `Ketik *keranjang* untuk melihat keranjang\n` +
              `Ketik *checkout* untuk melanjutkan pembayaran\n` +
              `Ketik *menu* untuk kembali ke menu utama`,
        buttons: [
            { buttonId: 'keranjang', buttonText: { displayText: '🛒 Lihat Keranjang' }, type: 1 },
            { buttonId: 'checkout', buttonText: { displayText: '💰 Checkout' }, type: 1 },
            { buttonId: 'menu', buttonText: { displayText: '📋 Menu Utama' }, type: 1 }
        ]
    });
}

// Fungsi untuk menampilkan keranjang
async function showCart(sock, to, state) {
    if (!state.cart || state.cart.length === 0) {
        await sock.sendMessage(to, { 
            text: "🛒 Keranjang belanja kosong.\n\nKetik *produk* untuk melihat produk." 
        });
        return;
    }
    
    let message = "🛒 *KERANJANG BELANJA*\n\n";
    let total = 0;
    
    state.cart.forEach((item, index) => {
        message += `${index + 1}. ${item.name}\n`;
        message += `   Jumlah: ${item.quantity}\n`;
        message += `   Harga: Rp ${item.price.toLocaleString()}\n`;
        message += `   Subtotal: Rp ${item.subtotal.toLocaleString()}\n\n`;
        total += item.subtotal;
    });
    
    message += `💰 *TOTAL: Rp ${total.toLocaleString()}*\n\n`;
    message += `Ketik *checkout* untuk melanjutkan pembayaran\n`;
    message += `Ketik *hapus [no]* untuk menghapus item\n`;
    message += `Ketik *menu* untuk kembali`;
    
    await sock.sendMessage(to, { 
        text: message,
        buttons: [
            { buttonId: 'checkout', buttonText: { displayText: '💰 Checkout' }, type: 1 },
            { buttonId: 'menu', buttonText: { displayText: '📋 Menu Utama' }, type: 1 }
        ]
    });
}

// Fungsi untuk memulai checkout
async function startCheckout(sock, to, state) {
    if (!state.cart || state.cart.length === 0) {
        await sock.sendMessage(to, { 
            text: "❌ Keranjang belanja kosong." 
        });
        return;
    }
    
    const total = state.cart.reduce((sum, item) => sum + item.subtotal, 0);
    
    // Set checkout step 1: konfirmasi alamat
    state.checkoutStep = 'address';
    
    await sock.sendMessage(to, {
        text: `💰 *CHECKOUT*\n\n` +
              `Total belanja: Rp ${total.toLocaleString()}\n\n` +
              `*Step 1/3: Alamat Pengiriman*\n` +
              `Silakan kirim alamat lengkap pengiriman:\n` +
              `(Nama Penerima, Alamat Lengkap, Kota, Kode Pos)\n\n` +
              `Contoh:\n` +
              `Budi Santoso\n` +
              `Jl. Merdeka No. 123\n` +
              `Jakarta Pusat, 10110`
    });
}

// Handler untuk step checkout
async function handleCheckoutStep(sock, to, state, userMessage) {
    if (state.checkoutStep === 'address') {
        // Simpan alamat
        state.address = userMessage;
        state.checkoutStep = 'payment_method';
        
        await sock.sendMessage(to, {
            text: `✅ *Alamat tersimpan!*\n\n` +
                  `*Step 2/3: Metode Pembayaran*\n` +
                  `Pilih metode pembayaran:\n\n` +
                  `1. Transfer Bank (BCA)\n` +
                  `2. Transfer Bank (Mandiri)\n` +
                  `3. E-Wallet (OVO)\n` +
                  `4. E-Wallet (Gopay)\n` +
                  `5. COD (Bayar di Tempat)\n\n` +
                  `Ketik angka pilihan Anda:`
        });
    }
    else if (state.checkoutStep === 'payment_method') {
        const paymentMethods = {
            '1': 'Transfer Bank (BCA)',
            '2': 'Transfer Bank (Mandiri)',
            '3': 'E-Wallet (OVO)',
            '4': 'E-Wallet (Gopay)',
            '5': 'COD (Bayar di Tempat)'
        };
        
        if (!paymentMethods[userMessage]) {
            await sock.sendMessage(to, { 
                text: "❌ Pilihan tidak valid. Silakan pilih 1-5." 
            });
            return;
        }
        
        state.paymentMethod = paymentMethods[userMessage];
        
        // Generate payment info berdasarkan metode
        let paymentInfo = '';
        if (userMessage === '1') {
            paymentInfo = "BCA: 1234567890 a.n. My Store\nKode Unik: 123";
        } else if (userMessage === '2') {
            paymentInfo = "Mandiri: 0987654321 a.n. My Store\nKode Unik: 456";
        } else if (userMessage === '5') {
            paymentInfo = "Bayar saat barang diterima. Max. COD: Rp 1.000.000";
        } else {
            paymentInfo = "Instruksi pembayaran akan dikirim setelah konfirmasi";
        }
        
        state.checkoutStep = 'confirmation';
        
        const total = state.cart.reduce((sum, item) => sum + item.subtotal, 0);
        
        await sock.sendMessage(to, {
            text: `✅ *Metode pembayaran dipilih!*\n\n` +
                  `*Step 3/3: Konfirmasi Pesanan*\n\n` +
                  `📦 *Ringkasan Pesanan:*\n` +
                  `Total: Rp ${total.toLocaleString()}\n` +
                  `Items: ${state.cart.length}\n\n` +
                  `🏠 *Alamat:*\n${state.address}\n\n` +
                  `💳 *Pembayaran:*\n${state.paymentMethod}\n${paymentInfo}\n\n` +
                  `Ketik *ya* untuk konfirmasi pesanan\n` +
                  `Ketik *batal* untuk membatalkan`
        });
    }
    else if (state.checkoutStep === 'confirmation') {
        if (userMessage === 'ya') {
            // Proses pembuatan pesanan
            const total = state.cart.reduce((sum, item) => sum + item.subtotal, 0);
            const order = orders.createOrder(to, state.cart, total);
            
            // Update stock
            state.cart.forEach(item => {
                products.updateStock(item.productId, item.quantity);
            });
            
            await sock.sendMessage(to, {
                text: `🎉 *PESANAN BERHASIL DIBUAT!*\n\n` +
                      `*ID Pesanan:* ${order.id}\n` +
                      `*Total:* Rp ${total.toLocaleString()}\n` +
                      `*Status:* Menunggu pembayaran\n\n` +
                      `Terima kasih telah berbelanja di ${config.storeName}! 🛍️\n\n` +
                      `Ketik *pesanan* untuk melacak pesanan\n` +
                      `Ketik *menu* untuk kembali berbelanja`
            });
            
            // Reset state
            resetUserState(to);
        } else {
            await sock.sendMessage(to, { 
                text: "❌ Pesanan dibatalkan." 
            });
            resetUserState(to);
        }
    }
}

// Fungsi untuk menampilkan pesanan user
async function showUserOrders(sock, to) {
    const userOrders = orders.getUserOrders(to);
    
    if (userOrders.length === 0) {
        await sock.sendMessage(to, { 
            text: "📭 Anda belum memiliki pesanan.\n\nKetik *produk* untuk mulai berbelanja." 
        });
        return;
    }
    
    let message = "📦 *PESANAN ANDA*\n\n";
    
    userOrders.forEach((order, index) => {
        const date = new Date(order.createdAt).toLocaleDateString('id-ID');
        const statusEmoji = {
            'pending': '⏳',
            'processing': '🔧',
            'shipped': '🚚',
            'completed': '✅',
            'cancelled': '❌'
        }[order.status] || '❓';
        
        message += `${index + 1}. *${order.id}*\n`;
        message += `   Tanggal: ${date}\n`;
        message += `   Total: Rp ${order.total.toLocaleString()}\n`;
        message += `   Status: ${statusEmoji} ${order.status}\n\n`;
    });
    
    message += "Ketik *detail [ID]* untuk melihat detail pesanan\n";
    message += "Contoh: *detail ORD0001*";
    
    await sock.sendMessage(to, { text: message });
}

module.exports = {
    handleMessage,
    resetUserState
};

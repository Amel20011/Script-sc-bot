const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const handler = require('./handler');
const config = require('./config');

// Fungsi untuk koneksi WhatsApp
async function connectToWhatsApp() {
    // Membuat folder untuk auth state
    const authFolder = './auth_info';
    if (!fs.existsSync(authFolder)) {
        fs.mkdirSync(authFolder);
    }

    // Load auth state
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    
    // Fetch latest version
    const { version } = await fetchLatestBaileysVersion();
    
    // Membuat socket WhatsApp
    const sock = makeWASocket({
        version,
        logger: { level: 'silent' }, // bisa diubah ke 'debug' untuk troubleshooting
        printQRInTerminal: true,
        mobile: false, // false untuk bot
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, { log: console.log }),
        },
        browser: Browsers.ubuntu('Chrome'),
        generateHighQualityLinkPreview: true,
        markOnlineOnConnect: false, // false agar tidak terlihat online
        getMessage: async (key) => {
            return {
                conversation: "hello"
            };
        }
    });

    // Event handler untuk koneksi
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n📱 Scan QR Code ini di WhatsApp:');
            qrcode.generate(qr, { small: true });
            console.log('\nAtau gunakan pairing code:');
            console.log('1. Buka WhatsApp > Settings > Linked Devices');
            console.log('2. Pilih "Link a Device"');
            console.log('3. Pilih "Pair using code"');
            console.log('4. Masukkan kode pairing yang muncul di terminal\n');
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
            console.log('Koneksi terputus...', lastDisconnect?.error);
            
            if (shouldReconnect) {
                console.log('Mencoba reconnect...');
                setTimeout(connectToWhatsApp, 5000);
            } else {
                console.log('Tidak bisa reconnect, mungkin sesi sudah tidak valid.');
                // Hapus auth folder untuk memulai baru
                fs.rmSync(authFolder, { recursive: true, force: true });
                console.log('Auth info dihapus. Silakan restart bot untuk scan QR baru.');
            }
        } else if (connection === 'open') {
            console.log('\n✅ Bot berhasil terhubung!');
            console.log(`🤖 Nama Bot: ${config.botName}`);
            console.log(`🏪 Store: ${config.storeName}`);
            console.log('\nBot siap menerima pesanan...\n');
        }
    });

    // Save credentials when updated
    sock.ev.on('creds.update', saveCreds);

    // Event handler untuk pesan
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        const message = messages[0];
        
        // Skip jika pesan dari bot sendiri atau bukan pesan biasa
        if (message.key.fromMe || !message.message) return;
        
        // Hanya handle pesan teks
        if (message.message.conversation || 
            message.message.extendedTextMessage ||
            message.message.buttonsResponseMessage ||
            message.message.listResponseMessage) {
            
            try {
                console.log(`📩 Pesan dari: ${message.key.remoteJid}`);
                console.log(`📝 Isi: ${message.message.conversation || message.message.extendedTextMessage?.text || 'button/list response'}`);
                
                await handler.handleMessage(sock, message);
            } catch (error) {
                console.error('Error handling message:', error);
                
                // Kirim error message ke user
                try {
                    await sock.sendMessage(message.key.remoteJid, { 
                        text: '❌ Terjadi kesalahan. Silakan coba lagi atau hubungi admin.' 
                    });
                } catch (sendError) {
                    console.error('Error sending error message:', sendError);
                }
            }
        }
    });

    // Event handler untuk pesan group (opsional, bisa di-disable)
    sock.ev.on('group-participants.update', async (update) => {
        // Handle event group jika diperlukan
    });

    // Event handler untuk chat update
    sock.ev.on('chats.update', (updates) => {
        // Handle chat updates jika diperlukan
    });

    // Event handler untuk presence update
    sock.ev.on('presence.update', (update) => {
        // Handle presence update jika diperlukan
    });

    // Fungsi untuk mengirim pesan broadcast (opsional)
    async function sendBroadcast(message) {
        // Implementasi broadcast jika diperlukan
    }

    return sock;
}

// Fungsi untuk memulai bot
async function startBot() {
    console.log('🚀 Starting WhatsApp Store Bot...');
    console.log('===============================');
    
    try {
        await connectToWhatsApp();
    } catch (error) {
        console.error('Failed to start bot:', error);
        console.log('Restarting in 10 seconds...');
        setTimeout(startBot, 10000);
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n\n🛑 Bot dihentikan oleh user');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

// Jalankan bot
startBot();

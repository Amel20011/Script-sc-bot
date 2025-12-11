const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const handler = require('./handler');
const config = require('./config');

// Fungsi untuk koneksi WhatsApp
async function connectToWhatsApp() {
    console.log(''+' Modified Bailleys '+'');
    console.log('Hi, thank you for using my modified Bailleys ^_^ Telegram: @yumevtc');
    console.log('Latest update: 12/8/2025\n');

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
        logger: { level: 'silent' },
        printQRInTerminal: true,
        mobile: false, // false untuk bot
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, { log: console.log }),
        },
        // Browser configuration untuk versi kiuur (tidak pakai Browsers.macOS)
        browser: ["Ubuntu", "Chrome", "110.0.5481.100"], // Format: [OS, Browser, Version]
        generateHighQualityLinkPreview: true,
        markOnlineOnConnect: false,
        syncFullHistory: false,
        fireInitQueries: true,
        emitOwnEvents: true,
        defaultQueryTimeoutMs: 60000,
        // Handle pesan
        getMessage: async (key) => {
            return {
                conversation: "hello"
            };
        }
    });

    // Event handler untuk koneksi
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n📱 Scan QR Code ini di WhatsApp:');
            qrcode.generate(qr, { small: true });
            console.log('\nAtau gunakan pairing code:');
            console.log('1. Buka WhatsApp > Settings > Linked Devices');
            console.log('2. Pilih "Link a Device"');
            console.log('3. Pilih "Pair using code"');
            console.log('4. Masukkan kode pairing yang muncul di terminal\n');
            
            // Juga tampilkan pairing code jika tersedia
            if (update.pairingCode) {
                console.log(`📟 Pairing Code: ${update.pairingCode}`);
            }
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
            console.log('Koneksi terputus...', lastDisconnect?.error?.message || 'Unknown error');
            
            if (shouldReconnect) {
                console.log('Mencoba reconnect...');
                setTimeout(connectToWhatsApp, 5000);
            } else {
                console.log('Tidak bisa reconnect, mungkin sesi sudah tidak valid.');
                // Hapus auth folder untuk memulai baru
                if (fs.existsSync(authFolder)) {
                    fs.rmSync(authFolder, { recursive: true, force: true });
                    console.log('Auth info dihapus. Silakan restart bot untuk scan QR baru.');
                }
            }
        } else if (connection === 'open') {
            console.log('\n✅ Bot berhasil terhubung!');
            console.log(`🤖 Nama Bot: ${config.botName}`);
            console.log(`🏪 Store: ${config.storeName}`);
            console.log(`📞 Connected as: ${sock.user?.id || 'Unknown'}`);
            console.log('\nBot siap menerima pesanan...\n');
            
            // Update status
            await sock.sendPresenceUpdate('available');
        } else if (connection === 'connecting') {
            console.log('🔄 Menghubungkan ke WhatsApp...');
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
        
        // Debug log
        console.log(`📩 Pesan dari: ${message.key.remoteJid}`);
        
        // Hanya handle pesan dari pengguna (bukan broadcast, status, dll)
        if (message.key.remoteJid.endsWith('@s.whatsapp.net')) {
            try {
                // Cek tipe pesan
                let text = '';
                if (message.message.conversation) {
                    text = message.message.conversation;
                } else if (message.message.extendedTextMessage) {
                    text = message.message.extendedTextMessage.text;
                } else if (message.message.buttonsResponseMessage) {
                    text = message.message.buttonsResponseMessage.selectedButtonId;
                } else if (message.message.listResponseMessage) {
                    text = message.message.listResponseMessage.singleSelectReply.selectedRowId;
                }
                
                console.log(`📝 Isi: ${text || '[non-text message]'}`);
                
                // Handle pesan
                await handler.handleMessage(sock, message);
            } catch (error) {
                console.error('❌ Error handling message:', error.message || error);
                
                // Kirim error message ke user
                try {
                    await sock.sendMessage(message.key.remoteJid, { 
                        text: '❌ Terjadi kesalahan sistem. Silakan coba lagi atau hubungi admin.' 
                    });
                } catch (sendError) {
                    console.error('Error sending error message:', sendError);
                }
            }
        }
    });

    // Event handler untuk pesan group (opsional)
    sock.ev.on('group-participants.update', async (update) => {
        console.log('Group update:', update);
    });

    // Event handler untuk chat update
    sock.ev.on('chats.update', (updates) => {
        // Handle chat updates
    });

    // Event handler untuk presence update
    sock.ev.on('presence.update', (update) => {
        // Handle presence update
    });

    // Event handler untuk contacts update
    sock.ev.on('contacts.update', (updates) => {
        // Handle contacts update
    });

    // Clean up saat proses berhenti
    process.on('beforeExit', async () => {
        console.log('🛑 Menutup koneksi WhatsApp...');
        try {
            await sock.end();
        } catch (e) {
            console.error('Error closing connection:', e);
        }
    });

    return sock;
}

// Fungsi untuk memulai bot
async function startBot() {
    console.log('🚀 Starting WhatsApp Store Bot...');
    console.log('===============================\n');
    
    try {
        await connectToWhatsApp();
    } catch (error) {
        console.error('❌ Failed to start bot:', error.message || error);
        console.log('🔄 Restarting in 10 seconds...\n');
        setTimeout(startBot, 10000);
    }
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n\n🛑 Bot dihentikan oleh user (SIGINT)');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n🛑 Bot dihentikan (SIGTERM)');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.log('🔄 Restarting bot...');
    setTimeout(startBot, 5000);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
});

// Jalankan bot
startBot();

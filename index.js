// GANTI bagian ini:
const sock = makeWASocket({
    version,
    // HAPUS logger sepenuhnya atau komentari
    // logger: customLogger,
    printQRInTerminal: true,
    mobile: false,
    auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, { log: console.log }),
    },
    // ... konfigurasi lainnya
});

# Perbaikan Multiplayer untuk Production (AWS App Runner)

## Masalah yang Diperbaiki

### 1. WebSocket Connection Failed
**Masalah:** WebSocket upgrade gagal di AWS App Runner
```
WebSocket connection to 'wss://...awsapprunner.com/socket.io/...' failed
```

**Penyebab:** AWS App Runner tidak mendukung WebSocket upgrade dengan baik

**Solusi:** Gunakan **polling transport** di production yang lebih reliable

### 2. Multiplayer Tidak Sinkron
**Masalah:** Setiap client terhubung ke instance yang berbeda
**Solusi:** 
- Optimasi Socket.IO configuration
- Tambah logging untuk debugging
- Pastikan semua client connect ke namespace yang sama

## Perubahan yang Dilakukan

### 1. `lib/socket.ts` dan `lib/crashSocket.ts`
```typescript
// Detection untuk production
const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';

// Konfigurasi transport berdasarkan environment
transports: isProduction ? ['polling'] : ['polling', 'websocket']
```

**Manfaat:**
- ✅ Localhost: WebSocket untuk development (lebih cepat)
- ✅ Production: Polling-only (lebih stabil di cloud)
- ✅ Reconnection lebih agresif (10 attempts, 20s timeout)

### 2. `server.js` - Socket.IO Server Configuration
```javascript
const io = new Server(httpServer, {
  cors: { 
    origin: '*', 
    credentials: true 
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['polling', 'websocket']
});
```

**Manfaat:**
- ✅ CORS lebih permissive untuk multiplayer
- ✅ Ping timeout lebih panjang untuk koneksi yang lambat
- ✅ Support kedua transport

### 3. Enhanced Logging
**Server-side:**
```javascript
console.log('✅ Client connected:', socket.id, 'Transport:', socket.conn.transport.name);
console.log('👥 Total players in round:', plinkoState.players);
```

**Client-side:**
```javascript
console.log('✅ Socket connected!', socket.id);
console.log('🎮 Round update received:', update);
```

**Manfaat:**
- ✅ Mudah debug multiplayer issues
- ✅ Bisa track berapa player yang terhubung
- ✅ Bisa lihat transport apa yang digunakan

## Testing

### Local (Development)
```bash
npm run dev
# Buka di 2+ browser/tab
# Klik "Start / Join Round" - harus lihat Players: 2, 3, dst
```

### Production (AWS App Runner)
1. Deploy ke AWS
2. Buka di laptop berbeda
3. Klik "Start / Join Round"
4. Check console logs - semua harus connect dengan transport: "polling"
5. Player count harus increment untuk semua client

## Expected Console Output

### Client Console (Browser DevTools)
```
🔌 Socket connecting...
✅ Socket connected! abc123 Transport: polling
🎮 Round update received: {state: 'IDLE', players: 0, ...}
🎯 Joining round - My userId: 12345 Current players: 0
🎮 Round update received: {state: 'COUNTDOWN', players: 1, ...}
```

### Server Console (Docker/AWS Logs)
```
✅ Client connected to /plinko: abc123 Transport: polling
📥 Plinko join: {userId: 12345, ...} from socket: abc123
🎮 New round started: plinko_1699123456789
👥 Total players in round plinko_1699123456789: 1

✅ Client connected to /plinko: def456 Transport: polling
📥 Plinko join: {userId: 67890, ...} from socket: def456
👥 Total players in round plinko_1699123456789: 2
```

## Troubleshooting

### Jika masih tidak multiplayer:
1. Check console logs di browser - pastikan socket connected
2. Check AWS logs - pastikan semua client masuk ke round yang sama
3. Pastikan NEXT_PUBLIC_API_BASE di environment variables AWS = `/`
4. Clear browser cache dan reload
5. Test dengan incognito window

### Jika connection gagal total:
1. Check AWS App Runner service status
2. Verify health endpoint: `https://your-app.awsapprunner.com/health`
3. Check Socket.IO endpoint: `https://your-app.awsapprunner.com/socket.io/?EIO=4&transport=polling`
4. Pastikan tidak ada firewall/proxy yang block long-polling

## Deploy ke Production

```bash
git add .
git commit -m "fix: multiplayer support dengan polling transport untuk AWS App Runner"
git push origin main
```

GitHub Actions akan auto-deploy ke AWS App Runner.

## Verifikasi Setelah Deploy

1. Buka https://3xjcgt7mgq.us-east-1.awsapprunner.com/plinko
2. Buka browser DevTools (F12) → Console tab
3. Pastikan muncul: `✅ Socket connected!` dengan transport `polling`
4. Buka di device/laptop lain
5. Klik join di kedua device
6. Kedua device harus lihat `Players: 2`

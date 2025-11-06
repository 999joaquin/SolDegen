// Test Backend Connection
// Jalankan ini di browser console untuk testing koneksi

console.log('🔍 Testing Backend Connection...');

const API_BASE = window.location.origin;

async function testRestAPI() {
  console.log('\n📡 Testing REST API Endpoints...');
  
  const endpoints = [
    '/api/fair/current',
    '/api/demo/stats',
    '/api/leaderboard'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${endpoint}:`, data);
      } else {
        console.error(`❌ ${endpoint}: HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ ${endpoint}:`, error.message);
    }
  }
}

function testWebSocket() {
  console.log('\n🔌 Testing Plinko WebSocket Connection...');
  
  if (typeof io === 'undefined') {
    console.error('❌ socket.io-client not loaded');
    return;
  }
  
  const socket = io(`${API_BASE}/plinko`, {
    path: '/socket.io',
    transports: ['polling', 'websocket']
  });
  
  socket.on('connect', () => {
    console.log('✅ WebSocket connected!');
    console.log('Socket ID:', socket.id);
    socket.emit('join_round', { userId: Math.floor(Math.random() * 100000), bet: 1 });
  });
  
  socket.on('disconnect', () => {
    console.log('❌ WebSocket disconnected');
  });
  
  socket.on('connect_error', (error) => {
    console.error('❌ WebSocket connection error:', error.message);
  });
  
  socket.on('round_update', (data) => {
    console.log('📦 round_update:', data);
  });
  
  socket.on('round_started', (data) => {
    console.log('🏁 round_started:', data);
  });
  
  socket.on('round_finished', () => {
    console.log('✅ round_finished');
    setTimeout(() => {
      console.log('⏱️ Closing test connection...');
      socket.close();
    }, 3000);
  });
}

(async () => {
  await testRestAPI();
  testWebSocket();
})();
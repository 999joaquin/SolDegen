// Test Backend Connection
// Jalankan ini di browser console untuk testing koneksi

console.log('🔍 Testing Backend Connection...');

// Test REST API
const API_BASE = 'http://localhost:3000';

async function testRestAPI() {
  console.log('\n📡 Testing REST API Endpoints...');
  
  const endpoints = [
    '/crash/fair',
    '/crash/stats',
    '/crash/balance/123456',
    '/crash/history/dedup?limit=5',
    '/crash/history?limit=5'
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

// Test WebSocket
function testWebSocket() {
  console.log('\n🔌 Testing WebSocket Connection...');
  
  // Test if socket.io-client is available
  if (typeof io === 'undefined') {
    console.error('❌ socket.io-client not loaded');
    return;
  }
  
  const socket = io(`${API_BASE}/crash`, {
    path: '/socket.io',
    transports: ['websocket', 'polling']
  });
  
  socket.on('connect', () => {
    console.log('✅ WebSocket connected!');
    console.log('Socket ID:', socket.id);
    
    // Test emit
    socket.emit('get_chat_history');
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
  
  socket.on('chat_history', (data) => {
    console.log('💬 chat_history:', data);
  });
  
  // Close connection after 10 seconds
  setTimeout(() => {
    console.log('⏱️ Closing test connection...');
    socket.close();
  }, 10000);
}

// Run tests
(async () => {
  await testRestAPI();
  testWebSocket();
})();

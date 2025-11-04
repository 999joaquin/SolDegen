const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');
const { spawn } = require('child_process');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Start Python Physics Backend
let pythonProcess = null;

function startPythonBackend() {
  console.log('🐍 Starting Python Physics Backend...');
  
  const pythonPath = path.join(__dirname, 'python-backend', 'main.py');
  
  pythonProcess = spawn('python', [pythonPath], {
    cwd: path.join(__dirname, 'python-backend'),
    stdio: 'inherit' // Show Python logs in console
  });

  pythonProcess.on('error', (err) => {
    console.error('❌ Failed to start Python backend:', err.message);
    console.log('💡 Make sure Python is installed and dependencies are installed:');
    console.log('   cd python-backend && pip install -r requirements.txt');
  });

  pythonProcess.on('exit', (code) => {
    if (code !== 0) {
      console.log(`⚠️  Python backend exited with code ${code}`);
    }
  });
}

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  if (pythonProcess) {
    pythonProcess.kill();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  process.exit(0);
});

// Mock game state
let gameState = {
  state: 'COUNTDOWN',
  players: 0,
  multiplier: 1.00,
  timeLeftMs: 5000,
  targetCrash: 0
};

const chatMessages = [];

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Crash namespace
  const crashNsp = io.of('/crash');
  
  crashNsp.on('connection', (socket) => {
    console.log('✅ Client connected to /crash:', socket.id);

    socket.emit('round_update', gameState);
    
    socket.on('join_round', (data) => {
      console.log('📥 Player joining:', data);
      
      if (gameState.players === 0 && gameState.state === 'COUNTDOWN') {
        const rand = Math.random();
        gameState.targetCrash = rand < 0.65 ? 1.0 + Math.random() * 1.0 : 2.0 + Math.random() * 8.0;
        crashNsp.emit('_x', { _t: gameState.targetCrash });
      }
      
      gameState.players++;
      socket.emit('joined');
      crashNsp.emit('round_update', gameState);
    });

    socket.on('cashout', (data) => {
      console.log('💰 Player cashing out:', data);
      socket.emit('cashed_out', {
        userId: data.userId,
        atMultiplier: gameState.multiplier,
        payout: data.bet * gameState.multiplier,
        atMs: Date.now()
      });
    });

    socket.on('get_chat_history', () => {
      socket.emit('chat_history', chatMessages);
    });

    socket.on('send_chat_message', (data) => {
      const msg = {
        id: Math.random().toString(36).substring(7),
        userId: data.userId,
        username: data.username,
        message: data.message,
        timestamp: Date.now()
      };
      chatMessages.push(msg);
      if (chatMessages.length > 100) chatMessages.shift();
      crashNsp.emit('chat_message', msg);
    });

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected from /crash:', socket.id);
    });
  });

  // Plinko namespace
  const plinkoNsp = io.of('/plinko');
  
  let plinkoState = {
    state: 'IDLE',
    roundId: null,
    players: 0,
    timeLeftMs: 0,
    lockedBets: []
  };

  // Plinko multipliers: Win ratio 40:60 (Player 40%, House 60%)
  // Lebih banyak bins dengan multiplier < 1.0 untuk house advantage
  const plinkoMultipliers = [
    0.2,  // Bin 0 - Heavy loss
    0.35, // Bin 1 - Loss
    0.55, // Bin 2 - Loss
    0.9,  // Bin 3 - Small loss
    1.1,  // Bin 4 - Small win (left edge)
    0.95, // Bin 5 - Near break-even
    1.25, // Bin 6 - Win
    1.55, // Bin 7 - Win
    2.0,  // Bin 8 - Biggest win (center)
    1.55, // Bin 9 - Win
    1.25, // Bin 10 - Win
    0.95, // Bin 11 - Near break-even
    1.1,  // Bin 12 - Small win (right edge)
    0.9,  // Bin 13 - Small loss
    0.55, // Bin 14 - Loss
    0.35, // Bin 15 - Loss
    0.2   // Bin 16 - Heavy loss
  ];

  const PLINKO_ROWS = plinkoMultipliers.length - 1;
  
  plinkoNsp.on('connection', (socket) => {
    console.log('✅ Client connected to /plinko:', socket.id);

    socket.emit('round_update', {
      state: plinkoState.state,
      roundId: plinkoState.roundId,
      players: plinkoState.players,
      timeLeftMs: plinkoState.timeLeftMs
    });

    socket.on('join_round', (data) => {
      console.log('📥 Player joining Plinko:', data);
      
      if (plinkoState.state === 'IDLE') {
        plinkoState.state = 'COUNTDOWN';
        plinkoState.roundId = `plinko_${Date.now()}`;
        plinkoState.timeLeftMs = 5000;
      }

      if (plinkoState.state === 'COUNTDOWN') {
        plinkoState.players++;
        plinkoState.lockedBets.push(data);
        socket.emit('joined', { roundId: plinkoState.roundId, userId: data.userId });
        plinkoNsp.emit('round_update', {
          state: plinkoState.state,
          roundId: plinkoState.roundId,
          players: plinkoState.players,
          timeLeftMs: plinkoState.timeLeftMs
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected from /plinko:', socket.id);
    });
  });

  // Plinko game loop
  setInterval(() => {
    if (plinkoState.state === 'COUNTDOWN') {
      plinkoState.timeLeftMs -= 100;
      
      if (plinkoState.timeLeftMs <= 0 && plinkoState.players > 0) {
        plinkoState.state = 'RUNNING';
        plinkoNsp.emit('round_started', {
          roundId: plinkoState.roundId,
          lockedPlayers: plinkoState.players,
          startedAt: Date.now()
        });

        setTimeout(() => {
          // Kirim hasil satu per satu dengan delay
          plinkoState.lockedBets.forEach((bet, idx) => {
            setTimeout(() => {
              // Generate random path - setiap step 50/50 kiri atau kanan
              const path = Array.from({ length: PLINKO_ROWS }, () => Math.random() < 0.5 ? 0 : 1);
              const bin = path.reduce((sum, val) => sum + val, 0);
              const multiplier = plinkoMultipliers[bin] || 0.5;
              const payout = bet.bet * multiplier;
              const isWin = multiplier >= 1.0;

              console.log(`🎲 Ball ${idx + 1}: Path=${path.join('')} → Bin ${bin} → ${multiplier}x → ${isWin ? 'WIN' : 'LOSS'}`);

              // Kirim preview ball untuk semua player KECUALI yang punya bola ini
              const previewColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
              const randomColor = previewColors[idx % previewColors.length];
              
              plinkoNsp.emit('preview_ball', {
                ballId: `${plinkoState.roundId}_${idx}`,
                userId: bet.userId,
                color: randomColor,
                targetBin: bin,
                multiplier,
                startX: 0.5, // Center position
                startY: 0
              });

              // Kirim hasil ke owner bola untuk animasi penuh
              plinkoNsp.emit('your_result', {
                userId: bet.userId,
                betId: `${plinkoState.roundId}_${idx}`,
                path,
                bin,
                multiplier,
                payout,
                result: isWin ? 'win' : 'loss',
                proof: {
                  serverSeedHash: 'mock_hash',
                  clientSeed: bet.clientSeed || 'mock_seed',
                  nonce: idx
                },
                balanceAfter: 1000 + payout - bet.bet, // Balance setelah dikurangi bet
                createdAt: new Date().toISOString(),
                roundId: plinkoState.roundId
              });
            }, idx * 1000); // Delay 1000ms per bola (lebih lama agar terlihat jelas)
          });

          // Finish setelah semua bola selesai
          setTimeout(() => {
            plinkoNsp.emit('round_finished');
            plinkoState.state = 'IDLE';
            plinkoState.roundId = null;
            plinkoState.players = 0;
            plinkoState.lockedBets = [];
            plinkoState.timeLeftMs = 0;
            
            plinkoNsp.emit('round_update', {
              state: plinkoState.state,
              roundId: plinkoState.roundId,
              players: plinkoState.players,
              timeLeftMs: plinkoState.timeLeftMs
            });
          }, plinkoState.lockedBets.length * 1000 + 3000);
        }, 1000);
      } else {
        plinkoNsp.emit('round_update', {
          state: plinkoState.state,
          roundId: plinkoState.roundId,
          players: plinkoState.players,
          timeLeftMs: plinkoState.timeLeftMs
        });
      }
    }
  }, 100);

  // Game loop for crash
  setInterval(() => {
    if (gameState.state === 'COUNTDOWN' && gameState.players > 0) {
      gameState.timeLeftMs -= 100;
      if (gameState.timeLeftMs <= 0) {
        gameState.state = 'RUNNING';
        gameState.multiplier = 1.00;
        
        // Pake targetCrash yang udah di-generate saat join
        if (!gameState.targetCrash) {
          const rand = Math.random();
          gameState.targetCrash = rand < 0.65 ? 1.0 + Math.random() * 1.0 : 2.0 + Math.random() * 8.0;
        }
        
        crashNsp.emit('round_started', { _t: gameState.targetCrash });
      }
      crashNsp.emit('round_update', gameState);
    } else if (gameState.state === 'RUNNING') {
      gameState.multiplier = parseFloat((gameState.multiplier + 0.01).toFixed(2));
      crashNsp.emit('round_update', gameState);
      
      if (gameState.multiplier >= gameState.targetCrash) {
        crashNsp.emit('crashed', { crashMultiplier: gameState.multiplier });
        crashNsp.emit('round_finished');
        gameState.state = 'IDLE';
        gameState.players = 0;
        gameState.multiplier = 1.00;
        gameState.targetCrash = 0;
        
        setTimeout(() => {
          gameState.state = 'COUNTDOWN';
          gameState.timeLeftMs = 5000;
          
          const rand = Math.random();
          gameState.targetCrash = rand < 0.65 ? 1.0 + Math.random() * 1.0 : 2.0 + Math.random() * 8.0;
          crashNsp.emit('_x', { _t: gameState.targetCrash });
          
          crashNsp.emit('round_update', gameState);
        }, 5000);
      }
    }
  }, 100);

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`\n🚀 Server ready on http://${hostname}:${port}`);
      console.log('🎮 Crash game namespace: /crash');
      console.log('🎲 Plinko game namespace: /plinko');
      
      // Start Python backend after Node server is ready
      setTimeout(() => {
        startPythonBackend();
      }, 1000);
    });
});
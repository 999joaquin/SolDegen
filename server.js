const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

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

  // Plinko multipliers: Adjusted untuk house edge 60:40
  // Bins dengan multiplier rendah lebih banyak (house advantage)
  const plinkoMultipliers = [
    0.2,  // Bin 0 - Loss
    0.3,  // Bin 1 - Loss
    0.5,  // Bin 2 - Loss
    0.7,  // Bin 3 - Loss
    0.9,  // Bin 4 - Loss
    1.2,  // Bin 5 - Small win
    1.5,  // Bin 6 - Small win
    2.0,  // Bin 7 - Medium win
    3.0,  // Bin 8 - Big win (center, jarang)
    2.0,  // Bin 9 - Medium win
    1.5,  // Bin 10 - Small win
    1.2,  // Bin 11 - Small win
    0.9,  // Bin 12 - Loss
    0.7,  // Bin 13 - Loss
    0.5,  // Bin 14 - Loss
    0.3,  // Bin 15 - Loss
    0.2   // Bin 16 - Loss
  ];
  
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
              const path = Array.from({ length: 16 }, () => Math.random() < 0.5 ? 0 : 1);
              const bin = path.reduce((sum, val) => sum + val, 0);
              const multiplier = plinkoMultipliers[bin] || 1.0;
              const payout = bet.bet * multiplier;

              plinkoNsp.emit('your_result', {
                userId: bet.userId,
                betId: `${plinkoState.roundId}_${idx}`,
                path,
                bin,
                multiplier,
                payout,
                result: multiplier >= 1.0 ? 'win' : 'loss',
                proof: {
                  serverSeedHash: 'mock_hash',
                  clientSeed: bet.clientSeed || 'mock_seed',
                  nonce: idx
                },
                balanceAfter: 1000 + payout,
                createdAt: new Date().toISOString(),
                roundId: plinkoState.roundId
              });
            }, idx * 500); // Delay 500ms per bola
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
          }, plinkoState.lockedBets.length * 500 + 2000);
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
          
          // Generate crash point untuk round berikutnya
          const rand = Math.random();
          gameState.targetCrash = rand < 0.65 ? 1.0 + Math.random() * 1.0 : 2.0 + Math.random() * 8.0;
          crashNsp.emit('_x', { _t: gameState.targetCrash });
          
          crashNsp.emit('round_update', gameState);
        }, 3000);
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
      console.log('🎲 Plinko game namespace: /plinko\n');
    });
});

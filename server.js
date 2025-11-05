// server.js
// One process that serves Next.js (frontend + SSR), Socket.IO namespaces, and a Python backend.

const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');
const { spawn } = require('child_process');
const path = require('path');
const httpProxy = require('http-proxy');
const url = require('url');

// ------------ Runtime config
const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const pythonBin = process.env.PYTHON_BIN || 'python3';
const PY_SERVER = process.env.PY_SERVER || 'http://127.0.0.1:8000';

// HTTP/WS proxy for Python backend
const proxy = httpProxy.createProxyServer({});

// ------------ Next.js app
const app = next({ dev });
const handler = app.getRequestHandler();

// ------------ Python backend lifecycle
let pythonProcess = null;

function startPythonBackend() {
  try {
    console.log('🐍 Starting Python Physics Backend...');
    const pythonPath = path.join(__dirname, 'python-backend', 'main.py');

    pythonProcess = spawn(pythonBin, [pythonPath], {
      cwd: path.join(__dirname, 'python-backend'),
      stdio: 'inherit',
    });

    pythonProcess.on('error', (err) => {
      console.error('❌ Failed to start Python backend:', err.message);
      console.log('💡 Check that Python is available and dependencies are installed.');
    });

    pythonProcess.on('exit', (code, signal) => {
      if (signal) {
        console.log(`⚠️  Python backend terminated by signal: ${signal}`);
      } else {
        console.log(`⚠️  Python backend exited with code: ${code}`);
      }
    });
  } catch (e) {
    console.error('❌ Unexpected error starting Python backend:', e);
  }
}

function stopPythonBackend() {
  if (pythonProcess && !pythonProcess.killed) {
    try {
      pythonProcess.kill('SIGTERM');
    } catch (e) {
      console.error('⚠️  Error killing Python backend:', e);
    }
  }
}

// ------------ Mock game state (Crash)
let gameState = {
  state: 'COUNTDOWN',
  players: 0,
  multiplier: 1.0,
  timeLeftMs: 5000,
  targetCrash: 0,
};

// In-memory chat
const chatMessages = [];

// ------------ Plinko state
const plinkoMultipliers = [
  0.2, 0.35, 0.55, 0.9, 1.1, 0.95, 1.25, 1.55, 2.0, 1.55, 1.25, 0.95, 1.1, 0.9, 0.55, 0.35, 0.2,
];
const PLINKO_ROWS = plinkoMultipliers.length - 1;

let plinkoState = {
  state: 'IDLE',
  roundId: null,
  players: 0,
  timeLeftMs: 0,
  lockedBets: [],
};

// ------------ Bootstrap
app
  .prepare()
  .then(() => {
    // Custom request listener so we can serve health checks and proxy /physics before Next
    const requestListener = (req, res) => {
      const { pathname, search } = url.parse(req.url || '/', false);

      // Health endpoints
      if (pathname === '/health' || pathname === '/readyz' || pathname === '/livez') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
        return;
      }

      // PROXY: /physics/*  →  Python backend (strip prefix)
      if (pathname && pathname.startsWith('/physics')) {
        req.url = pathname.replace(/^\/physics/, '') + (search || '');
        proxy.web(
          req,
          res,
          { target: PY_SERVER, changeOrigin: true },
          (err) => {
            console.error('Physics proxy error:', err?.message);
            if (!res.headersSent) {
              res.statusCode = 502;
              res.end('Bad gateway');
            }
          }
        );
        return;
      }

      // Everything else -> Next.js
      return handler(req, res);
    };

    const httpServer = createServer(requestListener);

    // WS upgrades so Python Socket.IO works at /physics/socket.io
    httpServer.on('upgrade', (req, socket, head) => {
      if (req.url && req.url.startsWith('/physics')) {
        req.url = req.url.replace(/^\/physics/, '');
        proxy.ws(req, socket, head, { target: PY_SERVER, changeOrigin: true });
      }
    });

    // ------------ Socket.IO (Node side)
    const io = new Server(httpServer, {
      path: '/socket.io',
      cors: { origin: '*', methods: ['GET', 'POST'] },
      allowEIO3: true,
    });

    // ---- Crash namespace
    const crashNsp = io.of('/crash');

    crashNsp.on('connection', (socket) => {
      console.log('✅ Client connected to /crash:', socket.id);

      // Send current round snapshot
      socket.emit('round_update', gameState);

      socket.on('join_round', (data) => {
        console.log('📥 Crash join:', data);

        if (gameState.players === 0 && gameState.state === 'COUNTDOWN') {
          const rand = Math.random();
          // ~65% quick crash between 1.0–2.0x, else 2.0–10.0x
          gameState.targetCrash = rand < 0.65 ? 1.0 + Math.random() * 1.0 : 2.0 + Math.random() * 8.0;
          crashNsp.emit('_x', { _t: gameState.targetCrash });
        }

        gameState.players++;
        socket.emit('joined');
        crashNsp.emit('round_update', gameState);
      });

      socket.on('cashout', (data) => {
        console.log('💰 Crash cashout:', data);
        socket.emit('cashed_out', {
          userId: data.userId,
          atMultiplier: gameState.multiplier,
          payout: data.bet * gameState.multiplier,
          atMs: Date.now(),
        });
      });

      socket.on('get_chat_history', () => {
        socket.emit('chat_history', chatMessages);
      });

      socket.on('send_chat_message', (data) => {
        const msg = {
          id: Math.random().toString(36).slice(2),
          userId: data.userId,
          username: data.username,
          message: data.message,
          timestamp: Date.now(),
        };
        chatMessages.push(msg);
        if (chatMessages.length > 100) chatMessages.shift();
        crashNsp.emit('chat_message', msg);
      });

      socket.on('disconnect', () => {
        console.log('❌ Client disconnected from /crash:', socket.id);
      });
    });

    // ---- Plinko namespace
    const plinkoNsp = io.of('/plinko');

    plinkoNsp.on('connection', (socket) => {
      console.log('✅ Client connected to /plinko:', socket.id);

      socket.emit('round_update', {
        state: plinkoState.state,
        roundId: plinkoState.roundId,
        players: plinkoState.players,
        timeLeftMs: plinkoState.timeLeftMs,
      });

      socket.on('join_round', (data) => {
        console.log('📥 Plinko join:', data);

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
            timeLeftMs: plinkoState.timeLeftMs,
          });
        }
      });

      socket.on('disconnect', () => {
        console.log('❌ Client disconnected from /plinko:', socket.id);
      });
    });

    // ------------ Plinko game loop
    const previewColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

    setInterval(() => {
      if (plinkoState.state === 'COUNTDOWN') {
        plinkoState.timeLeftMs -= 100;

        if (plinkoState.timeLeftMs <= 0 && plinkoState.players > 0) {
          plinkoState.state = 'RUNNING';
          plinkoNsp.emit('round_started', {
            roundId: plinkoState.roundId,
            lockedPlayers: plinkoState.players,
            startedAt: Date.now(),
          });

          setTimeout(() => {
            plinkoState.lockedBets.forEach((bet, idx) => {
              setTimeout(() => {
                // Random walk path: 0=left, 1=right
                const path = Array.from({ length: PLINKO_ROWS }, () => (Math.random() < 0.5 ? 0 : 1));
                const bin = path.reduce((sum, val) => sum + val, 0);
                const multiplier = plinkoMultipliers[bin] ?? 0.5;
                const payout = bet.bet * multiplier;
                const isWin = multiplier >= 1.0;

                console.log(
                  `🎲 Ball ${idx + 1}: Path=${path.join('')} → Bin ${bin} → ${multiplier}x → ${isWin ? 'WIN' : 'LOSS'}`
                );

                // Broadcast a preview for everyone
                const color = previewColors[idx % previewColors.length];
                plinkoNsp.emit('preview_ball', {
                  ballId: `${plinkoState.roundId}_${idx}`,
                  userId: bet.userId,
                  color,
                  targetBin: bin,
                  multiplier,
                  startX: 0.5,
                  startY: 0,
                });

                // Send full result
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
                    nonce: idx,
                  },
                  balanceAfter: 1000 + payout - bet.bet,
                  createdAt: new Date().toISOString(),
                  roundId: plinkoState.roundId,
                });
              }, idx * 1000); // stagger balls
            });

            // Wrap up after all balls are processed
            setTimeout(() => {
              plinkoNsp.emit('round_finished');
              plinkoState = {
                state: 'IDLE',
                roundId: null,
                players: 0,
                timeLeftMs: 0,
                lockedBets: [],
              };
              plinkoNsp.emit('round_update', {
                state: plinkoState.state,
                roundId: plinkoState.roundId,
                players: plinkoState.players,
                timeLeftMs: plinkoState.timeLeftMs,
              });
            }, plinkoState.lockedBets.length * 1000 + 3000);
          }, 1000);
        } else {
          plinkoNsp.emit('round_update', {
            state: plinkoState.state,
            roundId: plinkoState.roundId,
            players: plinkoState.players,
            timeLeftMs: plinkoState.timeLeftMs,
          });
        }
      }
    }, 100);

    // ------------ Crash game loop
    setInterval(() => {
      if (gameState.state === 'COUNTDOWN' && gameState.players > 0) {
        gameState.timeLeftMs -= 100;
        if (gameState.timeLeftMs <= 0) {
          gameState.state = 'RUNNING';
          gameState.multiplier = 1.0;

          if (!gameState.targetCrash) {
            const rand = Math.random();
            gameState.targetCrash = rand < 0.65 ? 1.0 + Math.random() * 1.0 : 2.0 + Math.random() * 8.0;
          }

          crashNsp.emit('round_started', { _t: gameState.targetCrash });
        }
        crashNsp.emit('round_update', gameState);
      } else if (gameState.state === 'RUNNING') {
        // Tick multiplier
        gameState.multiplier = parseFloat((gameState.multiplier + 0.01).toFixed(2));
        crashNsp.emit('round_update', gameState);

        if (gameState.multiplier >= gameState.targetCrash) {
          crashNsp.emit('crashed', { crashMultiplier: gameState.multiplier });
          crashNsp.emit('round_finished');

          // Reset and schedule next countdown
          gameState = {
            state: 'IDLE',
            players: 0,
            multiplier: 1.0,
            timeLeftMs: 0,
            targetCrash: 0,
          };

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

    // ------------ Start HTTP server
    httpServer
      .once('error', (err) => {
        console.error('❌ HTTP server error:', err);
        process.exit(1);
      })
      .listen(port, '0.0.0.0', () => {
        console.log(`\n🚀 Server ready on 0.0.0.0:${port}`);
        console.log('🎮 Crash namespace: /crash');
        console.log('🎲 Plinko namespace: /plinko');

        // Start Python backend after Node server is listening
        setTimeout(startPythonBackend, 1000);
      });

    // ------------ Graceful shutdown
    const shutdown = (signal) => {
      console.log(`\n🛑 Received ${signal}. Shutting down...`);
      stopPythonBackend();
      io.close(() => {
        httpServer.close(() => {
          console.log('✅ HTTP server closed.');
          process.exit(0);
        });
      });
      // Fallback hard-exit if something hangs
      setTimeout(() => process.exit(0), 5000).unref();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  })
  .catch((err) => {
    console.error('❌ Failed to prepare Next app:', err);
    process.exit(1);
  });
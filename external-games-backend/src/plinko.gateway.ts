import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PlinkoService, BetRecord } from './plinko.service';
import { RiskLevel } from './payouts';

type RoundState = 'IDLE' | 'COUNTDOWN' | 'RUNNING';

interface PlayerJoin {
  userId: number;
  bet: number;
  risk: RiskLevel;
  rows: 8;
  clientSeed: string;
}

interface Round {
  id: string;
  state: RoundState;
  countdownEndsAt: number;
  players: Map<number, PlayerJoin>;
}

interface JoinRoundPayload {
  userId: number;
  bet: number;
  risk: 'easy' | 'medium' | 'hard';
  rows: 8;
  clientSeed: string;
}

interface ChatMessage {
  id: string;
  userId: number;
  username: string;
  message: string;
  timestamp: number;
}

interface SendChatMessagePayload {
  userId: number;
  username: string;
  message: string;
}

@WebSocketGateway({
  namespace: '/ws/plinko',
  cors: { origin: '*' }
})
export class PlinkoGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private currentRound: Round | null = null;
  private countdownTimer: NodeJS.Timeout | null = null;
  private updateTimer: NodeJS.Timeout | null = null;
  private chatHistory: ChatMessage[] = [];
  private readonly MAX_CHAT_HISTORY = 50;

  constructor(private readonly plinkoService: PlinkoService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    this.sendRoundUpdate();
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('get_chat_history')
  handleGetChatHistory(@ConnectedSocket() client: Socket) {
    client.emit('chat_history', this.chatHistory);
  }

  @SubscribeMessage('send_chat_message')
  handleSendChatMessage(
    @MessageBody() payload: SendChatMessagePayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Validate payload
      if (!payload.userId || !payload.username || !payload.message) {
        return;
      }

      // Validate message length
      const trimmedMessage = payload.message.trim();
      if (trimmedMessage.length === 0 || trimmedMessage.length > 200) {
        return;
      }

      // Create chat message
      const chatMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: payload.userId,
        username: payload.username,
        message: trimmedMessage,
        timestamp: Date.now(),
      };

      // Add to history
      this.chatHistory.push(chatMessage);

      // Trim history if too long
      if (this.chatHistory.length > this.MAX_CHAT_HISTORY) {
        this.chatHistory = this.chatHistory.slice(-this.MAX_CHAT_HISTORY);
      }

      // Broadcast to all clients
      this.server.emit('chat_message', chatMessage);

      console.log(`Chat message from ${payload.username}: ${trimmedMessage}`);
    } catch (error) {
      console.error('Error in send_chat_message:', error);
    }
  }

  @SubscribeMessage('join_round')
  async handleJoinRound(
    @MessageBody() payload: JoinRoundPayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Validate payload
      if (!payload.userId || !payload.bet || !payload.risk || !payload.clientSeed) {
        client.emit('error', { code: 'INVALID_PAYLOAD', message: 'Missing required fields' });
        return;
      }

      if (payload.bet <= 0 || payload.bet > 100) {
        client.emit('error', { code: 'INVALID_BET', message: 'Bet must be between 0.1 and 100 SOL' });
        return;
      }

      if (!['easy', 'medium', 'hard'].includes(payload.risk)) {
        client.emit('error', { code: 'INVALID_RISK', message: 'Risk must be easy, medium, or hard' });
        return;
      }

      // Check if user has sufficient balance
      const balance = this.plinkoService.getBalance(payload.userId);
      if (balance < payload.bet) {
        client.emit('error', { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient balance' });
        return;
      }

      // Handle different round states
      if (this.currentRound?.state === 'RUNNING') {
        client.emit('error', { code: 'ROUND_LOCKED', message: 'Round is already running' });
        return;
      }

      // If no round exists or round is IDLE, create new round
      if (!this.currentRound || this.currentRound.state === 'IDLE') {
        this.startNewRound();
      }

      // Add/update player in current round
      if (this.currentRound && this.currentRound.state === 'COUNTDOWN') {
        this.currentRound.players.set(payload.userId, {
          userId: payload.userId,
          bet: payload.bet,
          risk: payload.risk as RiskLevel,
          rows: 8,
          clientSeed: payload.clientSeed,
        });

        // Acknowledge the join
        client.emit('joined', {
          roundId: this.currentRound.id,
          userId: payload.userId,
        });

        this.sendRoundUpdate();
      }
    } catch (error) {
      console.error('Error in join_round:', error);
      client.emit('error', { code: 'INTERNAL_ERROR', message: 'Internal server error' });
    }
  }

  private startNewRound() {
    // Clear any existing timers
    this.clearTimers();

    // Create new round
    this.currentRound = {
      id: `round_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      state: 'COUNTDOWN',
      countdownEndsAt: Date.now() + 10000, // 10 seconds
      players: new Map(),
    };

    console.log(`Started new round: ${this.currentRound.id}`);

    // Start countdown timer
    this.countdownTimer = setTimeout(() => {
      this.startRoundExecution();
    }, 10000);

    // Start update timer for broadcasting round state
    this.updateTimer = setInterval(() => {
      this.sendRoundUpdate();
    }, 250);

    this.sendRoundUpdate();
  }

  private async startRoundExecution() {
    if (!this.currentRound || this.currentRound.state !== 'COUNTDOWN') {
      return;
    }

    // Clear update timer
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    // Check if we have players
    if (this.currentRound.players.size === 0) {
      this.resetToIdle();
      return;
    }

    // Lock the round
    this.currentRound.state = 'RUNNING';
    const lockedPlayers = Array.from(this.currentRound.players.values());
    const startedAt = Date.now();

    // Broadcast round started
    this.server.emit('round_started', {
      roundId: this.currentRound.id,
      lockedPlayers: lockedPlayers.length,
      startedAt,
    });

    console.log(`Round ${this.currentRound.id} started with ${lockedPlayers.length} players`);

    // Process all bets
    const results: (BetRecord & { roundId: string })[] = [];
    
    try {
      // Process bets sequentially to maintain order
      for (const player of lockedPlayers) {
        try {
          const result = this.plinkoService.placeBet(
            player.userId,
            player.bet,
            player.rows,
            player.risk,
            player.clientSeed
          );

          const resultWithRound = {
            ...result,
            roundId: this.currentRound.id,
          };

          results.push(resultWithRound);

          // Emit individual result
          this.server.emit('your_result', resultWithRound);

          // Small delay between results for better UX
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error processing bet for user ${player.userId}:`, error);
          // Continue with other players even if one fails
        }
      }

      // Wait a bit for animations to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Broadcast round finished
      const durationMs = Date.now() - startedAt;
      this.server.emit('round_finished', {
        roundId: this.currentRound.id,
        durationMs,
      });

      console.log(`Round ${this.currentRound.id} finished in ${durationMs}ms`);

      // Reset to idle after a short delay
      setTimeout(() => {
        this.resetToIdle();
      }, 1000);

    } catch (error) {
      console.error('Error during round execution:', error);
      this.resetToIdle();
    }
  }

  private resetToIdle() {
    this.clearTimers();
    this.currentRound = null;
    this.sendRoundUpdate();
    console.log('Round reset to IDLE');
  }

  private clearTimers() {
    if (this.countdownTimer) {
      clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  private sendRoundUpdate() {
    const now = Date.now();
    let roundUpdate;

    if (!this.currentRound) {
      roundUpdate = {
        state: 'IDLE' as RoundState,
        roundId: null,
        players: 0,
        timeLeftMs: 0,
      };
    } else {
      const timeLeftMs = Math.max(0, this.currentRound.countdownEndsAt - now);
      
      roundUpdate = {
        state: this.currentRound.state,
        roundId: this.currentRound.id,
        players: this.currentRound.players.size,
        timeLeftMs: this.currentRound.state === 'COUNTDOWN' ? timeLeftMs : 0,
      };
    }

    this.server.emit('round_update', roundUpdate);
  }

  // Cleanup on module destroy
  onModuleDestroy() {
    this.clearTimers();
  }
}

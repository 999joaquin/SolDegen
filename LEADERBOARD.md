# 🏆 Dynamic Real-Time Leaderboard

## Overview
The leaderboard system tracks player performance across Plinko and Crash games with real-time updates via WebSocket connections.

## Features

### ✨ Core Features
- **Real-Time Updates**: Leaderboard updates instantly when players win/lose
- **Multi-Game Support**: Track stats for Plinko, Crash, or combined (All Games)
- **Time Frames**: Filter by Daily, Weekly, or All-Time statistics
- **Rank Tracking**: See rank changes with up/down indicators
- **Top 50 Display**: Shows top 50 players with detailed stats

### 📊 Statistics Tracked
- **Total Profit**: Net profit/loss (primary ranking metric)
- **Total Wagered**: Sum of all bets placed
- **Games Played**: Total number of games
- **Win Rate**: Percentage of games won
- **Biggest Win**: Highest single game payout

### 🎯 Rank Indicators
- 🥇 **1st Place**: Gold medal + yellow text
- 🥈 **2nd Place**: Silver medal + gray text
- 🥉 **3rd Place**: Bronze medal + amber text
- **4th+**: Numeric rank + zinc text
- **Rank Changes**: Green ↑ for up, Red ↓ for down

## Technical Implementation

### Files Structure
```
app/
  ├── leaderboard/
  │   └── page.tsx          # Main leaderboard UI component
  ├── api/
  │   └── leaderboard/
  │       └── route.ts      # API endpoints (GET, POST)
lib/
  └── leaderboardApi.ts     # Helper functions for API calls
```

### API Endpoints

#### GET `/api/leaderboard`
Fetches current leaderboard rankings.

**Query Parameters:**
- `game`: 'plinko' | 'crash' | 'all' (default: 'all')
- `timeframe`: 'daily' | 'weekly' | 'allTime' (default: 'allTime')

**Response:**
```typescript
[
  {
    userId: number;
    username: string;
    totalWagered: number;
    totalProfit: number;
    gamesPlayed: number;
    biggestWin: number;
    winRate: number;
    rank: number;
  }
]
```

#### POST `/api/leaderboard`
Updates player statistics after game completion.

**Request Body:**
```typescript
{
  userId: number;
  username: string;
  game: 'plinko' | 'crash';
  wagered: number;
  profit: number;
  isWin: boolean;
  payout: number;
}
```

### Real-Time Updates

The leaderboard listens to WebSocket events from both game sockets:

```typescript
// Plinko socket
plinkoSocket.on('leaderboard_update', handleLeaderboardUpdate);

// Crash socket
crashSocket.on('leaderboard_update', handleLeaderboardUpdate);
```

Updates are triggered automatically when:
1. Plinko ball lands (after animation completes)
2. Crash player cashes out
3. Crash game crashes (for busted players)

### Integration Points

#### Plinko Game Integration
Located in `app/plinko/page.tsx`:
```typescript
// Update leaderboard after animation completes
const profit = finalResult.payout - bet;
updateLeaderboard({
  userId,
  username,
  game: 'plinko',
  wagered: bet,
  profit,
  isWin: finalResult.result === 'win',
  payout: finalResult.payout,
});
```

#### Crash Game Integration
Located in `app/crash/page.tsx`:
```typescript
// Update on cashout
const profit = data.payout - bet;
updateLeaderboard({
  userId,
  username,
  game: 'crash',
  wagered: bet,
  profit,
  isWin: profit > 0,
  payout: data.payout,
});

// Update on crash (busted)
const profit = -bet;
updateLeaderboard({
  userId,
  username,
  game: 'crash',
  wagered: bet,
  profit,
  isWin: false,
  payout: 0,
});
```

## Data Storage

Currently uses **in-memory storage** (Map) for demo purposes. 

### Production Considerations
For production, replace with:
- **PostgreSQL** via Supabase (recommended)
- **Redis** for caching
- **MongoDB** for document storage

Example Supabase schema:
```sql
CREATE TABLE leaderboard_stats (
  user_id BIGINT PRIMARY KEY,
  username TEXT NOT NULL,
  plinko_wagered DECIMAL DEFAULT 0,
  plinko_profit DECIMAL DEFAULT 0,
  plinko_games INT DEFAULT 0,
  plinko_wins INT DEFAULT 0,
  plinko_biggest_win DECIMAL DEFAULT 0,
  crash_wagered DECIMAL DEFAULT 0,
  crash_profit DECIMAL DEFAULT 0,
  crash_games INT DEFAULT 0,
  crash_wins INT DEFAULT 0,
  crash_biggest_win DECIMAL DEFAULT 0,
  last_update TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_total_profit ON leaderboard_stats ((plinko_profit + crash_profit) DESC);
CREATE INDEX idx_plinko_profit ON leaderboard_stats (plinko_profit DESC);
CREATE INDEX idx_crash_profit ON leaderboard_stats (crash_profit DESC);
```

## Responsive Design

The leaderboard is fully responsive:
- **Mobile**: Stacked layout, essential stats only
- **Tablet**: 2-column filters, more stats visible
- **Desktop**: Full table with all statistics

### Breakpoints
- `sm`: 640px - Shows player avatars
- `md`: 768px - Shows Total Wagered column
- `lg`: 1024px - Shows Games and Win Rate columns
- `xl`: 1280px - Shows Biggest Win column

## Auto-Refresh

Leaderboard auto-refreshes every 10 seconds:
```typescript
const interval = setInterval(() => {
  loadLeaderboard();
}, 10000);
```

## UI Components

### Filter Buttons
- Game Type: All Games | Plinko | Crash
- Time Frame: Daily | Weekly | All Time

### Table Columns
1. **Rank**: Medal/number with change indicator
2. **Player**: Avatar + username
3. **Total Profit**: Green (positive) / Red (negative)
4. **Total Wagered**: Total bets placed
5. **Games**: Number of games played
6. **Win Rate**: Percentage with 1 decimal
7. **Biggest Win**: Highest single win

### Loading States
- Spinner animation while loading
- Empty state with trophy icon when no data

## Performance Optimization

### Client-Side
- Debounced updates to prevent spam
- Memoized calculations
- Efficient re-renders with proper keys

### Server-Side
- Top 50 limit on results
- Indexed database queries (when DB implemented)
- Cached computations

## Future Enhancements

### Planned Features
- [ ] Time-based filtering (last 24h, 7d, 30d)
- [ ] Search/filter by username
- [ ] Player profile pages
- [ ] Historical rank charts
- [ ] Achievements/badges system
- [ ] Pagination for 50+ players
- [ ] Export leaderboard data
- [ ] Social sharing features

### Technical Improvements
- [ ] Database persistence
- [ ] Redis caching layer
- [ ] Rate limiting on updates
- [ ] Webhook notifications for rank changes
- [ ] GraphQL API option
- [ ] WebSocket broadcast optimization

## Testing

### Manual Testing
1. Play Plinko games - verify stats update
2. Play Crash games - verify stats update
3. Switch between game filters
4. Check rank change indicators
5. Verify responsive layout on mobile

### Automated Testing (TODO)
```typescript
// Example test structure
describe('Leaderboard', () => {
  it('should update rank after game', async () => {
    // Test implementation
  });
  
  it('should show correct rank changes', () => {
    // Test implementation
  });
});
```

## Troubleshooting

### Leaderboard Not Updating
1. Check WebSocket connections are active
2. Verify `updateLeaderboard()` is called after games
3. Check browser console for errors
4. Ensure API endpoint is reachable

### Incorrect Rankings
1. Verify profit calculation logic
2. Check data sorting in API
3. Validate database/storage data

### Performance Issues
1. Reduce auto-refresh interval
2. Implement pagination
3. Add server-side caching
4. Optimize database queries

## Color Scheme (Consistent with Crash)

- Background: `zinc-900/70` with border `zinc-800`
- Cards: `zinc-800/50`
- Borders: `zinc-700`
- Text Primary: `white`
- Text Secondary: `zinc-300`
- Text Tertiary: `zinc-400`
- Accent: `purple-400/500`
- Success: `green-400`
- Error: `red-400`
- Warning: `yellow-400`

---

**Built with:** Next.js 14, TypeScript, Tailwind CSS, Socket.IO
**Status:** ✅ Fully Functional (In-Memory Demo)
**Production Ready:** After database integration

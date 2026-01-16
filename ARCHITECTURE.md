# x402 Tic-Tac-Toe - Architecture Document

## Project Overview

A browser-based tic-tac-toe game demonstrating x402 payment protocol integration. Players pay per game using USDC on the Base Sepolia network via a browser wallet extension.

## Technology Stack

| Component | Technology |
|-----------|------------|
| Server | Node.js with Express (TypeScript) |
| Client | React with Vite (TypeScript) |
| Payment Protocol | x402 |
| Network | Base Sepolia (MVP), Base Mainnet (future) |
| Payment Token | USDC |
| Wallet Integration | wagmi/viem with browser extensions (MetaMask, Rabby, etc.) |

## Game Mode

- **Player vs Bot**: Single player games against a server-side Bot opponent
- **First Move**: Random (player or Bot)
- **Bot Difficulty**: Simple (allows mistakes for better UX)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  Landing Page                     │  Game Page                  │
│  ┌─────────────────────────────┐  │  ┌───────────────────────┐  │
│  │  "Start Game" Button        │  │  │  Tic-Tac-Toe Board    │  │
│  │  (triggers wallet connect   │  │  │  Game State Display   │  │
│  │   then payment flow)        │  │  └───────────────────────┘  │
│  └─────────────────────────────┘  │             │               │
│               │                   │             ▼               │
│               ▼                   │  ┌───────────────────────┐  │
│  ┌─────────────────────────────┐  │  │  Session Management   │  │
│  │  Wallet Extension           │  │  │  (wallet address      │  │
│  │  (MetaMask/Rabby)           │  │  │   in sessionStorage)  │  │
│  │  Signs x402 payment         │  │  └───────────────────────┘  │
│  └─────────────────────────────┘  │                             │
└───────────────────────────────────┴─────────────────────────────┘
                    │                             │
                    │ x402 Payment Header         │ Game Moves
                    ▼                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SERVER (Express)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  x402 Middleware                                            ││
│  │  - Validates payment headers                                ││
│  │  - Extracts wallet address from payment                     ││
│  │  - Protects paid endpoints                                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                  │
│  ┌───────────────────────────┼──────────────────────────────┐  │
│  │                           ▼                              │  │
│  │  POST /api/session/start (PAID - x402 protected)         │  │
│  │  - Checks if wallet has active session → return existing │  │
│  │  - Creates new session bound to wallet address           │  │
│  │  - Returns session info + initial board state            │  │
│  │  - Sets 5 min expiry                                     │  │
│  │                                                          │  │
│  │  POST /api/game/move (Session validated by wallet)       │  │
│  │  - Looks up session by wallet address                    │  │
│  │  - Validates session exists and not expired              │  │
│  │  - Processes player move                                 │  │
│  │  - Returns Bot move + game state                          │  │
│  │  - Invalidates session immediately on game end           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Session Store (in-memory Map)                             ││
│  │  - walletAddress → { createdAt, expiresAt, gameState }     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Game Engine (Simple Bot with occasional mistakes)          ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Payment Flow

### 1. User Initiates Game

```
User clicks "Start Game"
    → If wallet not connected: prompt wallet connection
    → If wallet connected: proceed to payment
```

### 2. Wallet Signs Payment

```
Client → Wallet Extension (MetaMask/Rabby)
       → User approves USDC payment
       → Wallet signs payment payload
       → Returns signed x402 header
```

### 3. Paid API Call

```
Client sends POST /api/session/start
Headers: {
  "X-Payment": <signed x402 payment payload>
}
```

### 4. Server Validates & Creates Session

```
x402 Middleware validates payment
       → Extract wallet address from payment
       → Check if wallet has active session
           → Yes: Return existing session (no new payment processed)
           → No: Create new session, return session info
       → Payment invalid: Return 402 Payment Required
```

### 5. Game Play

```
Client stores wallet address in sessionStorage
All subsequent /api/game/move calls include wallet address
Server looks up session by wallet address
Game ends → Session immediately invalidated
```

---

## Session Management

### Session Properties

| Property | Description |
|----------|-------------|
| `walletAddress` | Primary key - the paying wallet address |
| `createdAt` | Timestamp of session creation |
| `expiresAt` | createdAt + 5 minutes |
| `gameState` | Current tic-tac-toe board state |
| `status` | `created`, `active`, `completed`, `expired` |
| `playerFirst` | Boolean - whether player has played already |

### Session Lifecycle

1. **Created**: After successful x402 payment (or restored if active session exists)
2. **Active**: Player has made at leas one move already.
3. **Completed**: Game finished (win/lose/draw) → **Immediately invalidated**
4. **Expired**: 5 minutes elapsed without completion

### Key Behaviors

- **One session per wallet**: A wallet can only have one active session at a time
- **Session restoration**: If wallet has active session and clicks "Start Game", restore existing session (no payment taken)
- **Immediate invalidation**: Session expired immediately when game ends, allowing new game
- **Stale session handling**: If client has stale session (server cleared), prompt to start new game (pay again)

### Disconnection Handling

- Session persists server-side for 5 minutes
- Client can reconnect using wallet address (looked up via sessionStorage)
- Expired sessions are cleaned up periodically

---

## API Endpoints

### `POST /api/session/start` (x402 Protected)

**Payment**: Required (USDC on Base Sepolia)

**Behavior**:
- If wallet has active session → return existing session (payment not processed)
- If no active session → create new session

**Response**:
```json
{
  "walletAddress": "0x...",
  "board": [null, null, null, null, null, null, null, null, null],
  "playerFirst": true,
  "aiMove": null,
  "status": "active",
  "expiresAt": "ISO-8601 timestamp"
}
```

If Bot moves first:
```json
{
  "walletAddress": "0x...",
  "board": [null, null, null, null, "O", null, null, null, null],
  "playerFirst": false,
  "aiMove": 4,
  "status": "active",
  "expiresAt": "ISO-8601 timestamp"
}
```

### `POST /api/game/move`

**Request**:
```json
{
  "walletAddress": "0x...",
  "position": 0-8
}
```

**Response (success)**:
```json
{
  "board": ["X", null, "O", ...],
  "aiMove": 4,
  "status": "ongoing|player_wins|ai_wins|draw"
}
```

**Response (invalid move)** → 400 status, client shows error toast:
```json
{
  "error": "Invalid move",
  "message": "Cell is already occupied"
}
```

**Response (no session)** → 404 status, client prompts new game:
```json
{
  "error": "Session not found",
  "message": "Please start a new game"
}
```

### `GET /api/session/:walletAddress`

**Response (active session)**:
```json
{
  "walletAddress": "0x...",
  "board": ["X", null, "O", ...],
  "status": "active",
  "playerFirst": true,
  "expiresAt": "ISO-8601 timestamp"
}
```

**Response (no session)** → 404 status

---

## x402 Configuration

### Server Configuration

```typescript
{
  network: "base-sepolia",
  paymentToken: "USDC",
  paymentAddress: "<server-wallet-address>",
  pricePerGame: "0.01" // USDC
}
```

### Client Configuration

```typescript
{
  network: "base-sepolia",
  paymentToken: "USDC"
}
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Payment succeeds, session creation fails | Hard crash (MVP) |
| Invalid move (occupied cell, out of range) | 400 response, error toast on client |
| Session not found / expired | 404 response, prompt to start new game |
| x402 validation service down | Game unavailable |
| Wallet not connected | Prompt connection on "Start Game" click |

### Future Improvements (Post-MVP)

- If payment succeeds but session fails, track wallet for retry on next request
- Credit back wallets that paid but never made a move (after 5 min expiry)

---

## Security Considerations

### Server-Side Protection

1. **x402 Middleware**: Validates all payment headers on protected endpoints
2. **Session-Wallet Binding**: Sessions tied to wallet address, preventing session theft
3. **One Session Per Wallet**: Prevents abuse through multiple concurrent sessions
4. **Rate Limiting**: Prevent abuse of endpoints

### Client-Side

1. **Secure Session Storage**: Store wallet address in sessionStorage (cleared on tab close)
2. **Wallet Connection**: Only connect when "Start Game" is clicked

---

## Project Structure

```
tic-tac-toe-x402/
├── client/                 # React frontend (TypeScript)
│   ├── src/
│   │   ├── components/
│   │   │   ├── LandingPage.tsx
│   │   │   ├── GameBoard.tsx
│   │   │   └── WalletConnect.tsx
│   │   ├── hooks/
│   │   │   ├── useWallet.ts      # wagmi hooks
│   │   │   └── useSession.ts
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── x402.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── server/                 # Express backend (TypeScript)
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── x402.ts
│   │   │   └── session.ts
│   │   ├── routes/
│   │   │   ├── session.ts
│   │   │   └── game.ts
│   │   ├── services/
│   │   │   ├── sessionStore.ts   # In-memory Map
│   │   │   └── gameEngine.ts     # Simple Bot
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
└── README.md
```

---

## MVP Decisions Summary

| Decision | Choice |
|----------|--------|
| Network | Base Sepolia |
| Payment model | One payment = one game |
| Session storage | In-memory (single server) |
| Session binding | Bound to wallet address |
| Sessions per wallet | One at a time |
| Session expiry | 5 minutes |
| First move | Random |
| Bot difficulty | Simple (allows mistakes) |
| Horizontal scaling | Not supported |
| Metrics/Observability | None |
| Wallet connection | On-demand (after button click) |
| Client framework | Plain React + Vite |
| Wallet library | wagmi/viem |
| Language | TypeScript (client & server) |

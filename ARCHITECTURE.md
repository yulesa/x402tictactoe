# Tic-Tac-Toe x402 - Architecture Document

## Project Overview

A browser-based tic-tac-toe game demonstrating x402 payment protocol integration. Players pay per game using USDC on the Base network via a browser wallet extension.

## Technology Stack

| Component | Technology |
|-----------|------------|
| Server | Node.js with Express |
| Client | React |
| Payment Protocol | x402 |
| Network | Base |
| Payment Token | USDC |
| Wallet Integration | Browser extensions (MetaMask, Rabby, etc.) |

## Game Mode

- **Player vs AI**: Single player games against a server-side AI opponent

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                          │
├─────────────────────────────────────────────────────────────────┤
│  Landing Page                     │  Game Page                  │
│  ┌─────────────────────────────┐  │  ┌───────────────────────┐  │
│  │  "Start Game" Button        │  │  │  Tic-Tac-Toe Board    │  │
│  │  (triggers payment flow)    │  │  │  Game State Display   │  │
│  └─────────────────────────────┘  │  └───────────────────────┘  │
│               │                   │             │               │
│               ▼                   │             ▼               │
│  ┌─────────────────────────────┐  │  ┌───────────────────────┐  │
│  │  Wallet Extension           │  │  │  Session Management   │  │
│  │  (MetaMask/Rabby)           │  │  │  (sessionId storage)  │  │
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
│  │  - Protects paid endpoints                                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                  │
│  ┌───────────────────────────┼──────────────────────────────┐  │
│  │                           ▼                              │  │
│  │  POST /api/session/start (PAID - x402 protected)         │  │
│  │  - Creates new game session                              │  │
│  │  - Returns sessionId                                     │  │
│  │  - Sets 5 min expiry                                     │  │
│  │                                                          │  │
│  │  POST /api/game/move (FREE - session validated)          │  │
│  │  - Validates sessionId                                   │  │
│  │  - Processes player move                                 │  │
│  │  - Returns AI move + game state                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Session Store (in-memory or Redis)                        ││
│  │  - sessionId → { createdAt, expiresAt, gameState }         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Game Engine (AI Logic)                                    ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Payment Flow

### 1. User Initiates Game

```
User clicks "Start Game" → Client prepares x402 payment request
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
       → Payment valid: Create session, return sessionId
       → Payment invalid: Return 402 Payment Required
```

### 5. Game Play

```
Client stores sessionId
All subsequent /api/game/move calls include sessionId
Server validates session before processing moves
```

---

## Session Management

### Session Properties

| Property | Description |
|----------|-------------|
| `sessionId` | Unique identifier (UUID) |
| `createdAt` | Timestamp of session creation |
| `expiresAt` | createdAt + 5 minutes |
| `gameState` | Current tic-tac-toe board state |
| `status` | `active`, `completed`, `expired` |

### Session Lifecycle

1. **Created**: After successful x402 payment
2. **Active**: Player can make moves
3. **Completed**: Game finished (win/lose/draw)
4. **Expired**: 5 minutes elapsed without completion

### Disconnection Handling

- Session persists server-side for 5 minutes
- Client can reconnect and resume game using stored sessionId
- Expired sessions are cleaned up periodically

---

## API Endpoints

### `POST /api/session/start` (x402 Protected)

**Payment**: Required (USDC on Base)

**Response**:
```json
{
  "sessionId": "uuid-v4",
  "expiresAt": "ISO-8601 timestamp"
}
```

### `POST /api/game/move` (Session Protected)

**Request**:
```json
{
  "sessionId": "uuid-v4",
  "position": 0-8
}
```

**Response**:
```json
{
  "board": ["X", null, "O", ...],
  "aiMove": 4,
  "status": "ongoing|player_wins|ai_wins|draw",
  "sessionValid": true
}
```

### `GET /api/session/:sessionId` (Session Protected)

**Response**:
```json
{
  "sessionId": "uuid-v4",
  "board": ["X", null, "O", ...],
  "status": "active",
  "expiresAt": "ISO-8601 timestamp"
}
```

---

## x402 Configuration

### Server Configuration

```javascript
{
  network: "base",
  paymentToken: "USDC",
  paymentAddress: "<server-wallet-address>",
  pricePerGame: "0.01" // USDC
}
```

### Client Configuration

```javascript
{
  network: "base",
  paymentToken: "USDC"
}
```

---

## Security Considerations

### Server-Side Protection

1. **x402 Middleware**: Validates all payment headers on protected endpoints
2. **Session Validation**: All game endpoints verify valid, non-expired session
3. **Rate Limiting**: Prevent abuse of free endpoints
4. **Session Binding**: Sessions tied to initial payment proof

### Client-Side

1. **Secure Session Storage**: Store sessionId in memory or sessionStorage (not localStorage)
2. **Wallet Connection**: Only connect to wallet when payment needed

---

## Project Structure

```
tic-tac-toe-x402/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── GameBoard.jsx
│   │   │   └── WalletConnect.jsx
│   │   ├── hooks/
│   │   │   ├── useWallet.js
│   │   │   └── useSession.js
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── x402.js
│   │   └── App.jsx
│   └── package.json
│
├── server/                 # Express backend
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── x402.js
│   │   │   └── session.js
│   │   ├── routes/
│   │   │   ├── session.js
│   │   │   └── game.js
│   │   ├── services/
│   │   │   ├── sessionStore.js
│   │   │   └── gameEngine.js
│   │   └── index.js
│   └── package.json
│
└── README.md
```

---

## Open Questions / Decisions to Make

- [ ] Exact USDC price per game?
- [ ] Session store: In-memory vs Redis?
- [ ] AI difficulty level?
- [ ] Use existing tic-tac-toe implementation or build from scratch?

# Tic-Tac-Toe x402

A pay-per-play Tic-Tac-Toe game demonstrating x402 payment protocol integration. Players pay 0.01 USDC per game. Supports both Base mainnet and Base Sepolia testnet (default).

## Quick Start

### Prerequisites

- Node.js 18+
- A browser wallet (MetaMask, Rabby, etc.)
- USDC on your chosen network:
  - **Base Sepolia** (default): Get testnet USDC via the CDP Faucet
  - **Base mainnet**: Requires buying Real USDC (1 USD token)

### Installation

```bash
# Copy environment files
cp server/.env.example server/.env
cp client/.env.example client/.env.local

# Install dependencies
cd server && npm install
cd ../client && npm install
```

Configure your environment variables in `server/.env` and `client/.env.local`. Set `NETWORK` to `base-sepolia` (default) or `base` for mainnet. Both client and server must use the same network.

### Running

```bash
# Terminal 1 - Start server
cd server && npm run dev

# Terminal 2 - Start client
cd client && npm run dev
```

Open http://localhost:5173 in your browser.

## How It Works

1. **Connect Wallet** - Click "Connect Wallet & Play" to connect your browser wallet
2. **Sign Payment** - Sign a message to authorize the 0.01 USDC payment
3. **Play** - Make moves on the 3x3 grid. You are always playing X, Bot is O
4. **Game Over** - Win, lose, or draw. Pay again to play another game

## Project Structure

```
├── server/                 # Express backend (TypeScript)
│   └── src/
│       ├── index.ts        # Server entry point
│       ├── middleware/
│       │   └── x402.ts     # Payment validation
│       ├── routes/
│       │   ├── session.ts  # Session management
│       │   └── game.ts     # Game moves
│       └── services/
│           ├── sessionStore.ts  # In-memory sessions
│           └── gameEngine.ts    # Bot logic
│
└── client/                 # React frontend (TypeScript)
    └── src/
        ├── App.tsx         # Main component
        ├── main.tsx        # Wagmi setup
        ├── components/
        │   ├── LandingPage.tsx
        │   ├── GameBoard.tsx
        │   └── WalletConnect.tsx
        ├── hooks/
        │   └── useSession.ts
        └── services/
            └── api.ts
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/session/start` | POST | Start new game (x402 protected) |
| `/api/session/:wallet` | GET | Get session status |
| `/api/game/move` | POST | Make a move |


### Server Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Server port |
| `NETWORK` | `base-sepolia` | Network selection: `base` or `base-sepolia` |
| `PAYMENT_ADDRESS` | 0x0...0 | Wallet to receive payments |
| `FACILITATOR_URL` | `https://x402.org/facilitator` | x402 facilitator endpoint |

## Tech Stack

- **Server**: Node.js, Express, TypeScript
- **Client**: React, Vite, TypeScript
- **Wallet**: wagmi, viem, RainbowKit
- **Networks**: Base mainnet & Base Sepolia testnet
- **Payment**: x402 protocol, USDC

## License

MIT

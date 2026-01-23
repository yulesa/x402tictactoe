# x402 Tic-Tac-Toe

A pay-per-play Tic-Tac-Toe game demonstrating x402 payment protocol integration. Players pay 0.01 USDC per game using a browser wallet. Supports both Base mainnet and Base Sepolia testnet.

## Quick Start

### Prerequisites

- Node.js 18+
- A browser wallet (MetaMask, Rabby, Rainbow, Coinbase Wallet, etc.)
- USDC on your chosen network:
  - **Base mainnet**: Use the built-in fiat onramp or transfer USDC to Base
  - **Base Sepolia** (testnet): Get testnet USDC via the CDP Faucet

### Installation

```bash
# Copy environment files
cp server/.env.example server/.env
cp client/.env.example client/.env.local

# Install dependencies
cd server && npm install
cd ../client && npm install
```

Configure your environment variables in `server/.env` and `client/.env.local`:
- Set `NETWORK` to `base` (mainnet) or `base-sepolia` (testnet)
- Set `VITE_THIRDWEB_CLIENT_ID` in `client/.env.local` (get from [Thirdweb Dashboard](https://thirdweb.com/dashboard))
- Both client and server must use the same network

### Running

```bash
# Terminal 1 - Start server
cd server && npm run dev

# Terminal 2 - Start client
cd client && npm run dev
```

Open http://localhost:5173 in your browser.

## How It Works

1. **Connect Wallet** - Click "Connect Wallet & Play" and select your wallet (MetaMask, Rabby, Rainbow, or Coinbase)
2. **Get USDC** - If needed, use the built-in "Need USDC?" modal to access fiat onramp or testnet faucet
3. **Sign Payment** - Approve and sign the 0.01 USDC payment transaction (one-time per game)
4. **Play** - Make moves on the 3x3 grid. You play as X, Bot plays as O. First player is random.
5. **Game Over** - Win, lose, or draw. Start a new game to play again (requires new payment)

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
        ├── main.tsx        # Thirdweb setup
        ├── thirdwebClient.ts  # Thirdweb SDK initialization
        ├── components/
        │   ├── LandingPage.tsx
        │   ├── GameBoard.tsx
        │   ├── WalletConnect.tsx
        │   └── modals/     # UI modals (HowToPlay, NeedUSDC, etc.)
        ├── hooks/
        │   ├── useSession.ts
        │   └── useGameStart.ts
        └── services/
            ├── api.ts
            └── x402.ts     # x402 payment service
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/session/start` | POST | Start new game (x402 protected) |
| `/api/session/:wallet` | GET | Get session status |
| `/api/game/move` | POST | Make a move |


## Environment Variables

### Server (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3001) |
| `NETWORK` | Yes | Network selection: `base` or `base-sepolia` |
| `PAYMENT_ADDRESS` | Yes | Wallet address to receive payments |
| `FACILITATOR_URL` | Yes | x402 facilitator endpoint (CDP API for mainnet) |
| `CDP_API_KEY_ID` | Mainnet only | Coinbase CDP API key ID |
| `CDP_API_KEY_SECRET` | Mainnet only | Coinbase CDP API key secret |

### Client (`client/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_THIRDWEB_CLIENT_ID` | Yes | Thirdweb API client ID from dashboard |
| `VITE_NETWORK` | Yes | Network selection: `base` or `base-sepolia` |

## Tech Stack

- **Server**: Node.js, Express, TypeScript
- **Client**: React, Vite, TypeScript
- **Wallet**: Thirdweb SDK (wallet connection, onramp, network switching)
- **Blockchain**: viem, x402 protocol
- **Networks**: Base mainnet & Base Sepolia testnet
- **Payment**: x402 protocol with USDC
- **Deployment**: GitHub Actions (frontend), Render-ready (backend)

## License

MIT

# How to Play x402 Tic-Tac-Toe

This demo shows x402 in action—a pay-per-play Tic-Tac-Toe game where each match costs 0.01 USDC. No subscriptions, no accounts. Just connect your wallet, approve the payment, and play.

## What You'll Need

**A browser wallet.** MetaMask, Rainbow, Rabby, or any wallet that works as a browser extension or phone wallet. If you don't have one, we suggest Rainbow Wallet. Click on Connect Wallet and Play and choose one. 

**USDC on Base network.** The game uses USDC (a stablecoin pegged 1:1 to the US dollar) on the Base blockchain. You'll need at least 0.01 USDC to play one game.

The demo supports two networks:
- **Base Sepolia** (testnet) — Uses free test USDC. Perfect for trying the demo without spending real money.
- **Base Mainnet** — Uses real USDC. Each game costs actual money (one cent).

## Playing the Game

Once your wallet is funded:

1. **Click "Connect Wallet & Play"** — Your wallet extension will prompt you to connect
2. **Approve the connection** — Select the account you want to use and confirm
3. **Sign the payment** — Your wallet will show a payment request for 0.01 USDC. Review and approve it
4. **Play** — The game board appears. You're X, the bot is O. Click any empty square to make your move
5. **Game ends** — Win, lose, or draw. To play again, click the button and approve another 0.01 USDC payment

The entire payment flow happens in miliseconds. You sign once, the blockchain settles the transaction, and you're playing. No checkout forms, no card numbers, no friction.

## What's Happening Behind the Scenes

When you click to start a game, the app requests access to a protected endpoint. The server responds with HTTP status 402 ("Payment Required") and includes payment details. Your wallet reads these details, asks you to sign, and sends the signed payment back. The server verifies the signature, settles the payment on-chain, and grants access.

This is x402 in action—HTTP-native payments without intermediaries. However is in its infancy. Applications might need a different payment scheme to fulfill the payment. Currently, it only supports exact schem. It transfers a specific amount (ex: pay $1 to read an article) and requires a signature for each payment. In the future, other schemes could be supported. Up-To, where a certain amount is pre-proved, Stream, etc.

## Troubleshooting

**"Insufficient funds"** — Make sure you have USDC on the correct network (Base Sepolia for testnet, Base for mainnet). Also ensure you have a small amount of ETH for gas fees.

**Wallet not connecting** — Refresh the page and try again. Make sure your wallet extension is unlocked.

---

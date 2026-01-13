import { Request, Response, NextFunction } from 'express';

// x402 configuration
export const x402Config = {
  network: 'base-sepolia',
  paymentToken: 'USDC',
  paymentAddress: process.env.PAYMENT_ADDRESS || '0x0000000000000000000000000000000000000000',
  pricePerGame: '0.01', // USDC
};

// Extend Request to include wallet address from payment
declare global {
  namespace Express {
    interface Request {
      walletAddress?: string;
    }
  }
}

// MVP x402 middleware - validates payment header and extracts wallet address
// In production, this would use the actual x402-express package for proper validation
export function x402Middleware(req: Request, res: Response, next: NextFunction): void {
  const paymentHeader = req.headers['x-payment'] as string;

  if (!paymentHeader) {
    res.status(402).json({
      error: 'Payment Required',
      message: 'x402 payment header missing',
      paymentDetails: {
        network: x402Config.network,
        token: x402Config.paymentToken,
        amount: x402Config.pricePerGame,
        recipient: x402Config.paymentAddress,
      },
    });
    return;
  }

  try {
    // MVP: Extract wallet address from payment header
    // Format expected: "wallet:<address>:signature:<sig>"
    // In production, this would validate the signature using x402 protocol
    const parts = paymentHeader.split(':');
    if (parts.length >= 2 && parts[0] === 'wallet') {
      req.walletAddress = parts[1];
      next();
      return;
    }

    // Also accept just a wallet address for testing
    if (paymentHeader.startsWith('0x') && paymentHeader.length === 42) {
      req.walletAddress = paymentHeader;
      next();
      return;
    }

    res.status(402).json({
      error: 'Invalid Payment',
      message: 'Payment header format invalid',
    });
  } catch {
    res.status(402).json({
      error: 'Payment Validation Failed',
      message: 'Could not validate payment',
    });
  }
}

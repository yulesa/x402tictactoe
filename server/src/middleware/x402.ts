import { Request, Response, NextFunction } from 'express';
import {
  x402ResourceServer,
  HTTPFacilitatorClient,
  type ResourceConfig,
} from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import type { PaymentRequirements } from '@x402/core/types';
import { createFacilitatorConfig } from '@coinbase/x402';
import { getSession } from '../services/sessionStore.js';

// x402 configuration (from environment variables)
const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS as `0x${string}`;
const NETWORK_ENV = process.env.NETWORK;
const FACILITATOR_URL = process.env.FACILITATOR_URL

if (!PAYMENT_ADDRESS) {
  throw new Error('PAYMENT_ADDRESS environment variable is required');
}

if (!NETWORK_ENV) {
  throw new Error('NETWORK environment variable is required');
}

if (!FACILITATOR_URL) {
  throw new Error('FACILITATOR_URL environment variable is required');
}

const PRICE_USD = '$0.01';

// Map network name to CAIP-2 chain ID format
const NETWORK_MAP = {
  'base': 'eip155:8453' as const,           // Base mainnet
  'base-sepolia': 'eip155:84532' as const,  // Base Sepolia testnet
};

const NETWORK = NETWORK_MAP[NETWORK_ENV as keyof typeof NETWORK_MAP];
if (!NETWORK) {
  throw new Error(`Invalid NETWORK environment variable: ${NETWORK_ENV}. Must be 'base' or 'base-sepolia'`);
}

// Configure facilitator based on network
const getFacilitatorConfig = () => {
  if (NETWORK_ENV === 'base') {

    if (FACILITATOR_URL === 'https://api.cdp.coinbase.com/platform/v2/x402') {
      // Mainnet: Use CDP facilitator with JWT authentication
      const cdpApiKeyId = process.env.CDP_API_KEY_ID;
      const cdpApiKeySecret = process.env.CDP_API_KEY_SECRET;

      if (!cdpApiKeyId || !cdpApiKeySecret) {
        throw new Error(
          'CDP_API_KEY_ID and CDP_API_KEY_SECRET are required for mainnet (base). ' +
          'Get your API keys from https://portal.cdp.coinbase.com/'
        );
      }
      return createFacilitatorConfig(cdpApiKeyId, cdpApiKeySecret);
    } else {
      return { url: FACILITATOR_URL };
    }
  } else if (NETWORK_ENV === 'base-sepolia') {
    return { url: FACILITATOR_URL };
  } else {
    throw new Error(`Invalid NETWORK: ${NETWORK_ENV}. Must be 'base' or 'base-sepolia'`);
  }
};

const facilitatorConfig = getFacilitatorConfig();

// Extend Request to include wallet address
declare global {
  namespace Express {
    interface Request {
      walletAddress?: string;
    }
  }
}

// Route payment configuration
interface RoutePaymentConfig extends ResourceConfig {
  description: string;
  mimeType: string;
}

const routeConfig: RoutePaymentConfig = {
  scheme: 'exact',
  price: PRICE_USD,
  network: NETWORK,
  payTo: PAYMENT_ADDRESS,
  description: 'Pay to start a new Tic-Tac-Toe game',
  mimeType: 'application/json',
};

// Initialize the x402 resource server
const facilitatorClient = new HTTPFacilitatorClient(facilitatorConfig);
const resourceServer = new x402ResourceServer(facilitatorClient).register(
  NETWORK,
  new ExactEvmScheme()
);

// Cached payment requirements
let cachedRequirements: PaymentRequirements | null = null;

// Initialize the resource server
export async function initX402(): Promise<void> {
  console.log('\n🔧 Initializing x402 Resource Server');
  console.log(`   Payment address: ${PAYMENT_ADDRESS}`);
  console.log(`   Facilitator: ${facilitatorConfig.url}`);
  console.log(`   Network: ${NETWORK} (${NETWORK_ENV})`);
  console.log(`   Price: ${PRICE_USD}`);
  console.log(`   Scheme: exact\n`);

  try {
    await resourceServer.initialize();
  } catch (error) {
    console.error('❌ Failed to initialize resource server:', error);
    throw error;
  }

  // Pre-build payment requirements
  const requirements = await resourceServer.buildPaymentRequirements(routeConfig);
  if (requirements.length === 0) {
    throw new Error('Failed to build payment requirements');
  }
  cachedRequirements = requirements[0];

  console.log('✅ x402 resource server initialized\n');
}

// x402 middleware for protected endpoints
export async function x402Middleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  console.log(`\n📥 Payment request received: ${req.method} ${req.path}`);

  if (!cachedRequirements) {
    console.log('❌ Payment requirements not initialized');
    res.status(500).json({ error: 'Server not initialized' });
    return;
  }

  // Check for payment header (v2: payment-signature, v1: x-payment)
  const paymentHeader =
    (req.headers['payment-signature'] as string) || (req.headers['x-payment'] as string);

  if (!paymentHeader) {
    console.log('💳 No payment provided, returning 402 Payment Required');

    const paymentRequired = resourceServer.createPaymentRequiredResponse(
      [cachedRequirements],
      {
        url: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        description: routeConfig.description,
        mimeType: routeConfig.mimeType,
      }
    );
    const requirementsHeader = Buffer.from(JSON.stringify(paymentRequired)).toString('base64');

    // Check if client provided a wallet address hint for session lookup
    const hintWalletAddress = req.body?.walletAddress as string | undefined;
    let existingSessionInfo: { hasExistingSession: boolean; expiresAt?: string } = {
      hasExistingSession: false,
    };

    if (hintWalletAddress) {
      const existingSession = getSession(hintWalletAddress);
      if (existingSession && !['player_wins', 'ai_wins', 'draw'].includes(existingSession.status)) {
        console.log(`   ℹ️  Found existing session for wallet hint: ${hintWalletAddress}`);
        existingSessionInfo = {
          hasExistingSession: true,
          expiresAt: existingSession.expiresAt.toISOString(),
        };
      }
    }

    res.status(402);
    res.setHeader('Payment-Required', requirementsHeader);
    res.json({
      error: 'Payment Required',
      message: 'Payment is required to start a game',
      requirements: cachedRequirements,
      ...existingSessionInfo,
    });
    return;
  }

  try {
    console.log('🔐 Payment header received, verifying with facilitator...');

    // Decode and verify the payment
    const paymentPayload = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf-8'));
    console.log(`   From wallet: ${paymentPayload.payload?.authorization?.from || 'unknown'}`);

    const verifyResult = await resourceServer.verifyPayment(paymentPayload, cachedRequirements);

    if (!verifyResult.isValid) {
      console.log(`❌ Payment verification failed: ${verifyResult.invalidReason}`);
      res.status(402).json({
        error: 'Payment Invalid',
        message: verifyResult.invalidReason || 'Payment verification failed',
      });
      return;
    }

    console.log('✅ Payment verified successfully');

    // Extract wallet address from the payment payload (this is the trusted source)
    req.walletAddress = paymentPayload.payload?.authorization?.from;
    console.log(`   Wallet address: ${req.walletAddress}`);

    // Check if this wallet has an existing active session (for session restoration)
    // This check uses the verified wallet from the payment signature, not any client hint
    const existingSession = req.walletAddress ? getSession(req.walletAddress) : null;
    const isRestoringSession = existingSession &&
      !['player_wins', 'ai_wins', 'draw'].includes(existingSession.status);

    if (isRestoringSession) {
      // Skip settlement for session restoration - user is just proving wallet ownership
      console.log('♻️  Restoring existing session - skipping payment settlement');
    } else {
      // Settle payment before proceeding (new session)
      console.log('💰 Settling payment on-chain...');
      try {
        const settleResult = await resourceServer.settlePayment(paymentPayload, cachedRequirements!);
        console.log(`✅ Payment settled: ${settleResult.transaction || 'confirmed'}`);
      } catch (err) {
        console.error(`❌ Settlement failed:`, err);
        res.status(500).json({
          error: 'Payment Settlement Failed',
          message: 'Payment was verified but settlement failed. Please try again.',
        });
        return;
      }
    }

    next();
  } catch (err) {
    console.error('❌ Payment processing error:', err);
    res.status(402).json({
      error: 'Payment Processing Error',
      message: err instanceof Error ? err.message : 'Failed to process payment',
    });
  }
}

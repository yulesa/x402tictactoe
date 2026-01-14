import { x402Client } from '@x402/core/client';
import { encodePaymentSignatureHeader } from '@x402/core/http';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import type { PaymentRequirements, PaymentRequired } from '@x402/core/types';
import type { WalletClient } from 'viem';

// Fetch payment requirements from the server
export async function fetchPaymentRequirements(): Promise<PaymentRequirements> {
  const response = await fetch('/api/payment-requirements');
  if (!response.ok) {
    throw new Error('Failed to fetch payment requirements');
  }
  return response.json();
}

// Build a PaymentRequired object from PaymentRequirements
function buildPaymentRequired(requirements: PaymentRequirements): PaymentRequired {
  return {
    x402Version: 2,
    resource: {
      url: window.location.origin + '/api/session/start',
      description: 'Pay to start a new Tic-Tac-Toe game',
      mimeType: 'application/json',
    },
    accepts: [requirements],
  };
}

// Create a wagmi-compatible EVM signer for the x402 client
function createWagmiEvmSigner(walletClient: WalletClient, address: `0x${string}`) {
  return {
    address,
    signTypedData: async (params: {
      domain: Record<string, unknown>;
      types: Record<string, Array<{ name: string; type: string }>>;
      primaryType: string;
      message: Record<string, unknown>;
    }) => {
      const signature = await walletClient.signTypedData({
        account: address,
        domain: params.domain as {
          name?: string;
          version?: string;
          chainId?: number;
          verifyingContract?: `0x${string}`;
        },
        types: params.types,
        primaryType: params.primaryType,
        message: params.message,
      });
      return signature;
    },
  };
}

// Create the x402 payment and return the encoded header
export async function createPaymentHeader(
  walletClient: WalletClient,
  address: `0x${string}`,
  requirements: PaymentRequirements
): Promise<string> {
  // Create the wagmi-compatible signer
  const signer = createWagmiEvmSigner(walletClient, address);

  // Create the x402 client with our signer
  // The selector just returns the requirements since we only have one option
  const client = new x402Client(() => requirements).register(
    'eip155:*',
    new ExactEvmScheme(signer)
  );

  // Build the full PaymentRequired object from the requirements
  const paymentRequired = buildPaymentRequired(requirements);

  // Create the payment payload (this will trigger wallet signature)
  const paymentPayload = await client.createPaymentPayload(paymentRequired);

  // Encode and return the header
  return encodePaymentSignatureHeader(paymentPayload);
}

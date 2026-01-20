import { x402Client } from '@x402/core/client';
import { encodePaymentSignatureHeader } from '@x402/core/http';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import type { PaymentRequired } from '@x402/core/types';

// Type for wallet client that supports signTypedData
interface SignableWalletClient {
  signTypedData: (params: {
    account: `0x${string}`;
    domain: {
      name?: string;
      version?: string;
      chainId?: number;
      verifyingContract?: `0x${string}`;
    };
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    message: Record<string, unknown>;
  }) => Promise<`0x${string}`>;
}

// Extract payment requirements from a 402 response
export function extractPaymentRequired(response: Response): PaymentRequired {
  const paymentRequiredHeader = response.headers.get('Payment-Required');
  if (!paymentRequiredHeader) {
    throw new Error('No Payment-Required header in 402 response');
  }
  const paymentRequired = JSON.parse(atob(paymentRequiredHeader)) as PaymentRequired;
  return paymentRequired;
}

// Create an EVM signer for the x402 client
function createEvmSigner(walletClient: SignableWalletClient, address: `0x${string}`) {
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
  walletClient: SignableWalletClient,
  address: `0x${string}`,
  paymentRequired: PaymentRequired
): Promise<string> {
  // Create the signer for x402
  const signer = createEvmSigner(walletClient, address);

  // Use the first payment option from the accepts array
  const requirements = paymentRequired.accepts[0];

  // Create the x402 client with our signer
  // The selector just returns the requirements since we only have one option
  const client = new x402Client(() => requirements).register(
    'eip155:*',
    new ExactEvmScheme(signer)
  );

  // Create the payment payload (this will trigger wallet signature)
  const paymentPayload = await client.createPaymentPayload(paymentRequired);

  // Encode and return the header
  return encodePaymentSignatureHeader(paymentPayload);
}

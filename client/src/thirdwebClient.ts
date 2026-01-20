import { createThirdwebClient } from 'thirdweb';

const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

if (!clientId) {
  throw new Error(
    'Missing VITE_THIRDWEB_CLIENT_ID environment variable.\n' +
    'Get a free client ID at: https://thirdweb.com/create-api-key\n' +
    'Then add it to your .env file: VITE_THIRDWEB_CLIENT_ID=your_client_id'
  );
}

// Create a thirdweb client with your client ID
export const thirdwebClient = createThirdwebClient({
  clientId,
});

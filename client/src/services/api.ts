const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Wake up the server (useful for Render cold starts)
// Retries with exponential backoff until the server responds
// Returns true if server is ready, false if all retries failed
export async function wakeServer(maxRetries = 5): Promise<boolean> {
  // In production (VITE_API_URL set): ping the root endpoint
  // In local dev (no VITE_API_URL): use the API base which goes through Vite proxy
  const wakeUrl = import.meta.env.VITE_API_URL
    ? API_BASE.replace(/\/api$/, '') || '/'
    : '/api';

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(wakeUrl, { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        console.log('Server is awake:', data);
        return true;
      }
    } catch {
      // Server not ready yet
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.pow(2, attempt) * 1000;
    console.log(`Server not ready, retrying in ${delay / 1000}s...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  console.error('Server is not available after retries');
  return false;
}

export interface SessionResponse {
  walletAddress: string;
  board: (string | null)[];
  playerFirst: boolean;
  aiMove: number | null;
  status: string;
  expiresAt: string;
  restored?: boolean;
}

export interface MoveResponse {
  board: (string | null)[];
  aiMove: number | null;
  status: string;
}

// Try to start a session without payment (will return 402 with requirements)
// If walletAddress is provided, server will check for existing session and include info in 402 response
export async function tryStartSession(walletAddress?: string): Promise<Response> {
  return fetch(`${API_BASE}/session/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: walletAddress ? JSON.stringify({ walletAddress }) : undefined,
  });
}

// Start session with payment header
export async function startSessionWithPayment(paymentHeader: string): Promise<SessionResponse> {
  const response = await fetch(`${API_BASE}/session/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Payment-Signature': paymentHeader,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to start session');
  }

  return response.json();
}

export async function getSession(walletAddress: string): Promise<SessionResponse | null> {
  const response = await fetch(`${API_BASE}/session/${walletAddress}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Failed to get session');
  }

  return response.json();
}

export async function makeMove(walletAddress: string, position: number): Promise<MoveResponse> {
  const response = await fetch(`${API_BASE}/game/move`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ walletAddress, position }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to make move');
  }

  return response.json();
}

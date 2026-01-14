const API_BASE = '/api';

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

export async function startSession(paymentHeader: string): Promise<SessionResponse> {
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

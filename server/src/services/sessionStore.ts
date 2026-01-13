export type CellValue = 'X' | 'O' | null;
export type GameStatus = 'created' | 'active' | 'player_wins' | 'ai_wins' | 'draw' | 'expired';

export interface Session {
  walletAddress: string;
  createdAt: Date;
  expiresAt: Date;
  gameState: CellValue[];
  status: GameStatus;
  playerFirst: boolean;
}

// In-memory session store - keyed by wallet address
const sessions = new Map<string, Session>();

const SESSION_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function createSession(walletAddress: string, playerFirst: boolean): Session {
  const now = new Date();
  const session: Session = {
    walletAddress,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
    gameState: Array(9).fill(null),
    status: 'created',
    playerFirst,
  };
  sessions.set(walletAddress.toLowerCase(), session);
  return session;
}

export function getSession(walletAddress: string): Session | undefined {
  const session = sessions.get(walletAddress.toLowerCase());
  if (session && new Date() > session.expiresAt) {
    sessions.delete(walletAddress.toLowerCase());
    return undefined;
  }
  return session;
}

export function updateSession(walletAddress: string, updates: Partial<Session>): Session | undefined {
  const session = getSession(walletAddress);
  if (!session) return undefined;

  Object.assign(session, updates);
  sessions.set(walletAddress.toLowerCase(), session);
  return session;
}

export function deleteSession(walletAddress: string): void {
  sessions.delete(walletAddress.toLowerCase());
}

export function cleanupExpiredSessions(): void {
  const now = new Date();
  for (const [address, session] of sessions) {
    if (now > session.expiresAt) {
      sessions.delete(address);
    }
  }
}

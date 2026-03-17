import crypto from "crypto";

interface ChatMessage {
  role: string;
  content: string;
}

interface Session {
  id: string;
  messages: ChatMessage[];
  ownedRepo: string;
  relatedRepos: string[];
  lastActivity: number;
}

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const sessions = new Map<string, Session>();

export function createSession(
  messages: ChatMessage[],
  ownedRepo: string,
  relatedRepos: string[]
): string {
  const id = crypto.randomUUID();
  sessions.set(id, {
    id,
    messages,
    ownedRepo,
    relatedRepos,
    lastActivity: Date.now(),
  });
  return id;
}

export function getSession(id: string): Session | null {
  const session = sessions.get(id);
  if (!session) return null;
  if (Date.now() - session.lastActivity > SESSION_TTL_MS) {
    sessions.delete(id);
    return null;
  }
  session.lastActivity = Date.now();
  return session;
}

export function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

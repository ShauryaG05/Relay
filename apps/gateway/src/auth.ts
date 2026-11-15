import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { config } from "./config.js";
import { findUserById } from "./db/users.js";
import { UserDoc } from "./db/mongo.js";

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface WsTicketPayload {
  userId: string;
  nonce: string;
  exp: number;
}

export function generateSessionToken(user: UserDoc): string {
  const payload: AuthTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "7d" });
}

export function verifySessionToken(token: string): AuthTokenPayload {
  return jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
}

/**
 * Generate a short-lived single-use ticket for web client to open a WebSocket
 */
const usedTickets = new Set<string>();

export function generateWsTicket(userId: string): string {
  const nonce = crypto.randomUUID();
  const payload: WsTicketPayload = {
    userId,
    nonce,
    exp: Math.floor(Date.now() / 1000) + config.ticketExpirySeconds,
  };
  return jwt.sign(payload, config.ticketSecret);
}

export function verifyAndConsumeWsTicket(ticket: string): string {
  try {
    const payload = jwt.verify(ticket, config.ticketSecret) as WsTicketPayload;
    if (usedTickets.has(payload.nonce)) {
      throw new Error("Ticket already used");
    }
    usedTickets.add(payload.nonce);
    // Garbage collect tickets after expiry
    setTimeout(() => usedTickets.delete(payload.nonce), config.ticketExpirySeconds * 1000);
    return payload.userId;
  } catch (err: any) {
    throw new Error(`Invalid or expired ticket: ${err.message}`);
  }
}

export interface AuthenticatedRequest extends Request {
  user?: UserDoc;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const cookieToken = req.headers.cookie
    ?.split(";")
    .find((c) => c.trim().startsWith("relay_token="))
    ?.split("=")[1];

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : cookieToken;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = verifySessionToken(token);
    const user = await findUserById(payload.userId);
    if (!user || user.status !== "active") {
      res.status(401).json({ error: "User session invalid or inactive" });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { config } from '../config/env.js';
import * as userQueries from '../db/queries/users.js';
import { badRequest, unauthorized } from '../utils/errors.js';
import type { User, AuthTokens, AuthResponse } from '@optionsranker/shared';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(user: { id: number; email: string; username: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN } as jwt.SignOptions
  );
}

export function generateRefreshToken(user: { id: number; email: string; username: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    config.JWT_REFRESH_SECRET,
    { expiresIn: config.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions
  );
}

export function verifyAccessToken(token: string): { id: number; email: string; username: string } {
  return jwt.verify(token, config.JWT_SECRET) as { id: number; email: string; username: string };
}

export function verifyRefreshToken(token: string): { id: number; email: string; username: string } {
  return jwt.verify(token, config.JWT_REFRESH_SECRET) as { id: number; email: string; username: string };
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getRefreshExpirationDate(): string {
  const match = config.JWT_REFRESH_EXPIRES_IN.match(/^(\d+)([dhms])$/);
  const now = new Date();

  if (match) {
    const amount = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 'd': now.setDate(now.getDate() + amount); break;
      case 'h': now.setHours(now.getHours() + amount); break;
      case 'm': now.setMinutes(now.getMinutes() + amount); break;
      case 's': now.setSeconds(now.getSeconds() + amount); break;
    }
  } else {
    // Default 7 days
    now.setDate(now.getDate() + 7);
  }

  return now.toISOString();
}

function toUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.display_name,
    tier: row.tier,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function register(data: {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}): Promise<AuthResponse> {
  const existingEmail = userQueries.findByEmail(data.email);
  if (existingEmail) {
    throw badRequest('Email already registered');
  }

  const existingUsername = userQueries.findByUsername(data.username);
  if (existingUsername) {
    throw badRequest('Username already taken');
  }

  const passwordHash = await hashPassword(data.password);
  const userRow = userQueries.create({
    email: data.email,
    username: data.username,
    passwordHash,
    displayName: data.displayName,
  });

  const user = toUser(userRow);
  const tokens = generateTokens(user);
  await storeRefreshTokenInDb(user.id, tokens.refreshToken);

  return { user, tokens };
}

export async function login(data: { email: string; password: string }): Promise<AuthResponse> {
  const userRow = userQueries.findByEmail(data.email);
  if (!userRow) {
    throw unauthorized('Invalid email or password');
  }

  const passwordValid = await comparePassword(data.password, userRow.password_hash);
  if (!passwordValid) {
    throw unauthorized('Invalid email or password');
  }

  const user = toUser(userRow);
  const tokens = generateTokens(user);
  await storeRefreshTokenInDb(user.id, tokens.refreshToken);

  return { user, tokens };
}

export async function refreshTokens(refreshToken: string): Promise<AuthResponse> {
  let decoded: { id: number; email: string; username: string };

  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw unauthorized('Invalid refresh token');
  }

  const tokenHash = hashToken(refreshToken);
  const storedToken = userQueries.findRefreshToken(tokenHash);
  if (!storedToken) {
    throw unauthorized('Refresh token not found or revoked');
  }

  // Delete the old refresh token (rotation)
  userQueries.deleteRefreshToken(tokenHash);

  const userRow = userQueries.findById(decoded.id);
  if (!userRow) {
    throw unauthorized('User not found');
  }

  const user = toUser(userRow);
  const tokens = generateTokens(user);
  await storeRefreshTokenInDb(user.id, tokens.refreshToken);

  return { user, tokens };
}

export function logout(refreshToken: string): void {
  const tokenHash = hashToken(refreshToken);
  userQueries.deleteRefreshToken(tokenHash);
}

function generateTokens(user: { id: number; email: string; username: string }): AuthTokens {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
}

async function storeRefreshTokenInDb(userId: number, refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  const expiresAt = getRefreshExpirationDate();
  userQueries.storeRefreshToken(userId, tokenHash, expiresAt);
}

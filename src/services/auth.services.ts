import { NextRequest } from 'next/server';
import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { logger, securityLogger } from '@/lib/logger';
import {
  getClientIdentifier,
  clearFailedAttempts,
  trackFailedAttempt,
} from '@/lib/rate-limit';
import { validateInput } from '@/lib/validation';
import { registerSchema, loginSchema } from './validations/auth.validation';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(env.JWT_SECRET);
const JWT_REFRESH_SECRET = new TextEncoder().encode(env.JWT_REFRESH_SECRET);
export const SESSION_ACCESS_COOKIE_NAME = 'access_token';
export const SESSION_REFRESH_COOKIE_NAME = 'refresh_token';

export interface JWTPayload {
  userId: string;
  email: string;
  sessionId: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export class AuthService {
  /**
   * Hash password with bcrypt (12 rounds for production)
   */
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Generate access token (short-lived)
   */
  static async generateAccessToken(
    userId: string,
    email: string,
    sessionId: string
  ): Promise<string> {
    const token = await new SignJWT({
      userId,
      email,
      sessionId,
      type: 'access',
    } as JoseJWTPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(env.JWT_EXPIRES_IN)
      .sign(JWT_SECRET);

    return token;
  }

  /**
   * Generate refresh token (long-lived)
   */
  static async generateRefreshToken(
    userId: string,
    email: string,
    sessionId: string
  ): Promise<string> {
    const token = await new SignJWT({
      userId,
      email,
      sessionId,
      type: 'refresh',
    } as JoseJWTPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(env.JWT_REFRESH_EXPIRES_IN)
      .sign(JWT_REFRESH_SECRET);

    return token;
  }

  /**
   * Verify access token
   */
  static async verifyAccessToken(token: string): Promise<JWTPayload | null> {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const jwtPayload = payload as unknown as JWTPayload;

      if (jwtPayload.type !== 'access') {
        return null;
      }

      return jwtPayload;
    } catch (error) {
      logger.debug('Token verification failed', { error });
      return null;
    }
  }

  /**
   * Verify refresh token
   */
  static async verifyRefreshToken(token: string): Promise<JWTPayload | null> {
    try {
      const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET);
      const jwtPayload = payload as unknown as JWTPayload;

      if (jwtPayload.type !== 'refresh') {
        return null;
      }

      return jwtPayload;
    } catch (error) {
      logger.debug('Refresh token verification failed', { error });
      return null;
    }
  }

  /**
   * Get current user from request with session validation
   */
  static async getCurrentUser(request: NextRequest) {
    const accessToken = request.cookies.get(SESSION_ACCESS_COOKIE_NAME)?.value;

    if (!accessToken) {
      return null;
    }

    const payload = await this.verifyAccessToken(accessToken);

    if (!payload) {
      return null;
    }

    // Validate session exists and is not revoked
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
    });

    if (!session || session.revoked || session.expiresAt < new Date()) {
      return null;
    }

    // Update last activity
    await prisma.session.update({
      where: { id: session.id },
      data: { lastActivity: new Date() },
    });

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      return null;
    }

    return user;
  }

  /**
   * Create session with device tracking
   */
  static async createSession(
    userId: string,
    request: NextRequest
  ): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
    const sessionId = nanoid(32);
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    const accessToken = await this.generateAccessToken(
      userId,
      user.email,
      sessionId
    );
    const refreshToken = await this.generateRefreshToken(
      userId,
      user.email,
      sessionId
    );

    const ip = getClientIdentifier(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Check concurrent sessions
    const activeSessions = await prisma.session.count({
      where: {
        userId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    const maxSessions = parseInt(env.MAX_SESSIONS_PER_USER);

    // Revoke oldest session if limit exceeded
    if (activeSessions >= maxSessions) {
      const oldestSession = await prisma.session.findFirst({
        where: {
          userId,
          revoked: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (oldestSession) {
        await prisma.session.update({
          where: { id: oldestSession.id },
          data: { revoked: true },
        });

        logger.info('Revoked oldest session due to limit', {
          userId,
          sessionId: oldestSession.id,
        });
      }
    }

    await prisma.session.create({
      data: {
        id: sessionId,
        userId,
        token: refreshToken,
        accessToken,
        expiresAt: new Date(Date.now() + parseInt(env.SESSION_MAX_AGE) * 1000),
        ipAddress: ip,
        userAgent,
        lastActivity: new Date(),
      },
    });

    return { accessToken, refreshToken, sessionId };
  }

  /**
   * Revoke session
   */
  static async revokeSession(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: { revoked: true },
    });

    logger.info('Session revoked', { sessionId });
  }

  /**
   * Revoke all user sessions
   */
  static async revokeAllUserSessions(userId: string): Promise<void> {
    await prisma.session.updateMany({
      where: { userId },
      data: { revoked: true },
    });

    logger.info('All user sessions revoked', { userId });
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(
    refreshToken: string,
    _request: NextRequest
  ): Promise<{ accessToken: string } | null> {
    const payload = await this.verifyRefreshToken(refreshToken);

    if (!payload) {
      return null;
    }

    // Validate session
    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
    });

    if (!session || session.revoked || session.expiresAt < new Date()) {
      return null;
    }

    const accessToken = await this.generateAccessToken(
      payload.userId,
      payload.email,
      payload.sessionId
    );

    await prisma.session.update({
      where: { id: session.id },
      data: {
        accessToken,
        lastActivity: new Date(),
      },
    });

    return { accessToken };
  }

  /**
   * Register new user
   */
  static async register(
    email: string,
    password: string,
    name?: string,
    request?: NextRequest
  ) {
    // Validate input
    const validation = validateInput(registerSchema, { email, password, name });
    if (!validation.success) {
      throw validation.errors;
    }

    const hashedPassword = await this.hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: validation.data.email,
        password: hashedPassword,
        name: validation.data.name,
      },
    });

    // Assign default 'user' role
    const userRole = await prisma.role.findUnique({
      where: { name: 'user' },
    });

    if (userRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: userRole.id,
        },
      });
    }

    const ip = request ? getClientIdentifier(request) : undefined;
    securityLogger.logSecurityEvent('USER_REGISTERED', user.id, { email }, ip);

    logger.info('User registered', { userId: user.id, email });

    return user;
  }

  /**
   * Login user
   */
  static async login(email: string, password: string, request: NextRequest) {
    const ip = getClientIdentifier(request);

    // Validate input
    const validation = validateInput(loginSchema, { email, password });
    if (!validation.success) {
      throw validation.errors;
    }

    securityLogger.logAuthAttempt(false, email, ip);

    const user = await prisma.user.findUnique({
      where: { email: validation.data.email },
    });

    if (!user || user.deletedAt) {
      securityLogger.logAuthFailure(email, 'User not found', ip);
      trackFailedAttempt(ip);
      throw new Error('Invalid credentials');
    }

    const isValid = await this.verifyPassword(password, user.password);

    if (!isValid) {
      securityLogger.logAuthFailure(email, 'Invalid password', ip);
      trackFailedAttempt(ip);
      throw new Error('Invalid credentials');
    }

    // Clear failed attempts on success
    clearFailedAttempts(ip);

    const { accessToken, refreshToken, sessionId } = await this.createSession(
      user.id,
      request
    );

    securityLogger.logAuthSuccess(user.id, email, ip);

    return { user, accessToken, refreshToken, sessionId };
  }

  /**
   * Logout user
   */
  static async logout(sessionId: string, request: NextRequest): Promise<void> {
    await this.revokeSession(sessionId);

    const user = await this.getCurrentUser(request);
    if (user) {
      securityLogger.logSecurityEvent(
        'USER_LOGOUT',
        user.id,
        { sessionId },
        getClientIdentifier(request)
      );
    }
  }

  /**
   * Change password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isValid = await this.verifyPassword(currentPassword, user.password);

    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    const hashedPassword = await this.hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Revoke all sessions except current
    await this.revokeAllUserSessions(userId);

    securityLogger.logSecurityEvent('PASSWORD_CHANGED', userId, {});

    logger.info('Password changed', { userId });
  }

  static async getSessionToken(): Promise<string | undefined> {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_ACCESS_COOKIE_NAME)?.value;
  }

  /**
   * Delete session by access token (value from the access_token cookie).
   * Session.token stores the refresh token; Session.accessToken stores the JWT we receive here.
   */
  static async deleteSession(accessToken: string) {
    await prisma.session.deleteMany({
      where: { accessToken },
    });
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_ACCESS_COOKIE_NAME);
    cookieStore.delete(SESSION_REFRESH_COOKIE_NAME);
  }
}

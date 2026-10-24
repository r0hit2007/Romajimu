const { prisma } = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/hash');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwt');

class AuthService {
  async signup({ name, email, password, ipAddress, userAgent }) {
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      const err = new Error('An account with this email already exists.');
      err.statusCode = 409;
      throw err;
    }

    const password_hash = await hashPassword(password);

    // Create user and default settings in transaction
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password_hash,
        settings: {
          create: {
            countdown: 5,
            practice_mode: false,
            custom_message: 'Emergency: I need assistance immediately. Please check my location.',
            region: 'US',
            include_location: true,
            include_audio: false,
          },
        },
      },
      include: {
        settings: true,
      },
    });

    const tokenPayload = { id: user.id, email: user.email, name: user.name };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ id: user.id });

    // Store session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.userSession.create({
      data: {
        user_id: user.id,
        refresh_token: refreshToken,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        expires_at: expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        settings: user.settings,
      },
      accessToken,
      refreshToken,
    };
  }

  async login({ email, password, ipAddress, userAgent }) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        settings: true,
      },
    });

    if (!user) {
      const err = new Error('Invalid email or password.');
      err.statusCode = 401;
      throw err;
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      const err = new Error('Invalid email or password.');
      err.statusCode = 401;
      throw err;
    }

    const tokenPayload = { id: user.id, email: user.email, name: user.name };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken({ id: user.id });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.userSession.create({
      data: {
        user_id: user.id,
        refresh_token: refreshToken,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        expires_at: expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        settings: user.settings,
      },
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken) {
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      const err = new Error('Invalid or expired refresh token.');
      err.statusCode = 401;
      throw err;
    }

    const session = await prisma.userSession.findUnique({
      where: { refresh_token: refreshToken },
      include: { user: true },
    });

    if (!session || new Date() > session.expires_at) {
      if (session) {
        await prisma.userSession.delete({ where: { id: session.id } });
      }
      const err = new Error('Session has expired. Please log in again.');
      err.statusCode = 401;
      throw err;
    }

    const tokenPayload = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };

    const newAccessToken = generateAccessToken(tokenPayload);

    return {
      accessToken: newAccessToken,
    };
  }

  async forgotPassword({ email, newPassword }) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      const err = new Error('No account found with this email address.');
      err.statusCode = 404;
      throw err;
    }

    const password_hash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash },
    });

    // Invalidate all existing sessions for security
    await prisma.userSession.deleteMany({
      where: { user_id: user.id },
    });

    return { success: true, message: 'Password updated successfully. Please log in with your new password.' };
  }

  async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        settings: true,
        contacts: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      settings: user.settings,
      contacts: user.contacts,
    };
  }
}

module.exports = new AuthService();

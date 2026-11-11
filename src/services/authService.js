const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const User = require('../models/User');
const Organization = require('../models/Organization');
const env = require('../config/env');

const JWT_EXPIRY = '1d';
const BCRYPT_COST = 10;

function generateToken(userId, organizationId) {
  return jwt.sign(
    { userId, organizationId },
    env.jwtSecret,
    { expiresIn: JWT_EXPIRY }
  );
}

function formatOrganization(org) {
  if (!org) return null;
  return {
    id: org._id,
    name: org.name,
    defaultLowStockThreshold: org.defaultLowStockThreshold,
  };
}

async function signup({ email, password, confirmPassword, organizationName }) {
  if (!email || !password || !confirmPassword || !organizationName) {
    throw new AppError('All fields are required', 400, 'VALIDATION_ERROR');
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new AppError('Email is required', 400, 'VALIDATION_ERROR');
  }

  if (password !== confirmPassword) {
    throw new AppError('Passwords do not match', 400, 'PASSWORD_MISMATCH');
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError('Email already in use', 409, 'EMAIL_EXISTS');
  }

  const organization = await Organization.create({ name: organizationName.trim() });

  let user;
  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    user = await User.create({
      email: normalizedEmail,
      passwordHash,
      organizationId: organization._id,
    });
  } catch (userError) {
    try {
      await Organization.findByIdAndDelete(organization._id);
    } catch (cleanupError) {
      console.error('Cleanup failed after User creation error:', cleanupError.message);
    }
    throw userError;
  }

  const token = generateToken(user._id, user.organizationId);
  const org = await Organization.findById(user.organizationId).catch(() => null);

  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      organizationId: user.organizationId,
    },
    organization: formatOrganization(org),
  };
}

async function login({ email, password }) {
  if (!email || !password) {
    throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new AppError('Email is required', 400, 'VALIDATION_ERROR');
  }

  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!user) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  const token = generateToken(user._id, user.organizationId);
  const org = await Organization.findById(user.organizationId).catch(() => null);

  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      organizationId: user.organizationId,
    },
    organization: formatOrganization(org),
  };
}

module.exports = {
  signup,
  login,
  generateToken,
};
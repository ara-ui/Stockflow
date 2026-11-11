process.env.NODE_ENV = 'test';

require('dotenv').config();

const mongoose = require('mongoose');
const env = require('../src/config/env');

const Organization = require('../src/models/Organization');
const User = require('../src/models/User');
const Product = require('../src/models/Product');

let isConnected = false;

async function connectTestDB() {
  if (isConnected) return;

  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Tests can only run in test environment');
  }

  if (!process.env.MONGODB_URI_TEST) {
    throw new Error('MONGODB_URI_TEST is not set');
  }

  if (process.env.MONGODB_URI_TEST === process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI_TEST must differ from MONGODB_URI');
  }

  await mongoose.connect(process.env.MONGODB_URI_TEST);

  if (mongoose.connection.name !== 'stockflow_test') {
    await mongoose.disconnect();
    throw new Error(`Connected to wrong database: ${mongoose.connection.name}. Expected 'stockflow_test'`);
  }

  isConnected = true;
  console.log('Test database connected');
}

async function clearDb() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Database cleanup only allowed in test environment');
  }

  if (!process.env.MONGODB_URI_TEST) {
    throw new Error('MONGODB_URI_TEST is not set');
  }

  if (process.env.MONGODB_URI_TEST === process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI_TEST must differ from MONGODB_URI');
  }

  if (mongoose.connection.name !== 'stockflow_test') {
    throw new Error(`Wrong database: ${mongoose.connection.name}. Expected 'stockflow_test'`);
  }

  await Promise.all([
    Organization.deleteMany({}),
    User.deleteMany({}),
    Product.deleteMany({}),
  ]);
}

async function disconnectTestDB() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('Test database disconnected');
  }
}

module.exports = {
  connectTestDB,
  clearDb,
  disconnectTestDB,
  Organization,
  User,
  Product,
};
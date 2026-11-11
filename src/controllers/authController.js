const { signup, login } = require('../services/authService');

async function signupController(req, res, next) {
  try {
    const { email, password, confirmPassword, organizationName } = req.body;
    const result = await signup({ email, password, confirmPassword, organizationName });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function loginController(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await login({ email, password });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signupController,
  loginController,
};
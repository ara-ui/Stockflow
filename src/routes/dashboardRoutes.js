const express = require('express');
const { getDashboardController } = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getDashboardController);

module.exports = router;
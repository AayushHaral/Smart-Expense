const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken); // Protect dashboard routes

router.get('/summary', dashboardController.getDashboardSummary);

module.exports = router;

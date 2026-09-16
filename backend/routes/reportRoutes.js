const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken); // Protect report routes

router.get('/monthly', reportController.getMonthlyReport);
router.get('/category', reportController.getCategoryReport);
router.get('/income-expense', reportController.getIncomeExpenseReport);

module.exports = router;

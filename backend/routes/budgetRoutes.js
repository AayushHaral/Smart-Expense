const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken); // Protect budget routes

router.get('/', budgetController.getBudgets);
router.get('/history', budgetController.getBudgetHistory);
router.post('/', budgetController.createOrUpdateBudget);
router.put('/:id', budgetController.updateBudget);
router.delete('/:id', budgetController.deleteBudget);

module.exports = router;

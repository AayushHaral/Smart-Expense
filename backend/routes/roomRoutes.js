const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const { authenticateToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(authenticateToken);

// Room Management
router.post('/', roomController.createRoom);
router.post('/join', roomController.joinRoom);
router.get('/my-rooms', roomController.getMyRooms);
router.get('/notifications', roomController.getNotifications);

router.get('/:roomId', roomController.getRoomDetails);
router.post('/:roomId/leave', roomController.leaveRoom);
router.delete('/:roomId/members/:targetUserId', roomController.removeMember);

// Shared Expenses
router.get('/:roomId/expenses', roomController.getSharedExpenses);
router.post('/:roomId/expenses', upload.single('receipt'), roomController.createSharedExpense);
router.delete('/:roomId/expenses/:expenseId', roomController.deleteSharedExpense);

// Balances & Smart Settlements
router.get('/:roomId/balances', roomController.getRoomBalances);
router.post('/:roomId/settle', roomController.recordSettlement);

// Shared Budgets
router.get('/:roomId/budgets', roomController.getSharedBudgets);
router.post('/:roomId/budgets', roomController.createOrUpdateSharedBudget);

module.exports = router;

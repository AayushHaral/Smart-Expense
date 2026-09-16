const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticateToken } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.use(authenticateToken); // Protect all transaction routes

router.get('/', transactionController.getTransactions);
router.get('/calendar', transactionController.getCalendarTransactions);
router.get('/:id', transactionController.getTransactionById);

// Support optional receipt image file upload via multer
router.post('/', upload.single('receipt'), transactionController.createTransaction);
router.put('/:id', upload.single('receipt'), transactionController.updateTransaction);

router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;

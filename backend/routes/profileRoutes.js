const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken); // Protect profile routes

router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);
router.put('/change-password', profileController.changePassword);

module.exports = router;

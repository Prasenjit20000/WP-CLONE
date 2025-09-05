const express = require('express');
const authController = require('../controller/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { multerMiddleware } = require('../config/cloudinaryConfig');

const router = express.Router();


router.post('/send-otp',authController.sendOtp);
router.post('/verify-otp',authController.verifyOtp);
router.get('/logout',authController.logout);



// protected-routes

router.put('/update-profile',authMiddleware,multerMiddleware,authController.updateProfile);
router.get('/check-auth',authMiddleware,authController.checkAuthticate);
router.get('/users',authMiddleware,authController.getAllUsers);


module.exports = router;
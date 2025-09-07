const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { multerMiddleware } = require('../config/cloudinaryConfig');
const statusController = require('../controller/statusController')

const router = express.Router();

//protected route 
router.post('/',authMiddleware,multerMiddleware,statusController.createStatus);
router.get('/',authMiddleware,multerMiddleware,statusController.getStatus);
router.put('/:statusId/view',authMiddleware,multerMiddleware,statusController.viewStatus);
router.delete('/:statusId',authMiddleware,multerMiddleware,statusController.deleteStatus);

module.exports=router;
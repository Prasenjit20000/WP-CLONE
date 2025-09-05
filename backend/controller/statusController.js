const { uploadFileToClodinary } = require('../config/cloudinaryConfig');
const Status = require('../models/Status');
const response = require('../utils/responseHandler');

exports.createStatus = async (req, res) => {
    try {
        const { content, contentType } = req.body;
        const userId = req.user.userId;
        const file = req.file;

        let mediaUrl = null;
        let finalContentType = contentType || 'text';

        if (file) {
            const uploadFile = await uploadFileToClodinary(file);
            if (!uploadFile?.secure_url) {
                return response(res, 400, 'Failed to upload media');
            }
            mediaUrl = uploadFile?.secure_url;

            if (file.mimetype.startwith('image')) {
                finalContentType = 'image';
            }
            else if (file.mimetype.startwith('video')) {
                finalContentType = 'video';
            } else {
                return response(res, 400, 'Unsupported file type.');
            }
        }
        else if (content?.trim()) {
            finalContentType = 'text';
        } else {
            return response(res, 400, 'Status content is required');
        }

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); //status set for 24 hours
        const status = new Status({
            user: userId,
            content: mediaUrl || content,
            contentType,
            expiresAt
        })
        await status.save();

        const populatedStatus = await Status.findOne(status?._id)
            .populate('user', 'username profilePicture')
            .populate('viewers', 'username profilePicture');

        return response(res, 200, 'Status post successfully.', status);
    } catch (error) {
        console.error(error);
        return response(res, 500, 'Internal server error.');
    }
}


exports.getStatus = async(req,res) =>{
    try {
        const userId = req.user.userId;
        // const 
    } catch (error) {
        console.error(res,500,'Internal server error');
    }
}
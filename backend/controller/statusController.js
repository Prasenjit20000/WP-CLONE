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
            contentType: finalContentType,
            expiresAt
        })
        await status.save();

        const populatedStatus = await Status.findOne(status?._id)
            .populate('user', 'username profilePicture')
            .populate('viewers', 'username profilePicture');

        // emit socket event
        // coming via middleware setup in index.js
        if (req.io && req.socketUserMap) {
            // broadcast to all connecting user except the creatoe
            for (const [connectedUserId, socketId] of req.socketUserMap) {
                if (connectedUserId !== userId) {
                    req.io.to(socketId).emit('new_status', populatedStatus);
                }
            }
        }

        return response(res, 200, 'Status post successfully.', populatedStatus);
    } catch (error) {
        console.error(error);
        return response(res, 500, 'Internal server error.');
    }
}


exports.getStatus = async (req, res) => {
    try {
        const statuses = await Status.find({
            // give those which are expire at today
            expiresAt: { $gt: new Date() }
        }).populate('user', 'username profilePicture')
            .populate('viewers', 'username profilePicture')
            .sort({ createdAt: -1 });

        return response(res, 200, 'Status retrive successfully', statuses);
    } catch (error) {
        console.error(error);
        return response(res, 500, 'Internal server error');
    }
}

exports.viewStatus = async (req, res) => {
    try {
        const { statusId } = req.params;
        const userId = req.user.userId;
        const status = await Status.findById(statusId);
        if (!status) {
            return response(res, 404, 'Status not found');
        }
        if (!status?.viewers.includes(userId)) {
            status.viewers.push(userId);
            await status.save();
            const updatedStatus = await Status.findById(statusId)
                .populate('user', 'username profilePicture') //creater of the status
                .populate('viewers', 'username profilePicture'); //viewers of the status

            // emit socket event
            if (req.io && req.socketUserMap) {
                const statusOwnerSocketId = req.socketUserMap.get(status.user._id.toString());
                if (statusOwnerSocketId) {
                    const viewData = {
                        statusId,
                        viewerId: userId,
                        totalViewers: updatedStatus.viewers.length,
                        viewers: updatedStatus.viewers
                    }
                    req.io.to(statusOwnerSocketId).emit('status_viewed', viewData);
                }
            } else {
                console.log('status owner not connected.');
            }
        } else {
            console.log('User already viewed the status');
        }

        return response(res, 200, 'Status viewed successfully');
    } catch (error) {
        console.error(error);
        return response(res, 500, 'Internal server error.');
    }
}


exports.deleteStatus = async (req, res) => {
    try {
        const { statusId } = req.params;
        const userId = req.user.userId;
        const status = await Status.findById(statusId);
        if (!status) {
            return response(res, 404, 'Status not found.');
        }
        if (status?.user.toString() !== userId) {
            return response(res, 403, 'User not authorized to delete this status.');
        }
        await status.deleteOne();

        if (req.io && req.socketUserMap) {
            for ([connectedUserId, socketId] of req.socketUserMap) {
                if (connectedUserId !== userId) {
                    req.io.to(socketId).emit('status_deleted', statusId);
                }
            }
        }

        return response(res, 200, 'Status deleted successfully.');

    } catch (error) {
        console.error(error);
        return response(res, 500, 'Internal server error.');
    }
}
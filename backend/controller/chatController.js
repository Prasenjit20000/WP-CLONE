const { uploadFileToClodinary } = require("../config/cloudinaryConfig");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const response = require("../utils/responseHandler");


exports.sendMessage = async (req, res) => {
    try {
        const { senderId, receiverId, content, messageStatus } = req.body;
        const file = req.file;


        const participants = [senderId, receiverId].sort();
        // check if conversation already exist
        let conversation = await Conversation.findOne({
            participants: participants
        })
        if (!conversation) {
            conversation = new Conversation({
                participants,
            });
            await conversation.save();
        }
        let imageOrVideoUrl = null;
        let contentType = null;

        // handle file upload
        if (file) {
            const uploadFile = await uploadFileToClodinary(file);

            if (!uploadFile?.secure_url) {
                return response(res, 400, "Failed to upload media.");
            }
            imageOrVideoUrl = uploadFile?.secure_url;

            if (file.mimetype.startwith('image')) {
                contentType = 'image';
            } else if (file.mimetype.startwith('video')) {
                contentType = 'video';
            } else {
                return response(res, 400, 'Unsupported file type');
            }
        }else if(content?.trim()){
            contentType = 'text';
        }else{
            return response(res,400,'Message content is required');
        }

        const message = new Message({
            conversation: conversation?._id,
            sender:senderId,
            receiver:receiverId,
            content,
            contentType,
            imageOrVideoUrl,
            messageStatus
        })
        await message.save();

        if(message?.content){
            conversation.lastMessage = message?._id;
        }
        conversation.unreadCount+=1;
        await conversation.save();

        const populatedMessage = await Message.findOne(message?._id)
        .populate('sender','username profilePicture')
        .populate('receiver','username profilePicture');

        return response(res,201,'Message send successfully',populatedMessage);
    } catch (error) {
        console.error(error);
        return response(res,500,'Internal server error');
    }
}

// get all conversations of a particular user

exports.getConversation = async(req,res)=>{
    const userId = req.user.userId
    try {
        let conversation = await Conversation.find({
            participants:userId
        }).populate("participants","username profilePicture isOnline lastSeen")
        populate({
            path:"lastMessage",
            populate:{
                path : "sender receiver",
                select: "username profilePicture"
            }
        }).sort({createdAt : -1});

        return response(res,201,'Coversation get successfully.',conversation);
    } catch (error) {
        console.error(error);
        return response(res,500,"Internal server error");
    }
}
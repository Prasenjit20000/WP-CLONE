const User = require("../models/User");
const sendOtpToEmail = require("../services/emailService");
const otpGenerate = require("../utils/otpGenerator");
const response = require("../utils/responseHandler");
const twilloService = require('../services/twilloService');
const generateToken = require("../utils/generateToken");
const { uploadFileToClodinary } = require("../config/cloudinaryConfig");
const Conversation = require('../models/Conversation')


// 1.send otp
const sendOtp = async (req, res) => {
    const { phoneNumber, phoneSuffix, email } = req.body;
    const otp = otpGenerate();
    const expiry = new Date(Date.now() + 5 * 60 * 1000);
    let user;
    try {
        if (email) {
            user = await User.findOne({ email });
            if (!user) {
                user = new User({ email });
            }
            user.emailOtp = otp;
            user.emailOtpExpiry = expiry;
            await user.save(); //save in db
            await sendOtpToEmail(email, otp);
            return response(res, 200, 'Otp send to your email', { email });
        }
        if (!phoneNumber || !phoneSuffix) {
            return response(res, 400, 'Phone number and phone suffix are required');
        }
        const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
        user = await User.findOne({ phoneNumber });
        if (!user) {
            user = await new User({ phoneNumber, phoneSuffix });
        }
        await user.save();
        await twilloService.sendOtpToPhoneNumber(fullPhoneNumber);
        return response(res, 200, 'Otp send successfully', user);
    } catch (error) {
        console.error(error);
        return response(res, 500, 'Internal server error');
    }
}

// 2.verify otp
const verifyOtp = async (req, res) => {
    const { phoneNumber, phoneSuffix, email, otp } = req.body;
    try {
        let user;
        if (email) {
            user = await User.findOne({ email });
            if (!user) {
                return response(res, 404, 'User not found');
            }
            const now = Date.now();
            if (!user.emailOtp || String(user.emailOtp) != String(otp) || now > new Date(user.emailOtpExpiry)) {
                return response(res, 400, 'Invalid or expired otp');
            }
            user.isVerified = true;
            user.emailOtp = null;
            user.emailOtpExpiry = null;
            await user.save();
        } else {
            if (!phoneNumber || !phoneSuffix) {
                response(res, 400, 'Phone number and phone suffix are required');
            }
            const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`;
            user = await User.findOne({ phoneNumber });
            if (!user) {
                response(res, 404, 'User not found');
            }
            const result = await twilloService.verifyOtp(fullPhoneNumber, otp);
            if (result.status !== 'approved') {
                return response(res, 400, 'Invalid otp');
            }
            user.isVerified = true;
            await user.save();
        }
        const token = generateToken(user?._id);
        res.cookie("authToken",token,{
            httpOnly : true,
            maxAge:1000*60*60*24*365
        });
        return response(res,200,'Otp verified successfully',{user,token});
    } catch (error) {
        console.error(error);
        response(res,500,'Internal server error');
    }
}

const checkAuthticate = async(req,res)=>{
    try {
        const userId = req.user.userId;
        if(!userId){
            return response(res,404,'User unauthorized,please login before access!');
        }
        const user = await User.findById(userId);
        if(!user){
            return response(res,404,'User not found');
        }
        // check every case user is authenticated or not
        return response(res,200,'User authenticated',user);
    } catch (error) {
        console.error(error);
        return response(res,500,'Internal server error.');
    }
}

const updateProfile = async(req,res) =>{
    const {username,agreed,about} = req.body;
    const userId = req.user.userId;
    try {
        const user = await User.findById(userId);
        const file = req.file;
        if(file){
            const uploadResult = await uploadFileToClodinary(file);
            console.log(uploadResult);
            user.profilePicture = uploadResult?.secure_url;
        }else if(req.body.profilePicture){
            user.profilePicture = req.body.profilePicture;
        }
        if(username){
            user.username = username;
        }
        if(agreed){
            user.agreed=agreed;
        }
        if(about){
            user.about=about;
        }
        await user.save();
        return response(res,200,'User profile updated successfully.',user);
    } catch (error) {
        console.error(error);
        return response(res,500,'Internal server error.');      
    }
}


const logout = (req,res)=>{
    try {
        res.cookie("authToken","",{expires:new Date(0)});
        return response(res,200,'Logout successfully.');
    } catch (error) {
        console.error(error);
        return response(res,500,'Internal server error');
    }
}

// retrive all users except you
const getAllUsers = async(req,res)=>{
    const loggedInUser = req.user.userId;
    try {
        const users = await User.find({_id:{$ne:loggedInUser}}).select(
            'username profilePicture lastSeen isOnline about  phoneNumber phoneSuffix' 
        ).lean();

        const usersWithConversation = await Promise.all(
            users.map(async (user)=>{
                const conversation = await Conversation.findOne({
                    // retrive conversations between otherusers & loggedin user
                    participants : {$all : [loggedInUser,user?._id]}
                }).populate({
                    path:'lastMessage',
                    select : 'content createdAt sender receiver'
                }).lean();

                return {
                    ...user,
                    conversation : conversation | null
                }
            }) 
        )
        response(res,200,'Users retrive successfull',usersWithConversation);
    } catch (error) {
        console.error(error);
        response(res,500,'Internal server error');
    }
}


module.exports = {
    sendOtp,verifyOtp,updateProfile,logout,checkAuthticate,getAllUsers
}
const mongoose = require('mongoose');



const userSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        unique: true,
        //sparse is use because when  a user try to login using email then in that case ph no is null
        // and it is possible that multiple users can login using email son in that case null is not 
        // a unique value,so that sparse is used it help to check uniquenes only when ph no is not null
        sparse: true
    },
    phoneSuffix: {
        type: String,
        unique: false
    },
    username: {
        type: String,
    },
    email: {
        type: String,
        lowercase: true,
        validate: {
            validator: function (v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: props => `${props.value} is not a valid email address!`
        }
    },
    emailOtp: {
        type: String
    },
    emailOtpExpiry: {
        type: Date
    },
    profilePicture: {
        type: String
    },
    lastSeen: {
        type: String
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    agreed: {
        type: Boolean,
        default: false
    }
},{timestamps:true});

// here first User->help to access the table in our code editor
// second User->is the name of the table in mongodb
const User = mongoose.model('User',userSchema);
module.exports=User;
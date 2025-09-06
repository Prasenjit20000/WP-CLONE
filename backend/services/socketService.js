const { Server } = require('socket.io');
const User = require('../models/User');
const Message = require('../models/Message');


// store online users into a map=>uesrId & socketid of them
const onlineUsers = new Map();

// store users who are typing(status) => userId->[conversation]:boolean
const typingUsers = new Map();


// connecting socket in our backend server (port)
const initializeSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin : process.env.FRONTEND_URL,
            credentials: true,
            methods:['GET','POST','PUT','DELETE','OPTIONS'],

        },
        //disconnect socket after 60secs in case of inactive users
        pingTimeout : 60000
    });

    // when a new socket connection is established
    io.on('connection',(socket)=>{
        console.log("User connected with this socket id: ",socket.id);
        let userId = null;


        // handle user connection and mark them as online in db
        socket.on('user_connected',async(connectingUserId)=>{
            try {
                userId = connectingUserId;
                // when a user is online push the userid and socketid of that user inside the map
                onlineUsers.set(userId,socket.id);
                socket.join(userId); //join a personal room for direct emit

                //update user in db by id
                await User.findByIdAndUpdate(userId,{
                    isOnline:true,
                    lastSeen : new Date(),
                });

                // notify all users that this user is online
                io.emit("user_status",{userId,isOnline:true});
            } catch (error) {
                console.error('error in socket handling ',error);
            }
        })

        // return online status of requested user
        socket.on('get_user_status',(requestedUserId,callback)=>{
            const isOnline = onlineUsers.has(requestedUserId);
            callback({
                userId : requestedUserId,
                isOnline,
                lastSeen: isOnline?new Date():null,
            })
        })

        //forward message to receiver if online
        // message is an object from Message db
        socket.on('send_message',async(message)=>{
            try {
                const receiverSocketId = onlineUsers.get(message?.receiver?._id);
                if(receiverSocketId){
                    io.to(receiverSocketId).emit('receive_message',message);
                }
            } catch (error) {
                console.error('Error sending message',error);
                socket.emit('message_error',{error:'Failed to send message'});
            }
        })

        // update messages as read and notify sender
        socket.on('message_read',async({messageIds,senderId})=>{
            try {
                await Message.updateMany(
                    {_id: {$in:messageIds}},
                    {$set : {messageStatus:'read'}}
                )

                const senderSocketId = onlineUsers.get(senderId);
                if(senderSocketId){
                    messageIds.forEach((messageId) => {
                        io.to(senderSocketId).emit('message_status_update',{
                            messageId,
                            messageStatus:'read'
                        })
                    });
                }
            } catch (error) {
                console.error('Error updateing message status',error);
            }
        })

        // handle typing start event and autostop after 3sec
        socket.on('typing_start',({conversationId,receiverId})=>{
            if(!userId || !conversationId || !receiverId){
                return;
            }
            
            // if userId not in typingUsers map
            if(!typingUsers.has(userId)){
                typingUsers.set(userId,{});
            }

            const userTyping = typingUsers.get(userId);

            userTyping[conversationId] = true;

            //clear any existing time out
            // if(userTyping)
        })
    })
}
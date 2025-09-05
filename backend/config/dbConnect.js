const mongoose = require('mongoose');

const connectDb = async() =>{
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Database Connected');
    } catch (error) {
        console.error('Error connecting database',error.message);
        process.exit(1);

    }
}
module.exports=connectDb;
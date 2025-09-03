const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDb = require('./config/dbConnect');

dotenv.config();

const PORT = process.env.PORT;
const app = express();


// start->node index.js for deployment npm start
// dev->nodemon index.js for development npm run dev


// database connection
connectDb();



app.listen(PORT,()=>{
    
    console.log(`Server running on ${PORT}`);
})
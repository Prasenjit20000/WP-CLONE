const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDb = require('./config/dbConnect');
const bodyParser = require('body-parser');
const authRoute = require('./routes/authRoute')
const chatRoute = require('./routes/chatRoute')
const http = require('http');
const initializeSocket = require('./services/socketService')
const statusRoute = require('./routes/statusRoute')

dotenv.config();

const PORT = process.env.PORT;
const app = express();


// when send api request from frontend
// that frontend url add as origin in this cors options
const corsOption = {
    origin:process.env.FRONTEND_URL,
    credentials : true
}

app.use(cors(corsOption));
// start->node index.js for deployment npm start
// dev->nodemon index.js for development npm run dev


// Middleware
app.use(express.json()); //parse body data
app.use(cookieParser()); // parse token on every request
app.use(bodyParser.urlencoded({extended:true}));

// database connection
connectDb();

// create server
const server = http.createServer(app);

const io = initializeSocket(server);

app.use((req,res,next)=>{
    req.io = io;
    req.sockeUserMap = io.sockeUserMap
    next();
})

// routes
app.use('/api/auth',authRoute);
app.use('/api/chat',chatRoute);
app.use('/api/status',statusRoute);

server.listen(PORT,()=>{
    console.log(`Server running on ${PORT}`);
})
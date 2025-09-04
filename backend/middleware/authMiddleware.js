const jwt = require('jsonwebtoken');
const response = require('../utils/responseHandler');

const authMiddleware = (req,res,next)=>{
    const authToken = req.cookies?.authToken;
    if(!authToken){
        return response(res,401,'Authorization token missing');
    }
    try {
        const decode = jwt.verify(authToken,process.env.JWT_SECRET);
        
        console.log(decode);
        req.user=decode;
        console.log(req.user);
        next();
    } catch (error) {
        console.error(error);
        return response(res,401,'Invalid or expired token');
    }
}

module.exports= authMiddleware;
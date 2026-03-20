const db = require('../config/db');
const { sendSuccess } = require('../utils/response');
const sayHello =(req,res)=>{
   return sendSuccess(res, 'Hello', { text: 'Hello Hans Raj' }, 200);
};
module.exports={sayHello};
const db = require('../config/db');
const sayHello =(req,res)=>{
   res.send("Hello Hans Raj");
};
module.exports={sayHello};
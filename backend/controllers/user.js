const User = require("../models/user.js")
const passport = require('passport')

module.exports.registeredUser = async (req,res)=>{
    const {username,email,password} = req.body
    let newUser= new User({
        username:username,
        email:email,
    })
    try{
        let registeredUser = await User.register(newUser,password);
        req.login(registeredUser, (err) => {
            if (err) {
                return res.status(500).send({ success: false, msg: "Login after signup failed", error: err.message });
            }
            return res.status(200).send({ success: true, msg: "User Signed Up & Logged In Successfully", data: registeredUser });
        });
    }
    catch(err){
        res.status(400).send({success:false,msg:'User does not sign up successfully',error:err.message})
    }
}

module.exports.loginUser = (req, res) => {
    if (req.isAuthenticated()) { 
        console.log("user is"+req.user)
        res.status(200).send({
            success: true,
            message: "Logged in successfully",
            data: req.user
        });
    } else {
        res.status(401).send({ success: false, message: "Login failed" });
    }
};

module.exports.logOut = (req,res,next)=>{
    req.logOut((err)=>{
        if(err){
            return next(err)
        }
    })
    res.send({success:true,message:"Logout Successfully"})
}
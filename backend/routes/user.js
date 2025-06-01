const express = require('express')
const router = express.Router()
const passport = require('passport')
const User = require("../models/user.js")
const userControllers = require('../controllers/user.js')


router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.post("/signup",userControllers.registeredUser)
router.get("/logout",userControllers.logOut)
router.post("/login",passport.authenticate("local",{ failureRedirect: "/login", failureFlash: true }),userControllers.loginUser)
router.get("/getUser",async(req,res)=>{
    const id = req.user._id
    try{
        const result = await User.findById(id).populate("classTeacher").populate("enrolledIn");
        if(!result){
            return res.send({msg:"User does not exits"})
        }
        res.send({msg:"User found",data:result})
    }catch(err){
        res.send({msg:"Some error occurred",error:err})
    }
})

module.exports = router;
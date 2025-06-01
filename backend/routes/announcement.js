const express = require('express');
const route = express.Router();
const User = require("../models/user.js")
const Class = require("../models/class.js")
const passport = require('passport')
const {isLoggedin} = require("../middleware.js")
const Announcement = require("../models/announcement.js")

route.use(express.json());
route.use(express.urlencoded({extended:true}));

route.post("/:id",isLoggedin,async(req,res)=>{
    let { id } = req.params;
    const { content } = req.body;
    try {
        const newAnnouncement = new Announcement({
            classId:id,
            postedBy: req.user._id, 
            content,
        });
        const result = await newAnnouncement.save();
        const classData = await Class.findById(id);
        classData.announcements.push(result._id)
        const savedData = await classData.save()
        
        res.status(201).json({ message: 'Announcement created successfully', announcement: result });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Error creating announcement', error });
    }
})

route.get("/:id",async(req,res)=>{
    try{
        const announcements = await Announcement.find({ classId: req.params.id }).sort({createdAt:-1})
        .populate('postedBy');
        res.status(200).json({msg:"Announcements found successfully",data:announcements});
    }catch(err){
        res.status(500).json({ message: 'Error fetching announcements', error:err });
    }
})

module.exports = route;
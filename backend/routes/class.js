const express = require('express');
const route = express.Router();
const User = require("../models/user.js")
const Submission = require("../models/submission.js")
const Class = require("../models/class.js")
const Assignment = require("../models/assignment.js")
const passport = require('passport')
const multer = require('multer')
const {storage} = require("../cloudConfig.js");
const upload = multer({storage})
const axios = require('axios')
const Aigrade = require('../models/aigrading.js')
const {isLoggedin} = require("../middleware.js")
const cloudinary = require('cloudinary').v2;
const classControllers = require("../controllers/class.js")

route.use(express.json());
route.use(express.urlencoded({extended:true}));


route.post("/create",isLoggedin,classControllers.createClass)

route.post("/join", isLoggedin,classControllers.joinClass);

route.post('/grade-submission/:id',isLoggedin,upload.single('file'),classControllers.aiGradingAndSubmission);

route.post("/uploadAss/:id",isLoggedin,upload.single('file'),classControllers.uploadAss)

route.get("/getClasses",isLoggedin,classControllers.getallClasses)

route.get("/getClass/:id",isLoggedin,classControllers.viewClass)

route.get("/getGrading/:id",isLoggedin,classControllers.getGradings)

route.get('/submissions/:id', isLoggedin,async (req, res) => {
    try {
        const { id } = req.params;
        const classData = await Class.findById(id)
        .populate({
            path: 'assignments',
            populate: [
                {
                    path: 'submissions',
                    populate: {
                        path: 'studentId', 
                    }
                },
                {
                    path: 'submissions',
                    populate: {
                        path: 'aiGrade' 
                    }
                },
                {
                    path: 'submissions',
                    populate: {
                        path: 'assignmentId' 
                    }
                },
                
            ]
            
        })
        .populate('students');
        
            //.populate('aiGrade')
        if (!classData) {
            return res.status(404).send({ message: 'Class not found' });
        }
        const submissions = classData.assignments.flatMap(assignment => assignment.submissions);

        res.send({msg:"Class found successfully" ,submissions:submissions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});


route.put("/updateScore/:id",async(req,res)=>{
    try {
        const { score } = req.body;

        if (score < 0) {
            return res.status(400).json({ msg: "Invalid score. It must be a non-negative number." });
        }

        const submission = await Submission.findById(req.params.id);

        if (!submission) {
            return res.status(404).json({ msg: "Submission not found." });
        }

        if (!submission.aiGrade) {
            return res.status(400).json({ msg: "No AI grade associated with this submission." });
        }

        const updatedAigrade = await Aigrade.findByIdAndUpdate(
            submission.aiGrade,
            { $set: { score: score } },
            { new: true, runValidators: true }
        );

        if (!updatedAigrade) {
            return res.status(404).json({ msg: "AI Grade record not found." });
        }

        res.status(200).json({ msg: "Score updated successfully!", data: updatedAigrade });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: "Server error" });
    }
})

module.exports = route;



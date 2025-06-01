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
                        path: 'studentId', // Populate studentId in submissions
                    }
                },
                {
                    path: 'submissions',
                    populate: {
                        path: 'aiGrade' // Populate aiGrade in submissions
                    }
                },
                {
                    path: 'submissions',
                    populate: {
                        path: 'assignmentId' // Populate aiGrade in submissions
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

module.exports = route;



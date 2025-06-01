const Agenda = require("agenda");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const Assignment = require("../models/assignment.js");
const Submission = require("../models/submission.js");
const Class = require("../models/class.js");
require("dotenv").config();


const agenda = new Agenda({ db: { address: process.env.ATLAS_DBURL, collection: "agendaJobs" } });

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
    }
});


agenda.define("send assignment reminder", async (job) => {
    const { assignmentId } = job.attrs.data;
    
    const assignment = await Assignment.findById(assignmentId).populate("class").populate("uploaded_by");
    if (!assignment) return;

    const classData = await Class.findById(assignment.class).populate("students");

    // Get all submissions for this assignment in one query
    const submittedStudents = await Submission.find({ assignmentId }).distinct("studentId");
    
    for (const student of classData.students) {
        if (!submittedStudents.includes(student._id.toString())) {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: student.email,
                subject: "Assignment Deadline Reminder",
                text: `Hello ${student.name},\n\nThe deadline for '${assignment.title}' is approaching.\nPlease submit your assignment before the deadline.\n\nBest,\nYour ${assignment. uploaded_by.username}`
            });
        }
    }
});

(async function () {
    await agenda.start();
})();

module.exports = agenda;

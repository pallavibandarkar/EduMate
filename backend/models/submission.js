const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const submissionSchema = new Schema({
    assignmentId:{
        type:mongoose.Schema.ObjectId,
        ref:"Assignment",
    },
    studentId:{
        type:mongoose.Schema.ObjectId,
        ref:"User"
    },
    submittedOn:{
        type:Date,
        default: Date.now,
    },
    file:{
        url:String,
        filename:String,
    },
    submitted:{
        type:Boolean,
    },
    aiGrade:{
        type:Schema.ObjectId,
        ref:"Aigrade"
    },
})

module.exports = mongoose.model('Submission',submissionSchema)
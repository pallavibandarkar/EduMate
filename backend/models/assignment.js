const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const assignmentSchema = new Schema({
    title:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    file:{
        url:String,
        filename:String,
    },
    createdAt:{
        type:Date,
        default: Date.now,
    },
    deadline:{
        type:Date,
        required:true,
    },
    class:{
        type:mongoose.Schema.ObjectId,
        ref:"Class"
    },
    uploaded_by:{
        type:mongoose.Schema.ObjectId,
        ref:"User"
    },
    submissions:[
        {
            type:mongoose.Schema.ObjectId,
            ref:"Submission",
        }
    ]
})

module.exports = mongoose.model('Assignment',assignmentSchema)
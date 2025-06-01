const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const User = require('./user.js');
const { nanoid } = require("nanoid");

const classSchema = new Schema({
    className:{
        type:String,
        required:true,
    },
    div:{
        type:String,
    },
    classCode:{
        type: String,
        unique: true,
        required: true,
        default: () => nanoid(6).toUpperCase(),
    },
    classLink:{
        type:String,

    },
    classTeacher:{
        type:mongoose.Schema.ObjectId,
        ref:"User",
    },
    students:[
        {
            type:mongoose.Schema.ObjectId,
            ref:"User"
        }
    ],
    assignments:[
        {
            type:mongoose.Schema.ObjectId,
            ref:'Assignment'
        }
    ],
    announcements:[
        {
            type:mongoose.Schema.ObjectId,
            ref:"Announcement",
        }
    ],
    createdAt:{
        type:Date,
        default: Date.now,
    }
})

module.exports = mongoose.model('Class',classSchema)

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const announcementSchema = new Schema({
    classId:{
        type:mongoose.Schema.ObjectId,
        ref:"Class"
    },
    postedBy:{
        type:mongoose.Schema.ObjectId,
        ref:"User",
    },
    content:{
        type:String,
    },
    createdAt:{
        type:Date,
        default: Date.now,
    }
})

module.exports = mongoose.model('Announcement',announcementSchema)
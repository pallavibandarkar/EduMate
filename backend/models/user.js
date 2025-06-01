const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
    email:{
        type:String,
        required : true,
    },
    role:{
        type:String,
        enum:['student','teacher'],
    },
    classTeacher:[
        {
            type:mongoose.Schema.ObjectId,
            ref:"Class"
        },
    ],
    enrolledIn:[
        {
            type:mongoose.Schema.ObjectId,
            ref:"Class"
        },
    ]
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User",userSchema);
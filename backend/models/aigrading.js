const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const aigradingSchema = new Schema({
    score:{
        type:Number,
        required:true,
    },
    remarks:{
        type:[String],
    },
    suggestions:{
        type:[String],
    },
    errors:{
        type:[String],
    }
}, { 
    suppressReservedKeysWarning: true // Move the option here at schema level
});


module.exports = mongoose.model("Aigrade",aigradingSchema);
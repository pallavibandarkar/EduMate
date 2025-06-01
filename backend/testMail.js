if(process.env.NODE_ENV != "production"){
    require('dotenv').config();
}


const nodemailer = require("nodemailer");

// Replace with your Gmail and generated App Password
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,  
        pass: process.env.EMAIL_PASSWORD 
    }
});

const mailOptions = {
    from: process.env.EMAIL,
    to: "pallavibandarkar2@gmail.com", 
    subject: "Test Email from Nodemailer",
    text: "Hello! This is a test email to check if Nodemailer is working."
};

// Send email
transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.log("Error:", error);
    } else {
        console.log("Email sent successfully:", info.response);
    }
});

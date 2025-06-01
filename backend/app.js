if(process.env.NODE_ENV != "production"){
    require('dotenv').config();
}

const express = require('express');
const app = express();
const mongoose = require('mongoose')
const cors = require('cors')
const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const User = require("./models/user.js")
const userRouter = require("./routes/user.js")
const classRouter = require("./routes/class.js")
const announcementRouter = require("./routes/announcement.js")
const agenda = require("./utils/ajenda.js")


const dburl =process.env.ATLAS_DBURL
main()
.then(()=>{
    console.log("Connected to the atlas db")
})
.catch((err)=>{
    console.log("Error occurred!!")
})

async function main() {
    await mongoose.connect(dburl)
}

const sessionOptions = {
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:false,
    store: MongoStore.create({
        mongoUrl: process.env.ATLAS_DBURL, 
        
    }),
    cookie:{
        expires:Date.now()+7*24*60*60*1000,
        maxAge:7*24*60*60*1000,
        httpOnly:true,
        SameSite:'lax'
    }
}

app.use(cors( {
        origin: true, 
        credentials: true,  
}))

app.use(express.json());  
app.use(express.urlencoded({ extended: true }));

app.use(session(sessionOptions));
// Add flash middleware after session and before passport
app.use(flash());

app.use(passport.initialize())
app.use(passport.session())

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use("/profile",userRouter);
app.use('/class',classRouter)
app.use("/announcement",announcementRouter)

app.get("/hello",(req,res)=>{
    res.send("Welcome to edumate!!!");
})

app.get("/user", (req, res) => {
    res.send({ session: req.session, user: req.user });
});

app.use((err, req, res, next) => {
    console.error(err.stack); // Log the error stack for debugging
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

app.use((req, res, next) => {
    res.status(404).json({ message: 'Not Found' });
});

agenda.start().then(() => console.log("Agenda started"));

app.listen(8080,()=>{
    console.log("Listening on port 8080");
})

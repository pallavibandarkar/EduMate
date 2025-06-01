module.exports.isLoggedin = async(req,res,next)=>{
    console.log(req.user)
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized: Please log in first" });
    }
    next();
}
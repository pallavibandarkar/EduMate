const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name:process.env.CLOUD_NAME,
    api_key:process.env.CLOUD_API_KEY,
    api_secret:process.env.CLOUD_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: "EduMate",
      allowedFormats: ["png", "jpg", "jpeg", "pdf", "doc", "docx"],
      resource_type: "auto", 
    };
  },
    // cloudinary: cloudinary,
    // params: {
    //   folder: 'EduMate',
    //   allowerdFormats: ["png","jpg","jpej","pdf","docs"]
      
    // },
  });

module.exports={
    cloudinary,
    storage,
}
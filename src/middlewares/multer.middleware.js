import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp")                //multer will store the file in this path
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})
  
export const upload = multer({ 
  storage, 
})
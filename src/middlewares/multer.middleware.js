/**
 * the middle part upload.single('avatar') is middleware 
 * app.post('/profile', upload.single('avatar'), function (req, res, next) {
// req.file is the `avatar` file
// req.body will hold the text fields, if there were any
}) from the documentation 
 * we are using disk storage we could use memoryStorage also but it might be not convinient for larger files 

 */

import multer from "multer";

const storage = multer.diskStorage({
    // multer provides access to the file also below given
    destination: function (req, file, cb) {
    // cb is callback where the first param is for handling error since we are not handling any error for now so null and 
    // second param is for file path
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
    //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null,file.originalname)
    // cb(null, file.fieldname + '-' + uniqueSuffix)
    }
  })
  
  export const upload = multer({ storage: storage })
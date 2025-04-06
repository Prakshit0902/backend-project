/**
 * our agenda is to store a file temporarily on server before being uploaded on cloudinary
 * hence we are using the npm fs module
 * we find the localFilePath on the server and upload it to the cloudinary
 */

import { v2 as cloudinary } from "cloudinary";
import fs from "fs"
// fs is used for file system





const uploadOnCloudinary = async (localFilePath) => {
    cloudinary.config({ 
        cloud_name: `${process.env.CLOUDINARY_NAME}`, 
        api_key: `${process.env.CLOUDINARY_API_KEY}`, 
        api_secret: `${process.env.CLOUDINARY_API_SECRET}`
    });

    try {
        if (!localFilePath) {
            return null
        }

        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })

        console.log('File uploaded successfully on cloudinary',response);

        // after uploading the file to cloudinary we remove the local files stored in public/temp
        fs.unlinkSync(localFilePath)
        return response
        
    } catch (error) {
        // this removes the locally saved temp file 
        console.log("unlinking files");
        console.log(error);
        
        fs.unlinkSync(localFilePath)
        
    }
}

export {uploadOnCloudinary}
import {v2 as cloudinary} from "cloudinary"
import fs from "fs"             //library in nodejs,  to handle files

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUD_NAME, 
    api_key: process.env.CLOUD_API_KEY, 
    api_secret: process.env.CLOUD_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {          //localFilePath= public/temp here
    try {
        if (!localFilePath) return null
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        fs.unlinkSync(localFilePath)
        return response;
        // console.log("file is uploaded on cloudinary ", response);
        // returns object- url, height, width, format, created_at, bytes, orginal_filename

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}



export {uploadOnCloudinary}
import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/Cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const genereateAccessAndRefreshTokens= async(userId) =>{
    try {
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken() 

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave: false})              // wont check for validity of user before saving 
        return {accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating acces and refresh tokens")
    }
}
/*--------------------------------------------------------------------------------------------------------------------------*/
const registerUser= asyncHandler( async (req,res) =>{

    const {username, fullName,email,password} = req.body  //express gives req.body //data from form or json or body
    // console.log("req.body ",req.body);  

    /*req.body  [Object: null prototype] {
        fullName: 'Rishika',
        email: 'rm@gmail.com',
        username: 'rm',
        password: '1234'
    }*/


    // if(fullName==="" || username===""||email===""||password===""){
    //     throw new ApiError(400,"All fiels are required")
    // }

    if([fullName,username,email,password].some((field)=> field?.trim()==="")){
        throw new ApiError(400,"All fiels are required")
    }

    const userExist = await User.findOne({
        $or: [{username},{email}]
    })
    if(userExist){
        throw new ApiError(409,"User already exist")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;        //multer middleware gives the req.files access
    // .path is the local path where files are temporarily stored (public/temp)
    
    // console.log('req.files: ', req.files);
    
    /*req.files:  [Object: null prototype] {
    avatar: [                                                           
        {
        fieldname: 'avatar',
        originalname: 'pic.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        destination: './public/temp',
        filename: 'pic.jpg',
        path: 'public\\temp\\pic.jpg',                             // req,files->avatar->[0]->path
        size: 218661
        }
    ],
    coverImage: [
        {same
        }]
    }*/

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){      //so if no cover image is given there is no error .. it will be empyt in user
        coverImageLocalPath = req.files?.coverImage[0]?.path; 
    }   
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }
    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    if (!avatar) {                                                      // check if avatar uploaded
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url ||"",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser= await User.findById(user._id).select(
        "-password -refreshToken"                                       //remove what we dont want
    )
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser,"User registered successfully")        // return object-- new
    )
})
/*--------------------------------------------------------------------------------------------------------------------------*/

const loginUser = asyncHandler(async(req,res) => {

    const {email, username, password} = req.body
    if(!(username || email)){
        throw new ApiError(400, "username or email is required")
    }
    const user = await User.findOne({                                                 // User is object of mongoose->findOne
        $or: [{username}, {email}]
    })
    if(!user){
        throw new ApiError(404,"User does not exist")
    }
    const isPassValid =await user.isPasswordCorrect(password)
    if(!isPassValid){
        throw new ApiError(401,"Invalid user credentials")
    }

    const { accessToken,refreshToken } = await genereateAccessAndRefreshTokens(user._id)
    const loggedUser = await User.findOne(user._id).select("-password -refreshToken")

    const options ={
        httpOnly: true,
        secure: true                            // only server can modify cookies not from frontend
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)                    //using cookie-parser we can access the cookies
    .cookie("refreshToken",refreshToken,options)                    //adding cokkies
    .json(
        new ApiResponse(
            200,
            {
                user: loggedUser, accessToken,refreshToken
            },
            "User logged in Successfully"
        )
    )

})
/*--------------------------------------------------------------------------------------------------------------------------*/

const logoutUser = asyncHandler( async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,                                       //we added user by the verifyJWT middleware // so we got user id to logout
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options ={
        httpOnly: true,
        secure: true                                        // only server can modify not from frontend
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"))
})
/*--------------------------------------------------------------------------------------------------------------------------*/

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

export {registerUser , loginUser , logoutUser, refreshAccessToken }          //export an object so import an object
import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'

import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import jwt from "jsonwebtoken"


const generateAccessAndRefreshToken = async (userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        // this saves the user and doesn't validate it and save it directly
        await user.save({validateBeforeSave : false})

        return {accessToken,refreshToken}
    }
    catch (error){
        console.log(error);
        
        throw new ApiError(500,"Something went wrong while generating the access and refresh token")
    }
}


const registerUser = asyncHandler(async (req,res)=>{
    // for testing purposes only
    // res.status(200).json({
    //     message : 'OK '
    // })

    // get user details from frontend check the user.model.js
    // validation of the details (not empty ,email format)
    // check if user exists : username / email
    // check if images , avatars
    // upload them to cloudinary,check 
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation 
    // return res   

    console.log('this is req.body : ',req.body);
    
    const {email,fullname,username,password} = req.body
    console.log("email" ,email);

    // if (fullname === ""){
    //     throw new ApiError(400,"fullname is required")
    // }
    
    if ([fullname,email,password,username].some((field) => field ?.trim() === "")){
        throw new ApiError(400,"All fields are required")
    }   


    const existedUser = await User.findOne({
        // this is $or operator which checks either of them 
        // here it checks either username or email exists 
        $or : [{username},{email}]
    })

    if (existedUser){
        throw new ApiError(409,"User with email or username already exists ")
    }

    // as the express gives us access of body in the req 
    // similarly multer gives us access to files in our req

    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path

    // this above coverImageLocalPath is not required field so when not sent in the request arises an error of being undefined
    // to fix this we do this :

    let coverImageLocalPath

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath){
        throw new ApiError(400,"local path not found")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar){
        throw new ApiError(400,"Avatar is required")
    }

    const user = await User.create({
        fullname,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email,password,
        username : username.toLowerCase()
    })

    // we write the fields which we want to remove in the select in the string format with spaces 
    console.log("user is :",user );
    
    // in the created user with below object will not contain the password and refreshToken in response
    const userCreated = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!userCreated){
        throw new ApiError(500,"Something went wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200,userCreated,"User registered successfully")
    )
})


const loginUser = asyncHandler( async (req,res) => {
    // get data from the req.body
    // username or email
    // find the user
    // password check   
    // access and refresh token
    // send cookies (secure)
    

    const {username,email,password} = req.body

    if (!(username || email) ){
        throw new ApiError(400,"username or password is required")

    }

    const user = await User.findOne({
        $or : [{username},{email}] 
    })

    if (!user){
        throw new ApiError(404,"User doesn't exist ")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid){
        throw new ApiError(401,"Invalid password credentials")
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken") 


    const options = {
        // by checking these below attr the cookies will be secure and can only be modified by server
        httpOnly : true,
        secure : true
    }
    return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",refreshToken,options).json(
        // why sending the tokens here in response when we already saved it to cookie 
        // so there may be some reasons such as may be this is developed for mobile app which doesn't have cookies 
        // or user want to save the tokens in local storage
        new ApiResponse(200 , {
            user : loggedInUser,accessToken,refreshToken
        }, "User Logged In successfully")
    )
})

const logOutUser = asyncHandler( async (req,res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $set : {
            refreshToken : undefined
        }
        
    },
    {
        new : true
    }) 


    const options = {
        // by checking these below attr the cookies will be secure and can only be modified by server
        httpOnly : true,
        secure : true
    }

    return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options).json(
        new ApiResponse(200,{},"user logged out ")
    )
})

const  refreshAccessToken = asyncHandler(async (req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.user.refreshToken

    if (!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request ")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user){
            throw new ApiError(401,"invalid refresh token")
            
        }
    
        if (incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"refresh token expired or used ")
        }
    
        const options = {
            httpOnly : true,
            secure : true
        }
    
    
        const {accessToken,newRefreshToken} = await generateAccessAndRefreshToken(user._id)
        
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(new ApiResponse(200,{accessToken,refreshToken : newRefreshToken},"access token refreshed successfully"))
        
    } catch (error) {
        console.log(error);
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }
})


const changeCurrentPassword = asyncHandler(async (req,res) => {
    const {oldPassword,newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect){
        throw new ApiError(400,"Invalid password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave : false})

    return res.status(200).json(
        new ApiResponse(200,{},"password changed successfully")
    )
})

const getCurrentUser = asyncHandler(async (req,res) => {
    return res.status(200).json(
        new ApiResponse(200,req.user,"User fetched successfully")
    )
})

const updateAccountDetails = asyncHandler(async (req,res) => {
    // for updating the files we should use a different controller with endpoint
    const {fullname,username,email} = req.body

    if (!fullname || !email){
        throw new ApiError(400,"All fields are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,{
        $set : {
            fullname,
            email : email
        }
    },{
        new : true
    }).select("-password -refeshToken")


    return res.status(200).json(
        new ApiResponse(200,user,"Account Details updated successfully")    
    )
}) 

const updateUserAvatar = asyncHandler(async (req,res) => {
    // here we are not taking files because we are expecting only one file from the user request
    // to change the avatar of the user 
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400,"avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url){
        throw new ApiError(400,"Error uploading file")
    }

    // const user = await User.findById(req.user?._id)
    // user.avatar = avatar.url
    // user.save({validateBeforeSave : false})

    const user = await User.findByIdAndUpdate(req.user?._id,{
        $set : {
            avatar :avatar.url
        }
    },{
        new : true
    }).select("-password")

    return res.status(200).json(
        new ApiResponse(200,user,"Avatar updated successfully")
    )

})
const updateUserCoverImage = asyncHandler(async (req,res) => {
    // here we are not taking files because we are expecting only one file from the user request
    // to change the avatar of the user 
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400,"cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url){
        throw new ApiError(400,"Error uploading file")
    }

    // const user = await User.findById(req.user?._id)
    // user.avatar = avatar.url
    // user.save({validateBeforeSave : false})

    const user = await User.findByIdAndUpdate(req.user?._id,{
        $set : {
            coverImage :coverImage.url
        }
    },{
        new : true
    }).select("-password")

    return res.status(200).json(
        new ApiResponse(200,user,"Updated cover image successfully")
    )
})


export {loginUser}
export {logOutUser}
export {registerUser}
export {refreshAccessToken}
export {changeCurrentPassword}
export {getCurrentUser}
export {updateAccountDetails}
export {updateUserAvatar}
export {updateUserCoverImage}
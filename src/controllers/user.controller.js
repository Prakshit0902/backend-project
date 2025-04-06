import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'

import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import mongoose from "mongoose";

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

    if (!fullname || !email || !username){
        throw new ApiError(400,"All fields are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,{
        $set : {
            fullname,
            email : email,
            username : username
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


const getUserChannelProfile = asyncHandler(async (req,res) => {
    // we are taking the the username from the url hence using the params
    const {username} = req.params

    if (!username?.trim){
        throw new ApiError(400,"username is missing")
    }

    // await User.find({username}) we can find the document from here also 
    // instead we can use aggregation pipeline from here 

    // we will get arrays in return from the aggregate pipeline
    const channel = await User.aggregate([
        // these are pipelines here
        {
            // so instead of finding user as above we could do it here in a place using the match   
            $match : {
                username : username?.toLowerCase()
            }
        },
        {
            // lookup pipeline is basically the left join of sql which takes certain parameters to join
            $lookup : {
                // here we take the name of the table from where we want to join
                // the model we exported was Subscriptions but here using subscriptions as 
                // the mongoose changes the name of the model to lowercase and to plural
                from : "subscriptions",
                // local field is what is the joining column called in this document
                localField : "_id",
                // foreign field is what the joining column called in the field we have to join from 
                // we will count the number of subscribers by counting the channel from the documents  
                foreignField : "channel",
                // how will the new field named as so subscribers
                as : "subscribers"
            }
        },
        {
            // this is next pipeline in which we will count how many channel user subscribed
            $lookup : {
                from : "channel",
                localField : "_id",
                foreignField : "subscription",
                as : "subscribedTo"
            }

        },
        {
            // add fields pipeline adds the new additional fields added to the document 
            $addFields : {
                subscribersCount : {
                    // using $ for the fields
                    $size : "$subscribers"
                },
                channelSubscribedToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond : {
                        // checks the condition that whether this user is in the subscribers document or not 
                        // so condition consists of three things 1st is if,then,else
                        if : {
                            $in : [req.user?._id,"$subscribers.subscriber"]
                        },
                        then :true,
                        else : false
                    }
                } 
            }
        },
        {
            // this pipeline projection 
            $project : {
                // here we give which fields we want to project
                username : 1,
                fullname : 1,
                email : 1,
                avatar : 1,
                coverImage : 1,
                channelSubscribedToCount : 1,
                isSubscribed : 1,
                subscribersCount : 1
            }
        }
    ])

    if (!channel?.length){
        throw new ApiError(404,"Channel doesn't exist")
    }

    console.log(channel)

    return res.status(200).json(
        new ApiResponse(200,channel[0],"User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler (async (req,res) => {
    const user = await User.aggregate([
        // is mongo db _id we get a string which on seen on the atlas is seen as ObjectId('alkdfjasjf') so the 
        // string is obtained through _id 
        {
            $match : {
                // _id : req.user?._id this line will not work as expected as here the code will not go through mongoose
                // mongoose will not work here it will be sent directly 
                // as mongoose behind the scene fetches the ObjectId('') instead of just string and thats what we want
                // before we were using username for matching in the pipeline but here 
                // we are using the _id hence it is done this way only 
                _id : new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "watchHistory",
                foreignField: "_id",
                as : "watchHistory",

                // nested pipeline
                pipeline : [
                    {
                        $lookup : {
                            from : "user",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owneduser",
                            pipeline : [
                                {
                                    // the owner will also be a user but only with these fields rather than being of 
                                    // multiple fields as defined in user.models.js
                                    $project : {
                                        fullname : 1,
                                        username : 1,
                                        avatar : 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200,user[0].watchHistory,"Watch History fetched successfully")
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
export {getUserChannelProfile}
export {getWatchHistory}
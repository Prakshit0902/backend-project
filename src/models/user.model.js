import mongoose ,{Schema} from "mongoose";

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema({
    username : {
        type : String,
        required : true,
        unique : true,
        lowercase : true,
        trim : true,
        // index used for optimized searching 
        index : true
    },
    email : {
        type : String,
        required : true,
        unique : true,
        lowercase : true,
        trim : true,
    },
    fullname : {
        type : String,
        required : true,
        trim : true,
        index : true
    },
    avatar : {
        type : String, // using cloudinary url
        required : true
    },
    coverImage : {
        type : String,
    },
    watchHistory : [{
        type : Schema.Types.ObjectId,
        ref : "Video"
    }],
    password : {
        type : String,
        required : [true,"Password is required "]
    },
    refreshToken : {
        type : String
    }

},{timestamps : true})


/**
 * we can use hooks for mongoose schema for e.g pre , plugin , post etc. these are middlewares for the mongoose
 * also there are events for the hooks such as save,validate,remove,updateOne,deleteOne,init
 */

// we are doing this to encrypt the password 
userSchema.pre("save",async function(next){

    /**
     * the save hook is done when we are going to save any info in the userSchema but there is a problem
     * that any change is occuring for e.g avatar is changed and when going to save the callback will be fired and 
     * password will be updated again so we need to prevent this 
     * 
     * this function is not used directly by arrow function becoz it will not facilitate the refernce (this) to the function 
     * which required in this 
     * also it is taken async because it takes time to encrypt and save to db
     * also this pre is a middleware in mongoose we use next flag here 
     * the hash function uses rounds for hashing so second argument is the numerical input 
     * 
     *  
     */

    if (!this.isModified("password")){
        // if password is not changed then next will be called 
        return next()
    }
    this.password = await bcrypt.hash(this.password,10)
    next()

})

// we can also create custom methods for our schema 

userSchema.methods.isPasswordCorrect = async function(password){
    // this refers to userSchema
    // below function returns true if compare is matched
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken = function() {
    return jwt.sign({
        _id : this._id,
            
    },process.env.ACCESS_TOKEN_SECRET,{
    expiresIn : process.env.ACCESS_TOKEN_EXPIRY
})
}


userSchema.methods.generateRefreshToken = function() {
    return jwt.sign({
        _id : this._id,
        email : this.email,
        username : this.username,
        fullname : this.fullname    
    },process.env.REFRESH_TOKEN_SECRET,{
    expiresIn : process.env.REFRESH_TOKEN_EXPIRY
})
}

export const User = mongoose.model("User",userSchema)
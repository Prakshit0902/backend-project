import dotenv from "dotenv"

import {connectDB} from "./db/index.js"
import {app} from "./app.js"

dotenv.config({
    path : './.env'
})

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () =>{
        console.log("Server is running ");
        
    })
})
.catch((error) => {
    console.log(error);
    
}) 


// require('dotenv').config({path : './env'}) but this degrades consistency of code but there is no issue in code
// to fix the above issue we can just add import statement and changing the package.json file 
// by adding some commands in the scripts tag which are as 
// dev : nodemon src/index.js  ---> dev : nodemon -r dotenv/config --experimental-json-modules src/index.js
// 










// method 1

// import mongoose from "mongoose";
// import {DB_NAME} from "./constants"

// import express from "express";

// // function connectDB(){

// // }

// // connectDB()

// /** 
//  * But iife (immediately invoked function) which executes immediately as the program is live 
//  * also a semicolon is used at starting of the iife for clean code purposes
//  **/

// const app = express()

// ;(async () => {

//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error",(error) => {
//             console.log("Error listening db " , error);
//         })

//         app.listen(process.env.PORT, () => {
//             console.log(`PORT : ${process.env.PORT}`);
            
//         }) 
//     } catch (error) {
//         console.log(error);
        
//     }

// }) ()
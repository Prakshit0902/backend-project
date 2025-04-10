import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"

const app = express()

// app.use is used for middlewares
app.use(cors(
    {
        origin : process.env.CORS,
        credentials : true
    }
))

// data can be taken from json also and we can set a limit for json 
// in older versions body-parser are used as middleware which are by default in newer versions    

app.use(express.json({limit : "20kb"}))

// for urls and encoding where (space --> %20)

app.use(express.urlencoded({
    // these are options for this which are not required so often but can be set without this also there will be no issue
    extended : true,
    limit : "20kb"
}))

// we can also use static for storing the assets 

app.use(express.static("public"))

// cookieParser is used for accessing and set cookies of the user's browser and only servers can use these cookies and access

app.use(cookieParser())


import userRouter from './routes/user.routes.js'

// now as we are using the routes as middleware so instead of calling direct app.get we use 
// app.use() which is used for middlewares
// we are using userRouter as middleware

app.use("/api/v1/users",userRouter)

// http://localhost:8000/api/v1/users

export {app}
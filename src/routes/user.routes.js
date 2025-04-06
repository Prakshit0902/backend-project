import { Router } from "express";
import { registerUser,loginUser,logOutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router()

// using the middleware upload before sending to registerUser(controller)
router.route("/register").post(upload.fields([
    {
        name : "avatar",
        maxCount : 1
    },
    {
        name : "coverImage",
        maxCount : 1
    }
]),
    registerUser)


router.route("/login").post(loginUser)

router.route("/logout").post(verifyJWT,logOutUser)

router.route("/refresh-token").post(refreshAccessToken)

router.route("/change-password").post(verifyJWT,changeCurrentPassword)

router.route("/current-user").get(verifyJWT,getCurrentUser)

router.route("/update-account-details").patch(verifyJWT,updateAccountDetails)

// so due to this single we were getting the req.file instead of req.files and also there are two middlewares used here
// first verifyJWT then upload this is the reason why next is used 
router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
router.route("/coverImage").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)

// here the param we want to pass will be used at the username place basically it will be used at the semicolon
// with semicolon we can send the params and here it is named username as we are expecting username as destructure
// in the user.controller.js 
router.route("/c/:username").get(verifyJWT,getUserChannelProfile)

router.route("/history").get(verifyJWT,getWatchHistory)
export default router
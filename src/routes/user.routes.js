import { Router } from "express";
import { loginUser, logoutUser, registerUser, refreshAccessToken } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router=Router()

router.route("/register").post(
    upload.fields([                    // accepts array //accepting two files
        {
            name: "avatar",            // name of file.. will be same in frontend
            maxCount: 1
        }, 
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),                                //applying midddleware (upload) before the function (registerUser)
    registerUser)

router.route("/login").post(loginUser)


router.route("/logout").post(verifyJWT, logoutUser)                     //give reference to methods
router.route("/refresh-token").post(refreshAccessToken)

export default router             //we can name it anything when importing since it is default
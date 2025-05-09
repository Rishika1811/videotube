import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router=Router()

router.route("/register").post(registerUser)

export default router             //we can name it anything when importing since it is default
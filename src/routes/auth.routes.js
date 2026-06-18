import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";

const router = Router();

/**
 * POST /api/auth/register
 */

authRouter.post("/register", authController.register);



export default authRouter;
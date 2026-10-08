import { Router } from "express";
import { iniciarSesion, obtenerSesion, registrar } from "../controllers/auth.controller.js";
import { requiereLogin } from "../middlewares/auth.js";

const router = Router();

router.post("/registro", registrar);
router.post("/login", iniciarSesion);
router.get("/sesion", requiereLogin, obtenerSesion);

export default router;

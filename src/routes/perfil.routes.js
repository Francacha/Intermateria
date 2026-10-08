import { Router } from "express";
import { actualizarPerfil, obtenerPerfil } from "../controllers/perfil.controller.js";
import { requiereLogin } from "../middlewares/auth.js";

const router = Router();

router.use(requiereLogin);

router.get("/", obtenerPerfil);
router.put("/", actualizarPerfil);

export default router;

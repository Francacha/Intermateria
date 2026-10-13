import { Router } from "express";
import { actualizarPerfil, obtenerPerfil } from "../controllers/perfil.controller.js";
import { requiereEmpresa } from "../middlewares/auth.js";

const router = Router();

router.use(requiereEmpresa);

router.get("/", obtenerPerfil);
router.put("/", actualizarPerfil);

export default router;

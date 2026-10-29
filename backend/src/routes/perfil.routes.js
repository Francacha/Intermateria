import { Router } from "express";
import { actualizarPerfil, obtenerPerfil } from "../controllers/perfil.controller.js";
import { requiereEmpresa, soloDueno } from "../middlewares/auth.js";

const router = Router();

router.use(requiereEmpresa);

router.get("/", obtenerPerfil);
// Horarios y reglas de reserva los decide el dueño
router.put("/", soloDueno, actualizarPerfil);

export default router;

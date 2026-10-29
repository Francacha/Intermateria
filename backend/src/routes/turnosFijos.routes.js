import { Router } from "express";
import { actualizarTurnoFijo, nuevoTurnoFijo, obtenerTurnosFijos } from "../controllers/turnosFijos.controller.js";
import { requiereEmpresa } from "../middlewares/auth.js";

// Turnos fijos del complejo (dueño y encargados)
const router = Router();

router.use(requiereEmpresa);

router.get("/", obtenerTurnosFijos);
router.post("/", nuevoTurnoFijo);
router.put("/:id", actualizarTurnoFijo);

export default router;

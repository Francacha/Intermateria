import { Router } from "express";
import { actualizarTurno, crearTurnoManual, turnosDelDia } from "../controllers/turnos.controller.js";
import { requiereEmpresa } from "../middlewares/auth.js";

// Turnos de las canchas del complejo logueado
const router = Router();

router.use(requiereEmpresa);

router.get("/", turnosDelDia);
router.post("/", crearTurnoManual);
router.put("/:id", actualizarTurno);

export default router;

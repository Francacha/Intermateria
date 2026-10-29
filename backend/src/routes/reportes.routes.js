import { Router } from "express";
import { obtenerReportes } from "../controllers/reportes.controller.js";
import { requiereEmpresa, soloDueno } from "../middlewares/auth.js";

// Actividad del complejo: solo el dueño
const router = Router();

router.get("/", requiereEmpresa, soloDueno, obtenerReportes);

export default router;

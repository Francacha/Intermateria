import { Router } from "express";
import { obtenerCaja } from "../controllers/caja.controller.js";
import { requiereEmpresa } from "../middlewares/auth.js";

// Caja del día (dueño y encargados)
const router = Router();

router.get("/", requiereEmpresa, obtenerCaja);

export default router;

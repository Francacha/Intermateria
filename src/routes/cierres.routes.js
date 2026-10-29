import { Router } from "express";
import { crearCierre, eliminarCierre, listarCierres } from "../controllers/cierres.controller.js";
import { requiereEmpresa } from "../middlewares/auth.js";

// Cierres de canchas por lluvia o mantenimiento (dueño y encargados)
const router = Router();

router.use(requiereEmpresa);

router.get("/", listarCierres);
router.post("/", crearCierre);
router.delete("/:id", eliminarCierre);

export default router;

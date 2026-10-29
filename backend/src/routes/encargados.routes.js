import { Router } from "express";
import { actualizarEncargado, crearEncargado, listarEncargados } from "../controllers/encargados.controller.js";
import { requiereEmpresa, soloDueno } from "../middlewares/auth.js";

// Equipo del complejo: solo lo gestiona el dueño
const router = Router();

router.use(requiereEmpresa, soloDueno);

router.get("/", listarEncargados);
router.post("/", crearEncargado);
router.put("/:id", actualizarEncargado);

export default router;

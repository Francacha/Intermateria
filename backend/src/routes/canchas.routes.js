import { Router } from "express";
import {
  obtenerCanchas,
  crearCancha,
  actualizarCancha,
  eliminarCancha
} from "../controllers/canchas.controller.js";
import { requiereEmpresa, soloDueno } from "../middlewares/auth.js";

const router = Router();

router.use(requiereEmpresa);

router.get("/", obtenerCanchas);
// Las canchas y sus precios los define el dueño; los encargados solo las ven
router.post("/", soloDueno, crearCancha);
router.put("/:id", soloDueno, actualizarCancha);
router.delete("/:id", soloDueno, eliminarCancha);

export default router;

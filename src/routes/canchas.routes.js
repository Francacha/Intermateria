import { Router } from "express";
import {
  obtenerCanchas,
  crearCancha,
  actualizarCancha,
  eliminarCancha
} from "../controllers/canchas.controller.js";
import { requiereLogin } from "../middlewares/auth.js";

const router = Router();

router.use(requiereLogin);

router.get("/", obtenerCanchas);
router.post("/", crearCancha);
router.put("/:id", actualizarCancha);
router.delete("/:id", eliminarCancha);

export default router;

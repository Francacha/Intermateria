import { Router } from "express";
import {
  actualizarTurno,
  anularPagoTurno,
  cancelarTurnoComplejo,
  crearTurnoManual,
  registrarPagoTurno,
  resolverSenaTurno,
  turnosDelDia
} from "../controllers/turnos.controller.js";
import { requiereEmpresa, soloDueno } from "../middlewares/auth.js";

// Turnos de las canchas del complejo logueado (dueño y encargados)
const router = Router();

router.use(requiereEmpresa);

router.get("/", turnosDelDia);
router.post("/", crearTurnoManual);
router.put("/:id", actualizarTurno);
router.put("/:id/cancelar", cancelarTurnoComplejo);
router.put("/:id/sena", resolverSenaTurno);
router.post("/:id/pagos", registrarPagoTurno);
// Anular un pago cargado por error: solo el dueño
router.delete("/:id/pagos/:idPago", soloDueno, anularPagoTurno);

export default router;

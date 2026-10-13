import { Router } from "express";
import { cancelarMiReserva, misReservas, reservar } from "../controllers/turnos.controller.js";
import { requiereCliente } from "../middlewares/auth.js";

// Reservas del cliente logueado
const router = Router();

router.use(requiereCliente);

router.get("/", misReservas);
router.post("/", reservar);
router.put("/:id/cancelar", cancelarMiReserva);

export default router;

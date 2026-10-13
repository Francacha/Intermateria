import { Router } from "express";
import {
  iniciarSesion,
  obtenerSesion,
  registrar,
  registrarCliente
} from "../controllers/auth.controller.js";
import { requiere } from "../middlewares/auth.js";

const router = Router();

router.post("/registro", registrar);                 // complejo
router.post("/registro-cliente", registrarCliente);  // jugador
router.post("/login", iniciarSesion);                // los tres roles
router.get("/sesion", requiere("admin", "empresa", "cliente"), obtenerSesion);

export default router;

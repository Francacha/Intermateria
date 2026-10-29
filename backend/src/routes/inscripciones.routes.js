import { Router } from "express";
import { darseDeBaja, inscribirse, misInscripciones } from "../controllers/inscripciones.controller.js";
import { requiereCliente } from "../middlewares/auth.js";

// Equipos que inscribe el cliente logueado
const router = Router();

router.use(requiereCliente);

router.get("/", misInscripciones);
router.post("/", inscribirse);
router.delete("/:id", darseDeBaja);

export default router;

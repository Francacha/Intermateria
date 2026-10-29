import { Router } from "express";
import {
  disponibilidad,
  disponibilidadDelDia,
  listarComplejos,
  listarTorneos,
  obtenerComplejo,
  obtenerTorneoPublico
} from "../controllers/publico.controller.js";

// Sin login: catálogo de complejos, disponibilidad de canchas y torneos
const router = Router();

router.get("/complejos", listarComplejos);
router.get("/complejos/:id", obtenerComplejo);
router.get("/canchas/:id/disponibilidad", disponibilidad);
router.get("/disponibilidad", disponibilidadDelDia);
router.get("/torneos", listarTorneos);
router.get("/torneos/:id", obtenerTorneoPublico);

export default router;

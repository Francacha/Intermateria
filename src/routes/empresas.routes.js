import { Router } from "express";
import {
  obtenerEmpresas,
  obtenerEmpresaPorId,
  crearEmpresa,
  actualizarEmpresa,
  eliminarEmpresa
} from "../controllers/empresas.controller.js";

const router = Router();

router.get("/", obtenerEmpresas);
router.get("/:id", obtenerEmpresaPorId);
router.post("/", crearEmpresa);
router.put("/:id", actualizarEmpresa);
router.delete("/:id", eliminarEmpresa);

export default router;
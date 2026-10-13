import { Router } from "express";
import {
  obtenerEmpresas,
  obtenerEmpresaPorId,
  crearEmpresa,
  actualizarEmpresa,
  eliminarEmpresa,
  obtenerResumen
} from "../controllers/empresas.controller.js";
import { requiereAdmin } from "../middlewares/auth.js";

const router = Router();

// Solo el administrador gestiona las empresas
router.use(requiereAdmin);

router.get("/", obtenerEmpresas);
router.get("/resumen", obtenerResumen);
router.get("/:id", obtenerEmpresaPorId);
router.post("/", crearEmpresa);
router.put("/:id", actualizarEmpresa);
router.delete("/:id", eliminarEmpresa);

export default router;

import { Router } from "express";
import {
  actualizarPartido,
  actualizarTorneo,
  armarFixture,
  armarLaLlave,
  cambiarGrupo,
  crearTorneo,
  eliminarTorneo,
  inscribirEquipo,
  obtenerTorneo,
  obtenerTorneos,
  quitarEquipo,
  sortearLosGrupos
} from "../controllers/torneos.controller.js";
import { requiereEmpresa } from "../middlewares/auth.js";

// Torneos y campeonatos del complejo logueado
const router = Router();

router.use(requiereEmpresa);

router.get("/", obtenerTorneos);
router.post("/", crearTorneo);
router.get("/:id", obtenerTorneo);
router.put("/:id", actualizarTorneo);
router.delete("/:id", eliminarTorneo);
router.post("/:id/equipos", inscribirEquipo);
router.delete("/:id/equipos/:idEquipo", quitarEquipo);
router.put("/:id/equipos/:idEquipo/grupo", cambiarGrupo);
router.post("/:id/grupos/sorteo", sortearLosGrupos);
router.post("/:id/fixture", armarFixture);
router.post("/:id/llave", armarLaLlave);
router.put("/:id/partidos/:idPartido", actualizarPartido);

export default router;

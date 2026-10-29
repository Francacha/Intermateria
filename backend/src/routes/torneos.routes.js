import { Router } from "express";
import {
  actualizarPartido,
  actualizarTorneo,
  armarFixture,
  crearTorneo,
  eliminarTorneo,
  inscribirEquipo,
  obtenerTorneo,
  obtenerTorneos,
  quitarEquipo
} from "../controllers/torneos.controller.js";
import { requiereEmpresa, soloDueno } from "../middlewares/auth.js";

// Torneos y campeonatos del complejo logueado
const router = Router();

router.use(requiereEmpresa);

router.get("/", obtenerTorneos);
// Qué torneos se organizan lo decide el dueño; los encargados inscriben y cargan resultados
router.post("/", soloDueno, crearTorneo);
router.get("/:id", obtenerTorneo);
router.put("/:id", soloDueno, actualizarTorneo);
router.delete("/:id", soloDueno, eliminarTorneo);
router.post("/:id/equipos", inscribirEquipo);
router.delete("/:id/equipos/:idEquipo", quitarEquipo);
router.post("/:id/fixture", soloDueno, armarFixture);
router.put("/:id/partidos/:idPartido", actualizarPartido);

export default router;

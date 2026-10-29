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
// Armar los grupos, el fixture y la llave también lo decide el dueño
router.put("/:id/equipos/:idEquipo/grupo", soloDueno, cambiarGrupo);
router.post("/:id/grupos/sorteo", soloDueno, sortearLosGrupos);
router.post("/:id/fixture", soloDueno, armarFixture);
router.post("/:id/llave", soloDueno, armarLaLlave);
router.put("/:id/partidos/:idPartido", actualizarPartido);

export default router;

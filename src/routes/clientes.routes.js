import { Router } from "express";
import { cambiarPasswordCliente, listarClientes } from "../controllers/clientes.controller.js";
import { requiereAdmin } from "../middlewares/auth.js";

const router = Router();

// Solo el administrador gestiona a los jugadores
router.use(requiereAdmin);

router.get("/", listarClientes);
router.put("/:id/password", cambiarPasswordCliente);

export default router;

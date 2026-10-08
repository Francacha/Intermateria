import "dotenv/config";
import os from "node:os";
import express from "express";
import cors from "cors";
import empresasRoutes from "./routes/empresas.routes.js";
import authRoutes from "./routes/auth.routes.js";
import canchasRoutes from "./routes/canchas.routes.js";
import perfilRoutes from "./routes/perfil.routes.js";

if (!process.env.JWT_SECRET) {
  console.error("Falta la variable de entorno JWT_SECRET");
  process.exit(1);
}

const app = express();
// Nombre del droplet donde corre esta réplica (lo define el docker-compose)
const DROPLET = process.env.DROPLET || os.hostname();

app.use(cors({ exposedHeaders: ["X-Droplet"] }));
app.use(express.json());

// Cada respuesta indica qué droplet la atendió (se muestra en el pie del front)
app.use((req, res, next) => {
  res.set("X-Droplet", DROPLET);
  next();
});

app.get("/api/instancia", (req, res) => {
  res.json({ droplet: DROPLET });
});

app.use("/api/empresas", empresasRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/canchas", canchasRoutes);
app.use("/api/perfil", perfilRoutes);

app.use((req, res) => {
  res.status(404).json({ mensaje: "Ruta no encontrada" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API en ${DROPLET} corriendo en el puerto ${PORT}`);
});

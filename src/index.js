import "dotenv/config";
import express from "express";
import cors from "cors";
import empresasRoutes from "./routes/empresas.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/empresas", empresasRoutes);

app.use((req, res) => {
  res.status(404).json({ mensaje: "Ruta no encontrada" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
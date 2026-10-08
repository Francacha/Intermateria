import { MongoClient } from "mongodb";

// Base NoSQL (MongoDB Atlas, vía web): guarda el PERFIL de cada complejo
// (descripción, servicios, horarios, redes). Cada complejo tiene datos
// distintos y sin estructura fija, por eso va en un documento y no en tablas.
const uri = process.env.MONGO_URI;
const cliente = uri ? new MongoClient(uri, { serverSelectionTimeoutMS: 5000 }) : null;
const perfiles = cliente?.db(process.env.MONGO_DB || "canchas").collection("perfiles");

export const mongoActivo = Boolean(cliente);

export const buscarPerfil = (idEmpresa) =>
  perfiles.findOne({ id_empresa: idEmpresa }, { projection: { _id: 0 } });

export const guardarPerfil = async (idEmpresa, datos) => {
  await perfiles.updateOne(
    { id_empresa: idEmpresa },
    { $set: { ...datos, id_empresa: idEmpresa, actualizado: new Date() } },
    { upsert: true }
  );
  return buscarPerfil(idEmpresa);
};

// Se llama al eliminar una empresa en PostgreSQL para no dejar perfiles huérfanos
export const eliminarPerfil = async (idEmpresa) => {
  if (!perfiles) return;
  try {
    await perfiles.deleteOne({ id_empresa: idEmpresa });
  } catch (error) {
    console.error("No se pudo eliminar el perfil en MongoDB:", error.message);
  }
};

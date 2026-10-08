import { useSyncExternalStore } from "react";

// Guarda el último droplet que respondió para mostrarlo en el pie de página
let actual = "";
const suscriptores = new Set();

export const setDroplet = (droplet) => {
  if (!droplet || droplet === actual) return;
  actual = droplet;
  suscriptores.forEach((avisar) => avisar());
};

const suscribir = (avisar) => {
  suscriptores.add(avisar);
  return () => suscriptores.delete(avisar);
};

export const useDroplet = () => useSyncExternalStore(suscribir, () => actual);

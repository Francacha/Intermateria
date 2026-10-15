import { useEffect, useRef, useState } from "react";

// Comportamiento de diálogo: al abrir, el foco entra; Tab no se escapa; Escape cierra;
// al cerrar, el foco vuelve a donde estaba. ventana es el ref del contenedor del diálogo.
export default function useDialogo(ventana, onCerrar) {
  // onCerrar cambia en cada render del padre; el ref evita reiniciar el diálogo por eso
  const cerrar = useRef(onCerrar);
  // Lo que tenía el foco antes de abrir (se toma al primer render, antes de cualquier autoFocus de adentro)
  const [anterior] = useState(() => document.activeElement);
  useEffect(() => {
    cerrar.current = onCerrar;
  });

  useEffect(() => {
    const enfocables = () =>
      [...(ventana.current?.querySelectorAll("button:not(:disabled), a[href], input:not(:disabled), select, textarea") ?? [])];
    // Si algo de adentro ya tomó el foco (autoFocus), se respeta
    if (!ventana.current?.contains(document.activeElement)) (enfocables()[0] ?? ventana.current)?.focus();
    const teclas = (e) => {
      if (e.key === "Escape") return cerrar.current();
      if (e.key !== "Tab" || !ventana.current) return;
      const lista = enfocables();
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo?.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero?.focus();
      }
    };
    document.addEventListener("keydown", teclas);
    return () => {
      document.removeEventListener("keydown", teclas);
      if (anterior?.isConnected) anterior.focus();
    };
  }, [ventana, anterior]);
}

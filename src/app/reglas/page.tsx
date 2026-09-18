"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ReglasPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    (async () => {
      const me = await fetch("/api/me").then((r) => r.json());
      if (!me.user) {
        router.push("/");
        return;
      }
      if (me.user.role === "admin") {
        router.push("/admin");
        return;
      }
      setFirstName(me.user.firstName || "");
      setReady(true);
    })();
  }, [router]);

  if (!ready) {
    return <main className="flex-1 flex items-center justify-center text-[#5B655F]">Cargando...</main>;
  }

  return (
    <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 md:py-12">
      <div className="text-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1E2422]">¡Bienvenido{firstName ? `, ${firstName}` : ""}!</h1>
        <p className="text-sm text-[#5B655F] mt-1">Antes de empezar, lee bien las reglas del juego.</p>
      </div>

      <div className="space-y-4">
        <section className="bg-white border border-[#DAD3C4] rounded-2xl p-5">
          <h2 className="font-bold text-[#2F6E5C] mb-2">🎮 Los 3 niveles</h2>
          <p className="text-sm text-[#3a413e] mb-2">
            El juego tiene 3 niveles de 10 preguntas cada uno. Cada nivel es más difícil que el anterior y tiene
            <b> menos tiempo</b> para responder:
          </p>
          <ul className="text-sm text-[#3a413e] space-y-1 list-disc list-inside">
            <li><b>Nivel 1 — The Matter and the Molecule of the Month Project:</b> 6 minutos</li>
            <li><b>Nivel 2 — The Molecule of the Month and the Chemistry Universe:</b> 5 minutos</li>
            <li><b>Nivel 3 — 30 Years of Molecules:</b> 3 minutos</li>
          </ul>
          <p className="text-sm text-[#3a413e] mt-2">
            Debes completar un nivel para poder pasar al siguiente. ¡No puedes saltarte ninguno!
          </p>
        </section>

        <section className="bg-white border border-[#DAD3C4] rounded-2xl p-5">
          <h2 className="font-bold text-[#2F6E5C] mb-2">❓ Tipos de preguntas</h2>
          <ul className="text-sm text-[#3a413e] space-y-2">
            <li>
              <b>Preguntas normales:</b> de los temas de química que has visto en clase.
            </li>
            <li>
              <b>Preguntas en inglés 🇬🇧:</b> valen más puntos que las normales. Cuando te salga una, verás la imagen
              de English Day como recordatorio.
            </li>
            <li>
              <b>Preguntas Molecule of the Month (MoM) 🧪:</b> también valen más puntos. Cuando te salga una,
              <b> busca la estructura de la molécula en las carteleras de la pared del salón</b> — ahí tienes pistas
              para responder bien.
            </li>
          </ul>
          <p className="text-sm text-[#3a413e] mt-2">
            Las preguntas y el orden de las opciones son diferentes para cada estudiante, así que no sirve copiarle a
            tu compañero.
          </p>
        </section>

        <section className="bg-white border border-[#DAD3C4] rounded-2xl p-5">
          <h2 className="font-bold text-[#2F6E5C] mb-2">🏆 El ranking</h2>
          <ul className="text-sm text-[#3a413e] space-y-1 list-disc list-inside">
            <li>Durante el <b>Nivel 1</b> no se muestra ranking — juega concentrado.</li>
            <li>Durante el <b>Nivel 2</b> verás el ranking según los resultados del Nivel 1.</li>
            <li>Durante el <b>Nivel 3</b> verás la suma de los Niveles 1 y 2, y tu posición global.</li>
          </ul>
        </section>

        <section className="bg-[#FBE9E6] border border-[#C24B3F]/40 rounded-2xl p-5">
          <h2 className="font-bold text-[#8a3226] mb-2">⏱ Importante sobre el tiempo</h2>
          <p className="text-sm text-[#5c281f]">
            El cronómetro de cada nivel sigue corriendo aunque cierres la pestaña, salgas del navegador o dejes de
            responder. Cuando se acabe el tiempo, el sistema cierra el nivel automáticamente y te asigna los puntos
            de las preguntas que sí alcanzaste a responder — las que no respondiste quedan en cero. Así que no te
            distraigas y responde lo más rápido y concentrado que puedas.
          </p>
        </section>

        <section className="bg-[#FBF0DD] border border-[#EAD9A0] rounded-2xl p-5 text-center">
          <h2 className="font-bold text-[#6e5a1e] mb-1">🎁 Premio para el ganador</h2>
          <p className="text-sm text-[#5c4a17]">
            El estudiante con el mejor puntaje del ranking general se gana una <b>tarjeta de regalo precargada</b>.
          </p>
        </section>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={() => router.push("/game/level/1")}
          className="bg-[#2F6E5C] text-white font-semibold rounded-lg px-8 py-3 text-lg shadow-sm hover:bg-[#255a4a] transition-colors"
        >
          Iniciar trivia
        </button>
      </div>
    </main>
  );
}

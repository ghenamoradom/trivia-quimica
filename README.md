# Trivia Química — IE Juan XXIII

Juego de trivia por niveles (3 niveles, 10 preguntas cada uno) basado en el
banco de preguntas de Trivia Química / Molecule of the Month. Incluye
registro de estudiantes, ranking en vivo, y un panel de administrador con
estadísticas y exportación a Excel/PDF.

## Requisitos

- Node.js 22+ (usa `node -v` para verificar)
- npm

## 1. Instalación

```bash
npm install --legacy-peer-deps
```

> Se usa `--legacy-peer-deps` por un problema conocido del entorno con
> `npm install` normal; no afecta el funcionamiento de la app.

## 2. Música de fondo (opcional, pero recomendado)

Por derechos de autor, no se pueden distribuir aquí las pistas de audio
originales. Agrega tus propios archivos MP3 (que ya poseas legalmente) con
estos nombres exactos dentro de `public/audio/`:

```
public/audio/level1.mp3   (sugerido: Mario Bros. - Underground)
public/audio/level2.mp3   (sugerido: Top Gear Soundtrack - Track 1)
public/audio/level3.mp3   (sugerido: Donkey Kong Country - Aquatic Ambience)
```

Si no los agregas, el juego funciona igual; simplemente no habrá música de
fondo hasta que los coloques ahí.

## 3. Probar localmente

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). En desarrollo local,
sin configurar nada más, la app usa automáticamente una base de datos SQLite
local (carpeta `data/`, ignorada por git) — no necesitas instalar ni
configurar Postgres para probar.

El usuario administrador se crea automáticamente la primera vez que alguien
usa el login o el registro, con estas credenciales (definidas en
`.env.local` si lo creas, o los valores por defecto de abajo):

- **Usuario:** `ghenamoradom`
- **Contraseña:** `B@ttousai_d3st4j4d0r`

Para probar el flujo completo con una build de producción real (más fiel a
lo que verá en Vercel):

```bash
npm run build
npm run start
```

### Reiniciar los datos de prueba

Para borrar todos los registros/partidas de prueba y empezar de cero,
simplemente borra la carpeta `data/`:

```bash
rm -rf data
```

## 4. Configurar Supabase (base de datos de producción)

1. Crea un proyecto en [supabase.com](https://supabase.com) (plan gratuito
   es suficiente para este uso).
2. En el panel del proyecto ve a **Project Settings → Database → Connection
   string** y copia la cadena en modo **URI** (asegúrate de usar la variante
   "Connection pooling" / puerto 6543 si tu proyecto lo ofrece, o la directa
   si no).
3. Copia `.env.example` a `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
4. Pega tu cadena de conexión en `DATABASE_URL` dentro de `.env.local`.
5. Genera un valor aleatorio largo para `JWT_SECRET` (por ejemplo con
   `openssl rand -hex 32`).
6. Deja `ADMIN_USERNAME` y `ADMIN_PASSWORD` como están, o cámbialos si
   quieres otra contraseña de administrador.

La primera vez que la app se conecte a esa base de datos, crea las tablas
automáticamente (no hace falta correr migraciones a mano).

## 5. Subir a GitHub

```bash
git add -A
git commit -m "Trivia Química: juego completo con niveles, ranking y panel admin"
git branch -M main
git remote add origin <URL-de-tu-repositorio-en-GitHub>
git push -u origin main
```

> Nota: la carpeta `data/` (base de datos local SQLite) y los archivos
> `.env*` están en `.gitignore` a propósito — no se deben subir a GitHub.
> Los archivos MP3 en `public/audio/` **sí** se suben si los agregaste,
> porque son tuyos y el juego los necesita en producción.

## 6. Desplegar en Vercel

1. En [vercel.com](https://vercel.com), haz clic en **Add New → Project** e
   importa el repositorio de GitHub que acabas de crear.
2. En **Environment Variables**, agrega las mismas variables de tu
   `.env.local`:
   - `DATABASE_URL` (tu cadena de Supabase)
   - `JWT_SECRET`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
3. Haz clic en **Deploy**. Vercel detecta automáticamente que es un proyecto
   Next.js y no requiere configuración adicional.
4. Una vez desplegado, visita la URL que te da Vercel y prueba el flujo
   completo (registro, los 3 niveles, y el panel `/admin`).

## Cómo funciona el juego (resumen)

- **Nivel 1** — "The Matter and the Molecule of the Month Project": 10
  preguntas, 10 minutos, 1 pt/pregunta normal, 3 pts la de inglés, 2 pts la
  de MoM (14 pts en juego) + 1 pt bono por las 10 correctas. Música:
  `level1.mp3`.
- **Nivel 2** — "The Molecule of the Month and the Chemistry Universe": 10
  preguntas, 8.5 minutos, 2 pts/pregunta normal, 5 pts inglés, 3 pts MoM (28
  pts en juego) + 2 pts bono. Música: `level2.mp3`.
- **Nivel 3** — "30 Years of Molecules": 10 preguntas, 7 minutos, 3
  pts/pregunta normal, 5 pts inglés, 3 pts MoM + 4 pts bono. Música:
  `level3.mp3`.

Las preguntas y el orden de las opciones se generan de forma aleatoria e
independiente para cada estudiante (para evitar copia), tomadas del banco de
preguntas original. La pregunta en inglés nunca repite una pregunta que ya
se le haya hecho en español al mismo estudiante en ese nivel.

Si el tiempo se agota antes de terminar, el nivel se cierra automáticamente:
las preguntas ya respondidas conservan su puntaje y las que faltan quedan en
cero.

El ranking en vivo se muestra siempre, excepto durante el Nivel 1. Durante
el Nivel 2 se muestra el ranking según los resultados del Nivel 1; durante
el Nivel 3 se muestra la suma de Niveles 1+2 y la posición global.

## Panel de administrador (`/admin`)

Con las mismas credenciales de arriba, inicia sesión desde la página
principal y serás redirigido automáticamente al panel. Ahí puedes ver:

- El ranking completo (no solo el Top 10).
- Resultados detallados por estudiante y por nivel, filtrables por curso.
- Estadísticas: registrados, completaron a tiempo, completaron sin tiempo,
  iniciaron y no terminaron, promedio de puntaje de mujeres y de hombres.
- Exportar todos los resultados a Excel.
- Exportar estadísticas principales + Top 10 a PDF.

## Decisiones y aclaraciones importantes

Durante la construcción del juego tomé algunas decisiones interpretativas
que quiero que confirmes o me indiques si prefieres cambiarlas:

1. **Puntaje del Nivel 3:** con el peso indicado (3 pts normal × 7 preguntas,
   5 pts inglés × 1, 3 pts MoM × 2) el máximo posible da 36 puntos, no 46
   como se mencionó. Implementé el máximo real de 36 + 4 pts de bono. Si
   querías otra distribución de puntos para llegar a 46, dime cómo
   ajustarla.
2. **Criterio de desempate #5** (que se repetía como "tiempo del nivel 3" en
   las instrucciones originales) lo interpreté como el tiempo del **Nivel
   1**, ya que los niveles 2 y 3 ya estaban cubiertos por los criterios 3 y
   4.
3. **Preguntas "Molecule of the Month" (MoM):** en el archivo original eran
   de completar/crucigrama; para que el juego las pueda calificar
   automáticamente y a tiempo, las convertí en preguntas de opción múltiple
   (el nombre correcto de la molécula + 3 nombres distractores tomados del
   mismo banco MoM).
4. **Prevención de copia:** no fue necesario usar la API de Anthropic; se
   resolvió con aleatorización server-side (distinta selección de preguntas
   y orden de opciones por estudiante) y bloqueo de repetición español/inglés.
5. **"Ranking en tiempo real":** se actualiza automáticamente cada 15
   segundos mientras el estudiante juega, en lugar de un websocket
   instantáneo — para este tamaño de grupo (un salón de clase) el resultado
   es prácticamente el mismo.
6. **Música de fondo:** no pude incluir las pistas de Mario Bros., Top Gear
   ni Donkey Kong Country por derechos de autor (Nintendo / BBC). Debes
   agregar tus propios archivos MP3 como se explica en la sección 2.

## Base de datos: cómo funciona por dentro

En local, sin `DATABASE_URL` configurada, la app usa automáticamente SQLite
(`better-sqlite3`) guardando todo en `data/local.db` — cero configuración.
En producción, con `DATABASE_URL` apuntando a Postgres/Supabase, usa el
driver de `pg`. El cambio es automático según esa variable de entorno; el
resto del código de la app es idéntico en ambos casos.

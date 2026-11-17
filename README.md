# 🎓 IngresaYa

App para prepararse para el examen de admisión **jugando**. Empezamos con la **UNICA** (Universidad Nacional San Luis Gonzaga de Ica); Beca 18 y otras universidades vendrán después, cada una por separado.

## Qué incluye este prototipo
- **Elegir examen**: UNICA disponible; Beca 18 y otras universidades "Próximamente". Cada examen guarda su propio progreso.
- **Práctica libre**: el alumno elige curso y cantidad de preguntas (5, 10, 20 o 50), con pistas 💡 y explicación de cada respuesta.
- **Monedas 🪙**: +1 por respuesta correcta (sin pista), +5 por terminar con 70% o más, +5 por racha diaria 🔥, +50 por quedar en el Top 10. Bono de bienvenida: 50.
- **🏆 Examen de Admisión semanal**: domingos de 8 a. m. a 8 p. m., 100 preguntas, 3 horas, entrada de 100 monedas. Preguntas y opciones en orden distinto para cada alumno.
- **Resultados**: puntaje, puesto en el ranking, comparación con el examen anterior, temas débiles y revisión con explicaciones.
- **Modo demo**: permite abrir el examen del domingo en cualquier momento para probarlo.

## Limitaciones actuales (prototipo)
- Las **54 preguntas son de ejemplo**; se reemplazarán por el banco basado en exámenes anteriores de la UNICA.
- La estructura del examen (100 preguntas, 3 horas) es provisional hasta revisar el prospecto oficial (`src/data/exams.ts`).
- Sin cuentas configuradas, el progreso se guarda **solo en el navegador** y el ranking es simulado.
- El pago del Premium (S/ 5 al mes) y los anuncios aún no están implementados.

## ✨ Más funciones
- **Ícono y carga rápida:** la app tiene ícono propio y un service worker para abrir rápido (`public/manifest.webmanifest`, `public/sw.js`). El botón "Instalar" se agregará cuando exista la versión APK.
- **Pregunta del día:** la misma para todos; da +10 monedas si aciertas y +2 por intentarlo.
- **Repasa tus errores:** las preguntas falladas vuelven en 1, 3 y 7 días hasta dominarlas (repaso espaciado).
- **Mi progreso:** preguntas por día (2 semanas), aciertos por curso y 12 logros.
- **Logros:** se avisan con una notificación al desbloquearse.
- **Invita a un amigo:** enlace `?ref=CODIGO`; +50 monedas para cada uno (máximo 30 invitados).
- **Duelo 1 vs 1:** 5 preguntas, se comparte por WhatsApp (`?duelo=ID`); gana quien acierte más y, si empatan, el más rápido.
- **Ranking por colegio:** el alumno agrega su colegio en "Mi cuenta"; en los resultados del domingo aparece el promedio por colegio.
- **Foto de pregunta (Premium):** en el Tutor libre se puede enviar la foto de una pregunta; se reduce a 1280 px antes de subirla.
- **¿Ingresarías?:** compara tu resultado con los puntajes mínimos por carrera. Se activa al llenar `src/data/unica-careers.ts` **con datos reales** (está vacío a propósito).

Sin la migración `0004`, la app sigue funcionando: invitaciones, duelos y colegio quedan ocultos, y los logros y el repaso se guardan solo en el celular.

## 👤 Cuentas de usuario (Supabase)
- **Bienvenida**: antes de elegir el examen, el alumno crea su cuenta, inicia sesión o sigue sin cuenta.
- **Registro** con **Google, Facebook o X** en un toque, o con correo y contraseña. Se pide un apodo para el ranking (no el nombre real) y la confirmación de permiso para menores de 14 años. Quien entra con una red social elige su apodo al llegar. También permite recuperar la contraseña por correo.
- **Progreso en la nube**: monedas, racha y estadísticas se guardan por examen. Al crear la cuenta se sube lo que el alumno ya tenía como invitado.
- **Ranking real** del Examen de Admisión: uno por semana, con el Top 10 por apodo y el puesto en vivo.
- **Tutor IA**: solo con sesión iniciada. Da 3 consultas al día en el plan gratis y 10 en Premium, contadas en el servidor.
- **Eliminar cuenta**: desde «Mi cuenta» el alumno borra su cuenta y todos sus datos (lo exigen la ley, Facebook y Google Play).
- **Política de privacidad**: `public/privacidad.html`, publicada en `/privacidad.html`. Antes de lanzar, completa los datos marcados entre corchetes (responsable, DNI o RUC, dirección y correo).
- **Seguridad**: con reglas de la base de datos (RLS), cada alumno solo ve y edita lo suyo. Nadie puede darse Premium ni monedas negativas, y no se puede dar dos veces el examen de la misma semana.

**Cómo activarlas:**
1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. En **SQL Editor**, pega y ejecuta `supabase/migrations/0001_cuentas.sql` luego `0002_eliminar_cuenta.sql`, `0003_dar_premium.sql` y `0004_funciones_extra.sql`.
3. En **Authentication → URL Configuration**, pon la dirección de tu app (por ejemplo `https://ingresaya.vercel.app`) como *Site URL*.
4. Copia `.env.example` como `.env.local` (para probar en tu computadora) y, en Vercel, agrega las mismas variables: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (están en Project Settings → API).
5. Redes sociales (opcional): actívalas en Supabase (**Authentication → Sign In / Providers**) y pon en `VITE_AUTH_PROVIDERS` las que activaste, por ejemplo `google,facebook,x`. Cada red pide crear una "app" en su página de desarrolladores y copiar su *Client ID* y *Secret* en Supabase. Como dirección de retorno (*callback URL*) se usa la que muestra Supabase (`https://<tu-proyecto>.supabase.co/auth/v1/callback`):
   - **Google**: [console.cloud.google.com](https://console.cloud.google.com) → APIs y servicios → Credenciales → ID de cliente de OAuth (tipo "Aplicación web").
   - **Facebook**: [developers.facebook.com](https://developers.facebook.com) → Crear app → "Inicio de sesión con Facebook". Para que la use el público, la app debe pasar a modo "Activo".
   - **X**: [developer.x.com](https://developer.x.com) → Proyecto y app → "User authentication settings" con OAuth 2.0. En Supabase usa el proveedor **X / Twitter (OAuth 2.0)**.

Para dar Premium a un alumno (mientras no esté el pago automático), ejecuta una vez `supabase/migrations/0003_dar_premium.sql` y luego, en el SQL Editor:
```sql
select dar_premium('alumno@gmail.com', 30);  -- 30 días; si ya tenía Premium, se suman
```

## 🎓 Tutor IA ("Profe IA")
Después de responder una pregunta (o desde la revisión de resultados), el alumno abre un chat con un tutor que le explica su error paso a paso. El tutor conoce la pregunta, las opciones, la respuesta correcta y la explicación oficial, y tiene sugerencias rápidas: "Explícamelo más fácil", "Dame un ejemplo parecido" y "¿Qué truco uso en el examen?".

- **Tutor libre (Premium)**: desde la pantalla principal, el alumno pregunta cualquier tema del examen sin partir de una pregunta. El servidor rechaza el modo libre a quien no es Premium.
- Instrucciones del tutor: `src/lib/tutorPrompt.ts`.
- Pantalla del chat: `src/components/TutorPanel.tsx`.
- Servidor: `api/tutor.ts`, una función de Vercel que llama a la API de Claude. La clave nunca llega al navegador.

**Para activarlo al publicar en Vercel:**
1. Activa las cuentas (sección anterior): el tutor solo responde a alumnos con sesión iniciada.
2. En el proyecto de Vercel, agrega la variable de entorno `ANTHROPIC_API_KEY` con tu clave de la API de Claude.
3. Opcional: `TUTOR_MODEL` para cambiar el modelo. Por defecto usa `claude-haiku-5-5`, elegido por costo para el plan de S/ 5.

## Cómo ejecutarlo
```bash
npm install
npm run dev      # modo desarrollo
npm run build    # versión para publicar (carpeta dist/)
```

## Estructura
- `src/data/exams.ts`: lista de exámenes (UNICA, Beca 18, otras) y su configuración.
- `src/data/unica.ts`: banco de preguntas de la UNICA.
- `src/lib/game.ts`: reglas del juego (monedas, horarios, ranking).
- `src/lib/storage.ts`: guardado del progreso (navegador y nube).
- `src/lib/auth.tsx` y `src/components/AuthSheet.tsx`: cuentas e inicio de sesión.
- `supabase/migrations/`: base de datos, reglas de seguridad y ranking.
- `src/screens/`: pantallas de la app.

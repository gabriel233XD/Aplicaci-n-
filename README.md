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
- El progreso se guarda **solo en el navegador** y el **ranking es simulado**. Para un ranking real se necesitan servidor y cuentas.
- Premium (S/ 5 al mes), tutor con IA y anuncios aún no están implementados.

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
- `src/lib/storage.ts`: guardado del progreso.
- `src/screens/`: pantallas de la app.

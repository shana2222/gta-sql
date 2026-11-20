---
id: 02-garaje-y-golpes
title: Misión 2 — El garaje y los golpes
start: COM-320
pickup: PRACA-05
pickup_objective: Buscá la Llave del Garaje en PRACA-05
target: COM-24
objective: Llevale la llave a Rayo en el Garaje Fénix (COM-24)
give_item: llave-garaje
require_item: llave-garaje
delivery_prompt: Rayo no puede entrar a su garaje. Elegí el objeto:
wrong_item_message: Con eso no abro ni una lata de duraznos.
---

## CUTSCENE_INICIO
left: byte
right: chispa
bg: Taller de Chispa

- Chispa: Faltan tres tablas: los vehículos, las misiones y quién participó en cada misión.
- Byte: Un miembro va a muchas misiones, y en una misión hay muchos miembros. Eso es una relación de muchos a muchos.
- Chispa: ¿Y eso cómo se guarda?
- Byte: Con una tabla del medio, que une las dos. Cada fila dice: "este miembro estuvo en esta misión".
- Chispa: Rayo tiene la otra computadora, en su garaje. Pero perdió la llave. Otra vez.
- OPCAO: ¿Dónde la perdió? -> NEXT
- OPCAO: ¿Cuántas veces la perdió este mes? -> NEXT
- Chispa: Dice que se le cayó en la PRACA-05 persiguiendo un helado. Llevásela al Garaje Fénix, en COM-24.

## CUTSCENE_FIM
left: byte
right: rayo
bg: Garaje Fénix

- Rayo: ¡Mi llave! Dormí en el auto. Tres veces. Esta semana.
- Byte: Tomá, y no la pierdas:
- ENTREGAR: llave-garaje
- Rayo: Gracias. Che, Byte… vos que investigás lo del fuego. Anoche, tarde, vi luz en el taller de Chispa.
- Byte: ¿Luz? ¿A qué hora?
- Rayo: No sé, yo no anoto nada. Por eso me gusta tu base. Bueno, ¿qué hacemos?
- Byte: Tres tablas. La de vehículos tiene una clave foránea al dueño. La tabla del medio tiene una clave primaria compuesta: dos columnas juntas.
- Rayo: ¿Clave compuesta? Suena a pieza de motor. Me gusta.
- SQL: mision-2
- Rayo: Cinco tablas. Todas conectadas. Parece el mapa del metro.
- Byte: Es el modelo de la banda. Ahora falta ver si a la jefa le gusta.

---
id: 03-cambio-de-planes
title: Misión 3 — Cambio de planes
start: COM-14
pickup: PRACA-06
pickup_objective: Buscá el Pendrive en PRACA-06
target: CASA-01
objective: Llevale el pendrive a Vera en CASA-01
give_item: pendrive
require_item: pendrive
delivery_prompt: Vera espera el pendrive. Elegí el objeto:
wrong_item_message: ¿Y esto? Yo pedí el pendrive.
---

## CUTSCENE_INICIO
left: byte
right: rayo
bg: Garaje Fénix

- Rayo: Byte, llamó la jefa. Tiene cambios para la base. Dejó las órdenes en un pendrive, escondido en la PRACA-06.
- Byte: ¿Cambios? Las tablas ya están hechas.
- Rayo: Eso le dije. Y me dijo: "Las tablas se cambian, Rayo. Las personas no". No entendí.
- Rayo: Ah, y en ese pendrive también hay… una tabla mía. Se llama chismes. No la abras. Bueno, abrila. Pero no le cuentes a nadie.
- OPCAO: ¿Hiciste una tabla de chismes? -> NEXT
- OPCAO: Tranquilo, no juzgo. Solo consulto. -> NEXT
- Rayo: Llevale el pendrive a Vera, a la guarida. CASA-01.

## CUTSCENE_FIM
left: byte
right: vera
bg: Guarida de la Familia Ceibo

- Vera: ¿Trajiste el pendrive?
- Byte: Acá está:
- ENTREGAR: pendrive
- Vera: Primero: quiero anotar el teléfono de cada miembro. Después vemos.
- Byte: No hace falta borrar la tabla. Con ALTER TABLE se cambia su estructura: agregar, modificar o quitar columnas.
- OPCAO: Mejor borro toda la base y la hago de nuevo. -> GAMEOVER: Borraste toda la base con DROP DATABASE. Diez años de datos, otra vez en cero. Vera te mira en silencio.
- OPCAO: Uso ALTER TABLE: cambio solo lo necesario. -> NEXT
- Vera: Bien. Y esa tabla de chismes de Rayo… mirala antes de borrarla. Quiero saber qué anda diciendo la gente.
- SQL: mision-3
- Vera: ¿Qué decía la tabla de chismes?
- Byte: Que Rayo choca el auto todos los martes. Que Chispa le tiene miedo a las palomas. Y que anoche entró una paloma al taller de Chispa.
- Vera: Chismes. Los chismes no son datos, Byte.
- Byte: No. Pero a veces son pistas.

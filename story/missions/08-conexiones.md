---
id: 08-conexiones
title: Misión 8 — Conexiones
start: CASA-01
pickup: PRACA-10
pickup_objective: Buscá el Mapa de Conexiones en PRACA-10
target: CASA-84
objective: Llevale el mapa a Chispa en el Escondite de la Colina (CASA-84)
give_item: mapa-conexiones
require_item: mapa-conexiones
delivery_prompt: Chispa espera el mapa. Elegí el objeto:
wrong_item_message: Ese no es el mapa de los hilos rojos.
---

## CUTSCENE_INICIO
left: byte
right: vera
bg: Guarida de la Familia Ceibo

- Vera: Los datos están separados en tablas. El alias en una, el nombre de la banda en otra. Yo quiero verlos juntos.
- Byte: Para eso se usa JOIN: une filas de dos tablas usando la columna que tienen en común.
- Vera: Chispa armó un mapa con hilos rojos que conecta a todos. Quedó en la PRACA-10.
- OPCAO: Hilos rojos… muy de película de detectives. -> NEXT
- OPCAO: Lo busco. -> NEXT
- Vera: Llevalo al escondite de la colina, CASA-84. Chispa se mudó ahí. Dice que el taller… tiene corriente de aire.

## CUTSCENE_FIM
left: byte
right: chispa
bg: Escondite de la Colina

- Chispa: ¡El mapa! Mirá: cada hilo rojo une a un miembro con su banda.
- Byte: Cada hilo es una clave foránea. Tomá:
- ENTREGAR: mapa-conexiones
- Chispa: Quiero ver cada alias con el nombre de su banda. Y las misiones de Vera, con la plata que dejó cada una.
- Byte: La segunda necesita tres tablas: misión, participación… y el filtro por Vera.
- OPCAO: Junto las tablas sin condición, total la base se arregla. -> GAMEOVER: Sin la condición del JOIN salió el producto cartesiano: cada miembro con cada banda. Vera ahora cree que Rayo es de tres bandas a la vez.
- OPCAO: Uno las tablas con ON, por la columna en común. -> NEXT
- SQL: mision-8
- Chispa: ¡Un JOIN de tres tablas! Ahora sí parece una película.
- Byte: Hablando de unir cosas, Chispa. Pluma en tu taller. Luz a la noche. Un grito. Un aleteo. Una paloma.
- Chispa: …
- Chispa: Te lo cuento en el casino. Delante de la jefa. Es justo.

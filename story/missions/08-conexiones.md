---
id: 08-conexiones
title: Misión 8 — Conexiones
start: CASA-01
pickup: PRACA-20
pickup_objective: Buscá el Mapa de Conexiones en PRACA-20
target: CASA-353
objective: Llevale el mapa a Chispa en CASA-353
give_item: mapa-conexiones
require_item: mapa-conexiones
delivery_prompt: Chispa quiere el mapa. Elegí el objeto:
wrong_item_message: Ese no es el mapa de los hilos rojos.
---

## CUTSCENE_INICIO
left: byte
right: vera
bg: Guarida de la Familia Ceibo

- Vera: Los datos están separados en tablas. Yo quiero verlos juntos.
- Byte: Para eso se usan los JOIN: unen filas de varias tablas por la columna que tienen en común.
- Vera: Chispa armó un mapa con hilos rojos que une todo. Quedó en la PRACA-20.
- OPCAO: Lo busco. -> NEXT
- OPCAO: ¿Hilos rojos? Muy de película. -> NEXT
- Vera: Llevalo al escondite de la colina, CASA-353. Chispa te espera.

## CUTSCENE_FIM
left: byte
right: chispa
bg: Escondite de la Colina

- Chispa: ¡El mapa! Mirá: cada hilo es una clave foránea.
- Byte: Exacto. Tomá:
- ENTREGAR: mapa-conexiones
- Chispa: Quiero ver cada miembro con su banda. Y las misiones de Vera con la plata que dejaron.
- SQL: mision-8
- Chispa: ¡Un JOIN de tres tablas! Ahora sí parece una película.

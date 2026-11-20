---
id: 03-cambio-de-planes
title: Misión 3 — Cambio de planes
start: COM-24
pickup: PRACA-15
pickup_objective: Buscá el Pendrive del Soplón en PRACA-15
target: CASA-01
objective: Llevale el pendrive a Vera en CASA-01
give_item: pendrive
require_item: pendrive
delivery_prompt: Vera espera el pendrive. Elegí el objeto:
wrong_item_message: ¿Y esto qué es? Yo pedí el pendrive.
---

## CUTSCENE_INICIO
left: byte
right: rayo
bg: Garaje Fénix

- Rayo: Byte, un soplón dejó un pendrive en la PRACA-15. Dice que tiene órdenes de la jefa.
- Byte: ¿Órdenes de qué tipo?
- Rayo: Cambios en las tablas. Y… capaz que también una tabla mía. Una con chismes. No preguntes.
- OPCAO: Lo busco y se lo llevo a Vera. -> NEXT
- OPCAO: ¿Hiciste una tabla de chismes? -> NEXT
- Rayo: Andá rápido. Vera está en la guarida, en CASA-01.

## CUTSCENE_FIM
left: byte
right: vera
bg: Guarida de la Familia Ceibo

- Vera: ¿Trajiste el pendrive?
- Byte: Sí, acá está:
- ENTREGAR: pendrive
- Vera: Bien. Las tablas ya existen, pero los planes cambiaron. No quiero borrar todo y empezar de nuevo.
- Byte: Para eso está ALTER TABLE: agrega, cambia o quita columnas sin perder la tabla.
- OPCAO: Mejor borro la base entera con DROP DATABASE. -> GAMEOVER: Borraste toda la base. Vera no está contenta. Nada contenta.
- OPCAO: Uso ALTER TABLE y DROP TABLE solo donde haga falta. -> NEXT
- Vera: Eso. Y de paso borrá esa tabla de chismes que armó Rayo.
- SQL: mision-3
- Vera: Perfecto. Estructura lista. Ahora hay que llenarla de datos.

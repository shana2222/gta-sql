---
id: 07-informe-para-la-jefa
title: Misión 7 — Informe para la jefa
start: COM-14
pickup: PRACA-08
pickup_objective: Buscá la Tablet de la Jefa en PRACA-08
target: CASA-01
objective: Llevale la tablet a Vera en CASA-01
give_item: tablet
require_item: tablet
delivery_prompt: Vera espera su tablet. Elegí el objeto:
wrong_item_message: ¿Y mi tablet?
---

## CUTSCENE_INICIO
left: byte
right: rayo
bg: Garaje Fénix

- Rayo: La jefa quiere informes. Pero dice que no quiere tocar los datos. Solo mirarlos.
- Byte: Para eso está DQL: preguntarle cosas a la base con SELECT, sin cambiar nada.
- Rayo: ¿Le hago preguntas y me contesta? ¿Como un oráculo?
- Byte: Como un oráculo que nunca miente, si los datos están bien cargados.
- OPCAO: ¿Dónde está la jefa? -> NEXT
- OPCAO: ¿Alguien perdió algo esta vez? -> NEXT
- Rayo: La jefa perdió la tablet en la PRACA-08. Sí. Hasta ella pierde cosas. Llevásela a la guarida.

## CUTSCENE_FIM
left: byte
right: vera
bg: Guarida de la Familia Ceibo

- Vera: Mi tablet. No le cuentes a Rayo que la perdí.
- Byte: Ya lo sabe. Tomá:
- ENTREGAR: tablet
- Vera: Quiero tres informes. Primero, el garaje: qué autos tenemos y de qué color.
- Vera: Segundo, los golpes grandes: los que pagan mucho y tienen a la policía muy atenta. Tercero, el ranking de respeto, de mayor a menor.
- Byte: SELECT elige columnas. WHERE filtra filas. ORDER BY las ordena.
- SQL: mision-7
- Vera: Esto es poder, Byte. Pregunto y la base contesta en un segundo.
- Vera: Ahora contestame vos: ¿averiguaste algo del fuego?
- Byte: Tengo pistas. Una pluma, una luz, un grito y un aleteo. Me falta unirlas.
- Vera: Unir. Eso suena a tu próxima lección.

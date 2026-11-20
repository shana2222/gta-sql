---
id: 07-informe-para-la-jefa
title: Misión 7 — Informe para la jefa
start: COM-24
pickup: PRACA-12
pickup_objective: Buscá la Tablet de la Jefa en PRACA-12
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

- Rayo: La jefa quiere informes. Pero no quiere tocar los datos, solo mirarlos.
- Byte: Eso es DQL: consultar con SELECT, sin cambiar nada.
- Rayo: Se olvidó la tablet en la PRACA-12. Llevásela a la guarida.
- OPCAO: Dale. -> NEXT
- OPCAO: ¿Otra vez alguien perdió algo? -> NEXT
- Rayo: En esta banda perdemos todo. Por eso necesitamos la base.

## CUTSCENE_FIM
left: byte
right: vera
bg: Guarida de la Familia Ceibo

- Vera: ¡Mi tablet! Pasame.
- Byte: Acá está:
- ENTREGAR: tablet
- Vera: Quiero tres informes: el garaje, los golpes grandes y el ranking de respeto.
- SQL: mision-7
- Vera: Esto es poder: preguntarle cosas a la base y que conteste al instante.

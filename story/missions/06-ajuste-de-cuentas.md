---
id: 06-ajuste-de-cuentas
title: Misión 6 — Ajuste de cuentas
start: CASA-656
pickup: PRACA-10
pickup_objective: Buscá la Foto de la Redada en PRACA-10
target: COM-24
objective: Llevale la foto a Rayo en COM-24
give_item: foto-redada
require_item: foto-redada
delivery_prompt: Rayo quiere ver la foto. Elegí el objeto:
wrong_item_message: Eso no es una foto, es otra cosa.
---

## CUTSCENE_INICIO
left: byte
right: pepe
bg: Depósito del Puerto

- Pepe: Noticia caliente: la policía atrapó a Kobra, el jefe de Los Halcones.
- Byte: Entonces hay que borrarlo de la base. A él y a su auto.
- Pepe: Y hay más. Hay una foto de la redada en la PRACA-10: ahí se ve la pickup marrón de Rayo.
- OPCAO: Busco la foto y le aviso a Rayo. -> NEXT
- OPCAO: ¿Cuánto me cobrás por este dato? -> NEXT
- Pepe: Este va de regalo. Rayo está en su garaje, en COM-24.

## CUTSCENE_FIM
left: byte
right: rayo
bg: Garaje Fénix

- Rayo: ¿Qué es esa foto? ¡Ahí está mi pickup!
- Byte: Mirala:
- ENTREGAR: foto-redada
- Rayo: Hay que pintarla ya. Y además, gracias al soplo, la jefa me subió el respeto.
- Byte: Toca actualizar datos con UPDATE y borrar con DELETE. Siempre con WHERE.
- OPCAO: UPDATE sin WHERE, total es más corto. -> GAMEOVER: Pintaste de negro todos los autos de la ciudad. Hasta los de la policía.
- OPCAO: Con WHERE, para cambiar solo lo que hace falta. -> NEXT
- SQL: mision-6
- Rayo: Pickup negra, respeto 55 y Kobra fuera de la base. ¡Qué día!

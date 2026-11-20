---
id: 09-el-gran-golpe
title: Misión 9 — El gran golpe
start: CASA-353
pickup: PRACA-30
pickup_objective: Buscá el Plano del Casino en PRACA-30
target: COM-554
objective: Llevale el plano a Vera en el Casino Bruma (COM-554)
give_item: plano-casino
require_item: plano-casino
delivery_prompt: Vera espera el plano. Elegí el objeto:
wrong_item_message: Con eso no entramos ni al baño del casino.
---

## CUTSCENE_INICIO
left: byte
right: chispa
bg: Escondite de la Colina

- Chispa: Llegó el momento. El gran golpe al Casino Bruma.
- Byte: Antes, Vera quiere números: cuántos somos por banda y cuánta plata juntamos.
- Chispa: El plano del casino está escondido en la PRACA-30. Vera te espera en el casino, COM-554.
- OPCAO: Último viaje. ¡Vamos! -> NEXT
- OPCAO: Primero un mate. -> NEXT
- Chispa: Con cuidado: hay patrulleros por todos lados.

## CUTSCENE_FIM
left: byte
right: vera
bg: Casino Bruma

- Vera: ¿Tenés el plano?
- Byte: Acá está:
- ENTREGAR: plano-casino
- Vera: Antes de entrar quiero las cuentas: COUNT, SUM y las bandas con más de un miembro.
- Byte: Funciones de agregado, GROUP BY y HAVING. Vamos.
- SQL: mision-9
- Vera: Byte… la base está completa. Estructura, datos y consultas. La Familia Ceibo nunca estuvo tan ordenada.
- Byte: Y sin una sola hoja de papel.
- Vera: Desde hoy, sos la DBA oficial del bajo mundo. ¡Felicitaciones!

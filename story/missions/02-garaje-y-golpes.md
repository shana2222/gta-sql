---
id: 02-garaje-y-golpes
title: Misión 2 — El garaje y los golpes
start: COM-320
pickup: PRACA-05
pickup_objective: Buscá la Llave del Garaje en PRACA-05
target: COM-24
objective: Andá al Garaje Fénix de Rayo en COM-24
give_item: llave-garaje
require_item: llave-garaje
delivery_prompt: Rayo no puede abrir el garaje. Elegí el objeto:
wrong_item_message: Con eso no abro ni una lata.
---

## CUTSCENE_INICIO
left: byte
right: chispa
bg: Taller de Chispa

- Chispa: Faltan tres tablas: vehículos, misiones y quién participó en cada misión.
- Byte: La de participaciones es una relación muchos a muchos. Va a necesitar una tabla intermedia.
- Chispa: Eso te lo explica Rayo. Bueno… Rayo no explica nada, pero tiene la compu del garaje.
- Chispa: Primero buscá la llave del garaje. Se le cayó en la PRACA-05.
- OPCAO: Voy volando. -> NEXT
- OPCAO: ¿Otra vez perdió la llave? -> NEXT
- Chispa: Es la tercera vez esta semana. Llevásela al Garaje Fénix, en COM-24.

## CUTSCENE_FIM
left: byte
right: rayo
bg: Garaje Fénix

- Rayo: ¡Mi llave! Estaba durmiendo en el auto, afuera.
- Byte: Acá la tenés:
- ENTREGAR: llave-garaje
- Rayo: La compu está ahí. Yo de tablas no sé. Yo sé de autos.
- Byte: Justamente: vamos a crear la tabla de vehículos. Y la de misiones. Y la intermedia.
- SQL: mision-2
- Rayo: ¿Clave primaria compuesta? Suena a pieza de motor. Me gusta.

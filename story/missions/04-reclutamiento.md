---
id: 04-reclutamiento
title: Misión 4 — Reclutamiento
start: CASA-01
pickup: PRACA-25
pickup_objective: Buscá el Expediente de Inteligencia en PRACA-25
target: COM-320
objective: Llevale el expediente a Chispa en COM-320
give_item: expediente
require_item: expediente
delivery_prompt: Chispa necesita el expediente para cargar los datos. Elegí el objeto:
wrong_item_message: Eso no tiene ni un dato.
---

## CUTSCENE_INICIO
left: byte
right: vera
bg: Guarida de la Familia Ceibo

- Vera: Las tablas están vacías. Una base sin datos es como un auto sin nafta.
- Byte: Hay que cargar filas. Eso es DML: insertar, modificar y borrar datos.
- Vera: Nuestro informante dejó un expediente en la PRACA-25: bandas, miembros y vehículos.
- Vera: Y otra cosa, Byte… desde hoy sos parte de la familia. Anotate vos también.
- OPCAO: ¡Gracias, jefa! -> NEXT
- OPCAO: ¿Con cuánto respeto arranco? -> NEXT
- Vera: Con 10. El respeto se gana. Llevá el expediente al taller de Chispa.

## CUTSCENE_FIM
left: byte
right: chispa
bg: Taller de Chispa

- Chispa: ¿Ese es el expediente? ¡Dámelo!
- Byte: Tomá:
- ENTREGAR: expediente
- Chispa: Ojo con el orden: primero las bandas, después los miembros, después los vehículos.
- Byte: Claro: un miembro no puede apuntar a una banda que todavía no existe.
- SQL: mision-4
- Chispa: ¡Bienvenida oficialmente a la Familia Ceibo, Byte! Ya figurás en la base.

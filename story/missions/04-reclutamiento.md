---
id: 04-reclutamiento
title: Misión 4 — Reclutamiento
start: CASA-01
pickup: PRACA-13
pickup_objective: Buscá el Expediente de Inteligencia en PRACA-13
target: COM-96
objective: Llevale el expediente a Chispa en COM-96
give_item: expediente
require_item: expediente
delivery_prompt: Chispa necesita el expediente para cargar los datos. Elegí el objeto:
wrong_item_message: Eso no tiene ni un dato.
---

## CUTSCENE_INICIO
left: byte
right: vera
bg: Guarida de la Familia Ceibo

- Vera: La estructura está lista. Pero una base sin datos es un garaje sin autos.
- Byte: Ahora toca DML: el lenguaje que maneja los datos. Insertar filas, cambiarlas y borrarlas.
- Vera: Un informante dejó un expediente en la PRACA-13: las bandas de la ciudad, sus miembros y sus autos.
- Vera: Y otra cosa. Te ganaste un lugar. Desde hoy sos parte de la Familia Ceibo. Anotate vos también.
- OPCAO: ¡Gracias, jefa! -> NEXT
- OPCAO: ¿Con cuánto respeto arranco? -> NEXT
- Vera: Con 10. El respeto no se inserta: se gana. Llevá el expediente al taller de Chispa.

## CUTSCENE_FIM
left: byte
right: chispa
bg: Taller de Chispa

- Chispa: ¡El expediente! Pasámelo, que lo cargamos ya.
- Byte: Tomá:
- ENTREGAR: expediente
- Chispa: Empiezo por los miembros, que son los más divertidos.
- OPCAO: Dale, cargá primero los miembros. -> GAMEOVER: ERROR 1452. Cada miembro apuntaba a una banda que todavía no existía. La base dijo que no… 47 veces.
- OPCAO: Primero las bandas: los miembros apuntan a ellas. -> NEXT
- Chispa: Tenés razón. Primero la tabla "padre", después las "hijas". Si no, la clave foránea se queja.
- Byte: Y los textos van entre comillas simples. Los números, sin comillas.
- SQL: mision-4
- Chispa: ¡Bienvenida oficialmente a la familia, Byte! Ya sos una fila de la tabla miembro.
- Byte: Chispa, una pregunta. ¿Anoche estuviste acá, en el taller?
- Chispa: ¿Anoche? Eh… estaba… durmiendo. Muy dormida. Andá, que Tito tiene datos para vos.

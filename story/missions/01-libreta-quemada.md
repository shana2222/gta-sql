---
id: 01-libreta-quemada
title: Misión 1 — La libreta quemada
start: CASA-01
pickup: PRACA-01
pickup_objective: Buscá la Libreta Quemada en PRACA-01
target: COM-320
objective: Llevale la libreta a Chispa en COM-320
give_item: libreta
require_item: libreta
delivery_prompt: Chispa necesita la libreta para pasar todo a la computadora. Elegí el objeto:
wrong_item_message: ¡Eso no es la libreta! Esa tiene olor a humo.
---

## CUTSCENE_INICIO
left: byte
right: vera
bg: Guarida de la Familia Ceibo

- Vera: Byte, llegás justo. Alguien prendió fuego la libreta de la banda.
- Byte: ¿La libreta donde anotaban todo? ¿Bandas, miembros, autos, golpes?
- Vera: Esa. Años de datos, hechos ceniza. Se voló una parte hasta la PRACA-01.
- OPCAO: La busco ya mismo. -> NEXT
- OPCAO: ¿Y si anotamos todo en otra libreta? -> NEXT
- Vera: Nada de papel. Quiero una base de datos. Con tablas. Con claves. Bien hecha.
- Vera: Traé lo que quede de la libreta al taller de Chispa, en COM-320. Ahí está la compu.

## CUTSCENE_FIM
left: byte
right: chispa
bg: Taller de Chispa

- Chispa: ¡Byte! ¿Esa cosa chamuscada es la famosa libreta?
- Byte: Lo que queda. Tomá:
- ENTREGAR: libreta
- Chispa: Se lee poco… pero alcanza para saber qué guardar. Primero, la estructura.
- Byte: Eso es DDL: el lenguaje que define la base y sus tablas.
- Chispa: Te abrí la terminal. Creá la base y las dos primeras tablas: banda y miembro.
- SQL: mision-1
- Chispa: ¡Impecable! Cada miembro apunta a su banda con una clave foránea. Ni una palomita fuera de lugar.

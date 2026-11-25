---
id: 01-libreta-quemada
title: Misión 1 — La libreta quemada
start: CASA-01
pickup: PRACA-01
pickup_objective: Buscá los restos de la Libreta en PRACA-01
target: COM-320
objective: Llevale la libreta a Chispa en COM-320
give_item: libreta
require_item: libreta
delivery_prompt: Chispa necesita la libreta para pasar todo a la computadora. Elegí el objeto:
wrong_item_message: Eso no es la libreta. La libreta tiene olor a humo.
---

## CUTSCENE_INICIO
left: byte
right: vera
bg: Guarida de la Familia Ceibo

- Vera: Así que vos sos Byte. La hacker que todos recomiendan.
- Byte: Depende de quién recomiende. ¿Qué pasó acá? Huele a quemado.
- Vera: Anoche alguien prendió fuego la libreta de la banda. Diez años de datos: quién es quién, qué auto tiene cada uno, cada golpe.
- Byte: ¿Y no había una copia?
- Vera: En esta familia no confiamos en copias. Confiamos en la libreta. Bueno… confiábamos.
- OPCAO: Entonces necesitás una base de datos. -> NEXT
- OPCAO: ¿Sospechás de alguien? -> NEXT
- Vera: Quiero dos cosas, Byte. Una: que armes una base de datos que no se queme. Dos: saber quién lo hizo.
- Vera: El viento llevó unas hojas hasta la PRACA-01, acá nomás, a dos cuadras de la guarida. Juntá lo que quede y llevalo al taller de Chispa, en COM-320. Ahí está la computadora.

## CUTSCENE_FIM
left: byte
right: chispa
bg: Taller de Chispa

- Chispa: ¡Ah! Perdón, me asustaste. Pensé que eras… nada. Una paloma. Olvidalo.
- Byte: Te traje lo que quedó de la libreta:
- ENTREGAR: libreta
- Chispa: Pobre libreta. Se lee poco, pero alcanza para saber QUÉ hay que guardar: bandas, miembros, autos y golpes.
- Byte: Antes de guardar datos hay que construir dónde guardarlos. Eso se hace con DDL: el lenguaje que define la base y sus tablas.
- Chispa: Como armar el garaje antes de traer los autos.
- Byte: Exacto. Y cada tabla necesita una clave primaria: un dato que no se repite y que identifica a cada fila.
- Chispa: Te abrí la terminal. Empezá por la base, la tabla de bandas y la de miembros.
- SQL: mision-1
- Chispa: ¡Quedó perfecto! Cada miembro apunta a su banda con una clave foránea. Si alguien pone una banda que no existe, la base no lo deja.
- Byte: Chispa… ¿esto en el piso es una pluma?
- Chispa: ¿Pluma? ¿Qué pluma? Yo no veo ninguna pluma. Andá, que Rayo te necesita.

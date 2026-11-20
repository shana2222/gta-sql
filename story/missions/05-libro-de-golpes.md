---
id: 05-libro-de-golpes
title: Misión 5 — El libro de golpes
start: COM-320
pickup: PRACA-29
pickup_objective: Buscá el Libro de Golpes en PRACA-29
target: CASA-656
objective: Llevale el libro a Pepe en CASA-656
give_item: libro-golpes
require_item: libro-golpes
delivery_prompt: Pepe quiere ver el libro. Elegí el objeto:
wrong_item_message: No, no, no. Eso no lo compro.
---

## CUTSCENE_INICIO
left: byte
right: chispa
bg: Taller de Chispa

- Chispa: Faltan las misiones. Pepe, de los Vagos del Puerto, sabe qué golpes se hicieron.
- Byte: ¿Pepe es de otra banda?
- Chispa: Sí, pero vende información. Pide el Libro de Golpes a cambio. Está en la PRACA-29.
- OPCAO: Lo busco y voy al puerto. -> NEXT
- OPCAO: ¿Es de confianza? -> NEXT
- Chispa: Ni un poquito. Pero los datos son buenos. Su depósito está en CASA-656.

## CUTSCENE_FIM
left: byte
right: pepe
bg: Depósito del Puerto

- Pepe: Byte, ¿no? Me dijeron que traés algo para mí.
- Byte: El Libro de Golpes:
- ENTREGAR: libro-golpes
- Pepe: Trato justo. Te dicto las misiones y quién participó en cada una, con la fecha.
- Byte: Las participaciones van en la tabla intermedia. Cada fila une un miembro con una misión.
- SQL: mision-5
- Pepe: Linda tabla intermedia. Muchos a muchos, como mis negocios.

---
id: 05-libro-de-golpes
title: Misión 5 — El libro de golpes
start: COM-96
pickup: PRACA-16
pickup_objective: Buscá el Libro de Golpes en PRACA-16
target: CASA-181
objective: Llevale el libro a Pepe en el Depósito del Puerto (CASA-181)
give_item: libro-golpes
require_item: libro-golpes
delivery_prompt: Pepe quiere ver el libro antes de hablar. Elegí el objeto:
wrong_item_message: No, no, no. Eso no lo compro.
---

## CUTSCENE_INICIO
left: byte
right: chispa
bg: Taller de Chispa

- Chispa: Faltan los golpes: qué misiones hicimos, cuánto pagaron y quién participó.
- Byte: ¿Quién sabe eso?
- Chispa: Pepe, de los Vagos del Puerto. No es de la familia, pero vende información.
- Chispa: Pide el Libro de Golpes a cambio. Lo escondimos en la PRACA-16.
- OPCAO: ¿Pepe es de confianza? -> NEXT
- OPCAO: Voy. ¿Algún consejo? -> NEXT
- Chispa: Contá los dedos después de darle la mano. Su depósito está en CASA-181.

## CUTSCENE_FIM
left: byte
right: pepe
bg: Depósito del Puerto

- Pepe: La famosa Byte. Toda la ciudad habla de tu base de datos.
- Byte: Traje lo que pediste:
- ENTREGAR: libro-golpes
- Pepe: Trato justo. Tres misiones, cada una con su recompensa y sus estrellas de policía. Y quién estuvo en cada una, con la fecha.
- Byte: Las misiones van en su tabla. Y cada participación es una fila en la tabla del medio: un miembro, una misión, una fecha.
- Pepe: Y antes de que preguntes: yo no quemé la libreta. Los Vagos no quemamos papeles. Los vendemos.
- SQL: mision-5
- Pepe: Muchos a muchos. Como mis negocios.
- Pepe: Te regalo un dato, Byte: mañana la policía hace una redada. Andá atenta.

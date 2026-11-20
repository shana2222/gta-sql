---
id: 06-ajuste-de-cuentas
title: Misión 6 — Ajuste de cuentas
start: CASA-656
pickup: PRACA-10
pickup_objective: Buscá la Foto de la Redada en PRACA-10
target: COM-24
objective: Llevale la foto a Rayo en el Garaje Fénix (COM-24)
give_item: foto-redada
require_item: foto-redada
delivery_prompt: Rayo quiere ver la foto. Elegí el objeto:
wrong_item_message: Eso no es una foto.
---

## CUTSCENE_INICIO
left: byte
right: pepe
bg: Depósito del Puerto

- Pepe: Te dije que venía la redada. La policía atrapó a Kobra, el jefe de Los Halcones.
- Byte: Entonces Kobra ya no está en la calle. Hay que sacarlo de la base, a él y a su auto.
- Pepe: Hay más. Alguien sacó una foto de la redada, quedó en la PRACA-10. Y en la foto se ve una pickup marrón… la de Rayo.
- OPCAO: ¿Cómo sabés todo eso? -> NEXT
- OPCAO: ¿Cuánto me cobrás por este dato? -> NEXT
- Pepe: Este va de regalo. Saber cosas es mi trabajo. Rayo está en su garaje, COM-24.

## CUTSCENE_FIM
left: byte
right: rayo
bg: Garaje Fénix

- Rayo: ¿Qué foto es esa? ¡Esa es mi pickup! ¡Me buscan!
- Byte: Mirá:
- ENTREGAR: foto-redada
- Rayo: Hay que pintarla ya. Y otra cosa: avisé a la jefa de la redada a tiempo. Me subió el respeto.
- Byte: Tres cambios y un borrado. Para cambiar datos se usa UPDATE. Para borrarlos, DELETE.
- OPCAO: UPDATE sin WHERE. Es más corto. -> GAMEOVER: Sin WHERE, el UPDATE cambió todas las filas. Pintaste de negro todos los autos de la ciudad. Hasta los patrulleros.
- OPCAO: Con WHERE, para cambiar solo la fila que corresponde. -> NEXT
- Rayo: ¿Y para borrar a Kobra? Su auto también está en la base.
- Byte: Ojo con el orden. El auto apunta a Kobra. Si borro primero a Kobra, la base protesta.
- SQL: mision-6
- Rayo: Pickup negra. Respeto 55. Kobra, afuera. ¡Qué día!
- Byte: Rayo, ¿a qué hora viste la luz en el taller de Chispa?
- Rayo: Tarde. Y escuché un grito. Como de alguien asustado. Y un aleteo.

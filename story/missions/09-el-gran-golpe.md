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

- Chispa: Llegó la noche. El gran golpe al Casino Bruma.
- Byte: Antes, Vera quiere números. Cuántos somos por banda, cuánta plata juntamos y qué bandas tienen más de un miembro.
- Chispa: ¿Contar y sumar con la base?
- Byte: Funciones de agregado: COUNT cuenta, SUM suma. Y GROUP BY arma grupos, uno por banda.
- OPCAO: ¿Dónde está el plano? -> NEXT
- OPCAO: ¿Estás listo para confesar? -> NEXT
- Chispa: El plano está en la PRACA-30. Te espero en el casino, COM-554. Con la jefa. Y con la verdad.

## CUTSCENE_FIM
left: byte
right: vera
bg: Casino Bruma

- Vera: ¿Tenés el plano?
- Byte: Acá está:
- ENTREGAR: plano-casino
- Vera: Antes de entrar, las cuentas. Quiero saber con quiénes cuento y cuánto vale esta familia.
- Byte: COUNT para contar miembros por banda. SUM para el botín. Y HAVING para quedarnos con las bandas de más de un miembro.
- Vera: ¿HAVING? ¿No era WHERE?
- Byte: WHERE filtra filas. HAVING filtra grupos, después de agrupar.
- SQL: mision-9
- Vera: La base está completa. Estructura, datos y respuestas. Ahora sí: ¿quién quemó la libreta?
- Byte: La respuesta estaba en los chismes. Y en una pluma. ¿Chispa?
- Chispa: Fui yo. Bueno, fue una paloma. Entró al taller a la noche. Yo grité, ella aleteó, yo salté… y tiré la lámpara arriba de la libreta.
- Vera: ¿Una paloma? ¿Diez años de datos… por una paloma?
- Chispa: Tenía mucho miedo de decírtelo, jefa.
- Vera: Chispa. Si no hubiera pasado eso, nunca habríamos tenido esta base.
- Byte: Igual, mañana hacemos copias de seguridad. Por las dudas. Y cerramos las ventanas.
- Vera: Byte, desde hoy sos la administradora oficial de la base de datos del bajo mundo. Ahora sí… ¡vamos al casino!

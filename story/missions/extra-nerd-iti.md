---
id: extra-nerd-iti
npc: ohm
location: COM-116
prompt: Entrar al ITI (misión nerd)
roof_color: #1f6feb
roof_logo: assets/logo-iti.svg
---

## CUTSCENE
left: byte
right: ohm
bg: Taller de robótica del ITI

- Ohm: ¡Byte! Pasá, cuidado con los cables. Estamos terminando un robot para la competencia.
- Byte: ¿Lo armaron con piezas de computadoras viejas?
- Ohm: Con todo lo que encontramos. El problema es que anotamos los robots en papelitos… y los papelitos se pierden.
- Byte: Eso me suena. Mejor una tabla.
- Ohm: ¡Exacto! Ya tengo la base iti_robotica. Necesito que registres el robot nuevo y que me digas quién se está quedando sin batería.
- OPCAO: Dale, a programar. -> NEXT
- OPCAO: Hoy no, profe. -> COMPLETE
- SQL: nerd-iti
- Ohm: ¡Bip bip! Eso en idioma robot quiere decir "gracias". Volvé cuando quieras.

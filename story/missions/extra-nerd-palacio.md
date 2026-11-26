---
id: extra-nerd-palacio
npc: delia
location: COM-66
prompt: Entrar al Palacio Legislativo (misión nerd)
roof_color: #1f3a5f
roof_logo: assets/logo-palacio.svg
---

## CUTSCENE
left: byte
right: delia
bg: Salón de los Pasos Perdidos del Palacio Legislativo

- Delia: ¡Bienvenida al Palacio Legislativo! Acá se debaten y se votan las leyes del país.
- Byte: ¡Qué edificio! Todo es de mármol.
- Delia: Mármoles y piedras de Uruguay. Mirá esta placa: es un homenaje a José "Pepe" Mujica. Fue diputado, senador y presidente de Uruguay entre 2010 y 2015.
- Byte: Así que por estas salas pasaron muchas personas que hicieron historia.
- Delia: Y todos los días vienen estudiantes de todo el país a conocerlas. Llevamos un registro de cada visita… en una base de datos, claro.
- Delia: Hoy vino el Liceo 29. ¿Me ayudás a anotar la visita y a ver de qué departamentos vienen los grupos?
- OPCAO: ¡Con gusto! -> NEXT
- OPCAO: Hoy solo vine a mirar. -> COMPLETE
- SQL: nerd-palacio
- Delia: ¡Gracias, Byte! Volvé cuando quieras: el Palacio es de todos.

---
id: extra-nerd-ceibal
npc: tecla
location: COM-209
prompt: Entrar a Ceibal (misión nerd)
roof_color: #007a7a
roof_logo: assets/logo-ceibal.svg
---

## CUTSCENE
left: byte
right: tecla
bg: Centro de soporte de Ceibal

- Tecla: Hola, Byte. Acá llegan computadoras de escuelas de todo el país.
- Byte: ¿Y cómo saben cuál está rota y cuál funciona?
- Tecla: Con una base de datos, claro. Cada equipo tiene su número de serie, su modelo, su estado y su escuela.
- Tecla: Necesito dos informes: cuántos equipos hay en cada estado, y cuáles están rotos con el nombre de su escuela.
- OPCAO: Abro la terminal. -> NEXT
- OPCAO: Vuelvo más tarde. -> COMPLETE
- SQL: nerd-ceibal
- Tecla: Perfecto. Mañana sale el equipo técnico a reparar. ¡Gracias por la ayuda!

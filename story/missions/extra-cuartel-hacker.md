---
id: extra-cuartel-hacker
npc: nube
location: CASA-13
prompt: Entrar al Cuartel del Hacker (práctica libre de SQL)
roof_color: #1f6feb
roof_logo: assets/logo-sql.svg
---

## CUTSCENE
left: byte
right: nube
bg: Cuartel del Hacker

- Nube: Pasá, Byte. Te estaba esperando. ¿Mate?
- Byte: ¿Vos sos Nube? Dicen que sos la mejor hacker de Santa Bruma.
- Nube: Dicen muchas cosas. Ahora enseño. Acá podés practicar SQL sin miedo: lo que hagas no cambia tu nota.
- Byte: ¿Y si rompo la base?
- Nube: Para eso está el botón Reparar base. Equivocarse es parte del oficio. Lo importante es leer bien el error.
- OPCAO: Quiero practicar. -> NEXT
- OPCAO: Hoy no, gracias. -> COMPLETE
- Nube: Te dejo ideas en la pantalla. Probá LIKE, AVG, LEFT JOIN… o creá tu propia tabla.
- SQL: libre
- Nube: Volvé cuando quieras. La terminal también se abre con el botón SQL de abajo.

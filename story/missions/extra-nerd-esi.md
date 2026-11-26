---
id: extra-nerd-esi
npc: kernel
location: COM-111
prompt: Entrar a la ESI (misión nerd)
roof_color: #1f2328
roof_logo: assets/logo-esi.svg
---

## CUTSCENE
left: byte
right: kernel
bg: Sala de servidores de la ESI

- Kernel: …
- Byte: ¿Hola? ¿Kernel?
- Kernel: Perdón. Estaba leyendo logs. Estoy armando el servidor nuevo de la ESI y la base está vacía.
- Kernel: Necesito una tabla de usuarios. Regla de oro: dos personas no pueden tener el mismo nombre de usuario.
- Byte: Eso es una restricción UNIQUE.
- Kernel: Sabía que eras de las buenas. Y que todo usuario nuevo arranque con el rol "alumno".
- OPCAO: sudo ayudar -> NEXT
- OPCAO: Ahora no. -> COMPLETE
- SQL: nerd-esi
- Kernel: Servidor en línea. Cero errores. Me gusta.

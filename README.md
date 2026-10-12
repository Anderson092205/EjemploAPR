# SoporteClaro

Aplicación web de soporte técnico para pequeñas empresas sin departamento de TI. Proyecto académico de Administración de Proyectos basado en el ensayo sobre propuesta de valor.

**Propuesta de valor:** que ningún problema técnico se pierda en una conversación: cada solicitud queda registrada, tiene un responsable y un estado consultable.

## Ejecutar
Abre `index.html` con un navegador moderno. No requiere instalación, servidor, dependencias ni conexión a internet. Para una dirección estable y almacenamiento consistente, se recomienda GitHub Pages. Cambiar de navegador, perfil o dirección crea un espacio de datos diferente.

## Funciones
- Crear solicitudes con código, solicitante, equipo, categoría, prioridad, responsable y descripción.
- Ver totales, buscar y filtrar por estado y prioridad.
- Consultar detalles, actualizar responsable y estado, agregar notas y registrar soluciones.
- Exigir una solución al marcar una solicitud como resuelta.
- Consultar el historial de fallas y soluciones por equipo.
- Registrar la primera atención al pasar por primera vez a En proceso o Resuelta.
- Exportar todas las solicitudes a CSV y cargar cuatro ejemplos ficticios sin borrar registros propios.
- Navegar entre Solicitudes e Historial por equipo desde el menú principal.
- Diseño adaptable a celular, etiquetas de campos, navegación por teclado y cuadros de diálogo.

## Alcance del MVP
HTML, CSS y JavaScript sin bibliotecas externas. Persistencia con LocalStorage. Es una demostración local: no hay autenticación, usuarios reales, notificaciones externas ni base de datos compartida. Los nombres representan perfiles del caso de estudio, no cuentas con permisos. No usar para información sensible. Borrar los datos del navegador elimina los registros; el CSV es una exportación para consulta y no se importa automáticamente. El indicador de primera atención mide un cambio de estado, no prueba que un técnico haya respondido fuera del sistema.


## Recorrido de demostración
1. Carga los ejemplos y comprueba los cuatro indicadores.
2. Crea un reporte de PC-01; anota su código de confirmación.
3. Busca ese código y abre su detalle.
4. Cambia a En proceso, agrega una nota y guarda.
5. Cambia a Resuelta: verifica que se exige una solución.
6. Consulta PC-01 en Historial por equipo y observa sus reportes.
7. Recarga la página y comprueba la persistencia.
8. Exporta el CSV y comprueba los registros.

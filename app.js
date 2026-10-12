'use strict';

/* ==========================================================================
   1. CONSTANTES Y CONFIGURACIÓN
   ========================================================================== */
const STORAGE_KEY = 'soporteclaro.v1';
const STATES = ['Pendiente', 'En proceso', 'Resuelta'];
const PRIORITIES = ['Alta', 'Media', 'Baja'];

let tickets = [];

/* ==========================================================================
   2. UTILIDADES Y HELPERS
   ========================================================================== */
/** Selecciona un elemento del DOM */
const $ = (selector) => document.querySelector(selector);

/** Escapa caracteres especiales para prevenir inyección HTML (XSS) */
const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[char])
  );

/** Formatea una fecha ISO a formato legible local */
const formatDate = (dateValue) =>
  new Date(dateValue).toLocaleString('es-SV', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

/** Muestra un mensaje flotante temporal (Toast) */
function toast(message) {
  const toastEl = $('#toast');
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    toastEl.hidden = true;
  }, 5000);
}

/** Genera el HTML de la etiqueta de estado */
const badge = (ticket) => {
  const statusClass =
    ticket.status === 'Pendiente'
      ? 'pending'
      : ticket.status === 'En proceso'
      ? 'progress'
      : 'resolved';

  return `<span class="badge ${statusClass}">${esc(ticket.status)}</span>`;
};

/** Prepara y sanea una celda para el archivo CSV */
function csvCell(value) {
  let text = String(value ?? '');
  // Prevención de inyección de fórmulas CSV
  if (/^[\s]*[=+@-]/.test(text)) {
    text = "'" + text;
  }
  return '"' + text.replace(/"/g, '""') + '"';
}

/* ==========================================================================
   3. PERSISTENCIA Y VALIDACIÓN DE DATOS (LOCALSTORAGE)
   ========================================================================== */
/** Valida la estructura íntegra de un objeto ticket */
function validTicket(t) {
  return (
    t &&
    typeof t.id === 'string' &&
    ['title', 'requester', 'equipment', 'category', 'priority', 'assignee', 'description', 'created'].every(
      (k) => typeof t[k] === 'string'
    ) &&
    STATES.includes(t.status) &&
    PRIORITIES.includes(t.priority) &&
    Number.isFinite(Date.parse(t.created)) &&
    Array.isArray(t.events) &&
    t.events.every((e) => typeof e.text === 'string' && Number.isFinite(Date.parse(e.at)))
  );
}

/** Carga los tickets almacenados en el navegador */
try {
  const savedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if (!Array.isArray(savedData) || !savedData.every(validTicket)) {
    throw new Error('Estructura de datos inválida');
  }
  tickets = savedData;
} catch {
  toast('No se pudieron leer los datos guardados. No se sobrescribirán hasta que registres un cambio.');
}

/** Guarda el estado actual en LocalStorage y re-renderiza la interfaz */
function commit(nextTickets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTickets));
    tickets = nextTickets;
    render();
    return true;
  } catch {
    toast('No se pudo guardar. Revisa el espacio o los permisos de almacenamiento del navegador.');
    return false;
  }
}

/* ==========================================================================
   4. RENDERIZADO PRINCIPAL DE LA INTERFAZ
   ========================================================================== */
/** Renderiza el listado de tickets, estadísticas y filtros */
function render() {
  // 1. Tarjetas de estadísticas
  const counts = [tickets.length, ...STATES.map((s) => tickets.filter((t) => t.status === s).length)];
  const statsConfig = [
    { title: 'Total de solicitudes', subtitle: 'Reportes registrados' },
    { title: 'Pendientes', subtitle: 'Por comenzar' },
    { title: 'En proceso', subtitle: 'Recibiendo atención' },
    { title: 'Resueltas', subtitle: 'Soluciones documentadas' },
  ];

  $('#stats').innerHTML = statsConfig
    .map(
      (item, index) => `
      <article class="stat">
        <p>${item.title}</p>
        <strong>${counts[index]}</strong>
        <small>${item.subtitle}</small>
      </article>`
    )
    .join('');

  // 2. Filtros y búsqueda
  const searchTerm = $('#search').value.trim().toLocaleLowerCase();
  const statusFilter = $('#status-filter').value;
  const priorityFilter = $('#priority-filter').value;

  const visibleTickets = tickets
    .filter((ticket) => {
      const matchStatus = !statusFilter || ticket.status === statusFilter;
      const matchPriority = !priorityFilter || ticket.priority === priorityFilter;
      const matchSearch =
        !searchTerm ||
        [ticket.id, ticket.title, ticket.requester, ticket.equipment, ticket.assignee].some((field) =>
          field.toLocaleLowerCase().includes(searchTerm)
        );

      return matchStatus && matchPriority && matchSearch;
    })
    .sort((a, b) => Date.parse(b.created) - Date.parse(a.created));

  // 3. Tabla de solicitudes
  $('#ticket-list').innerHTML = visibleTickets
    .map(
      (ticket) => `
      <tr>
        <td>
          <span class="code">${esc(ticket.id)}</span>
          <button class="ticket-link" data-id="${esc(ticket.id)}">${esc(ticket.title)}</button>
          <small>${esc(ticket.category)}</small>
        </td>
        <td>
          ${esc(ticket.equipment)}
          <small>${esc(ticket.requester)}</small>
        </td>
        <td>
          <span class="priority ${ticket.priority}">● ${ticket.priority}</span>
        </td>
        <td>${badge(ticket)}</td>
        <td>${esc(ticket.assignee)}</td>
        <td>${esc(new Date(ticket.created).toLocaleDateString('es-SV'))}</td>
      </tr>`
    )
    .join('');

  // 4. Contador de resultados y estado vacío
  $('#count').textContent = `${visibleTickets.length} de ${tickets.length} solicitudes`;
  $('#empty').hidden = visibleTickets.length > 0;

  // 5. Actualizar historial de equipos
  renderHistory();
}

/** Renderiza el historial de solicitudes agrupado por equipo */
function renderHistory() {
  const select = $('#equipment-filter');
  const previousValue = select.value;
  const uniqueEquipments = [...new Set(tickets.map((t) => t.equipment))].sort((a, b) =>
    a.localeCompare(b)
  );

  // Actualizar opciones del select
  select.innerHTML = uniqueEquipments.length
    ? uniqueEquipments.map((eq) => `<option>${esc(eq)}</option>`).join('')
    : '<option value="">Sin equipos registrados</option>';

  if (uniqueEquipments.includes(previousValue)) {
    select.value = previousValue;
  }

  // Filtrar y mostrar las incidencias del equipo seleccionado
  const rows = tickets
    .filter((t) => t.equipment === select.value)
    .sort((a, b) => Date.parse(b.created) - Date.parse(a.created));

  $('#equipment-history').innerHTML = rows.length
    ? rows
        .map(
          (t) => `
        <article class="panel history-item">
          <span class="code">${esc(t.id)} · ${esc(formatDate(t.created))}</span>
          <h2>
            <button class="ticket-link" data-id="${esc(t.id)}">${esc(t.title)}</button>
          </h2>
          ${badge(t)}
          <p>${esc(t.description)}</p>
          <p><strong>Responsable:</strong> ${esc(t.assignee)}</p>
          <p><strong>Solución:</strong> ${esc(t.solution || 'Todavía no hay una solución registrada.')}</p>
        </article>`
        )
        .join('')
    : '<div class="panel empty">El historial aparecerá cuando registres solicitudes.</div>';
}

/* ==========================================================================
   5. DETALLE Y ACTUALIZACIÓN DE SOLICITUD (MODAL)
   ========================================================================== */
/** Abre el diálogo con el detalle completo de un ticket */
function detail(id) {
  const ticket = tickets.find((t) => t.id === id);
  if (!ticket) return;

  const firstResponseInfo = ticket.firstResponse
    ? `<p class="muted">Primera atención: ${esc(formatDate(ticket.firstResponse))} · ${Math.max(
        0,
        Math.round((Date.parse(ticket.firstResponse) - Date.parse(ticket.created)) / 60000)
      )} minutos desde el reporte.</p>`
    : '';

  $('#detail-content').innerHTML = `
    <p class="code">${esc(ticket.id)} · ${esc(formatDate(ticket.created))}</p>
    <h2>${esc(ticket.title)}</h2>
    <p>${badge(ticket)} · ${esc(ticket.priority)} · ${esc(ticket.category)}</p>
    <p>
      <strong>Solicitante:</strong> ${esc(ticket.requester)}<br>
      <strong>Equipo o cuenta:</strong> ${esc(ticket.equipment)}
    </p>
    <p class="detail-description">${esc(ticket.description)}</p>
    
    <form id="update-form">
      <div class="two">
        <label class="field">
          Estado
          <select name="status">
            ${STATES.map((s) => `<option${s === ticket.status ? ' selected' : ''}>${s}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          Responsable
          <input name="assignee" required maxlength="80" value="${esc(ticket.assignee)}">
        </label>
      </div>
      <label class="field">
        Solución aplicada (obligatoria al resolver)
        <textarea name="solution" rows="3" maxlength="3000">${esc(ticket.solution || '')}</textarea>
      </label>
      <label class="field">
        Nota de seguimiento
        <textarea name="note" rows="2" maxlength="2000" placeholder="Agrega avances o información útil"></textarea>
      </label>
      <button class="primary" type="submit">Guardar cambios</button>
    </form>

    <h3>Actividad</h3>
    <ul class="timeline">
      ${[...ticket.events]
        .reverse()
        .map((e) => `<li>${esc(e.text)}<time>${esc(formatDate(e.at))}</time></li>`)
        .join('')}
    </ul>
    ${firstResponseInfo}
  `;

  const form = $('#update-form');

  // La solución es obligatoria si el estado es 'Resuelta'
  const toggleSolutionRequired = () => {
    form.elements.solution.required = form.elements.status.value === 'Resuelta';
  };
  form.elements.status.addEventListener('change', toggleSolutionRequired);
  toggleSolutionRequired();

  // Guardar cambios en el ticket
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const newStatus = formData.get('status');
    const newAssignee = formData.get('assignee').trim();
    const newSolution = formData.get('solution').trim();
    const note = formData.get('note').trim();

    if (!newAssignee || (newStatus === 'Resuelta' && !newSolution)) {
      toast('Indica un responsable y una solución antes de resolver.');
      return;
    }

    const now = new Date().toISOString();
    const updated = {
      ...ticket,
      status: newStatus,
      assignee: newAssignee,
      solution: newSolution,
      events: [...ticket.events],
    };

    // Registrar cambios en el historial de eventos
    if (newStatus !== ticket.status) {
      updated.events.push({ at: now, text: `Estado: ${ticket.status} → ${newStatus}` });
    }
    if (newAssignee !== ticket.assignee) {
      updated.events.push({ at: now, text: `Responsable: ${newAssignee}` });
    }
    if (newSolution !== (ticket.solution || '')) {
      updated.events.push({
        at: now,
        text: `Solución: ${newSolution || 'Se retiró la solución registrada.'}`,
      });
    }
    if (note) {
      updated.events.push({ at: now, text: note });
    }
    if (!updated.firstResponse && newStatus !== 'Pendiente') {
      updated.firstResponse = now;
    }

    if (commit(tickets.map((t) => (t.id === id ? updated : t)))) {
      detail(id);
      toast('Cambios guardados.');
    }
  });

  if (!$('#detail-dialog').open) {
    $('#detail-dialog').showModal();
  }
}

/* ==========================================================================
   6. GESTIÓN DE NUEVA SOLICITUD
   ========================================================================== */
$('#new-ticket').addEventListener('click', () => {
  $('#ticket-form').reset();
  $('#ticket-dialog').showModal();
});

$('#ticket-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const values = Object.fromEntries([...formData].map(([k, v]) => [k, v.trim()]));

  if (Object.values(values).some((v) => !v)) {
    toast('Completa todos los campos sin dejar solo espacios.');
    return;
  }

  const now = new Date().toISOString();
  const nextNumber = Math.max(0, ...tickets.map((t) => Number(t.id.replace('SC-', '')) || 0)) + 1;
  const newTicket = {
    ...values,
    id: `SC-${String(nextNumber).padStart(4, '0')}`,
    status: 'Pendiente',
    created: now,
    solution: '',
    events: [{ at: now, text: 'Solicitud recibida y registrada.' }],
  };

  if (commit([...tickets, newTicket])) {
    $('#ticket-dialog').close();
    toast(`Solicitud ${newTicket.id} recibida. Ya puedes consultar su estado.`);
  }
});

/* ==========================================================================
   7. DATOS DEMO Y EXPORTACIÓN A CSV
   ========================================================================== */
/** Carga datos ficticios de prueba */
$('#demo').addEventListener('click', () => {
  if (tickets.some((t) => t.demo)) {
    toast('Los ejemplos ya están cargados.');
    return;
  }

  const examples = [
    [
      'La impresora no responde',
      'Ana Martínez',
      'IMP-01',
      'Impresora',
      'Alta',
      'Carlos Pérez',
      'No imprime las facturas del área de ventas.',
      'Pendiente',
    ],
    [
      'No puedo acceder al correo',
      'Luis Hernández',
      'Correo de ventas',
      'Cuenta y acceso',
      'Media',
      'María López',
      'La cuenta muestra un error al iniciar sesión.',
      'En proceso',
    ],
    [
      'La computadora está muy lenta',
      'Sofía García',
      'PC-03',
      'Computadora',
      'Baja',
      'Carlos Pérez',
      'Los programas tardan varios minutos en abrir.',
      'Resuelta',
    ],
    [
      'Se pierde la conexión a internet',
      'Diego Castro',
      'PC-01',
      'Red e internet',
      'Alta',
      'María López',
      'La conexión se interrumpe durante las reuniones.',
      'Pendiente',
    ],
  ];

  let nextNumber = Math.max(0, ...tickets.map((t) => Number(t.id.replace('SC-', '')) || 0));

  const demoTickets = examples.map((data, index) => {
    const created = new Date(Date.now() - (index + 1) * 86400000).toISOString();
    const respondedAt = new Date(Date.parse(created) + 1800000).toISOString();
    const [title, requester, equipment, category, priority, assignee, description, status] = data;
    const solution =
      status === 'Resuelta'
        ? 'Se liberó espacio y se desactivaron programas innecesarios de inicio.'
        : '';

    return {
      id: `SC-${String(++nextNumber).padStart(4, '0')}`,
      title,
      requester,
      equipment,
      category,
      priority,
      assignee,
      description,
      status,
      created,
      demo: true,
      solution,
      firstResponse: status !== 'Pendiente' ? respondedAt : null,
      events: [
        { at: created, text: 'Solicitud de demostración recibida.' },
        ...(status !== 'Pendiente'
          ? [{ at: respondedAt, text: `Estado: ${status}${solution ? '. ' + solution : ''}` }]
          : []),
      ],
    };
  });

  if (commit([...tickets, ...demoTickets])) {
    toast('Se agregaron cuatro solicitudes ficticias de demostración.');
  }
});

/** Exporta los datos a un archivo CSV con soporte para caracteres en español (UTF-8 BOM) */
$('#export').addEventListener('click', () => {
  if (!tickets.length) {
    toast('Registra solicitudes antes de exportar.');
    return;
  }

  const columns = [
    'id',
    'title',
    'requester',
    'equipment',
    'category',
    'priority',
    'status',
    'assignee',
    'created',
    'firstResponse',
    'solution',
  ];

  const headers = [
    'Código',
    'Título',
    'Solicitante',
    'Equipo',
    'Categoría',
    'Prioridad',
    'Estado',
    'Responsable',
    'Creada',
    'Primera atención',
    'Solución',
  ];

  const rows = [headers, ...tickets.map((t) => columns.map((col) => t[col] || ''))];
  const csvContent = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');

  // \ufeff agrega la marca de orden de bytes (BOM) para compatibilidad con Excel
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'soporteclaro-solicitudes.csv';
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Solicitudes exportadas.');
});

/* ==========================================================================
   8. NAVEGACIÓN, DIÁLOGOS Y SINCRONIZACIÓN ENTRE PESTAÑAS
   ========================================================================== */
// Cambio de vistas (pestañas)
document.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.view').forEach((view) => {
      view.hidden = view.id !== button.dataset.view;
    });

    document.querySelectorAll('.nav').forEach((navBtn) => {
      navBtn.classList.toggle('active', navBtn === button);
    });

    if (button.dataset.view === 'history') {
      renderHistory();
    }
  });
});

// Botones para cerrar diálogos
document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.getElementById(btn.dataset.close).close();
  });
});

// Búsqueda y filtros reactivos
['search', 'status-filter', 'priority-filter'].forEach((id) => {
  document.getElementById(id).addEventListener(id === 'search' ? 'input' : 'change', render);
});

$('#equipment-filter').addEventListener('change', renderHistory);

// Delegación de eventos para abrir detalle de solicitudes
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-id]');
  if (link) {
    detail(link.dataset.id);
  }
});

// Sincronización en tiempo real entre pestañas con StorageEvent
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    try {
      const data = JSON.parse(e.newValue || '[]');
      if (Array.isArray(data) && data.every(validTicket)) {
        tickets = data;
        render();
        if ($('#detail-dialog').open) {
          $('#detail-dialog').close();
        }
        toast('Datos actualizados desde otra pestaña.');
      }
    } catch {
      toast('No se pudieron actualizar los datos de otra pestaña.');
    }
  }
});

/* ==========================================================================
   9. INICIALIZACIÓN
   ========================================================================== */
render();

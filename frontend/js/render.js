
// js/render.js
// Funciones de renderizado para el dashboard TaskFlow. Reciben el estado
// actual y actualizan el DOM. No hacen fetch ni deciden reglas de negocio.

/**
 * Escapa caracteres especiales de HTML.
 * @param {string} str - La cadena a escapar.
 * @returns {string} La cadena escapada.
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

const ETIQUETAS_ESTATUS = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  completada: 'Completada',
};

const ESTATUS_COLORS = {
  pendiente:   { bg: '#FEF3C7', text: '#92400E' },
  en_progreso: { bg: '#DBEAFE', text: '#1E40AF' },
  completada:  { bg: '#DCFCE7', text: '#166534' },
};

/**
 * Obtiene el nombre completo de un usuario.
 * @param {Array} usuarios - Lista de usuarios.
 * @param {number} id - El ID del usuario.
 * @returns {string} El nombre del usuario o su ID si no existe.
 */
function nombreUsuario(usuarios, id) {
  const u = usuarios.find((x) => x.id === id);
  return u ? `${u.nombre} ${u.apellido}` : `#${id}`;
}

/**
 * Genera iniciales a partir de un nombre y apellido.
 * @param {string} nombre - El nombre del usuario.
 * @param {string} apellido - El apellido del usuario.
 * @returns {string} Las iniciales en mayúsculas.
 */
function getInitials(nombre, apellido) {
  return `${(nombre || '')[0] || ''}${(apellido || '')[0] || ''}`.toUpperCase();
}

/**
 * Obtiene un color predefinido para el avatar del usuario basado en su ID.
 * @param {number} id - El ID del usuario.
 * @returns {string} El color en formato hexadecimal.
 */
function avatarColor(id) {
  const colors = [
    '#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626',
    '#7c3aed', '#db2777', '#0d9488', '#2563eb', '#ca8a04',
  ];
  return colors[id % colors.length];
}

// Load admin profile from localStorage into header on startup
(function initAdminHeader() {
  try {
    const profile = JSON.parse(localStorage.getItem('taskflow_admin_profile'));
    if (!profile) return;
    const headerName = document.getElementById('header-user-name');
    if (headerName) headerName.textContent = profile.nombre || 'Admin';
    const headerRole = document.getElementById('header-user-role');
    if (headerRole) headerRole.textContent = profile.cargo || '';
    const headerAvatar = document.getElementById('header-user-avatar');
    if (headerAvatar) {
      const parts = (profile.nombre || 'A').split(' ');
      headerAvatar.textContent = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'A';
    }
  } catch {}
})();

/**
 * Actualiza la visibilidad de las vistas según la vista activa.
 * @param {Object} state - El estado actual de la aplicación.
 * @returns {void}
 */
export function renderVistaActiva(state) {
  const views = ['dashboard', 'lista', 'detalle', 'tablero', 'config', 'login'];

  const isLogin = state.vista === 'login';
  const sidebar = document.getElementById('main-sidebar');
  const header = document.getElementById('top-header');
  // Removed hiding main-content-wrapper so view-login (which is inside it) can render
  // and cover everything with fixed inset-0.
  if (sidebar) sidebar.style.display = isLogin ? 'none' : '';
  if (header) header.style.display = isLogin ? 'none' : '';

  for (const v of views) {
    const el = document.getElementById('view-' + v);
    if (el) {
      el.hidden = state.vista !== v;
      if (state.vista === v) el.classList.remove('hidden');
      else el.classList.add('hidden');
    }
  }

  const activeClass = 'flex items-center gap-space-md px-space-md py-space-sm rounded-xl transition-colors bg-primary-container text-on-primary font-semibold shadow-sm';
  const inactiveClass = 'flex items-center gap-space-md px-space-md py-space-sm rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors font-label-md text-label-md';
  
  const navIds = ['dashboard', 'lista', 'tablero', 'detalle', 'config'];
  for (const id of navIds) {
    const nav = document.getElementById('nav-' + id);
    if (nav) nav.className = state.vista === id ? activeClass : inactiveClass;
  }
}

/**
 * Renderiza la lista de usuarios y sus estadísticas.
 * @param {Object} state - El estado actual de la aplicación.
 * @returns {void}
 */
export function renderListado(state) {
  const usuarios = state.usuariosFiltrados ?? state.usuarios;
  const vacio = document.getElementById('usuarios-vacio');
  const tableView = document.getElementById('users-table-view');
  const cardsView = document.getElementById('users-cards-view');

  vacio.hidden = usuarios.length > 0;
  if (usuarios.length === 0) {
    tableView.classList.add('hidden');
    cardsView.classList.add('hidden');
  } else {
    // Both are structurally visible, but CSS toggles which one actually shows based on state (handled in main.js with a separate class or we can just rely on the toggle button logic)
    // Actually, we don't mess with their hidden state here, just let the toggle buttons do it.
  }

  let totalTasks = 0;
  let completedTasks = 0;

  const filas = usuarios.map((u) => {
    const tareas = u.tareas || [];
    totalTasks += tareas.length;
    completedTasks += tareas.filter(t => t.estatus === 'completada').length;

    const activas = tareas.filter(t => t.estatus !== 'completada').length;
    const progreso = tareas.length === 0 ? 0 : Math.round((tareas.filter(t => t.estatus === 'completada').length / tareas.length) * 100);
    const iniciales = getInitials(u.nombre, u.apellido);
    const color = avatarColor(u.id);

    return `
    <tr class="hover:bg-surface-container-lowest transition-colors border-b border-surface-container-high last:border-0 group">
      <td class="py-space-sm px-space-lg">
        <input type="checkbox" class="w-4 h-4 rounded text-primary-container accent-primary-container cursor-pointer user-checkbox" value="${u.id}"/>
      </td>
      <td class="py-space-sm px-space-md">
        <div class="flex items-center gap-space-md cursor-pointer" onclick="abrirDetalleUsuario(${u.id})">
          <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-label-md font-bold shadow-sm" style="background-color: ${color}">
            ${iniciales}
          </div>
          <div class="flex flex-col">
            <span class="font-label-md text-label-md font-semibold text-on-surface group-hover:text-primary transition-colors">${escapeHtml(u.nombre)} ${escapeHtml(u.apellido)}</span>
          </div>
        </div>
      </td>
      <td class="py-space-sm px-space-md">
        <div class="flex flex-col">
          <span class="font-body-sm text-body-sm text-on-surface">${escapeHtml(u.email)}</span>
          <span class="font-code-sm text-code-sm text-on-surface-variant">${escapeHtml(u.telefono || '—')}</span>
        </div>
      </td>
      <td class="py-space-sm px-space-md">
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center justify-center bg-secondary-container text-on-secondary-container font-code-sm text-code-sm font-semibold rounded-full w-6 h-6">${activas}</span>
        </div>
      </td>
      <td class="py-space-sm px-space-md">
        <div class="flex flex-col gap-1 w-full max-w-[140px]">
          <div class="flex justify-between items-center">
            <span class="font-label-sm text-label-sm text-on-surface-variant">${progreso}%</span>
          </div>
          <div class="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
            <div class="bg-primary h-full rounded-full" style="width: ${progreso}%"></div>
          </div>
        </div>
      </td>
      <td class="py-space-sm px-space-md font-body-sm text-body-sm text-on-surface-variant">
        ${new Date(u.created_at).toLocaleDateString()}
      </td>
      <td class="py-space-sm px-space-lg text-right">
        <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors" onclick="abrirDetalleUsuario(${u.id})" title="Ver detalle">
            <span class="material-symbols-outlined text-lg">visibility</span>
          </button>
          <button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors btn-editar-usuario" data-id="${u.id}" title="Editar">
            <span class="material-symbols-outlined text-lg">edit</span>
          </button>
          <button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-error-container hover:text-error transition-colors btn-eliminar-usuario" data-id="${u.id}" title="Eliminar">
            <span class="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>
      </td>
    </tr>`;
  });

  const cards = usuarios.map((u) => {
    const tareas = u.tareas || [];
    const activas = tareas.filter(t => t.estatus !== 'completada').length;
    const progreso = tareas.length === 0 ? 0 : Math.round((tareas.filter(t => t.estatus === 'completada').length / tareas.length) * 100);
    const iniciales = getInitials(u.nombre, u.apellido);
    const color = avatarColor(u.id);

    return `
    <div class="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-transparent hover:border-surface-container-high transition-all flex flex-col gap-space-md group cursor-pointer" onclick="abrirDetalleUsuario(${u.id})">
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-space-md">
          <div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-headline-sm text-headline-sm font-bold shadow-sm" style="background-color: ${color}">
            ${iniciales}
          </div>
          <div class="flex flex-col">
            <span class="font-headline-sm text-headline-sm font-semibold text-on-surface group-hover:text-primary transition-colors">${escapeHtml(u.nombre)} ${escapeHtml(u.apellido)}</span>
            <span class="font-body-sm text-body-sm text-on-surface-variant">${escapeHtml(u.email)}</span>
          </div>
        </div>
        <button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors" onclick="event.stopPropagation(); // menu logic">
          <span class="material-symbols-outlined text-lg">more_vert</span>
        </button>
      </div>
      
      <div class="flex items-center gap-space-md mt-auto pt-space-md border-t border-surface-container-high">
        <div class="flex flex-col gap-1 flex-1">
          <div class="flex justify-between items-center">
            <span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Progreso</span>
            <span class="font-label-sm text-label-sm text-on-surface font-semibold">${progreso}%</span>
          </div>
          <div class="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
            <div class="bg-primary h-full rounded-full" style="width: ${progreso}%"></div>
          </div>
        </div>
        <div class="flex items-center gap-1.5 bg-secondary-container text-on-secondary-container px-2 py-1 rounded-lg">
          <span class="material-symbols-outlined text-base">task</span>
          <span class="font-label-sm text-label-sm font-bold">${activas}</span>
        </div>
      </div>
    </div>`;
  });

  const tbody = document.getElementById('tabla-usuarios-body');
  if (tbody) tbody.innerHTML = filas.join('');
  
  if (cardsView) cardsView.innerHTML = cards.join('');

  const tableInfo = document.getElementById('table-info');
  if (tableInfo) {
    tableInfo.innerHTML = `Mostrando <span class="font-semibold text-on-surface">${usuarios.length}</span> colaboradores`;
  }

  const statUsers = document.getElementById('stat-total-users');
  const statTasks = document.getElementById('stat-total-tasks');
  const statComp = document.getElementById('stat-completed');
  const pctText = document.getElementById('capacity-pct');
  const ring = document.getElementById('capacity-ring');
  const capBadge = document.getElementById('capacity-badge');
  const capDesc = document.getElementById('capacity-desc');
  const sparkline = document.getElementById('sparkline-bars');

  if (statUsers) statUsers.textContent = state.usuarios.length;
  if (statTasks) statTasks.textContent = totalTasks;
  if (statComp) statComp.textContent = completedTasks;

  if (pctText && ring) {
    const globalCap = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    pctText.textContent = `${globalCap}%`;
    ring.style.strokeDasharray = `${globalCap}, 100`;
    
    if (capBadge && capDesc) {
      if (globalCap > 75) {
        capBadge.textContent = "Óptimo";
        capBadge.className = "bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm px-2 py-0.5 rounded-full font-semibold";
        capDesc.textContent = "El equipo mantiene un excelente ritmo de entrega. Capacidad disponible para nuevas asignaciones.";
      } else if (globalCap > 40) {
        capBadge.textContent = "Estable";
        capBadge.className = "bg-secondary-container text-on-secondary-container font-label-sm text-label-sm px-2 py-0.5 rounded-full font-semibold";
        capDesc.textContent = "Ritmo constante. Recomendable monitorear cuellos de botella en tareas en progreso.";
      } else {
        capBadge.textContent = "Atención";
        capBadge.className = "bg-error-container text-on-error-container font-label-sm text-label-sm px-2 py-0.5 rounded-full font-semibold";
        capDesc.textContent = "Alta acumulación de tareas pendientes. Priorizar el desbloqueo del equipo.";
      }
    }
  }

  if (sparkline) {
    let p = 0, e = 0, c = 0;
    state.usuarios.forEach(u => {
      (u.tareas || []).forEach(t => {
        if (t.estatus === 'pendiente') p++;
        else if (t.estatus === 'en_progreso') e++;
        else c++;
      });
    });
    const tot = p + e + c || 1;
    sparkline.innerHTML = `
      <div class="bg-error-container text-on-error-container w-full rounded-t-sm flex items-end justify-center pb-1 text-[10px] font-bold transition-all" style="height: ${(p/tot)*100}%">${p>0?p:''}</div>
      <div class="bg-secondary-container text-on-secondary-container w-full rounded-t-sm flex items-end justify-center pb-1 text-[10px] font-bold transition-all" style="height: ${(e/tot)*100}%">${e>0?e:''}</div>
      <div class="bg-tertiary-fixed text-on-tertiary-fixed w-full rounded-t-sm flex items-end justify-center pb-1 text-[10px] font-bold transition-all" style="height: ${(c/tot)*100}%">${c>0?c:''}</div>
    `;
  }
}



/**
 * Renderiza la vista de detalle de un usuario específico.
 * @param {Object} state - El estado actual de la aplicación.
 * @returns {void}
 */
export function renderDetalle(state) {
  const ud = state.usuarioDetalle;
  if (!ud) return;

  const headerName = document.getElementById('detalle-header-name');
  if (headerName) headerName.textContent = escapeHtml(ud.nombre + ' ' + ud.apellido);
  
  const breadcrumbName = document.getElementById('detalle-breadcrumb-name');
  if (breadcrumbName) breadcrumbName.textContent = escapeHtml(ud.nombre + ' ' + ud.apellido);
  
  const reassignOwner = document.getElementById('reassign-modal-owner');
  if (reassignOwner) reassignOwner.textContent = escapeHtml(ud.nombre + ' ' + ud.apellido);
  
  const uid = document.getElementById('detalle-uid');
  if (uid) uid.textContent = 'UID-' + ud.id;

  const headerAvatar = document.getElementById('detalle-header-avatar');
  if (headerAvatar) {
    headerAvatar.textContent = getInitials(ud.nombre, ud.apellido);
    headerAvatar.style.backgroundColor = avatarColor(ud.id);
  }

  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  
  el('detalle-puesto-text', ud.puesto_nombre || 'Sin puesto asignado');
  
  const btnAsignar = document.getElementById('detalle-btn-asignar-txt');
  if (btnAsignar) btnAsignar.textContent = '+ Asignar Nueva Tarea a ' + escapeHtml(ud.nombre);

  const tareas = ud.tareas || [];
  let p = 0, e = 0, c = 0;
  tareas.forEach((t) => {
    if (t.estatus === 'pendiente') p++;
    else if (t.estatus === 'en_progreso') e++;
    else if (t.estatus === 'completada') c++;
  });
  
  const activeTasksCount = p + e;
  el('kpi-active-tasks', activeTasksCount);
  el('kpi-completed-tasks', c);
  
  let urgentesCount = 0;
  tareas.forEach(t => {
    if (t.prioridad === 'urgente' && t.estatus !== 'completada') urgentesCount++;
  });
  el('kpi-urgentes', urgentesCount + ' Urgentes');
  el('kpi-en-curso', (p + e - urgentesCount) + ' Regulares');
  
  el('kpi-minibar-p', p);
  el('kpi-minibar-e', e);
  el('kpi-minibar-c', c);
  
  const totalTasks = tareas.length;
  // Carga de trabajo is based on active tasks (p+e). Let's say 5 active tasks is 100%
  let workloadPct = Math.min(100, activeTasksCount * 20);
  el('kpi-workload', workloadPct + '%');
  
  const captionEl = document.getElementById('kpi-workload-caption');
  if (captionEl) {
    if (workloadPct < 50) {
      captionEl.textContent = '(Capacidad óptima)';
      captionEl.className = 'font-label-sm text-label-sm text-tertiary font-semibold';
    } else if (workloadPct < 80) {
      captionEl.textContent = '(Carga estable)';
      captionEl.className = 'font-label-sm text-label-sm text-on-surface-variant font-semibold';
    } else {
      captionEl.textContent = '(Sobrecarga)';
      captionEl.className = 'font-label-sm text-label-sm text-error font-semibold';
    }
  }

  // Update Completadas
  // c is total completed
  el('kpi-completed-tasks', c);
  el('kpi-completed-caption1', c > 10 ? 'Top 5% del equipo' : (c > 0 ? 'Buen ritmo' : 'Sin datos'));
  el('kpi-completed-caption2', c + ' tickets resueltos este ciclo');

  
  const horasBuffer = 40 - Math.min(40, activeTasksCount * 4);
  el('kpi-horas-libres', horasBuffer + ' horas libres');
  el('kpi-horas-buffer', horasBuffer + 'h');
  
  const bar = document.getElementById('kpi-workload-bar');
  if (bar) bar.style.width = workloadPct + '%';
  
  const ring = document.getElementById('capacity-ring-detalle');
  if (ring) {
     const circumference = 251.3;
     const offset = circumference - (workloadPct / 100) * circumference;
     ring.style.strokeDashoffset = offset;
  }
  const ringCritical = document.getElementById('capacity-ring-critical');
  if (ringCritical) {
     const circumference = 251.3;
     const cOffset = totalTasks === 0 ? circumference : circumference - (p / totalTasks) * circumference;
     ringCritical.style.strokeDashoffset = cOffset;
  }
  el('capacity-pct-detalle', workloadPct + '%');
  
  const tabAssigned = document.getElementById('tab-assigned-count');
  if (tabAssigned) tabAssigned.textContent = `Tareas Asignadas (${tareas.length})`;
  
  const batchTitle = document.getElementById('batch-control-title');
  if (batchTitle) batchTitle.textContent = `Seleccionar todas (${activeTasksCount} asignaciones activas)`;

  const wrapper = document.getElementById('tareas-lista');
  if (wrapper) {
    if (tareas.length === 0) {
      wrapper.innerHTML = '<p class="text-on-surface-variant p-4 text-center">No hay tareas asignadas</p>';
    } else {
      wrapper.innerHTML = tareas.map(t => {
        const isPending = t.estatus === 'pendiente';
        const isProgress = t.estatus === 'en_progreso';
        const isCompleted = t.estatus === 'completada';
        
        const borderColor = isPending ? 'bg-surface-variant' : (isProgress ? 'bg-primary' : 'bg-tertiary');
        
        const statusHtml = isPending ? `<span class="bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm px-space-xs py-0.5 rounded-full font-semibold flex items-center gap-1">Pendiente</span>` : 
                           (isProgress ? `<span class="bg-primary-container text-on-primary font-label-sm text-label-sm px-space-xs py-0.5 rounded-full font-semibold">En progreso</span>` :
                           `<span class="bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm px-space-xs py-0.5 rounded-full font-semibold">Completada</span>`);

        return `
        <div class="task-card bg-surface-container-lowest rounded-full p-space-md shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-space-md relative overflow-hidden" data-code="TK-${t.id}" data-title="${escapeHtml(t.titulo)}">
          <div class="absolute left-0 top-0 bottom-0 w-1.5 ${borderColor}"></div>
          <div class="flex items-start gap-space-md min-w-0 pl-space-xs">
            ${!isCompleted ? `<input class="task-select-box accent-primary-container rounded w-4 h-4 mt-1 cursor-pointer" type="checkbox"/>` : '<div class="w-4 h-4 mt-1"></div>'}
            <div class="flex flex-col min-w-0">
              <div class="flex flex-wrap items-center gap-space-xs mb-1">
                <span class="font-code-sm text-code-sm font-bold text-primary bg-primary-fixed/40 px-1.5 py-0.5 rounded">#TK-${t.id}</span>
                <span class="${{urgente:'bg-error text-on-error', alta:'bg-error-container text-on-error-container', media:'bg-secondary-container text-on-secondary-container', baja:'bg-surface-container-high text-on-surface-variant'}[t.prioridad||'media']} font-label-sm text-label-sm px-space-xs py-0.5 rounded font-semibold uppercase">${t.prioridad||'media'}</span>
                ${statusHtml}
              </div>
              <h3 class="font-headline-sm text-headline-sm text-on-surface ${isCompleted ? 'line-through text-on-surface-variant/70' : ''} font-semibold truncate hover:text-primary transition-colors cursor-pointer">
                ${escapeHtml(t.titulo)}
              </h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant line-clamp-1 pt-0.5">
                ${escapeHtml(t.descripcion)}
              </p>
            </div>
          </div>
          <div class="flex flex-wrap md:flex-nowrap items-center gap-space-md justify-between md:justify-end shrink-0 pl-space-lg md:pl-0">
            <div class="flex flex-col items-start md:items-end">
              <span class="font-label-sm text-label-sm text-on-surface-variant pt-0.5 flex items-center gap-1">
                <span class="material-symbols-outlined text-xs">event</span> ${escapeHtml(t.fecha || 'Sin fecha')}
              </span>
            </div>
            <button class="bg-surface-container text-primary hover:bg-primary-container hover:text-on-primary p-space-xs rounded-xl flex items-center justify-center transition-all shadow-sm btn-editar-tarea" data-id="${t.id}" title="Editar tarea">
              <span class="material-symbols-outlined text-xl">edit</span>
            </button>
            ${!isCompleted ? `<button class="bg-surface-container text-primary hover:bg-primary-container hover:text-on-primary p-space-xs rounded-xl flex items-center justify-center transition-all shadow-sm" onclick="openReassignModal('${t.id}')" title="Reasignar a otro miembro" type="button">
              <span class="material-symbols-outlined text-xl">swap_horiz</span>
            </button>` : ''}
          </div>
        </div>`;
      }).join('');
    }
  }
  
  const peers = state.usuarios.filter(u => u.id !== ud.id && u.puesto_id === ud.puesto_id).slice(0, 3);
  
  const peersAll = state.usuarios.filter(u => u.id !== ud.id && u.puesto_id === ud.puesto_id);
  const reassignList = document.getElementById('reassign-users-list');
  if (reassignList) {
    if (peersAll.length === 0) {
      reassignList.innerHTML = '<div class="text-on-surface-variant text-sm px-2 py-4 text-center">No hay otros colaboradores en la misma área para transferir tareas.</div>';
    } else {
      reassignList.innerHTML = peersAll.map(u => {
      const active = (u.tareas||[]).filter(t => t.estatus !== 'completada').length;
      const ini = getInitials(u.nombre, u.apellido);
      return `
      <label class="flex items-center justify-between p-space-md bg-surface-container-low rounded-xl cursor-pointer hover:bg-surface-container transition-colors">
        <div class="flex items-center gap-space-md">
          <input class="accent-primary-container h-4 w-4" name="targetMember" type="radio" value="${u.id}"/>
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-label-md font-bold" style="background-color: ${avatarColor(u.id)}">${ini}</div>
          <div>
            <span class="font-label-md text-label-md text-on-surface font-semibold block leading-tight">${escapeHtml(u.nombre)} ${escapeHtml(u.apellido)}</span>
            <span class="font-body-sm text-body-sm text-on-surface-variant">${active} tareas activas</span>
          </div>
        </div>
      </label>
      `;
    }).join('');
    }
  }
  
  const colabList = document.getElementById('colaboradores-pares-list');
  if (colabList) {
    
    if (peers.length === 0) {
      colabList.innerHTML = '<span class="text-on-surface-variant text-sm px-2">No hay colaboradores en la misma área.</span>';
    } else {
      colabList.innerHTML = peers.map(u => {
      const active = (u.tareas||[]).filter(t => t.estatus !== 'completada').length;
      const ini = getInitials(u.nombre, u.apellido);
      return `
      <div class="bg-surface-container-low/70 rounded-xl p-space-md flex flex-col gap-space-xs">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-space-sm">
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-headline-sm font-bold ring-2 ring-surface-container" style="background-color: ${avatarColor(u.id)}">${ini}</div>
            <div>
              <span class="font-label-md text-label-md text-on-surface font-bold block leading-tight">${escapeHtml(u.nombre)} ${escapeHtml(u.apellido)}</span>
              <span class="font-body-sm text-body-sm text-on-surface-variant">${active} tareas activas</span>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-end pt-space-xs">
          <button class="bg-surface-container hover:bg-primary-container hover:text-on-primary text-primary font-label-sm text-label-sm px-space-sm py-1 rounded-xl flex items-center gap-1 transition-colors font-semibold" onclick="quickTransfer('${u.id}')" type="button">
            <span class="material-symbols-outlined text-sm">forward</span>
            <span>Transferir carga rápida</span>
          </button>
        </div>
      </div>`;
    }).join('');
    }
  }
  
  const critList = document.getElementById('entregas-criticas-list');
  if (critList) {
    const urgentes = tareas.filter(t => t.estatus !== 'completada' && t.prioridad === 'urgente');
    if (urgentes.length === 0) {
      critList.innerHTML = '<span class="text-on-surface-variant text-sm px-2">No hay tareas urgentes.</span>';
    } else {
      critList.innerHTML = urgentes.map((t, idx) => {
        if (idx === 0) {
          return `
          <div class="bg-error-container/20 rounded-xl p-space-md flex flex-col gap-1">
            <div class="flex items-center justify-between">
              <span class="font-code-sm text-code-sm font-bold text-error">#TK-${t.id}</span>
              <div class="flex items-center gap-1 font-code-sm text-code-sm font-bold text-error bg-surface-container-lowest px-2 py-0.5 rounded-full shadow-xs">
                <span class="material-symbols-outlined text-xs">timer</span>
                <span class="countdown-dynamic">04h 28m 10s</span>
              </div>
            </div>
            <p class="font-label-md text-label-md text-on-surface font-semibold">${escapeHtml(t.titulo)}</p>
          </div>`;
        }
        return `
        <div class="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <span class="font-code-sm text-code-sm font-bold text-on-surface-variant">#TK-${t.id}</span>
          </div>
          <p class="font-label-md text-label-md text-on-surface font-semibold">${escapeHtml(t.titulo)}</p>
        </div>`;
      }).join('');
    }
  }
}


/**
 * Renderiza la vista del dashboard general.
 * @param {Object} state - El estado actual de la aplicación.
 * @returns {void}
 */
export function renderDashboard(state) {
  if (state.vista !== 'dashboard') return;

  const usuarios = state.usuarios;
  let totalTasks = 0;
  let completed = 0;
  let inProgress = 0;
  let pending = 0;
  let allTasks = [];

  for (const u of usuarios) {
    const tareas = u.tareas || [];
    totalTasks += tareas.length;
    for (const t of tareas) {
      if (t.estatus === 'completada') completed++;
      if (t.estatus === 'en_progreso') inProgress++;
      if (t.estatus === 'pendiente') pending++;
      allTasks.push({...t, usuario: u});
    }
  }

  const activeTasks = inProgress + pending;
  const completionRate = totalTasks > 0 ? ((completed / totalTasks) * 100).toFixed(1) : 0;

  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  
  el('dash-kpi-users', usuarios.length);
  el('dash-kpi-tasks', activeTasks);
  el('dash-kpi-rate', `${completionRate}%`);
  el('dash-sprint-completed', `${completed}/${totalTasks}`);

  const overloaded = usuarios.filter(u => {
     return (u.tareas||[]).filter(t => t.estatus !== 'completada').length >= 3; 
  }).length;
  el('dash-kpi-alerts', overloaded);

  const workloadList = document.getElementById('dash-workload-list');
  if (workloadList) {
    const sortedUsers = [...usuarios].sort((a, b) => {
      const activeA = (a.tareas||[]).filter(t => t.estatus !== 'completada').length;
      const activeB = (b.tareas||[]).filter(t => t.estatus !== 'completada').length;
      return activeB - activeA;
    }).slice(0, 5);

    workloadList.innerHTML = sortedUsers.map(u => {
      const active = (u.tareas||[]).filter(t => t.estatus !== 'completada').length;
      const pct = Math.min((active / 5) * 100, 100);
      const isOverload = active >= 4;
      const isOptimal = active <= 2;
      const color = isOverload ? 'bg-error' : (isOptimal ? 'bg-tertiary' : 'bg-primary-container');
      const badgeColor = isOverload ? 'bg-error-container text-on-error-container' : (isOptimal ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-secondary-container text-on-secondary-container');
      const badgeText = isOverload ? 'Sobrecarga' : (isOptimal ? 'Óptimo' : 'Moderado');
      const initials = getInitials(u.nombre, u.apellido);
      const avatarC = avatarColor(u.id);

      return `
      <div class="flex flex-col gap-space-xs cursor-pointer hover:bg-surface-container-low p-2 -mx-2 rounded-lg transition-colors" data-id="${u.id}">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-space-sm">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-label-md font-bold" style="background-color: ${avatarC}">${initials}</div>
            <div>
              <span class="font-label-md text-label-md font-semibold text-on-surface">${escapeHtml(u.nombre)} ${escapeHtml(u.apellido)}</span>
              <span class="font-body-sm text-body-sm text-on-surface-variant ml-space-xs">${active} tareas activas</span>
            </div>
          </div>
          <div class="flex items-center gap-space-sm">
            <span class="font-code-sm text-code-sm ${isOverload ? 'text-error' : (isOptimal ? 'text-tertiary' : 'text-primary-container')} font-semibold">${Math.round(pct)}%</span>
            <span class="inline-flex px-space-xs py-0.5 rounded-full ${badgeColor} font-label-sm text-label-sm font-semibold">${badgeText}</span>
          </div>
        </div>
        <div class="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden">
          <div class="${color} h-full rounded-full transition-all duration-500" style="width: ${pct}%;"></div>
        </div>
      </div>`;
    }).join('') || '<p class="text-on-surface-variant text-sm">No hay usuarios con carga de trabajo.</p>';
  }

  const criticalList = document.getElementById('dash-critical-tasks');
  if (criticalList) {
    const critical = allTasks.filter(t => t.estatus !== 'completada').slice(0, 3);
    criticalList.innerHTML = critical.map(t => {
      const initials = getInitials(t.usuario.nombre, t.usuario.apellido);
      const avatarC = avatarColor(t.usuario.id);
      const isUrgent = t.estatus === 'pendiente';

      return `
      <div class="p-space-md bg-surface-container-low/50 hover:bg-surface-container-high/60 transition-colors rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-space-md cursor-pointer" data-task-id="${t.id}" data-user-id="${t.usuario_id}">
        <div class="flex items-start gap-space-md min-w-0">
          <div class="w-9 h-9 rounded-full flex items-center justify-center text-white font-label-md font-bold shrink-0 mt-0.5" style="background-color: ${avatarC}">${initials}</div>
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-space-xs flex-wrap">
              <span class="font-label-sm text-label-sm uppercase tracking-wider px-space-xs py-0.5 rounded ${isUrgent ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'} font-semibold">${isUrgent ? 'Urgente' : 'Alta'}</span>
              <span class="font-code-sm text-code-sm text-on-surface-variant font-mono">TK-${t.id}</span>
              <span class="font-label-sm text-label-sm text-on-surface-variant">· ${escapeHtml(t.usuario.nombre)}</span>
            </div>
            <h3 class="font-headline-sm text-headline-sm font-semibold text-on-surface truncate mt-0.5">${escapeHtml(t.titulo)}</h3>
            <div class="flex items-center gap-space-md mt-space-xs font-body-sm text-body-sm text-on-surface-variant">
              <span class="flex items-center gap-1 ${isUrgent ? 'text-error font-medium' : ''}">
                <span class="material-symbols-outlined text-base">schedule</span> ${escapeHtml(t.fecha || 'Sin fecha')}
              </span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-space-xs self-end md:self-center shrink-0">
          <button class="bg-primary-container text-on-primary hover:bg-primary px-space-md py-space-xs rounded-xl font-label-md text-label-md shadow-sm transition-colors flex items-center gap-1" type="button" data-accion="ver-usuario">
            <span>Ver perfil</span>
            <span class="material-symbols-outlined text-base">chevron_right</span>
          </button>
        </div>
      </div>`;
    }).join('') || '<p class="text-on-surface-variant text-sm p-2">No hay tareas críticas.</p>';
  }
}


/**
 * Renderiza la vista de tablero Kanban.
 * @param {Object} state - El estado actual de la aplicación.
 * @returns {void}
 */
export function renderTablero(state) {
  if (state.vista !== 'tablero') return;

  const kanban = document.getElementById('kanban-board');
  if (!kanban) return;

  let allTasks = [];
  state.usuarios.forEach(u => {
    (u.tareas || []).forEach(t => {
      allTasks.push({...t, usuario: u});
    });
  });

  const { tableroUser, tableroPrio } = state.filtros || {};

  if (tableroUser) {
    allTasks = allTasks.filter(t => t.usuario_id === tableroUser);
  }
  if (tableroPrio) {
    allTasks = allTasks.filter(t => t.prioridad === tableroPrio);
  }

  const usersList = document.getElementById('filter-users-list');
  if (usersList) {
    const renderUsers = state.usuarios.slice(0, 5);
    usersList.innerHTML = renderUsers.map(u => {
      const ini = getInitials(u.nombre, u.apellido);
      const isSelected = tableroUser === u.id;
      return `<button class="relative rounded-full ring-2 ${isSelected ? 'ring-primary z-30 scale-110' : 'ring-surface-container-lowest z-20 hover:scale-110'} transition-transform" title="${escapeHtml(u.nombre)}" onclick="window.setFilterUser(${u.id})" type="button">
          <div class="w-7 h-7 rounded-full flex items-center justify-center text-white font-label-sm font-bold text-[10px]" style="background-color: ${avatarColor(u.id)}">${ini}</div>
        </button>`;
    }).join('');
  }

  const prioContainer = document.getElementById('filter-priority-list');
  if (prioContainer) {
    prioContainer.querySelectorAll('button[data-prio]').forEach(btn => {
      const p = btn.getAttribute('data-prio');
      if ((!tableroPrio && !p) || (tableroPrio === p)) {
        btn.classList.add('bg-primary', 'text-on-primary');
        btn.classList.remove('bg-surface-container-low', 'text-on-surface');
      } else {
        btn.classList.add('bg-surface-container-low', 'text-on-surface');
        btn.classList.remove('bg-primary', 'text-on-primary');
      }
    });
  }

  const columns = [
    { id: 'pendiente', title: 'Por Iniciar', color: 'bg-secondary', badgeClass: 'bg-surface-container-high text-on-surface' },
    { id: 'en_progreso', title: 'En Progreso', color: 'bg-primary-container', badgeClass: 'bg-primary-fixed text-on-primary-fixed' },
    { id: 'completada', title: 'Completadas', color: 'bg-tertiary', badgeClass: 'bg-tertiary-fixed text-on-tertiary-fixed' }
  ];

  kanban.innerHTML = columns.map(col => {
    const tasks = allTasks.filter(t => t.estatus === col.id);
    const isCompleted = col.id === 'completada';
    
    return `
    <div class="flex flex-col bg-surface-container-low rounded-xl p-space-md gap-space-md shadow-sm">
      <div class="flex items-center justify-between px-space-xs py-space-xs">
        <div class="flex items-center gap-space-sm">
          <span class="w-2.5 h-2.5 rounded-full ${col.color}"></span>
          <h2 class="font-headline-sm text-headline-sm text-on-surface font-bold">${col.title}</h2>
          <span class="${col.badgeClass} font-label-sm text-label-sm font-bold px-2 py-0.5 rounded-full">${tasks.length}</span>
        </div>
        <div class="flex items-center gap-space-xs">
          <button aria-label="Opciones de columna" class="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container transition-colors" type="button">
            <span class="material-symbols-outlined text-lg">more_horiz</span>
          </button>
        </div>
      </div>
      <div class="flex flex-col gap-space-md min-h-[200px]">
        ${tasks.map(t => {
          const u = t.usuario;
          const initials = `${(u.nombre || '')[0] || ''}${(u.apellido || '')[0] || ''}`.toUpperCase();
          
          return `
          <article class="${isCompleted ? 'bg-surface-container-lowest/80 opacity-90' : 'bg-surface-container-lowest'} rounded-xl p-space-md shadow-sm hover:shadow-md transition-all flex flex-col gap-space-sm group cursor-pointer" onclick="abrirDetalleUsuario(${u.id})">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="flex items-center gap-2"><span class="bg-surface-container-highest text-on-surface font-label-sm text-label-sm px-space-xs py-0.5 rounded font-semibold uppercase">TK-${t.id}</span>
<span class="${{urgente:'bg-error text-on-error', alta:'bg-error-container text-on-error-container', media:'bg-secondary-container text-on-secondary-container', baja:'bg-surface-container-high text-on-surface-variant'}[t.prioridad||'media']} font-label-sm text-label-sm px-space-xs py-0.5 rounded font-semibold uppercase">${t.prioridad||'media'}</span></div>
                <span class="${{urgente:'bg-error text-on-error', alta:'bg-error-container text-on-error-container', media:'bg-secondary-container text-on-secondary-container', baja:'bg-surface-container-high text-on-surface-variant'}[t.prioridad||'media']} font-label-sm text-label-sm px-space-xs py-0.5 rounded font-semibold uppercase">${t.prioridad||'media'}</span>
              </div>
              <div class="flex items-center gap-space-xs">
                <button aria-label="Menú de tarea" class="text-on-surface-variant opacity-0 group-hover:opacity-100 hover:text-on-surface transition-opacity btn-editar-tarea" data-id="${t.id}" onclick="event.stopPropagation()" type="button">
                  <span class="material-symbols-outlined text-base">edit</span>
                </button>
              </div>
            </div>
            <h3 class="font-headline-sm text-headline-sm text-on-surface ${isCompleted ? 'line-through text-on-surface-variant/80' : ''} group-hover:text-primary transition-colors leading-snug">
              ${escapeHtml(t.titulo)}
            </h3>
            <p class="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
              ${escapeHtml(t.descripcion)}
            </p>
            <div class="flex items-center justify-between pt-space-xs mt-auto">
              <div class="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant px-2 py-0.5 rounded bg-surface-container">
                <span class="material-symbols-outlined text-sm">event</span>
                <span>${escapeHtml(t.fecha || 'Sin fecha')}</span>
              </div>
              <div class="flex items-center gap-space-xs">
                <span class="font-label-sm text-label-sm text-on-surface-variant hidden sm:inline">${escapeHtml(u.nombre)} ${escapeHtml(u.apellido)[0]}.</span>
                <div class="w-6 h-6 rounded-full flex items-center justify-center text-white font-label-sm text-[10px] font-bold shadow-sm" style="background-color: ${['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#0d9488', '#2563eb', '#ca8a04'][u.id % 10]}">${initials}</div>
              </div>
            </div>
          </article>`;
        }).join('')}
      </div>
      <button class="w-full py-space-sm px-space-md rounded-xl text-on-surface-variant hover:text-primary hover:bg-surface-container font-label-md text-label-md flex items-center justify-center gap-space-xs transition-colors" type="button">
        <span class="material-symbols-outlined text-lg">add</span>
        <span>Añadir tarea aquí</span>
      </button>
    </div>`;
  }).join('');
}

/**
 * Renderiza la vista de configuración del administrador.
 * @param {Object} state - El estado actual de la aplicación.
 * @returns {void}
 */
export function renderConfig(state) {
  if (state.vista !== 'config') return;

  // Admin profile stored in localStorage, independent of the user directory
  const defaults = { nombre: 'Admin', cargo: 'Administrador', email: 'admin@taskflow.local', telefono: '', id: 1 };
  let profile;
  try { profile = JSON.parse(localStorage.getItem('taskflow_admin_profile')) || defaults; }
  catch { profile = defaults; }

  const setVal = (id, val) => { const e = document.getElementById(id); if (e) e.value = val || ''; };
  const setText = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val || ''; };

  setText('cfg-user-code', 'USR-' + String(profile.id || 1).padStart(5, '0'));
  setVal('cfg-nombre', profile.nombre || '');
  setVal('cfg-email', profile.email || '');
  setVal('cfg-cargo', profile.cargo || '');
  setVal('cfg-telefono', profile.telefono || '');

  // Avatar initials from name
  const avatar = document.getElementById('cfg-avatar');
  if (avatar) {
    const parts = (profile.nombre || 'A').split(' ');
    const ini = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
    avatar.textContent = ini.toUpperCase() || 'A';
  }

  // Update header user name & avatar to match admin profile
  const headerName = document.getElementById('header-user-name');
  if (headerName) headerName.textContent = profile.nombre || 'Admin';
  const headerRole = document.getElementById('header-user-role');
  if (headerRole) headerRole.textContent = profile.cargo || '';
  const headerAvatar = document.getElementById('header-user-avatar');
  if (headerAvatar) {
    const parts = (profile.nombre || 'A').split(' ');
    headerAvatar.textContent = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'A';
  }

  // Session info
  const sessionEl = document.getElementById('cfg-session-info');
  if (sessionEl) {
    const ua = navigator.userAgent;
    let browser = 'Navegador Web';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    sessionEl.textContent = navigator.platform + ' · ' + browser + ' · Sesión local';
  }
}

/**
 * Renderiza todas las vistas necesarias basadas en el estado actual.
 * @param {Object} state - El estado actual de la aplicación.
 * @returns {void}
 */
export function renderAll(state) {
  renderDashboard(state);
  renderTablero(state);
  renderVistaActiva(state);
  renderListado(state);
  if (state.vista === 'detalle') renderDetalle(state);
  if (state.vista === 'config') renderConfig(state);
}

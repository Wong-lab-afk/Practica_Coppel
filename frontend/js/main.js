// js/main.js
// Punto de entrada. Conecta las piezas:
//   evento de UI -> llamada a la API -> mutación de estado -> re-render
import { api } from './api.js?v=1790615040';
import * as state from './state.js?v=1790661968';
import { renderAll } from './render.js?v=1790661968';
import * as modal from './modals.js?v=1790615040';

function toast(mensaje, esError = false) {
  const el = document.getElementById('toast');
  const textEl = document.getElementById('toast-text');
  const iconEl = document.getElementById('toast-icon');
  textEl.textContent = mensaje;
  iconEl.textContent = esError ? 'error' : 'check_circle';
  el.classList.toggle('error', esError);
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 3000);
}

// Único punto que sabe volver a pintar la pantalla.
state.subscribe(renderAll);

// ---------- Carga inicial ----------
// We need to load each user with their tasks for the dashboard stats
async function cargarListado() {
  try {
    const usuarios = await api.listarUsuarios();
    // Load tasks for each user in parallel
    const usuariosConTareas = await Promise.all(
      usuarios.map(async (u) => {
        try {
          const detalle = await api.obtenerUsuario(u.id);
          return { ...u, tareas: detalle.tareas || [] };
        } catch {
          return { ...u, tareas: [] };
        }
      })
    );
    state.setUsuarios(usuariosConTareas);
  } catch (err) {
    toast(err.message, true);
  }
}

// ---------- Usuarios ----------
window.abrirDetalleUsuario = abrirDetalleUsuario;
window.setFilterUser = (id) => {
  const current = state.getState().filtros.tableroUser;
  state.setFiltro('tableroUser', current === id ? null : id);
};
window.setFilterPrio = (prio) => {
  state.setFiltro('tableroPrio', prio || null);
};
window.abrirDetallesUsuario = abrirDetalleUsuario;

async function abrirDetalleUsuario(id) {
  try {
    state.abrirDetalle(await api.obtenerUsuario(id));
  } catch (err) {
    toast(err.message, true);
  }
}

async function onSubmitUsuario(e) {
  e.preventDefault();
  const payload = {
    nombre: document.getElementById('f-nombre').value.trim(),
    apellido: document.getElementById('f-apellido').value.trim(),
    email: document.getElementById('f-email').value.trim(),
    telefono: document.getElementById('f-telefono').value.trim(),
    puesto_id: document.getElementById('f-puesto').value ? Number(document.getElementById('f-puesto').value) : null,
  };
  const enEdicion = modal.getUsuarioEnEdicion();
  try {
    if (enEdicion) {
      state.reemplazarUsuario(await api.actualizarUsuario(enEdicion.id, payload));
      toast('Usuario actualizado');
    } else {
      state.agregarUsuario(await api.crearUsuario(payload));
      toast('Usuario creado');
    }
    modal.cerrarModalUsuario();
  } catch (err) {
    modal.mostrarErrorUsuario(err.message);
  }
}

async function pedirEditarUsuario(usuario) {
  try {
    const puestos = await api.obtenerPuestos();
    modal.abrirModalUsuario(usuario, puestos);
  } catch (err) {
    toast('Error al cargar puestos', true);
  }
}

function pedirEliminarUsuario(usuario) {
  modal.confirmar(
    `¿Eliminar a ${usuario.nombre} ${usuario.apellido}? Esto también eliminará todas sus tareas.`,
    async () => {
      try {
        await api.eliminarUsuario(usuario.id);
        state.quitarUsuario(usuario.id);
        toast('Usuario eliminado');
      } catch (err) {
        toast(err.message, true);
      }
    }
  );
}

// ---------- Tareas ----------
async function onSubmitTarea(e) {
  e.preventDefault();
  const payload = {
    titulo: document.getElementById('t-titulo').value.trim(),
    descripcion: document.getElementById('t-descripcion').value.trim(),
    fecha: document.getElementById('t-fecha').value,
    estatus: document.getElementById('t-estatus').value,
    prioridad: document.getElementById('t-prioridad') ? document.getElementById('t-prioridad').value : 'media',
    usuario_id: Number(document.getElementById('t-usuario').value),
  };
  const enEdicion = modal.getTareaEnEdicion();
  try {
    if (enEdicion) {
      state.actualizarTareaEnEstado(await api.actualizarTarea(enEdicion.id, payload));
      toast('Tarea actualizada');
    } else {
      state.agregarTarea(await api.crearTarea(payload.usuario_id, payload));
      toast('Tarea creada');
    }
    modal.cerrarModalTarea();
  } catch (err) {
    modal.mostrarErrorTarea(err.message);
  }
}

function pedirEliminarTarea(tarea) {
  modal.confirmar(`¿Eliminar la tarea "${tarea.titulo}"?`, async () => {
    try {
      await api.eliminarTarea(tarea.id);
      state.quitarTarea(tarea.id);
      toast('Tarea eliminada');
    } catch (err) {
      toast(err.message, true);
    }
  });
}

// ---------- Wiring de eventos ----------

// Crear usuario
document.getElementById('btn-nuevo-usuario')?.addEventListener('click', async () => {
  try {
    const puestos = await api.obtenerPuestos();
    modal.abrirModalUsuario(null, puestos);
  } catch (err) {
    toast('Error al cargar puestos', true);
  }
});
document.getElementById('btn-cancelar-usuario')?.addEventListener('click', modal.cerrarModalUsuario);
document.getElementById('form-usuario')?.addEventListener('submit', onSubmitUsuario);


// Navegación Sidebar

document.getElementById('nav-tablero')?.addEventListener('click', (e) => {
  e.preventDefault();
  state.cambiarVista('tablero');
});

document.getElementById('nav-detalle')?.addEventListener('click', (e) => {
  e.preventDefault();
  const { usuarios, usuarioDetalle } = state.getState();
  if (usuarioDetalle) {
    state.cambiarVista('detalle');
  } else if (usuarios.length > 0) {
    abrirDetalleUsuario(usuarios[0].id);
  } else {
    toast('No hay usuarios para mostrar', true);
  }
});

document.getElementById('nav-dashboard')?.addEventListener('click', (e) => {
  e.preventDefault();
  state.cambiarVista('dashboard');
});
document.getElementById('nav-lista')?.addEventListener('click', (e) => {
  e.preventDefault();
  state.cambiarVista('lista');
});

document.getElementById('nav-config')?.addEventListener('click', (e) => {
  e.preventDefault();
  state.cambiarVista('config');
});

// Config: Guardar cambios (admin profile in localStorage)
document.getElementById('btn-guardar-config')?.addEventListener('click', () => {
  try {
    const nombre = (document.getElementById('cfg-nombre')?.value || '').trim();
    const email = (document.getElementById('cfg-email')?.value || '').trim();
    const cargo = (document.getElementById('cfg-cargo')?.value || '').trim();
    const telefono = (document.getElementById('cfg-telefono')?.value || '').trim();
    if (!nombre) { toast('El nombre es requerido', true); return; }
    const profile = { nombre, email, cargo, telefono, id: 1 };
    localStorage.setItem('taskflow_admin_profile', JSON.stringify(profile));
    // Update the header immediately
    const headerName = document.getElementById('header-user-name');
    if (headerName) headerName.textContent = nombre;
    const headerRole = document.getElementById('header-user-role');
    if (headerRole) headerRole.textContent = cargo;
    const headerAvatar = document.getElementById('header-user-avatar');
    if (headerAvatar) {
      const parts = nombre.split(' ');
      headerAvatar.textContent = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'A';
    }
    toast('Configuración guardada exitosamente');
  } catch (err) {
    toast('Error al guardar: ' + err.message, true);
  }
});

// Config: Cerrar sesión
document.getElementById('btn-cerrar-sesion')?.addEventListener('click', () => {
  localStorage.removeItem('taskflow_is_logged_in');
  state.cambiarVista('login');
  toast('Sesión cerrada');
});

// Config: Actualizar contraseña (simulado)
document.getElementById('btn-actualizar-pass')?.addEventListener('click', () => {
  const nueva = document.getElementById('cfg-pass-nueva')?.value || '';
  const confirmar = document.getElementById('cfg-pass-confirmar')?.value || '';
  if (!nueva || nueva.length < 8) {
    toast('La contraseña debe tener al menos 8 caracteres', true);
    return;
  }
  if (nueva !== confirmar) {
    toast('Las contraseñas no coinciden', true);
    return;
  }
  document.getElementById('cfg-pass-nueva').value = '';
  document.getElementById('cfg-pass-confirmar').value = '';
  toast('Contraseña actualizada correctamente');
});

// Volver
document.getElementById('btn-volver')?.addEventListener('click', () => state.cambiarVista('lista'));

// Dashboard clicks (Delegation)
document.getElementById('dash-workload-list')?.addEventListener('click', (e) => {
  const row = e.target.closest('[data-id]');
  if (row) abrirDetalleUsuario(Number(row.dataset.id));
});

document.getElementById('dash-critical-tasks')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-accion="ver-usuario"]');
  if (btn) {
    const row = btn.closest('[data-user-id]');
    if (row) abrirDetalleUsuario(Number(row.dataset.userId));
  }
});


// Editar/eliminar usuario desde detalle
document.body.addEventListener('click', (e) => {
  if (e.target.closest('#kanban-btn-nueva-tarea')) {
    const { usuarios, usuarioDetalle } = state.getState();
    modal.abrirModalTarea(usuarios, usuarioDetalle?.id);
  }
  if (e.target.closest('#btn-editar-usuario')) {
    pedirEditarUsuario(state.getState().usuarioDetalle);
  }
});

document.getElementById('btn-eliminar-usuario')?.addEventListener('click', () => {
  const usuario = state.getState().usuarioDetalle;
  if (usuario) pedirEliminarUsuario(usuario);
});

// Crear tarea
document.body.addEventListener('click', (e) => {
  if (e.target.closest('#btn-nueva-tarea')) {
    const { usuarios, usuarioDetalle } = state.getState();
    modal.abrirModalTarea(usuarios, usuarioDetalle?.id);
  }
});

// Header "Nueva Tarea" button (opens task modal for first user or current user)
document.getElementById('header-btn-nueva-tarea')?.addEventListener('click', () => {
  const { usuarios, usuarioDetalle } = state.getState();
  if (usuarios.length === 0) {
    toast('Primero crea un usuario', true);
    return;
  }
  modal.abrirModalTarea(usuarios, usuarioDetalle?.id || usuarios[0]?.id);
});

document.getElementById('btn-cancelar-tarea')?.addEventListener('click', modal.cerrarModalTarea);
document.getElementById('form-tarea')?.addEventListener('submit', onSubmitTarea);

document.getElementById('btn-cancelar-confirm')?.addEventListener('click', modal.cerrarConfirm);
document.getElementById('btn-aceptar-confirm')?.addEventListener('click', () => modal.ejecutarConfirmar());

// Clic en tabla de usuarios -> ver / editar / eliminar (delegación de eventos global)
document.body.addEventListener('click', (e) => {
  const btnEditarUsuario = e.target.closest('.btn-editar-usuario');
  const btnEliminarUsuario = e.target.closest('.btn-eliminar-usuario');
  
  if (btnEditarUsuario) {
    e.stopPropagation();
    let id = btnEditarUsuario.dataset.id;
    if (!id) {
       const row = btnEditarUsuario.closest('tr[data-id]');
       if (row) id = row.dataset.id;
    }
    if (id) {
       const usuario = state.getState().usuarios.find(u => u.id === Number(id));
       if (usuario) pedirEditarUsuario(usuario);
    }
    return;
  }
  
  if (btnEliminarUsuario) {
    e.stopPropagation();
    let id = btnEliminarUsuario.dataset.id;
    if (!id) {
       const row = btnEliminarUsuario.closest('tr[data-id]');
       if (row) id = row.dataset.id;
    }
    if (id) {
       const usuario = state.getState().usuarios.find(u => u.id === Number(id));
       if (usuario) pedirEliminarUsuario(usuario);
    }
    return;
  }
});

// Para hacer clic en la fila de la tabla y abrir el detalle (manteniendo el comportamiento viejo)
document.getElementById('tabla-usuarios-body')?.addEventListener('click', (e) => {
  if (e.target.closest('.btn-editar-usuario') || e.target.closest('.btn-eliminar-usuario')) return;
  const row = e.target.closest('tr[data-id]');
  if (!row) return;
  if (e.target.closest('[data-check-user]')) return;
  abrirDetalleUsuario(Number(row.dataset.id));
});


// Clic en tarjetas de usuario
document.getElementById('users-cards-view')?.addEventListener('click', (e) => {
  const card = e.target.closest('[data-id]');
  if (card) abrirDetalleUsuario(Number(card.dataset.id));
});

// Clic en acciones de tareas (Delegación Global)
document.body.addEventListener('click', (e) => {
  const btnEditarTarea = e.target.closest('.btn-editar-tarea') || e.target.closest('[data-accion="editar"]');
  const btnEliminarTarea = e.target.closest('[data-accion="eliminar"]');
  
  if (btnEditarTarea) {
    const cardOrRow = btnEditarTarea.closest('[data-code]') || btnEditarTarea.closest('[data-id]');
    if (!cardOrRow) return;
    
    // extraemos id del botón si lo tiene, sino de la fila
    let id = btnEditarTarea.dataset.id;
    if (!id) id = cardOrRow.dataset.id;
    if (!id) {
       const code = cardOrRow.dataset.code;
       if (code) id = code.replace('TK-', '');
    }
    
    if (id) {
      const idNum = Number(id);
      // Podemos buscar la tarea en todo el state
      const stateObj = state.getState();
      let tareaFound = null;
      let userFound = null;
      
      // Buscar en usuarioDetalle primero
      if (stateObj.usuarioDetalle && stateObj.usuarioDetalle.tareas) {
         tareaFound = stateObj.usuarioDetalle.tareas.find(t => t.id === idNum);
         userFound = stateObj.usuarioDetalle.id;
      }
      
      // Si no, buscar en todos los usuarios (para Kanban o Listado)
      if (!tareaFound) {
         for (const u of stateObj.usuarios) {
            if (u.tareas) {
               const t = u.tareas.find(tt => tt.id === idNum);
               if (t) { tareaFound = t; userFound = u.id; break; }
            }
         }
      }
      
      if (tareaFound) {
         modal.abrirModalTarea(stateObj.usuarios, userFound, tareaFound);
      }
    }
    return;
  }
  
  if (btnEliminarTarea) {
    const cardOrRow = btnEliminarTarea.closest('[data-id]');
    if (!cardOrRow) return;
    const id = Number(cardOrRow.dataset.id);
    
    modal.abrirConfirm(
      '¿Eliminar Tarea?',
      `¿Estás seguro de que deseas eliminar esta tarea permanentemente?`,
      async () => {
        try {
          const td = state.getState().usuarioDetalle;
          await api.eliminarTarea(id);
          const usuarioAct = await api.obtenerUsuario(td.id);
          state.abrirDetalle(usuarioAct);
          modal.cerrarConfirm();
          toast('Tarea eliminada con éxito');
        } catch (err) {
          toast('Error al eliminar tarea', 'error');
        }
      }
    );
  }
});

// Toggle vista tabla / tarjetas
const tableBtn = document.getElementById('view-table-btn');
const cardsBtn = document.getElementById('view-cards-btn');
const tableView = document.getElementById('users-table-view');
const cardsView = document.getElementById('users-cards-view');

tableBtn.addEventListener('click', () => {
  tableView.classList.remove('hidden');
  cardsView.classList.add('hidden');
  tableBtn.className = 'flex items-center gap-1.5 px-space-md py-1.5 rounded-lg bg-surface-container-lowest text-primary font-label-md text-label-md shadow-sm transition-all';
  cardsBtn.className = 'flex items-center gap-1.5 px-space-md py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface font-label-md text-label-md transition-all';
});

cardsBtn.addEventListener('click', () => {
  cardsView.classList.remove('hidden');
  tableView.classList.add('hidden');
  cardsBtn.className = 'flex items-center gap-1.5 px-space-md py-1.5 rounded-lg bg-surface-container-lowest text-primary font-label-md text-label-md shadow-sm transition-all';
  tableBtn.className = 'flex items-center gap-1.5 px-space-md py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface font-label-md text-label-md transition-all';
});

// Search filter
document.getElementById('filter-search')?.addEventListener('input', (e) => {
  state.setFiltro('busqueda', e.target.value);
});

// Status filter
document.getElementById('filter-estatus')?.addEventListener('change', (e) => {
  state.setFiltro('estatus', e.target.value);
});

// Export button (simple CSV download)
document.getElementById('btn-export')?.addEventListener('click', () => {
  const { usuarios } = state.getState();
  const rows = [['Nombre', 'Apellido', 'Email', 'Teléfono', 'Total Tareas', 'Completadas']];
  for (const u of usuarios) {
    const tareas = u.tareas || [];
    const comp = tareas.filter((t) => t.estatus === 'completada').length;
    rows.push([u.nombre, u.apellido, u.email, u.telefono || '', tareas.length, comp]);
  }
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'usuarios_taskflow.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast('Datos exportados como CSV');
});

// Cerrar modales haciendo clic fuera del contenido.
document.querySelectorAll('#modal-usuario, #modal-tarea, #modal-confirm').forEach((m) => {
  m.addEventListener('click', (e) => { if (e.target === m) m.hidden = true; });
});

// ---------- Arranque ----------
cargarListado();


window.quickTransfer = (targetUserId) => window.reasignarTareaMasiva(targetUserId);
window.reasignarTareaMasiva = async (targetUserId) => {
  const { usuarioDetalle } = state.getState();
  if (!usuarioDetalle) return;
  
  // Find selected tasks from checkboxes
  const checkboxes = document.querySelectorAll('.task-select-box');
  const tasksToMove = [];
  checkboxes.forEach(cb => {
    if (cb.checked) {
      const card = cb.closest('[data-code]');
      if (card) {
        const id = card.dataset.code.replace('TK-', '');
        tasksToMove.push(Number(id));
      }
    }
  });
  
  if (tasksToMove.length === 0) {
    toast('Selecciona al menos una tarea', true);
    return;
  }
  
  const tieneCompletadas = tasksToMove.some(id => {
    const t = usuarioDetalle.tareas.find(tarea => tarea.id === id);
    return t && t.estatus === 'completada';
  });
  
  if (tieneCompletadas) {
    toast('No puedes transferir tareas que ya están completadas', true);
    return;
  }
  
  try {
    for (const taskId of tasksToMove) {
      const tarea = usuarioDetalle.tareas.find(t => t.id === taskId);
      if (tarea) {
         await api.actualizarTarea(taskId, { ...tarea, usuario_id: Number(targetUserId) });
         // Updating state
         state.actualizarTareaEnEstado({ ...tarea, usuario_id: Number(targetUserId) });
      }
    }
    toast(`${tasksToMove.length} tareas reasignadas con éxito`);
    // refresh current view user
    const usuarioAct = await api.obtenerUsuario(usuarioDetalle.id);
    state.abrirDetalle(usuarioAct);
  } catch (err) {
    toast('Error al reasignar tareas', true);
  }
};

window.reasignarTareaIndividual = async (taskId, targetUserId) => {
  const { usuarioDetalle } = state.getState();
  if (!usuarioDetalle) return;
  
  const tarea = usuarioDetalle.tareas.find(t => t.id === Number(taskId));
  if (!tarea) return;
  if (tarea.estatus === 'completada') {
    toast('No puedes transferir tareas completadas', true);
    return;
  }
  
  try {
    await api.actualizarTarea(tarea.id, { ...tarea, usuario_id: Number(targetUserId) });
    state.actualizarTareaEnEstado({ ...tarea, usuario_id: Number(targetUserId) });
    toast(`Tarea TK-${tarea.id} reasignada con éxito`);
    // refresh
    const usuarioAct = await api.obtenerUsuario(usuarioDetalle.id);
    state.abrirDetalle(usuarioAct);
  } catch (err) {
    toast('Error al reasignar tarea', true);
  }
};

// Header search
document.getElementById('header-search')?.addEventListener('input', (e) => {
  const val = e.target.value;
  state.setFiltro('busqueda', val);
  if (val && state.getState().vista !== 'lista') {
    state.cambiarVista('lista');
  }
});

// Login handling
document.getElementById('form-login')?.addEventListener('submit', (e) => {
  e.preventDefault();
  localStorage.setItem('taskflow_is_logged_in', 'true');
  state.cambiarVista('dashboard');
  toast('Bienvenido a TaskFlow');
});

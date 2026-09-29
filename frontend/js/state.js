// js/state.js
// Estado centralizado de la aplicación. Es la ÚNICA fuente de verdad:
// las vistas nunca guardan su propia copia de los datos, siempre leen de
// aquí. Cada mutación notifica a los suscriptores (patrón observer), que
// vuelven a renderizar solo lo necesario.

const state = {
  usuarios: [],           // listado completo (cada uno puede tener .tareas)
  usuariosFiltrados: null, // null = sin filtro; array = resultado del filtro
  vista: localStorage.getItem('taskflow_is_logged_in') === 'true' ? 'dashboard' : 'login', // starts at login if not authenticated
  usuarioDetalle: null,    // { ...usuario, tareas: [...] } cuando vista === 'detalle'
  filtros: {
    busqueda: '',
    estatus: '',
  },
};

const listeners = new Set();

/**
 * Suscribe una función a los cambios de estado.
 * @param {Function} fn - La función a ejecutar cuando el estado cambie.
 * @returns {Function} Función para cancelar la suscripción.
 */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Notifica a todos los suscriptores y aplica los filtros.
 * @returns {void}
 */
function notificar() {
  aplicarFiltros();
  for (const fn of listeners) fn(state);
}

/**
 * Obtiene el estado global de la aplicación.
 * @returns {Object} El estado actual.
 */
export function getState() {
  return state;
}

// ---- Filtrado ----

/**
 * Aplica los filtros de búsqueda y estatus a la lista de usuarios.
 * @returns {void}
 */
function aplicarFiltros() {
  const { busqueda, estatus } = state.filtros;
  if (!busqueda && !estatus) {
    state.usuariosFiltrados = null;
    return;
  }

  const q = busqueda.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  state.usuariosFiltrados = state.usuarios.filter((u) => {
    // Filtro de texto
    if (q) {
      const fullName = `${u.nombre} ${u.apellido}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const emailStr = (u.email || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const phoneStr = (u.telefono || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const match = fullName.includes(q) || emailStr.includes(q) || phoneStr.includes(q);
      if (!match) return false;
    }
    // Filtro de estatus de tareas
    if (estatus) {
      const tareas = u.tareas || [];
      if (!tareas.some((t) => t.estatus === estatus)) return false;
    }
    return true;
  });
}

/**
 * Establece un filtro y notifica los cambios.
 * @param {string} campo - El campo a filtrar.
 * @param {string} valor - El valor del filtro.
 * @returns {void}
 */
export function setFiltro(campo, valor) {
  state.filtros[campo] = valor;
  notificar();
}

// ---- Mutadores ----

/**
 * Reemplaza la lista completa de usuarios y notifica.
 * @param {Array} usuarios - La nueva lista de usuarios.
 * @returns {void}
 */
export function setUsuarios(usuarios) {
  state.usuarios = usuarios;
  notificar();
}

/**
 * Agrega un nuevo usuario a la lista y notifica.
 * @param {Object} usuario - El usuario a agregar.
 * @returns {void}
 */
export function agregarUsuario(usuario) {
  // Nuevo usuario no tiene tareas aún
  usuario.tareas = usuario.tareas || [];
  state.usuarios = [usuario, ...state.usuarios];
  notificar();
}

/**
 * Reemplaza un usuario existente en la lista y notifica.
 * @param {Object} usuario - El usuario actualizado.
 * @returns {void}
 */
export function reemplazarUsuario(usuario) {
  state.usuarios = state.usuarios.map((u) => {
    if (u.id === usuario.id) {
      return { ...u, ...usuario, tareas: u.tareas || [] };
    }
    return u;
  });
  if (state.usuarioDetalle?.id === usuario.id) {
    state.usuarioDetalle = { ...state.usuarioDetalle, ...usuario };
  }
  notificar();
}

/**
 * Elimina un usuario por su ID y notifica.
 * @param {number} id - El ID del usuario.
 * @returns {void}
 */
export function quitarUsuario(id) {
  state.usuarios = state.usuarios.filter((u) => u.id !== id);
  if (state.usuarioDetalle?.id === id) state.usuarioDetalle = null;
  notificar();
}

/**
 * Abre la vista de detalle para un usuario y notifica.
 * @param {Object} usuarioConTareas - El usuario con sus tareas.
 * @returns {void}
 */
export function abrirDetalle(usuarioConTareas) {
  state.vista = 'detalle';
  state.usuarioDetalle = usuarioConTareas;
  // Also update the user's tasks in the main list so stats are accurate
  state.usuarios = state.usuarios.map((u) =>
    u.id === usuarioConTareas.id ? { ...u, tareas: usuarioConTareas.tareas } : u
  );
  notificar();
}

/**
 * Cambia la vista actual de la aplicación y notifica.
 * @param {string} nuevaVista - El nombre de la nueva vista.
 * @returns {void}
 */
export function cambiarVista(nuevaVista) {
  state.vista = nuevaVista;
  if (nuevaVista !== 'detalle') {
    state.usuarioDetalle = null;
  }
  notificar();
}

/**
 * Regresa a la vista de lista y notifica.
 * @returns {void}
 */
export function volverALista() {
  cambiarVista('lista');
}

/**
 * Agrega una nueva tarea a un usuario y notifica.
 * @param {Object} tarea - La tarea a agregar.
 * @returns {void}
 */
export function agregarTarea(tarea) {
  // Add to detail view
  if (state.usuarioDetalle?.id === tarea.usuario_id) {
    state.usuarioDetalle = {
      ...state.usuarioDetalle,
      tareas: [tarea, ...state.usuarioDetalle.tareas],
    };
  }
  // Also add to the list-level user
  state.usuarios = state.usuarios.map((u) => {
    if (u.id === tarea.usuario_id) {
      return { ...u, tareas: [tarea, ...(u.tareas || [])] };
    }
    return u;
  });
  notificar();
}

/**
 * Actualiza una tarea existente y notifica.
 * @param {Object} tarea - La tarea actualizada.
 * @returns {void}
 */
export function actualizarTareaEnEstado(tarea) {
  if (state.usuarioDetalle) {
    const pertenece = tarea.usuario_id === state.usuarioDetalle.id;
    const yaEstaba = state.usuarioDetalle.tareas.some((t) => t.id === tarea.id);

    let tareas;
    if (pertenece) {
      tareas = yaEstaba
        ? state.usuarioDetalle.tareas.map((t) => (t.id === tarea.id ? tarea : t))
        : [tarea, ...state.usuarioDetalle.tareas];
    } else {
      tareas = state.usuarioDetalle.tareas.filter((t) => t.id !== tarea.id);
    }
    state.usuarioDetalle = { ...state.usuarioDetalle, tareas };
  }

  // Also update in the main list
  state.usuarios = state.usuarios.map((u) => {
    const userTareas = u.tareas || [];
    const had = userTareas.some((t) => t.id === tarea.id);
    if (u.id === tarea.usuario_id) {
      // Tarea pertenece a este usuario
      return {
        ...u,
        tareas: had
          ? userTareas.map((t) => (t.id === tarea.id ? tarea : t))
          : [tarea, ...userTareas],
      };
    } else if (had) {
      // Tarea ya no pertenece a este usuario (reasignada)
      return { ...u, tareas: userTareas.filter((t) => t.id !== tarea.id) };
    }
    return u;
  });

  notificar();
}

/**
 * Elimina una tarea por su ID y notifica.
 * @param {number} id - El ID de la tarea.
 * @returns {void}
 */
export function quitarTarea(id) {
  if (state.usuarioDetalle) {
    state.usuarioDetalle = {
      ...state.usuarioDetalle,
      tareas: state.usuarioDetalle.tareas.filter((t) => t.id !== id),
    };
  }
  // Also remove from list
  state.usuarios = state.usuarios.map((u) => ({
    ...u,
    tareas: (u.tareas || []).filter((t) => t.id !== id),
  }));
  notificar();
}

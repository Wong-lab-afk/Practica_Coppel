// js/modals.js
// Los modales tienen su propio estado local pequeño (qué se está editando,
// en qué formulario hay un error) — no pertenece al estado global de la
// app porque nadie más lo necesita. Exponen funciones abrir/cerrar y
// delegan el guardado a los callbacks que les pasa main.js.

let usuarioEnEdicion = null;
let tareaEnEdicion = null;
let accionConfirmar = null;

export function abrirModalUsuario(usuario = null, puestos = []) {
  usuarioEnEdicion = usuario;
  document.getElementById('modal-usuario-titulo').textContent = usuario ? 'Editar usuario' : 'Nuevo usuario';
  document.getElementById('f-nombre').value = usuario?.nombre || '';
  document.getElementById('f-apellido').value = usuario?.apellido || '';
  document.getElementById('f-email').value = usuario?.email || '';
  document.getElementById('f-telefono').value = usuario?.telefono || '';
  
  const select = document.getElementById('f-puesto');
  if (select) {
    select.innerHTML = '<option value="">Selecciona un puesto...</option>' + 
      puestos.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
    select.value = usuario?.puesto_id || '';
  }

  document.getElementById('usuario-form-error').hidden = true;
  document.getElementById('modal-usuario').hidden = false;
}

export function cerrarModalUsuario() {
  document.getElementById('modal-usuario').hidden = true;
  usuarioEnEdicion = null;
}

export function getUsuarioEnEdicion() {
  return usuarioEnEdicion;
}

export function mostrarErrorUsuario(mensaje) {
  const el = document.getElementById('usuario-form-error');
  el.textContent = mensaje;
  el.hidden = false;
}

export function abrirModalTarea(usuarios, usuarioActualId, tarea = null) {
  tareaEnEdicion = tarea;
  document.getElementById('modal-tarea-titulo').textContent = tarea ? 'Editar tarea' : 'Nueva tarea';
  document.getElementById('t-titulo').value = tarea?.titulo || '';
  document.getElementById('t-descripcion').value = tarea?.descripcion || '';
  document.getElementById('t-fecha').value = tarea?.fecha || '';
  document.getElementById('t-estatus').value = tarea?.estatus || 'pendiente';
  const estatusContainer = document.getElementById('t-estatus-container');
  if (estatusContainer) {
    estatusContainer.hidden = !tarea;
  }
  const elPrio = document.getElementById('t-prioridad');
  if (elPrio) elPrio.value = tarea?.prioridad || 'media';
  document.getElementById('tarea-form-error').hidden = true;

  const select = document.getElementById('t-usuario');
  select.innerHTML = usuarios
    .map((u) => `<option value="${u.id}">${u.nombre} ${u.apellido}</option>`)
    .join('');
  select.value = tarea?.usuario_id ?? usuarioActualId;

  document.getElementById('modal-tarea').hidden = false;
}

export function cerrarModalTarea() {
  document.getElementById('modal-tarea').hidden = true;
  tareaEnEdicion = null;
}

export function getTareaEnEdicion() {
  return tareaEnEdicion;
}

export function mostrarErrorTarea(mensaje) {
  const el = document.getElementById('tarea-form-error');
  el.textContent = mensaje;
  el.hidden = false;
}

export function confirmar(mensaje, onAceptar) {
  document.getElementById('confirm-mensaje').textContent = mensaje;
  accionConfirmar = onAceptar;
  document.getElementById('modal-confirm').hidden = false;
}

export function cerrarConfirm() {
  document.getElementById('modal-confirm').hidden = true;
  accionConfirmar = null;
}

export function ejecutarConfirmar() {
  const accion = accionConfirmar;
  cerrarConfirm();
  return accion?.();
}

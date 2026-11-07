import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js';
import { getFirestore, doc, onSnapshot, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js';

// Mismo proyecto Firebase que el portal principal; la página no requiere npm ni servidor propio.
const app = initializeApp({
  apiKey: 'AIzaSyDvtzU8SGycfh99Cc_lLT7xabQ_uPBOpqE',
  authDomain: 'economia-41d20.firebaseapp.com',
  databaseURL: 'https://economia-41d20-default-rtdb.firebaseio.com',
  projectId: 'economia-41d20',
  storageBucket: 'economia-41d20.firebasestorage.app',
  messagingSenderId: '750639619847',
  appId: '1:750639619847:web:9a036501539ca6e3ceafa2',
  measurementId: 'G-BWV82ZTSW1'
});
const auth = getAuth(app);
const db = getFirestore(app);
const PAGINA_REF = doc(db, 'paginas_publicas', 'requisitos_publicacion');

// Navbar/footer compartidos con la portada: navegación, cuentas y configuración editorial.
const btnLoginPortal = document.getElementById('btn-login');
const menuCuentaPortal = document.getElementById('user-dropdown-container');
btnLoginPortal.addEventListener('click', () => signInWithPopup(auth, new GoogleAuthProvider()).catch(error => {
  if (error.code !== 'auth/popup-closed-by-user') {
    console.error('No se pudo iniciar sesión:', error);
    alert('No se pudo iniciar sesión con Google. Comprueba que el dominio esté autorizado en Firebase.');
  }
}));
document.getElementById('btn-logout-dropdown').addEventListener('click', () => signOut(auth));

const escaparNav = (texto) => String(texto ?? '').replace(/[&<>"']/g, simbolo => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[simbolo]));
onSnapshot(collection(db, 'secciones_opinion'), snapshot => {
  const secciones = snapshot.docs.map(item => ({ id: item.id, nombre: item.data().nombre || 'Sin nombre' }))
    .sort((a,b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity:'base' }));
  document.getElementById('menu-secciones-opinion').innerHTML = `<div class="opinion-submenu-options">
    <a class="opinion-submenu-link opinion-submenu-general" href="../?cafeTab=columnas"><span class="opinion-submenu-icon"><i class="bi bi-grid-1x2" aria-hidden="true"></i></span><span class="opinion-submenu-label">Todas las columnas</span></a>
    ${secciones.length ? '<span class="opinion-submenu-section-title">Secciones</span>' : ''}
    ${secciones.map(sec => `<a class="opinion-submenu-link" href="../?cafeTab=columnas&cafeSeccion=${encodeURIComponent(sec.id)}"><span class="opinion-submenu-icon"><i class="bi bi-bookmark" aria-hidden="true"></i></span><span class="opinion-submenu-label">${escaparNav(sec.nombre)}</span><i class="bi bi-chevron-right opinion-submenu-indicator" aria-hidden="true"></i></a>`).join('')}
  </div>`;
}, error => console.warn('No se cargaron las secciones del navbar:', error));

// Reutilizar exactamente los textos y enlaces configurables del footer de la portada.
onSnapshot(doc(db, 'config', 'footer'), snapshot => {
  if (!snapshot.exists()) return;
  const datos = snapshot.data();
  for (const campo of ['ubicacion', 'contacto', 'sobre']) {
    if (datos[campo]) document.getElementById(`f-${campo}`).innerHTML = escaparNav(datos[campo]).replace(/\n/g,'<br>');
  }
  for (const clave of ['link1','link2','link3','link4','link5','link6','btn1','btn2']) {
    const val = datos[clave];
    if (!val) continue;
    const texto = document.getElementById(`f-${clave}-text`);
    const enlace = document.getElementById(`f-${clave}-url`);
    if (texto && val.text) texto.textContent = val.text;
    if (enlace && val.url) {
      try {
        const destino = new URL(val.url, location.href);
        if (['http:', 'https:', 'mailto:', 'tel:'].includes(destino.protocol)) enlace.href = destino.href;
      } catch { /* Mantener enlace previo si el formato es inválido. */ }
    }
  }
  const textoLlegar = datos.link1?.text?.toLowerCase() || '';
  document.getElementById('f-link1-icon').style.display = (textoLlegar.includes('cómo llegar') || textoLlegar.includes('como llegar')) ? 'inline-block' : 'none';
}, error => console.warn('No se pudo cargar el pie de página:', error));
document.getElementById('current-year').textContent = new Date().getFullYear();

const OWNER_UIDS = ['ljyeGkc7GbR901C2pXxQmc1hAp62', 'kpHISTlicgNuyKqHZr46FMGKrko2'];

// Texto inicial, visible hasta que los owners publiquen sus requisitos oficiales.
const CONTENIDO_INICIAL = `
<h3>¿Qué puedes enviar?</h3>
<p>CAFÉ UNP recibe propuestas de artículos de opinión, análisis y trabajos de interés académico relacionados con la vida universitaria y la economía.</p>
<h3>Recomendaciones para tu documento</h3>
<ul>
<li>Incluye un título claro y presenta las ideas de manera ordenada.</li>
<li>Revisa la redacción y señala las fuentes de información utilizadas.</li>
<li>Comparte un documento de tu autoría y evita incorporar contenidos sin autorización.</li>
<li>Conserva el archivo en Google Drive con permisos que permitan su lectura por el equipo editorial.</li>
</ul>
<h3>Proceso de revisión</h3>
<p>Envía tu correo y el enlace del documento mediante el formulario. El equipo editorial podrá revisar el material y comunicarse contigo para indicar observaciones o los siguientes pasos.</p>
<p><em>Estos lineamientos iniciales pueden ser modificados por los responsables de CAFÉ UNP.</em></p>`;

const $ = (id) => document.getElementById(id);
const btnEditar = $('btn-editar');
const btnGestionar = $('btn-gestionar-secciones');
const overlay = $('editor-overlay');
const contenidoPublico = $('requisitos-contenido');
const estado = $('requisitos-estado');
const form = $('form-revision');
const botonEnviar = $('btn-enviar');
const indice = $('lista-secciones');
let seccionesPublicadas = [];
let seccionSeleccionadaId = null;
let borradorSecciones = [];
let borradorSeleccionadaId = null;
let usuarioActual = null;
let esOwner = false;
let editorIniciado = false;
let edicionAbierta = false;
let fechaPublicacion = null;
let primeraCargaDeSecciones = true;

function mostrarMensaje(elemento, mensaje, esError = false) {
  elemento.textContent = mensaje;
  elemento.classList.toggle('is-error', esError);
  elemento.hidden = false;
}

function limpiarMensaje(elemento) {
  elemento.hidden = true;
  elemento.textContent = '';
  elemento.classList.remove('is-error');
}

function sanearHTML(html) {
  if (window.DOMPurify) {
    return window.DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'h2', 'h3', 'h4', 'h5', 'ul', 'ol', 'li', 'b', 'strong', 'em', 'i', 'u', 's', 'blockquote', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div', 'hr', 'sub', 'sup'],
      ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'colspan', 'rowspan', 'style'],
      ALLOW_DATA_ATTR: false,
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|data:image\/(?:png|jpe?g|webp|gif);base64,)/i
    });
  }
  const lectura = new DOMParser().parseFromString(html, 'text/html');
  const contenedor = document.createElement('div');
  contenedor.textContent = lectura.body.textContent || '';
  return contenedor.innerHTML;
}

function idNuevo() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? `pagina-${crypto.randomUUID()}`
    : `pagina-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Migración no destructiva: cuando un documento antiguo no tiene "secciones",
// los subtítulos H2/H3 se usan para ofrecer varias páginas sin borrar texto.
// Solo se escribe la estructura nueva cuando un owner guarda en el editor.
function seccionesDesdeDocumentoAntiguo(titulo, contenido) {
  const temporal = document.createElement('div');
  temporal.innerHTML = contenido;
  const resultado = [{ id: 'guia-principal', titulo, contenido: '' }];
  let encabezados = 0;
  for (const nodo of Array.from(temporal.childNodes)) {
    const esTitulo = nodo.nodeType === 1 && ['H2', 'H3'].includes(nodo.nodeName) && nodo.textContent.trim();
    if (esTitulo) {
      encabezados++;
      if (encabezados > 1 && resultado.length < 20) {
        resultado.push({ id: `guia-${resultado.length + 1}`, titulo: nodo.textContent.trim().slice(0, 100), contenido: '' });
        continue; // El título pasa al encabezado de esta página.
      }
    }
    resultado[resultado.length - 1].contenido += nodo.nodeType === 1 ? nodo.outerHTML : nodo.textContent;
  }
  return resultado.map(seccion => ({ ...seccion, contenido: seccion.contenido.trim() || '<p>Contenido pendiente de actualización.</p>' }));
}

function leerSecciones(datos) {
  const tituloAntiguo = typeof datos.titulo === 'string' && datos.titulo.trim() ? datos.titulo.trim() : 'Lineamientos editoriales';
  const contenidoAntiguo = typeof datos.contenido === 'string' && datos.contenido.trim() ? datos.contenido : CONTENIDO_INICIAL;
  if (Array.isArray(datos.secciones) && datos.secciones.length) {
    const ids = new Set();
    const validas = datos.secciones.slice(0, 20).filter(item => {
      if (!item || typeof item.id !== 'string' || typeof item.titulo !== 'string' || typeof item.contenido !== 'string') return false;
      if (!item.id || !item.titulo.trim() || ids.has(item.id)) return false;
      ids.add(item.id); return true;
    }).map(item => ({ id: item.id, titulo: item.titulo.trim(), contenido: item.contenido }));
    if (validas.length) return validas;
  }
  return seccionesDesdeDocumentoAntiguo(tituloAntiguo, contenidoAntiguo);
}

function enlaceSeccion(id) {
  const url = new URL(location.href);
  url.searchParams.set('seccion', id);
  return url.pathname + url.search + url.hash;
}

function mostrarSeccion(id, { cambiarURL = false, desplazar = false } = {}) {
  const seccion = seccionesPublicadas.find(item => item.id === id) || seccionesPublicadas[0];
  if (!seccion) return;
  seccionSeleccionadaId = seccion.id;
  if (cambiarURL) history.pushState({ seccion: seccion.id }, '', enlaceSeccion(seccion.id));
  $('requirements-heading').textContent = seccion.titulo;
  $('breadcrumb-seccion').textContent = seccion.titulo;
  contenidoPublico.innerHTML = sanearHTML(seccion.contenido);
  contenidoPublico.querySelectorAll('a[href]').forEach(a => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
  document.title = `${seccion.titulo} | Requisitos para publicar | CAFÉ UNP`;
  indice.querySelectorAll('a[data-seccion]').forEach(a => {
    const actual = a.dataset.seccion === seccion.id;
    a.classList.toggle('is-active', actual);
    if (actual) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  $('ultima-actualizacion').hidden = !fechaPublicacion;
  if (fechaPublicacion) $('ultima-actualizacion').textContent = 'Última actualización: ' + new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' }).format(fechaPublicacion);
  // Al cambiar de sección, iniciar la lectura desde arriba y evitar el salto al título.
  if (desplazar) window.scrollTo({ top: 0, behavior: 'instant' });
}

function renderizarIndice() {
  indice.replaceChildren();
  seccionesPublicadas.forEach((seccion, posicion) => {
    const enlace = document.createElement('a');
    enlace.className = 'requirements-nav-item';
    enlace.href = enlaceSeccion(seccion.id);
    enlace.dataset.seccion = seccion.id;
    const numero = document.createElement('span');
    numero.className = 'requirements-nav-number';
    numero.textContent = String(posicion + 1).padStart(2, '0');
    const texto = document.createElement('span');
    texto.className = 'requirements-nav-text';
    texto.textContent = seccion.titulo;
    const icono = document.createElement('i');
    icono.className = 'bi bi-chevron-right requirements-nav-chevron';
    icono.setAttribute('aria-hidden', 'true');
    enlace.append(numero, texto, icono);
    indice.append(enlace);
  });
}

indice.addEventListener('click', evento => {
  const enlace = evento.target.closest('a[data-seccion]');
  if (!enlace || !indice.contains(enlace)) return;
  evento.preventDefault();
  if (enlace.dataset.seccion !== seccionSeleccionadaId) mostrarSeccion(enlace.dataset.seccion, { cambiarURL: true, desplazar: true });
});
window.addEventListener('popstate', () => {
  const id = new URL(location.href).searchParams.get('seccion');
  mostrarSeccion(id || seccionesPublicadas[0]?.id);
});

function renderizarRequisitos(datos) {
  seccionesPublicadas = leerSecciones(datos);
  fechaPublicacion = datos.actualizadoEn?.toDate?.() || null;
  renderizarIndice();
  const desdeURL = new URL(location.href).searchParams.get('seccion');
  const vigente = (primeraCargaDeSecciones ? seccionesPublicadas.find(s => s.id === desdeURL) : null)
    || seccionesPublicadas.find(s => s.id === seccionSeleccionadaId)
    || seccionesPublicadas[0];
  primeraCargaDeSecciones = false;
  mostrarSeccion(vigente.id);
  estado.hidden = true;
}

onSnapshot(PAGINA_REF, instantanea => {
  // Se actualiza la vista pública; el borrador abierto del owner no se reemplaza.
  renderizarRequisitos(instantanea.exists() ? instantanea.data() : {});
}, error => {
  console.error('No se pudieron cargar los requisitos:', error);
  renderizarRequisitos({});
  estado.hidden = false;
  estado.textContent = 'No fue posible consultar los requisitos publicados. Verifica la conexión y los permisos de Firebase.';
});

onAuthStateChanged(auth, async usuario => {
  usuarioActual = usuario;
  btnLoginPortal.classList.toggle('d-none', Boolean(usuario));
  menuCuentaPortal.classList.toggle('d-none', !usuario);
  if (usuario) {
    document.getElementById('user-avatar-img').src = usuario.photoURL || 'https://i.ibb.co/RG7dxCdp/cafe.png';
    document.getElementById('user-nombre').textContent = usuario.displayName || 'Usuario';
  }
  document.getElementById('admin-panel-link').classList.add('d-none');
  document.getElementById('user-plan-badge').textContent = 'Usuario';
  esOwner = false;
  btnEditar.hidden = true;
  btnGestionar.hidden = true;
  if (edicionAbierta) cerrarEditor();
  if (!usuario) return;
  try {
    const datos = await getDoc(doc(db, 'usuarios', usuario.uid));
    // Corresponde a la identidad owner del portal y a la regla Firestore esOwnerEditorial().
    if (auth.currentUser?.uid !== usuario.uid) return;
    esOwner = OWNER_UIDS.includes(usuario.uid) || (datos.exists() && datos.data().owner === true);
    btnEditar.hidden = !esOwner;
    btnGestionar.hidden = !esOwner;
    document.getElementById('admin-panel-link').classList.toggle('d-none', !esOwner);
    document.getElementById('user-plan-badge').textContent = esOwner ? 'Administrador' : 'Usuario';
  } catch (error) {
    // Los owners fijos siguen pudiendo editar si el documento de perfil no estuviera disponible.
    if (OWNER_UIDS.includes(usuario.uid)) {
      esOwner = true; btnEditar.hidden = false; btnGestionar.hidden = false;
      document.getElementById('admin-panel-link').classList.remove('d-none');
      document.getElementById('user-plan-badge').textContent = 'Administrador';
    }
    else console.warn('No se pudo comprobar el rol owner:', error);
  }
});

function esEnlaceGoogleValido(texto) {
  try {
    const url = new URL(texto);
    return url.protocol === 'https:' && ['drive.google.com', 'docs.google.com'].includes(url.hostname.toLowerCase()) && url.pathname.length > 1 && !url.username && !url.password;
  } catch { return false; }
}

form.addEventListener('submit', async evento => {
  evento.preventDefault();
  if (botonEnviar.disabled) return;
  limpiarMensaje($('solicitud-mensaje'));
  const correoInput = $('solicitud-correo');
  const enlaceInput = $('solicitud-enlace');
  const correo = correoInput.value.trim();
  const enlaceDrive = enlaceInput.value.trim();
  if (!correoInput.checkValidity() || correo.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    mostrarMensaje($('solicitud-mensaje'), 'Ingresa un correo electrónico válido.', true);
    correoInput.focus(); return;
  }
  if (!esEnlaceGoogleValido(enlaceDrive) || enlaceDrive.length > 1000) {
    mostrarMensaje($('solicitud-mensaje'), 'Ingresa un enlace HTTPS válido de Google Drive o Google Docs.', true);
    enlaceInput.focus(); return;
  }
  if (!$('solicitud-acceso').checked || !$('solicitud-privacidad').checked) {
    mostrarMensaje($('solicitud-mensaje'), 'Confirma el acceso al documento y la autorización de uso del correo.', true);
    return;
  }
  botonEnviar.disabled = true;
  const textoOriginal = botonEnviar.innerHTML;
  botonEnviar.textContent = 'Enviando solicitud…';
  try {
    await addDoc(collection(db, 'solicitudes_revision'), {
      correo,
      enlaceDrive,
      estado: 'pendiente',
      creadoEn: serverTimestamp()
    });
    form.reset();
    mostrarMensaje($('solicitud-mensaje'), 'Tu documento fue enviado para revisión. Las observaciones y la revisión se comunicarán al correo indicado.');
  } catch (error) {
    console.error('No se pudo enviar la revisión:', error);
    mostrarMensaje($('solicitud-mensaje'), 'No se pudo registrar la solicitud. Comprueba el enlace y que estén publicadas las reglas de Firestore para solicitudes_revision.', true);
  } finally {
    botonEnviar.disabled = false;
    botonEnviar.innerHTML = textoOriginal;
  }
});

function guardarEditorEnBorrador() {
  const actual = borradorSecciones.find(item => item.id === borradorSeleccionadaId);
  if (!actual) return;
  actual.titulo = $('editor-titulo').value;
  actual.contenido = (editorIniciado ? window.tinymce.get('editor-contenido')?.getContent() : $('editor-contenido').value) || '';
}

function renderizarEditorLista() {
  const lista = $('editor-lista-secciones');
  lista.replaceChildren();
  borradorSecciones.forEach((seccion, indiceSeccion) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'editor-section-item';
    boton.classList.toggle('is-active', seccion.id === borradorSeleccionadaId);
    boton.dataset.id = seccion.id;
    const posicion = document.createElement('span');
    posicion.className = 'editor-section-number';
    posicion.textContent = String(indiceSeccion + 1).padStart(2, '0');
    const titulo = document.createElement('span');
    titulo.textContent = seccion.titulo.trim() || 'Sección sin título';
    boton.append(posicion, titulo);
    lista.append(boton);
  });
  const posicion = borradorSecciones.findIndex(item => item.id === borradorSeleccionadaId);
  $('editor-posicion').textContent = `Página ${posicion + 1} de ${borradorSecciones.length}`;
  $('btn-mover-arriba').disabled = posicion <= 0;
  $('btn-mover-abajo').disabled = posicion === borradorSecciones.length - 1;
  $('btn-eliminar-seccion').disabled = borradorSecciones.length <= 1;
  $('btn-agregar-seccion').disabled = borradorSecciones.length >= 20;
}

function seleccionarEditorSeccion(id, { guardarAnterior = true } = {}) {
  if (guardarAnterior) guardarEditorEnBorrador();
  const seleccionada = borradorSecciones.find(item => item.id === id);
  if (!seleccionada) return;
  borradorSeleccionadaId = seleccionada.id;
  $('editor-titulo').value = seleccionada.titulo;
  $('editor-contenido').value = seleccionada.contenido;
  if (editorIniciado) window.tinymce.get('editor-contenido')?.setContent(seleccionada.contenido);
  renderizarEditorLista();
}

async function abrirEditor() {
  if (!esOwner || !usuarioActual) return;
  limpiarMensaje($('editor-mensaje'));
  borradorSecciones = seccionesPublicadas.map(item => ({ ...item }));
  borradorSeleccionadaId = seccionSeleccionadaId || borradorSecciones[0]?.id;
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  edicionAbierta = true;
  if (window.tinymce && !editorIniciado) {
    try {
      await window.tinymce.init({
        selector: '#editor-contenido', height: 380, menubar: false,
        plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen table wordcount',
        toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | table link image | removeformat',
        content_style: 'body { font-family: Inter, Arial, sans-serif; font-size: 15px; line-height: 1.7; }',
        paste_data_images: true,
        promotion: false,
        branding: false
      });
      editorIniciado = true;
    } catch (error) {
      console.warn('Se utilizará el editor HTML básico:', error);
    }
  }
  if (edicionAbierta) seleccionarEditorSeccion(borradorSeleccionadaId, { guardarAnterior: false });
}

function cerrarEditor() {
  overlay.hidden = true;
  document.body.style.overflow = '';
  edicionAbierta = false;
  borradorSecciones = [];
  borradorSeleccionadaId = null;
}

btnEditar.addEventListener('click', abrirEditor);
btnGestionar.addEventListener('click', abrirEditor);
$('btn-cerrar-editor').addEventListener('click', cerrarEditor);
$('btn-cancelar-editor').addEventListener('click', cerrarEditor);
overlay.addEventListener('click', e => { if (e.target === overlay) cerrarEditor(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && edicionAbierta) cerrarEditor(); });

$('editor-lista-secciones').addEventListener('click', e => {
  const boton = e.target.closest('button[data-id]');
  if (boton && boton.dataset.id !== borradorSeleccionadaId) seleccionarEditorSeccion(boton.dataset.id);
});
$('editor-titulo').addEventListener('input', () => {
  const elemento = $('editor-lista-secciones').querySelector('button.is-active span:last-child');
  if (elemento) elemento.textContent = $('editor-titulo').value.trim() || 'Sección sin título';
});
$('btn-agregar-seccion').addEventListener('click', () => {
  if (borradorSecciones.length >= 20) return;
  guardarEditorEnBorrador();
  const nueva = { id: idNuevo(), titulo: 'Nueva sección', contenido: '<p>Escribe aquí los requisitos de esta sección.</p>' };
  borradorSecciones.push(nueva);
  seleccionarEditorSeccion(nueva.id, { guardarAnterior: false });
  $('editor-titulo').focus(); $('editor-titulo').select();
});
$('btn-eliminar-seccion').addEventListener('click', () => {
  if (borradorSecciones.length <= 1) return;
  const actual = borradorSecciones.find(item => item.id === borradorSeleccionadaId);
  if (!confirm(`¿Eliminar la sección «${actual?.titulo || 'Sin título'}»? Se eliminará también su contenido al guardar los cambios.`)) return;
  const posicion = borradorSecciones.findIndex(item => item.id === borradorSeleccionadaId);
  borradorSecciones.splice(posicion, 1);
  seleccionarEditorSeccion(borradorSecciones[Math.min(posicion, borradorSecciones.length - 1)].id, { guardarAnterior: false });
});
function moverSeccion(direccion) {
  guardarEditorEnBorrador();
  const posicion = borradorSecciones.findIndex(item => item.id === borradorSeleccionadaId);
  const destino = posicion + direccion;
  if (destino < 0 || destino >= borradorSecciones.length) return;
  [borradorSecciones[posicion], borradorSecciones[destino]] = [borradorSecciones[destino], borradorSecciones[posicion]];
  seleccionarEditorSeccion(borradorSeleccionadaId, { guardarAnterior: false });
}
$('btn-mover-arriba').addEventListener('click', () => moverSeccion(-1));
$('btn-mover-abajo').addEventListener('click', () => moverSeccion(1));

$('btn-guardar-editor').addEventListener('click', async () => {
  if (!esOwner || !usuarioActual || $('btn-guardar-editor').disabled) return;
  limpiarMensaje($('editor-mensaje'));
  guardarEditorEnBorrador();
  if (!borradorSecciones.length || borradorSecciones.length > 20 || borradorSecciones.some(item => !item.titulo.trim() || item.titulo.length > 100 || !item.contenido.trim())) {
    mostrarMensaje($('editor-mensaje'), 'Todas las secciones deben tener un nombre (máximo 100 caracteres) y contenido.', true);
    return;
  }
  const ids = borradorSecciones.map(item => item.id);
  if (new Set(ids).size !== ids.length) {
    mostrarMensaje($('editor-mensaje'), 'Hay secciones repetidas. Vuelve a intentar el guardado.', true);
    return;
  }
  const secciones = borradorSecciones.map(item => ({ id: item.id, titulo: item.titulo.trim(), contenido: item.contenido }));
  const primera = secciones[0];
  const payload = JSON.stringify(secciones);
  // Evitar superar el máximo de Firestore (1 MiB por documento).
  if (new TextEncoder().encode(payload).length > 650000) {
    mostrarMensaje($('editor-mensaje'), 'El contenido total es demasiado grande para Firestore. Reduce las imágenes incrustadas antes de guardar.', true);
    return;
  }
  const boton = $('btn-guardar-editor');
  boton.disabled = true;
  const seleccionAnterior = seccionSeleccionadaId;
  try {
    seccionSeleccionadaId = borradorSeleccionadaId;
    await setDoc(PAGINA_REF, {
      titulo: primera.titulo,
      contenido: primera.contenido,
      secciones,
      actualizadoEn: serverTimestamp(),
      actualizadoPor: usuarioActual.uid
    });
    history.replaceState({ seccion: seccionSeleccionadaId }, '', enlaceSeccion(seccionSeleccionadaId));
    cerrarEditor();
  } catch (error) {
    seccionSeleccionadaId = seleccionAnterior;
    console.error('Error al guardar requisitos:', error);
    mostrarMensaje($('editor-mensaje'), error.code === 'permission-denied'
      ? 'Firebase rechazó el guardado. Actualiza las reglas de Firestore incluidas en el ZIP y verifica que tu cuenta tenga permisos owner.'
      : 'No se pudieron guardar los cambios: ' + (error.message || 'Error de conexión'), true);
  } finally {
    boton.disabled = false;
  }
});

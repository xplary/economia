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
const overlay = $('editor-overlay');
const contenidoPublico = $('requisitos-contenido');
const estado = $('requisitos-estado');
const form = $('form-revision');
const botonEnviar = $('btn-enviar');
let paginaActual = { titulo: 'Lineamientos editoriales', contenido: CONTENIDO_INICIAL };
let usuarioActual = null;
let esOwner = false;
let editorIniciado = false;
let edicionAbierta = false;

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
  // Si falla la librería, priorizar seguridad sobre formato HTML.
  const lectura = new DOMParser().parseFromString(html, 'text/html');
  const contenedor = document.createElement('div');
  contenedor.textContent = lectura.body.textContent || '';
  return contenedor.innerHTML;
}

function renderizarRequisitos(datos) {
  paginaActual = {
    titulo: typeof datos.titulo === 'string' && datos.titulo.trim() ? datos.titulo : 'Lineamientos editoriales',
    contenido: typeof datos.contenido === 'string' && datos.contenido.trim() ? datos.contenido : CONTENIDO_INICIAL
  };
  $('requirements-heading').textContent = paginaActual.titulo;
  contenidoPublico.innerHTML = sanearHTML(paginaActual.contenido);
  contenidoPublico.querySelectorAll('a[href]').forEach(a => {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });
  estado.hidden = true;
  const fecha = datos.actualizadoEn?.toDate?.();
  $('ultima-actualizacion').hidden = !fecha;
  if (fecha) $('ultima-actualizacion').textContent = 'Última actualización: ' + new Intl.DateTimeFormat('es-PE', { dateStyle: 'long' }).format(fecha);
}

onSnapshot(PAGINA_REF, instantanea => {
  // Un formulario de edición abierto no se sobrescribe durante una actualización remota.
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
  if (edicionAbierta) cerrarEditor();
  if (!usuario) return;
  try {
    const datos = await getDoc(doc(db, 'usuarios', usuario.uid));
    // Corresponde a la identidad owner del portal y a la regla Firestore esOwnerEditorial().
    if (auth.currentUser?.uid !== usuario.uid) return;
    esOwner = OWNER_UIDS.includes(usuario.uid) || (datos.exists() && datos.data().owner === true);
    btnEditar.hidden = !esOwner;
    document.getElementById('admin-panel-link').classList.toggle('d-none', !esOwner);
    document.getElementById('user-plan-badge').textContent = esOwner ? 'Administrador' : 'Usuario';
  } catch (error) {
    // Los owners fijos siguen pudiendo editar si el documento de perfil no estuviera disponible.
    if (OWNER_UIDS.includes(usuario.uid)) {
      esOwner = true; btnEditar.hidden = false;
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

async function abrirEditor() {
  if (!esOwner || !usuarioActual) return;
  limpiarMensaje($('editor-mensaje'));
  $('editor-titulo').value = paginaActual.titulo;
  $('editor-contenido').value = paginaActual.contenido;
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  edicionAbierta = true;
  if (window.tinymce && !editorIniciado) {
    try {
      await window.tinymce.init({
        selector: '#editor-contenido', height: 470, menubar: false,
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
  if (editorIniciado) window.tinymce.get('editor-contenido')?.setContent(paginaActual.contenido);
}

function cerrarEditor() {
  overlay.hidden = true;
  document.body.style.overflow = '';
  edicionAbierta = false;
}

btnEditar.addEventListener('click', abrirEditor);
$('btn-cerrar-editor').addEventListener('click', cerrarEditor);
$('btn-cancelar-editor').addEventListener('click', cerrarEditor);
overlay.addEventListener('click', e => { if (e.target === overlay) cerrarEditor(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && edicionAbierta) cerrarEditor(); });

$('btn-guardar-editor').addEventListener('click', async () => {
  if (!esOwner || !usuarioActual || $('btn-guardar-editor').disabled) return;
  limpiarMensaje($('editor-mensaje'));
  const titulo = $('editor-titulo').value.trim();
  const contenido = (editorIniciado ? window.tinymce.get('editor-contenido')?.getContent() : $('editor-contenido').value) || '';
  if (!titulo || titulo.length > 100 || !contenido.trim()) {
    mostrarMensaje($('editor-mensaje'), 'Introduce un título (máximo 100 caracteres) y el contenido de los requisitos.', true);
    return;
  }
  if (new TextEncoder().encode(contenido).length > 650000) {
    mostrarMensaje($('editor-mensaje'), 'El contenido es demasiado grande para Firestore. Reduce las imágenes incrustadas antes de guardar.', true);
    return;
  }
  const boton = $('btn-guardar-editor');
  boton.disabled = true;
  try {
    await setDoc(PAGINA_REF, {
      titulo,
      contenido,
      actualizadoEn: serverTimestamp(),
      actualizadoPor: usuarioActual.uid
    });
    cerrarEditor();
  } catch (error) {
    console.error('Error al guardar requisitos:', error);
    mostrarMensaje($('editor-mensaje'), error.code === 'permission-denied'
      ? 'Firebase rechazó el guardado. Solo los owners pueden modificar esta página. Comprueba las reglas publicadas.'
      : 'No se pudieron guardar los cambios: ' + (error.message || 'Error de conexión'), true);
  } finally {
    boton.disabled = false;
  }
});



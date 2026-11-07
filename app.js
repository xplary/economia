import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, deleteDoc, increment, writeBatch } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const app = initializeApp({ apiKey: "AIzaSyDvtzU8SGycfh99Cc_lLT7xabQ_uPBOpqE", authDomain: "economia-41d20.firebaseapp.com", databaseURL: "https://economia-41d20-default-rtdb.firebaseio.com", projectId: "economia-41d20", storageBucket: "economia-41d20.firebasestorage.app", messagingSenderId: "750639619847", appId: "1:750639619847:web:9a036501539ca6e3ceafa2", measurementId: "G-BWV82ZTSW1" });
const auth = getAuth(app); const db = getFirestore(app);

const statsRef = doc(db, "config", "estadisticas");
updateDoc(statsRef, { visitasGlobales: increment(1) }).catch(async (e) => {
    if (e.code === 'not-found') await setDoc(statsRef, { visitasGlobales: 1 });
});

window.postsData = {}; window.editandoId = null; window.editandoFormId = null; window.modalActual = { id: null, col: null };
window.noticiaCropper = null; 
let currentTab = 'columnas'; let userReputacion = 0; let reqReputacion = 15; let userSub = null;

document.getElementById('current-year').innerText = new Date().getFullYear();

tinymce.init({ selector: '#editor-noticias', height: 450, menubar: false, plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table wordcount', toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | table link image | removeformat', content_style: 'body { font-family: "Inter", sans-serif; font-size: 16px; text-align: justify; line-height: 1.6; }', paste_data_images: true });

if(!localStorage.getItem('uid')) localStorage.setItem('uid', 'anon_'+Math.random().toString(36).substring(2,11));
const getUid = () => auth.currentUser ? auth.currentUser.uid : localStorage.getItem('uid');
document.getElementById('btn-login').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
if(document.getElementById('btn-logout')) document.getElementById('btn-logout').onclick = () => signOut(auth);

function updateReputationVisibility() {
    const repCont = document.getElementById('reputacion-container');
    if (auth.currentUser && currentTab === 'ensayos') {
        repCont.classList.remove('d-none'); repCont.classList.add('d-flex'); setTimeout(() => repCont.style.opacity = '1', 10);
    } else {
        repCont.style.opacity = '0'; setTimeout(() => { repCont.classList.add('d-none'); repCont.classList.remove('d-flex'); }, 300);
    }
}

const escapeHTML = (str) => (str ? str.toString() : '').replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t] || t));

onAuthStateChanged(auth, async (u) => {
    const btnLogin = document.getElementById('btn-login');
    const oldLogout = document.getElementById('btn-logout');
    document.querySelectorAll('.auth-only').forEach(el => el.classList.toggle('d-none', !u));
    
    if(userSub) userSub();
    
    if(u) { 
        btnLogin.classList.add('d-none');
        if(oldLogout) oldLogout.classList.add('d-none');

        let ddCont = document.getElementById('user-dropdown-container');
        if(!ddCont) {
            ddCont = document.createElement('div');
            ddCont.id = 'user-dropdown-container';
            ddCont.className = 'dropdown d-inline-block ms-1'; 
            ddCont.innerHTML = `
                <div class="position-relative cursor-pointer" data-bs-toggle="dropdown" aria-expanded="false" title="Mi Cuenta">
                    <img src="${u.photoURL || 'https://via.placeholder.com/42'}" id="user-avatar-img" class="rounded-circle shadow-sm" style="width: 40px; height: 40px; object-fit: cover; border: 2px solid rgba(255,255,255,0.4); transition: border-color 0.2s ease;" alt="Perfil" onmouseover="this.style.borderColor='#ffffff'" onmouseout="this.style.borderColor='rgba(255,255,255,0.4)'">
                </div>
                <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-3 rounded-4 py-2" style="min-width: 250px; z-index: 1070; right: 0;">
                    <li class="px-4 py-3 border-bottom mb-2 text-center">
                        <img src="${u.photoURL || 'https://via.placeholder.com/60'}" class="rounded-circle mb-3 shadow-sm border" style="width: 55px; height: 55px; object-fit: cover;" id="user-avatar-img-large">
                        <span class="fw-bold font-inter text-dark d-block text-truncate mb-2" style="max-width: 210px; margin: 0 auto; font-size: 1.05rem;">${escapeHTML(u.displayName || 'Usuario')}</span>
                        <span class="badge bg-secondary font-inter px-3 py-1 rounded-pill shadow-sm" id="user-plan-badge" style="font-weight: 600; letter-spacing: 0.5px;">Usuario</span>
                    </li>
                    <li id="admin-panel-link" class="d-none"><a href="admin/" class="dropdown-item fw-bold text-primary py-2 cursor-pointer font-inter text-center hover-bg-light"><i class="bi bi-speedometer2 me-2"></i> Panel Admin</a></li>
                    <li><a class="dropdown-item fw-bold text-danger py-2 cursor-pointer font-inter text-center hover-bg-light rounded-bottom-4" id="btn-logout-dropdown"><i class="bi bi-box-arrow-right me-2"></i> Cerrar Sesión</a></li>
                </ul>
            `;
            btnLogin.parentNode.insertBefore(ddCont, btnLogin.nextSibling);
            document.getElementById('btn-logout-dropdown').onclick = () => signOut(auth);
        } else {
            ddCont.classList.remove('d-none');
            document.getElementById('user-avatar-img').src = u.photoURL || 'https://via.placeholder.com/42';
            const largeAvatar = document.getElementById('user-avatar-img-large');
            if(largeAvatar) largeAvatar.src = u.photoURL || 'https://via.placeholder.com/60';
        }

        const ref = doc(db, "usuarios", u.uid);
        userSub = onSnapshot(ref, (d) => {
            const badge = document.getElementById('user-plan-badge');
            const adminLink = document.getElementById('admin-panel-link');
            if(d.exists()) {
                if(d.data().owner) {
                    document.body.classList.add('is-owner');
                    if(badge) { badge.innerText = 'Administrador'; badge.className = 'badge font-inter px-3 py-1 rounded-pill shadow-sm text-white'; badge.style.backgroundColor = '#004b79'; }
                    if(adminLink) adminLink.classList.remove('d-none');
                } else {
                    document.body.classList.remove('is-owner');
                    if(badge) { badge.innerText = 'Usuario'; badge.className = 'badge bg-secondary font-inter px-3 py-1 rounded-pill shadow-sm text-white'; badge.style.backgroundColor = ''; }
                    if(adminLink) adminLink.classList.add('d-none');
                }
                userReputacion = d.data().reputacion || 0;
            } else {
                setDoc(ref, { nombre: u.displayName, email: u.email, reputacion: 0 });
                userReputacion = 0;
                if(badge) { badge.innerText = 'Usuario'; badge.className = 'badge bg-secondary font-inter px-3 py-1 rounded-pill shadow-sm text-white'; badge.style.backgroundColor = ''; }
                if(adminLink) adminLink.classList.add('d-none');
            }
            document.getElementById('user-reputacion').innerText = userReputacion;
            updateReputationVisibility();
            renderFormularios(); 
            if(window.modalActual.col === 'formularios' && window.modalActual.id) {
                const curData = window.postsData[window.modalActual.id];
                if(curData) window.renderModalFormulario(window.modalActual.id, curData);
            }
        });
    } else {
        btnLogin.classList.remove('d-none');
        const ddCont = document.getElementById('user-dropdown-container');
        if(ddCont) ddCont.classList.add('d-none');
        if(oldLogout) oldLogout.classList.add('d-none');
        userReputacion = 0; updateReputationVisibility(); renderFormularios(); 
        document.body.classList.remove('is-owner');
    }
});

window.borrarPost = async (col, id) => { 
    if(confirm("¿Estás seguro de eliminar esto? Se perderá permanentemente.")) {
        try {
            const d = window.postsData[id];
            if (col === 'formularios' && d && d.autorId === getUid() && !document.body.classList.contains('is-owner')) {
                const userRef = doc(db, "usuarios", getUid());
                await updateDoc(userRef, { reputacion: increment(reqReputacion) });
            }
            await deleteDoc(doc(db, col, id)); 
        } catch(e) { alert("Error al eliminar: " + e.message); }
    }
};

const slugify = (text) => (text ? text.toString() : '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 80) || 'cafe-unp';
window.compartir = (id, col) => { const d = window.postsData[id]; if(!d) return; const tit = d.titulo || d.pregunta || 'CAFE UNP'; const slug = slugify(tit); const rutaLimpia = window.location.pathname.replace(/index\.html$/i, '') || '/'; const url = window.location.origin + rutaLimpia + `?v=${slug}---${id}---${col}`; if(navigator.share) navigator.share({ title: tit, url: url }); else { navigator.clipboard.writeText(url); alert("Link copiado: " + url); } };

let currentRating = 0; const setupStars = (selector, textId) => { document.querySelectorAll(selector).forEach(st => { st.onclick = function() { currentRating = parseInt(this.getAttribute('data-val')); const cleanClass = selector.replace('.', ''); document.querySelectorAll(selector).forEach(s => { let val = parseInt(s.getAttribute('data-val')); s.className = val <= currentRating ? `bi bi-star-fill star-gradient cursor-pointer fs-3 me-1 ${cleanClass}` : `bi bi-star text-muted cursor-pointer fs-3 me-1 ${cleanClass}`; }); document.getElementById(textId).innerText = `(${currentRating} Estrellas)`; } }); }; setupStars('.star-btn-mn', 'rating-text-mn'); setupStars('.star-btn-ml', 'rating-text-ml'); 
const getPromedioStars = (comentarios) => { if(!comentarios || comentarios.length === 0) return ''; const valid = comentarios.filter(c => c.rating > 0 && c.aprobado !== false); if(valid.length === 0) return ''; return `<span class="star-gradient fw-bold">⭐ ${(valid.reduce((acc, c) => acc + c.rating, 0) / valid.length).toFixed(1)} (${valid.length})</span>`; };

const enviarComentario = async (txtId, selector, textId) => { const txt = document.getElementById(txtId).value; if(!txt) return alert("Escribe un comentario"); const isOwner = document.body.classList.contains('is-owner'); if (!isOwner) { const lastTime = localStorage.getItem('last_comment_time'); const now = Date.now(); if (lastTime && now - parseInt(lastTime) < 120000) { const wait = Math.ceil((120000 - (now - parseInt(lastTime))) / 1000); return alert(`Anti-Spam: Por favor, espera ${wait} segundos para comentar de nuevo.`); } } const ref = doc(db, window.modalActual.col, window.modalActual.id); const snap = await getDoc(ref); if(snap.exists()) { const arr = snap.data().comentarios || []; arr.push({ id: Date.now(), autor: auth.currentUser ? auth.currentUser.displayName || "Usuario" : "Anónimo", texto: escapeHTML(txt), rating: currentRating, date: new Date().toLocaleDateString(), aprobado: isOwner }); await updateDoc(ref, { comentarios: arr }); if (!isOwner) { localStorage.setItem('last_comment_time', Date.now()); alert("Tu comentario fue enviado y está pendiente de aprobación."); } document.getElementById(txtId).value = ''; currentRating = 0; document.querySelectorAll(selector).forEach(s => s.className = `bi bi-star text-muted cursor-pointer fs-3 me-1 ${selector.replace('.','')}`); document.getElementById(textId).innerText = ''; } };
document.getElementById('btn-enviar-comentario-mn').onclick = () => enviarComentario('mn-comentario-texto', '.star-btn-mn', 'rating-text-mn'); document.getElementById('btn-enviar-comentario-ml').onclick = () => enviarComentario('ml-comentario-texto', '.star-btn-ml', 'rating-text-ml');
window.borrarComentario = async (cid) => { if(!confirm("¿Borrar comentario?")) return; const ref = doc(db, window.modalActual.col, window.modalActual.id); const snap = await getDoc(ref); if(snap.exists()) { const arr = snap.data().comentarios || []; await updateDoc(ref, { comentarios: arr.filter(c => c.id !== cid) }); } };
window.aprobarComentario = async (cid) => { const ref = doc(db, window.modalActual.col, window.modalActual.id); const snap = await getDoc(ref); if(snap.exists()) { const arr = snap.data().comentarios || []; const index = arr.findIndex(c => c.id === cid); if(index !== -1) { arr[index].aprobado = true; await updateDoc(ref, { comentarios: arr }); } } };

const renderComentarios = (comentarios, containerId) => { const box = document.getElementById(containerId); if(!box) return; const isOwner = document.body.classList.contains('is-owner'); let comsToShow = comentarios || []; if(!isOwner) comsToShow = comsToShow.filter(c => c.aprobado !== false); if(comsToShow.length===0) return box.innerHTML = '<div class="text-center mt-4 text-muted"><i class="bi bi-chat-dots fs-3"></i><p class="mt-2 small">Sé el primero en aportar.</p></div>'; box.innerHTML = comsToShow.map(c => { const starsHTML = `<span class="star-gradient" style="font-size:0.9rem;">${'★'.repeat(c.rating)}${'☆'.repeat(5-c.rating)}</span>`; const pendingBadge = c.aprobado === false ? `<span class="badge bg-warning text-dark ms-2 fw-semibold" style="font-size:0.65rem;">Pendiente</span>` : ''; const approveBtn = (c.aprobado === false && isOwner) ? `<button class="btn btn-sm btn-success py-0 px-2 ms-2 fw-bold" style="font-size:0.7rem;" onclick="aprobarComentario(${c.id})"><i class="bi bi-check-lg"></i> Aprobar</button>` : ''; return `<div class="mb-4 pb-3 border-bottom"><div class="d-flex justify-content-between align-items-center mb-1"><strong class="font-inter text-dark small">${c.autor} ${pendingBadge}</strong><div>${starsHTML}${approveBtn}<i class="bi bi-trash text-danger ms-2 cursor-pointer admin-only-inline" onclick="borrarComentario(${c.id})"></i></div></div><p class="text-secondary font-inter mb-1" style="font-size: 0.95rem;">${c.texto}</p><div class="text-muted small font-inter text-end" style="font-size: 0.75rem;">${c.date}</div></div>`; }).join(''); };
const formatEmbedUrl = (url) => { if(!url) return ''; const match = url.match(/\/(?:d|file\/d)\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/); if (match && match[1]) return `https://drive.google.com/file/d/${match[1]}/preview`; return url; };


// ===== Lectura ampliada de Artículos y Opinión (solo presentación) =====
const lectorModal = document.getElementById('modalNoticia');
const lectorScroll = document.getElementById('mn-reader-scroll');
const lectorContenido = document.getElementById('mn-contenido');
let lectorProgresoPendiente = false;

function actualizarProgresoLectura() {
    const barra = document.getElementById('mn-lectura-barra');
    const relleno = document.getElementById('mn-lectura-progreso');
    const etiqueta = document.getElementById('mn-lectura-porcentaje');
    // El progreso corresponde a TODO el recorrido del lector, hasta el pie editorial.
    const distancia = Math.max(0, lectorScroll.scrollHeight - lectorScroll.clientHeight);
    const porcentaje = distancia === 0 ? 100 : Math.round(Math.min(100, Math.max(0, lectorScroll.scrollTop / distancia * 100)));
    barra.setAttribute('aria-valuenow', String(porcentaje));
    relleno.style.width = porcentaje + '%';
    etiqueta.textContent = 'Lectura: ' + porcentaje + '%';
}
lectorScroll.addEventListener('scroll', () => {
    if (lectorProgresoPendiente) return;
    lectorProgresoPendiente = true;
    requestAnimationFrame(() => { lectorProgresoPendiente = false; actualizarProgresoLectura(); });
}, { passive: true });
// Alinear la vista de lectura exactamente con el borde inferior del navbar real.
function ajustarPosicionLector() {
    const navbar = document.querySelector('body > nav.navbar');
    if (navbar) lectorModal.style.setProperty('--mn-navbar-bottom', Math.max(0, navbar.getBoundingClientRect().bottom) + 'px');
}
lectorModal.addEventListener('show.bs.modal', ajustarPosicionLector);
lectorModal.addEventListener('shown.bs.modal', () => requestAnimationFrame(actualizarProgresoLectura));
lectorModal.addEventListener('hidden.bs.modal', () => {
    // No conservar el porcentaje de una lectura anterior.
    lectorScroll.scrollTop = 0;
});
window.addEventListener('resize', () => {
    if (lectorModal.classList.contains('show')) {
        ajustarPosicionLector();
        requestAnimationFrame(actualizarProgresoLectura);
    }
});

// El navbar sigue accesible por encima del lector. Al cambiar de apartado se
// cierra el artículo, dejando que Bootstrap active la pestaña seleccionada.
for (const id of ['pills-tab', 'pills-tab-mobile']) {
    document.getElementById(id).addEventListener('click', event => {
        if (!event.target.closest('[data-bs-target="#investigacion"], [data-bs-target="#ensayos"], [data-bs-target="#columnas"], [data-seccion-opinion]')) return;
        if (lectorModal.classList.contains('show')) bootstrap.Modal.getOrCreateInstance(lectorModal).hide();
    });
}

for (const enlace of ['mn-volver-inicio', 'mn-volver-articulos']) {
    document.getElementById(enlace).addEventListener('click', () => {
        bootstrap.Modal.getOrCreateInstance(lectorModal).hide();
        document.getElementById('nav-opinion-general').click();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function construirEnlaceLectura(id, d) {
    const ruta = window.location.pathname.replace(/index\.html$/i, '') || '/';
    return window.location.origin + ruta + '?v=' + slugify(d.titulo || 'CAFE UNP') + '---' + id + '---noticias';
}

function llenarRecomendacionLectura(selector, noticia) {
    const tarjeta = document.getElementById(selector);
    tarjeta.hidden = !noticia;
    tarjeta.removeAttribute('data-mn-articulo');
    if (!noticia) return;
    tarjeta.dataset.mnArticulo = noticia.id;
    tarjeta.querySelector('.mn-related-title').textContent = noticia.titulo || 'Artículo';
    const fecha = noticia.fecha && typeof noticia.fecha.toDate === 'function' ? noticia.fecha.toDate().toLocaleDateString('es-PE') : '';
    tarjeta.querySelector('.mn-related-date').innerHTML = fecha ? '<i class="bi bi-calendar3" aria-hidden="true"></i>' + escapeHTML(fecha) : '';
    const imagen = tarjeta.querySelector('.mn-related-thumbnail img');
    const icono = tarjeta.querySelector('.mn-related-thumbnail .bi');
    if (noticia.imagen) {
        imagen.src = noticia.imagen;
        imagen.hidden = false;
        icono.hidden = true;
        imagen.onerror = () => { imagen.hidden = true; icono.hidden = false; };
    } else {
        imagen.removeAttribute('src');
        imagen.hidden = true;
        icono.hidden = false;
    }
}

function renderPieLectura(id, d) {
    const etiquetas = Array.isArray(d.etiquetas) ? d.etiquetas.filter(Boolean) : [];
    document.getElementById('mn-temas-relacionados').innerHTML = etiquetas.map(t => '<span class="mn-topic-pill">' + escapeHTML(t) + '</span>').join('');
    document.getElementById('mn-temas-fila').hidden = etiquetas.length === 0;
    document.getElementById('mn-copiado').textContent = '';
    const candidatos = noticiasData.filter(n => n.id !== id);
    const masLeido = candidatos.slice().sort((a,b) => (Number(b.vistas) || 0) - (Number(a.vistas) || 0) || (b.fecha?.toMillis?.() || 0) - (a.fecha?.toMillis?.() || 0))[0];
    const etiquetasActuales = new Set(etiquetas.map(normalizarBusqueda));
    const relacionados = candidatos.map(n => {
        const coincidencias = (Array.isArray(n.etiquetas) ? n.etiquetas : []).filter(t => etiquetasActuales.has(normalizarBusqueda(t))).length;
        return { n, puntos: (d.seccionId && d.seccionId === n.seccionId ? 3 : 0) + coincidencias };
    }).filter(o => o.puntos > 0 && o.n.id !== masLeido?.id)
      .sort((a,b) => b.puntos - a.puntos || (b.n.fecha?.toMillis?.() || 0) - (a.n.fecha?.toMillis?.() || 0));
    llenarRecomendacionLectura('mn-mas-leido', masLeido);
    llenarRecomendacionLectura('mn-nota-relacionada', relacionados[0]?.n);
    document.getElementById('mn-recomendaciones').hidden = !masLeido && !relacionados.length;
    document.getElementById('mn-pie-editorial').hidden = false;
}

document.getElementById('mn-recomendaciones').addEventListener('click', e => {
    const tarjeta = e.target.closest('[data-mn-articulo]');
    if (tarjeta && window.postsData[tarjeta.dataset.mnArticulo]) abrirModal(tarjeta.dataset.mnArticulo, 'noticias');
});

document.querySelector('.mn-share-actions').addEventListener('click', async e => {
    const boton = e.target.closest('[data-mn-red]');
    if (!boton || window.modalActual.col !== 'noticias') return;
    const { id } = window.modalActual;
    const d = window.postsData[id];
    if (!d) return;
    const enlace = construirEnlaceLectura(id, d);
    const red = boton.dataset.mnRed;
    if (red === 'copiar') {
        try {
            if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(enlace);
            else {
                const temporal = document.createElement('textarea');
                temporal.value = enlace;
                temporal.style.position = 'fixed'; temporal.style.opacity = '0';
                document.body.appendChild(temporal); temporal.select();
                if (!document.execCommand('copy')) throw Error('No se pudo copiar');
                temporal.remove();
            }
            document.getElementById('mn-copiado').textContent = '¡Enlace copiado!';
        } catch (error) { document.getElementById('mn-copiado').textContent = 'No se pudo copiar el enlace'; }
        return;
    }
    const url = red === 'whatsapp' ? 'https://wa.me/?text=' + encodeURIComponent((d.titulo || '') + ' ' + enlace)
        : red === 'x' ? 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(d.titulo || '') + '&url=' + encodeURIComponent(enlace)
        : red === 'facebook' ? 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(enlace)
        : red === 'linkedin' ? 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(enlace)
        : null;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
});

window.abrirModal = (id, col, isUpdate = false) => {
    const d = window.postsData[id]; if(!d) return; window.modalActual = { id, col };
    
    if (!isUpdate) {
        try { updateDoc(doc(db, col, id), { vistas: increment(1) }).catch(()=>{}); } catch(e) {}
        
        if (col === 'formularios') {
            const cont = document.getElementById('mf-contenido');
            document.getElementById('mf-titulo').innerHTML = `<div class="skeleton-box w-75 mb-2" style="height: 40px; border-radius:8px;"></div>`;
            document.getElementById('mf-desc').innerHTML = `<div class="skeleton-box w-100 mt-2" style="height: 20px; border-radius:4px;"></div><div class="skeleton-box w-50 mt-1" style="height: 20px; border-radius:4px;"></div>`;
            document.getElementById('mf-req-text').style.display = 'none';
            document.getElementById('mf-banner').style.backgroundImage = 'none';
            document.getElementById('mf-banner').innerHTML = `<div class="skeleton-box w-100 h-100 rounded-top-4"></div>`;
            document.getElementById('mf-footer-container').style.display = 'none';
            cont.innerHTML = `<div class="mb-4 bg-white p-4 shadow-sm" style="border-radius: 12px;"><div class="skeleton-box w-50 mb-3" style="height:25px;"></div><div class="skeleton-box w-100 mb-2" style="height:45px;"></div></div>`.repeat(3);
            bootstrap.Modal.getOrCreateInstance(document.getElementById('modalFormulario')).show();
        } else if (col === 'noticias') {
            lectorScroll.scrollTop = 0;
            document.getElementById('mn-pie-editorial').hidden = true;
            document.getElementById('mn-tiempo-lectura').textContent = '';
            actualizarProgresoLectura();
            document.getElementById('mn-tags').innerHTML = `<div class="skeleton-box w-25" style="height:25px; border-radius:15px;"></div>`;
            document.getElementById('mn-titulo').innerHTML = `<div class="skeleton-box w-100 mb-2 mt-2" style="height:40px;"></div><div class="skeleton-box w-75" style="height:40px;"></div>`;
            document.getElementById('mn-fecha').innerHTML = `<div class="skeleton-box w-50" style="height:20px;"></div>`;
            document.getElementById('mn-promedio-estrellas').innerHTML = '';
            document.getElementById('mn-imagen').style.display = 'none';
            document.getElementById('mn-contenido').innerHTML = `<div class="skeleton-box w-100 mb-4 rounded-4" style="height:400px;"></div><div class="skeleton-box w-100 mb-2" style="height:20px;"></div><div class="skeleton-box w-100 mb-2" style="height:20px;"></div><div class="skeleton-box w-75" style="height:20px;"></div>`;
            document.getElementById('mn-lista-comentarios').innerHTML = '';
            bootstrap.Modal.getOrCreateInstance(document.getElementById('modalNoticia')).show();
        } else {
            document.getElementById('modal-tags').innerHTML = `<div class="skeleton-box w-25" style="height:25px; border-radius:15px;"></div>`;
            document.getElementById('modal-titulo').innerHTML = `<div class="skeleton-box w-100 mb-2 mt-2" style="height:40px;"></div><div class="skeleton-box w-75" style="height:40px;"></div>`;
            document.getElementById('modal-fecha').innerHTML = `<div class="skeleton-box w-50" style="height:20px;"></div>`;
            document.getElementById('modal-promedio-estrellas').innerHTML = '';
            document.getElementById('modal-imagen').style.display = 'none';
            document.getElementById('modal-iframe').style.display = 'none';
            document.getElementById('modal-left-col').classList.remove('d-none');
            document.getElementById('modal-left-col').classList.add('d-flex');
            document.getElementById('modal-left-col').innerHTML = `<div class="skeleton-box w-100 h-100 rounded-4"></div>`; 
            document.getElementById('modal-contenido').innerHTML = `<div class="skeleton-box w-100 mb-2 mt-4" style="height:20px;"></div><div class="skeleton-box w-100 mb-2" style="height:20px;"></div><div class="skeleton-box w-75" style="height:20px;"></div>`;
            document.getElementById('ml-lista-comentarios').innerHTML = '';
            bootstrap.Modal.getOrCreateInstance(document.getElementById('modalLectura')).show();
        }
    }

    const llenarDatosReales = () => {
        if (col === 'formularios') {
            document.getElementById('mf-banner').innerHTML = ''; document.getElementById('mf-req-text').style.display = 'block'; window.renderModalFormulario(id, d); 
        } else if (col === 'noticias') {
            const tagsHTML = (d.etiquetas||[]).map(t => `<span class="tag-badge" style="color: ${d.colorTag||'#004b79'}; border-color: #d1d5db;">${escapeHTML(t)}</span>`).join('');
            document.getElementById('mn-titulo').innerText = d.titulo; document.getElementById('mn-fecha').innerHTML = `<i class="bi bi-calendar3 me-2"></i> ${d.fecha ? d.fecha.toDate().toLocaleDateString() : ''}`; 
            document.getElementById('mn-promedio-estrellas').innerHTML = getPromedioStars(d.comentarios); document.getElementById('mn-tags').innerHTML = tagsHTML; 
            const imgEl = document.getElementById('mn-imagen'); if(d.imagen && d.imagen.length > 20) { imgEl.src = d.imagen; imgEl.style.display = 'block'; } else { imgEl.style.display = 'none'; } 
            document.getElementById('mn-contenido').innerHTML = d.contenido ? `<div class="contenido-apa">${d.contenido}</div>` : `<div class="contenido-apa">${escapeHTML(d.resumen||'')}</div>`;
            const palabras = (lectorContenido.textContent || '').trim().split(/\s+/).filter(Boolean).length;
            const minutos = Math.max(1, Math.ceil(palabras / 200));
            document.getElementById('mn-tiempo-lectura').innerHTML = `<i class="bi bi-clock" aria-hidden="true"></i> ${minutos} min de lectura`;
            const seccion = seccionesOpinion.find(s => s.id === d.seccionId);
            document.getElementById('mn-ruta-seccion').textContent = seccion ? seccion.nombre : 'Opinión';
            renderComentarios(d.comentarios, 'mn-lista-comentarios');
            renderPieLectura(id, d);
            requestAnimationFrame(actualizarProgresoLectura); 
        } else {
            const tagsHTML = (d.etiquetas||[]).map(t => `<span class="tag-badge" style="color: ${d.colorTag||'#004b79'}; border-color: #d1d5db;">${escapeHTML(t)}</span>`).join('');
            if(!isUpdate) document.getElementById('modal-left-col').innerHTML = `<img id="modal-imagen" src="" class="img-fluid w-100 rounded-4 mb-4 shadow-sm" style="max-height: 85vh; object-fit: contain; background-color: #fff; display: none;"><iframe id="modal-iframe" src="" class="w-100 rounded-3 shadow-sm bg-white" style="height: 85vh; border: 1px solid #dee2e6; display: none;"></iframe>`;
            document.getElementById('modal-titulo').innerText = d.titulo || d.pregunta; document.getElementById('modal-fecha').innerHTML = `<i class="bi bi-calendar3 me-2"></i> ${d.fecha ? d.fecha.toDate().toLocaleDateString() : ''}`; 
            document.getElementById('modal-promedio-estrellas').innerHTML = getPromedioStars(d.comentarios); document.getElementById('modal-tags').innerHTML = tagsHTML; 
            const imgEl = document.getElementById('modal-imagen'); const iframeEl = document.getElementById('modal-iframe'); const contEl = document.getElementById('modal-contenido'); const leftCol = document.getElementById('modal-left-col'); const rightCol = document.getElementById('modal-right-col'); let hasLeftContent = false; 
            if(d.imagen && d.imagen.length > 20) { imgEl.src = d.imagen; imgEl.style.display = 'block'; hasLeftContent = true; } else { imgEl.style.display = 'none'; } 
            if(d.link) { iframeEl.src = formatEmbedUrl(d.link); iframeEl.style.display = 'block'; hasLeftContent = true; } else { iframeEl.style.display = 'none'; iframeEl.src = ''; } 
            if(hasLeftContent) { leftCol.classList.remove('d-none'); leftCol.classList.add('d-flex'); rightCol.className = 'col-lg-5 h-100 overflow-y-auto bg-white px-4 py-4 d-flex flex-column'; rightCol.style.maxWidth = 'none'; } else { leftCol.classList.remove('d-flex'); leftCol.classList.add('d-none'); rightCol.className = 'col-12 h-100 overflow-y-auto bg-white px-4 px-md-5 py-4 py-md-5 d-flex flex-column mx-auto'; rightCol.style.maxWidth = '900px'; } 
            contEl.innerHTML = d.contenido ? `<div class="contenido-apa">${d.contenido}</div>` : `<div class="contenido-apa">${escapeHTML(d.resumen||'')}</div>`; 
            renderComentarios(d.comentarios, 'ml-lista-comentarios'); 
        }
    };

    if (isUpdate) llenarDatosReales(); else setTimeout(llenarDatosReales, 400);
};

const checkDeepLink = (id, col) => { if(autoOpenDone) return; const urlP = new URLSearchParams(window.location.search); const v = urlP.get('v'); let tId = urlP.get('p'), tCol = urlP.get('t'); if(v) { const parts = v.split('---'); if(parts.length===3){ tId = parts[1]; tCol = parts[2]; } } if(tId === id && tCol === col) { autoOpenDone = true; setTimeout(() => { abrirModal(id, col); }, 500); } }; let autoOpenDone = false;
const compressImg = (file) => new Promise((res) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = (e) => { const img = new Image(); img.src = e.target.result; img.onload = () => { const canvas = document.createElement('canvas'); const MAX = 2000; const scale = img.width > MAX ? MAX / img.width : 1; canvas.width = img.width * scale; canvas.height = img.height * scale; canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); res(canvas.toDataURL('image/jpeg', 0.95)); }; }; });

document.getElementById('not-imagen').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const imgEl = document.getElementById('cropper-image');
            imgEl.src = event.target.result;
            document.getElementById('cropper-container').style.display = 'block';
            if(window.noticiaCropper) { window.noticiaCropper.destroy(); }
            window.noticiaCropper = new Cropper(imgEl, {
                aspectRatio: 16 / 9, viewMode: 2, dragMode: 'move', autoCropArea: 1, restore: false, guides: true, center: true, highlight: false, cropBoxMovable: true, cropBoxResizable: true, toggleDragModeOnDblclick: false,
            });
        };
        reader.readAsDataURL(file);
    }
});


// Los cuadros de diálogo de TinyMCE (vínculos, tablas, imágenes) se montan
// fuera del modal. La excepción evita que el bloqueo de foco de Bootstrap
// impida escribir en ellos; no cambia el guardado de las publicaciones.
document.addEventListener('focusin', (event) => {
    if (document.getElementById('colNoticia').classList.contains('show') &&
        event.target.closest('.tox-tinymce-aux, .tox-dialog, .tox-menu, .tox-collection')) {
        event.stopImmediatePropagation();
    }
});
// Recalcular el ancho de TinyMCE cuando se muestra por primera vez el modal.
document.getElementById('colNoticia').addEventListener('shown.bs.modal', () => {
    window.dispatchEvent(new Event('resize'));
});

window.cancelarEdicion = () => { 
    window.editandoId = null; document.querySelectorAll('input:not([type="color"]), textarea').forEach(i => i.value = ''); if(tinymce.get('editor-noticias')) tinymce.get('editor-noticias').setContent(''); document.getElementById('not-principal').checked = false; document.getElementById('not-principal-seccion').checked = false; document.getElementById('not-seccion').value = ''; actualizarPrincipalPorSeccion(); document.getElementById('not-form-title').innerText = "Editor de Columnas"; document.getElementById('btn-pub-noticia').innerText = 'Publicar Columna'; 
    if(window.noticiaCropper) { window.noticiaCropper.destroy(); window.noticiaCropper = null; } const cropCont = document.getElementById('cropper-container'); if(cropCont) { cropCont.style.display = 'none'; document.getElementById('cropper-image').src = ''; } bootstrap.Modal.getInstance(document.getElementById('colNoticia'))?.hide(); bootstrap.Collapse.getInstance(document.getElementById('colArticulo'))?.hide(); 
};

// ==========================================
// FOOTER EN VIVO (Escucha la Base de Datos)
// ==========================================
onSnapshot(doc(db, "config", "footer"), (s) => { 
    if(s.exists()){ 
        const d = s.data(); 
        if(d.ubicacion) document.getElementById('f-ubicacion').innerHTML = escapeHTML(d.ubicacion).replace(/\n/g, "<br>"); 
        if(d.contacto) document.getElementById('f-contacto').innerHTML = escapeHTML(d.contacto).replace(/\n/g, "<br>"); 
        if(d.sobre) document.getElementById('f-sobre').innerHTML = escapeHTML(d.sobre).replace(/\n/g, "<br>"); 

        const updateLink = (idStr, valObj) => {
            if(valObj) {
                const elText = document.getElementById(idStr+'-text');
                const elUrl = document.getElementById(idStr+'-url');
                if(elText && valObj.text) elText.innerText = valObj.text;
                if(elUrl && valObj.url) elUrl.href = valObj.url;
            }
        };
        
        updateLink('f-link1', d.link1);
        updateLink('f-link2', d.link2);
        updateLink('f-link3', d.link3);
        updateLink('f-link4', d.link4);
        updateLink('f-link5', d.link5);
        updateLink('f-link6', d.link6);
        updateLink('f-btn1', d.btn1);
        updateLink('f-btn2', d.btn2);
        
        const fLink1Txt = (d.link1 && d.link1.text) ? d.link1.text.toLowerCase() : '';
        if(fLink1Txt.includes('cómo llegar') || fLink1Txt.includes('como llegar')) {
            document.getElementById('f-link1-icon').style.display = 'inline-block';
        } else {
            document.getElementById('f-link1-icon').style.display = 'none';
        }
    } 
});


// Navegación recibida desde /informe: abrir la pestaña solicitada.
// Si se abre la portada normalmente o se comparte un artículo, no altera su comportamiento.
const enlaceDesdeInforme = new URLSearchParams(window.location.search);
const pestañaDesdeInforme = enlaceDesdeInforme.has('v') ? '' : enlaceDesdeInforme.get('cafeTab');
document.querySelectorAll('button[data-bs-toggle="pill"]').forEach(btn => { 
    btn.addEventListener('shown.bs.tab', (e) => { 
        const target = e.target.getAttribute('data-bs-target'); currentTab = target.replace('#', '');
        document.querySelectorAll('button[data-bs-toggle="pill"]').forEach(b => b.classList.remove('active')); document.querySelectorAll(`button[data-bs-target="${target}"]`).forEach(tBtn => tBtn.classList.add('active')); window.scrollTo({ top: 0, behavior: 'smooth' }); updateReputationVisibility();
    }); 
});

// Se activa después de registrar los eventos de Bootstrap para sincronizar ambas barras.
if (['columnas', 'investigacion', 'ensayos'].includes(pestañaDesdeInforme)) {
    const botonDestino = document.querySelector(`#pills-tab button[data-bs-target="#${pestañaDesdeInforme}"]`);
    if (botonDestino) bootstrap.Tab.getOrCreateInstance(botonDestino).show();
}

const normalizarBusqueda = (valor) => (valor == null ? '' : String(valor)).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
let noticiasData = []; let noticiasCargadas = false; let qBuscar = ''; let ordDesc = true; document.getElementById('input-buscar').addEventListener('input', (e) => { qBuscar = normalizarBusqueda(e.target.value); renderNoticias(); }); document.getElementById('btn-ordenar').addEventListener('click', () => { ordDesc = !ordDesc; document.getElementById('btn-ordenar').innerText = ordDesc ? 'Ordenar: Recientes ↓' : 'Ordenar: Antiguos ↑'; renderNoticias(); }); 

// ==========================================
// SECCIONES DE ARTÍCULOS Y OPINIÓN
// Los nombres viven en "secciones_opinion" y se asignan por ID estable.
// "principal" sigue siendo la portada general; "principalSeccion" es independiente.
// ==========================================
let seccionesOpinion = [];
let seccionOpinionActiva = '';
const selectorEditorOpinion = document.getElementById('not-seccion');
const selectorMovilOpinion = document.getElementById('opinion-secciones-movil');
const menuOpinion = document.getElementById('menu-secciones-opinion');

function actualizarPrincipalPorSeccion() {
    const tieneSeccion = Boolean(selectorEditorOpinion.value);
    const checkbox = document.getElementById('not-principal-seccion');
    checkbox.disabled = !tieneSeccion;
    if (!tieneSeccion) checkbox.checked = false;
    document.getElementById('not-principal-seccion-ayuda').textContent = tieneSeccion
        ? 'Solo será principal dentro de la sección seleccionada; no afecta a la portada general.'
        : 'Selecciona una sección para activar esta opción.';
}
selectorEditorOpinion.addEventListener('change', () => {
    document.getElementById('not-principal-seccion').checked = false;
    actualizarPrincipalPorSeccion();
});

function cambiarSeccionOpinion(id = '') {
    seccionOpinionActiva = id && seccionesOpinion.some(s => s.id === id) ? id : '';
    const actual = seccionesOpinion.find(s => s.id === seccionOpinionActiva);
    const filtro = document.getElementById('opinion-filtro-activo');
    filtro.classList.toggle('d-none', !actual);
    document.getElementById('opinion-nombre-seccion').textContent = actual ? actual.nombre : '';
    selectorMovilOpinion.value = seccionOpinionActiva;
    menuOpinion.querySelectorAll('[data-seccion-opinion]').forEach(btn => {
        const activo = btn.dataset.seccionOpinion === seccionOpinionActiva;
        btn.classList.toggle('active', activo);
        btn.setAttribute('aria-current', activo ? 'true' : 'false');
    });
    renderNoticias();
}

// El botón padre siempre muestra TODAS las columnas, no una sección anterior.
['nav-opinion-general', 'nav-opinion-mobile', 'opinion-ver-todas'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => cambiarSeccionOpinion(''));
});
selectorMovilOpinion.addEventListener('change', e => cambiarSeccionOpinion(e.target.value));
menuOpinion.addEventListener('click', event => {
    const btn = event.target.closest('[data-seccion-opinion]');
    if (!btn) return;
    const tab = document.getElementById('nav-opinion-general');
    // Mostrar la pestaña aunque se haya navegado a Papers o Encuestas.
    bootstrap.Tab.getOrCreateInstance(tab).show();
    cambiarSeccionOpinion(btn.dataset.seccionOpinion);
});

// Solo cambia la presentación del menú; la selección y el filtrado siguen intactos.
function renderizarMenuSeccionesOpinion() {
    menuOpinion.innerHTML = `
        <div class="opinion-submenu-options">
            <button type="button" class="opinion-submenu-link opinion-submenu-general" data-seccion-opinion="">
                <span class="opinion-submenu-icon"><i class="bi bi-grid-1x2" aria-hidden="true"></i></span>
                <span class="opinion-submenu-label">Todas las columnas</span>
                <i class="bi bi-check-lg opinion-submenu-indicator" aria-hidden="true"></i>
            </button>
            ${seccionesOpinion.length ? '<span class="opinion-submenu-section-title">Secciones</span>' : ''}
            ${seccionesOpinion.map(s => `
                <button type="button" class="opinion-submenu-link" data-seccion-opinion="${escapeHTML(s.id)}">
                    <span class="opinion-submenu-icon"><i class="bi bi-bookmark" aria-hidden="true"></i></span>
                    <span class="opinion-submenu-label">${escapeHTML(s.nombre)}</span>
                    <i class="bi bi-chevron-right opinion-submenu-indicator" aria-hidden="true"></i>
                    <i class="bi bi-check-lg opinion-submenu-indicator" aria-hidden="true"></i>
                </button>`).join('')}
        </div>`;
}

onSnapshot(collection(db, 'secciones_opinion'), snapshot => {
    seccionesOpinion = snapshot.docs.map(d => ({ id: d.id, nombre: d.data().nombre || 'Sin nombre' }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

    const anteriorEditor = selectorEditorOpinion.value;
    const opciones = seccionesOpinion.map(s => `<option value="${escapeHTML(s.id)}">${escapeHTML(s.nombre)}</option>`).join('');
    selectorEditorOpinion.innerHTML = '<option value="">General (sin sección específica)</option>' + opciones;
    selectorEditorOpinion.value = seccionesOpinion.some(s => s.id === anteriorEditor) ? anteriorEditor : '';
    actualizarPrincipalPorSeccion();

    selectorMovilOpinion.innerHTML = '<option value="">Todas las columnas</option>' + opciones;
    renderizarMenuSeccionesOpinion();
    // Si se borra una sección, volver automáticamente a Todas las columnas.
    cambiarSeccionOpinion(seccionOpinionActiva);
    const seccionDesdeInforme = enlaceDesdeInforme.get('cafeSeccion');
    if (pestañaDesdeInforme === 'columnas' && seccionDesdeInforme && seccionesOpinion.some(s => s.id === seccionDesdeInforme)) {
        cambiarSeccionOpinion(seccionDesdeInforme);
        // Respetar las selecciones posteriores del usuario aunque Firestore se actualice.
        enlaceDesdeInforme.delete('cafeSeccion');
    }
}, error => {
    console.error('No se pudieron cargar las secciones de opinión:', error);
    selectorMovilOpinion.innerHTML = '<option value="">Todas las columnas</option>';
    seccionesOpinion = [];
    renderizarMenuSeccionesOpinion();
});

document.getElementById('btn-pub-noticia').onclick = async () => {
    const boton = document.getElementById('btn-pub-noticia');
    const titulo = document.getElementById('not-titulo').value.trim();
    if (!titulo) return alert('Falta el titular.');
    const seccionId = selectorEditorOpinion.value || null;
    if (seccionId && !seccionesOpinion.some(s => s.id === seccionId)) {
        return alert('La sección ya no existe. Selecciona otra antes de guardar.');
    }
    const etiquetas = document.getElementById('not-tags').value
        ? document.getElementById('not-tags').value.split(',').map(t => t.trim()).filter(Boolean)
        : ['Opinión'];
    const esPrincipalGeneral = document.getElementById('not-principal').checked;
    const esPrincipalSeccion = Boolean(seccionId && document.getElementById('not-principal-seccion').checked);
    boton.disabled = true;
    try {
        let imgFinal = '';
        const imgFile = document.getElementById('not-imagen').files[0];
        if (window.noticiaCropper) {
            imgFinal = window.noticiaCropper.getCroppedCanvas({ maxWidth: 1280, maxHeight: 720 }).toDataURL('image/jpeg', 0.9);
        } else if (imgFile) {
            imgFinal = await compressImg(imgFile);
        } else if (window.editandoId && window.postsData[window.editandoId]?.imagen) {
            imgFinal = window.postsData[window.editandoId].imagen;
        }

        const data = {
            titulo, etiquetas, colorTag: document.getElementById('not-color').value,
            imagen: imgFinal, principal: esPrincipalGeneral,
            principalSeccion: esPrincipalSeccion, seccionId,
            contenido: tinymce.get('editor-noticias').getContent()
        };
        const batch = writeBatch(db);
        // Solo se retira la marca dentro del ámbito seleccionado.
        noticiasData.forEach(n => {
            if (n.id === window.editandoId) return;
            const updates = {};
            if (esPrincipalGeneral && n.principal) updates.principal = false;
            if (esPrincipalSeccion && n.seccionId === seccionId && n.principalSeccion) updates.principalSeccion = false;
            if (Object.keys(updates).length) batch.update(doc(db, 'noticias', n.id), updates);
        });
        if (window.editandoId) {
            batch.update(doc(db, 'noticias', window.editandoId), data);
        } else {
            batch.set(doc(collection(db, 'noticias')), {
                ...data, fecha: serverTimestamp(), comentarios: [], vistas: 0
            });
        }
        await batch.commit();
        cancelarEdicion();
    } catch (error) {
        console.error('Error al publicar la columna:', error);
        alert('No se pudo guardar la columna. Revisa tu conexión y los permisos de Firestore.');
    } finally {
        boton.disabled = false;
    }
};

onSnapshot(collection(db, "noticias"), (snap) => { noticiasData = []; snap.forEach(d => { noticiasData.push({id: d.id, ...d.data()}); window.postsData[d.id] = d.data(); checkDeepLink(d.id, 'noticias'); }); noticiasCargadas = true; renderNoticias(); if(window.modalActual.col === 'noticias' && window.modalActual.id) abrirModal(window.modalActual.id, 'noticias', true); }, (error) => {
    console.error('Error al cargar las columnas:', error);
    noticiasCargadas = true;
    const principal = document.getElementById('contenedor-noticia-principal');
    principal.setAttribute('aria-busy', 'false');
    principal.replaceChildren();
    document.getElementById('contenedor-noticias-lista').innerHTML = '<div class="text-center text-muted">No se pudieron cargar las columnas.</div>';
});

function renderNoticias() {
    // El cambio de secciones no debe retirar el esqueleto antes de la primera respuesta de noticias.
    if (!noticiasCargadas) return;
    document.getElementById('contenedor-noticia-principal').setAttribute('aria-busy', 'false');
    let filtradas = noticiasData.filter(n => (!seccionOpinionActiva || n.seccionId === seccionOpinionActiva) && (normalizarBusqueda(n.titulo).includes(qBuscar) || normalizarBusqueda(n.contenido).includes(qBuscar) || normalizarBusqueda(Array.isArray(n.etiquetas) ? n.etiquetas.join(' ') : n.etiquetas).includes(qBuscar))); 
    let principalDefinitiva = null; const principales = filtradas.filter(n => seccionOpinionActiva ? n.principalSeccion : n.principal);
    if (principales.length > 0) { principales.sort((a,b) => { let tA = a.fecha?.toMillis()||0; let tB = b.fecha?.toMillis()||0; return tB - tA; }); principalDefinitiva = principales[0]; }
    filtradas.sort((a,b) => { let tA = a.fecha?.toMillis()||0; let tB = b.fecha?.toMillis()||0; return ordDesc ? tB - tA : tA - tB; }); 
    const cLista = document.getElementById('contenedor-noticias-lista'); const cPrinc = document.getElementById('contenedor-noticia-principal'); 
    if (filtradas.length === 0) { cPrinc.innerHTML=''; cLista.innerHTML='<div class="text-center text-muted">No hay resultados.</div>'; return; } 
    let hLista = ''; let hPrinc = ''; 
    filtradas.forEach(d => { 
        const date = d.fecha ? d.fecha.toDate().toLocaleDateString() : 'Reciente'; const avgStr = getPromedioStars(d.comentarios); const textoLimpioPreview = (d.contenido || '').replace(/<[^>]*>?/gm, ''); 

        if (principalDefinitiva && d.id === principalDefinitiva.id) { 
            const tHTMLPrincipal = (d.etiquetas||[]).map(t => `<span class="badge border text-secondary bg-transparent rounded-1 me-2 px-2 py-1 font-inter" style="border-color: #cbd5e1 !important; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">${escapeHTML(t)}</span>`).join('');
            const imgP = d.imagen ? `<img src="${d.imagen}" class="img-fluid w-100 rounded-3 shadow-sm cursor-pointer opinion-principal-media" style="object-fit: cover; background-color: #f1f3f5;" onclick="abrirModal('${d.id}', 'noticias')">` : `<div class="w-100 rounded-3 shadow-sm d-flex align-items-center justify-content-center bg-light text-muted border cursor-pointer opinion-principal-media" onclick="abrirModal('${d.id}', 'noticias')"><i class="bi bi-image fs-1"></i></div>`; 
            hPrinc = `<div class="card border-0 shadow-sm rounded-4 mb-4 p-3 bg-white mx-auto" style="border: 1px solid #e2e8f0 !important; max-width: 100%;"><div class="row g-0 align-items-center"><div class="col-lg-7 pe-lg-4 mb-4 mb-lg-0">${imgP}</div><div class="col-lg-5 ps-lg-2 pe-lg-3 d-flex flex-column h-100"><div class="mb-3">${tHTMLPrincipal}</div><h2 class="fw-bold mb-3 font-serif cursor-pointer text-dark" style="font-size: 2.2rem; line-height: 1.25;" onclick="abrirModal('${d.id}', 'noticias')">${d.titulo}</h2><div class="text-secondary mb-4 text-truncate-3 font-inter" style="font-size: 1.05rem; line-height: 1.6;">${textoLimpioPreview}</div><div class="d-flex justify-content-between align-items-center mt-auto pt-2"><small class="text-muted fw-semibold font-inter"><i class="bi bi-calendar3 me-1"></i> ${date} <span class="ms-2">${avgStr}</span></small><small class="text-muted fw-semibold cursor-pointer font-inter hover-text-primary" onclick="compartir('${d.id}', 'noticias')"><i class="bi bi-share me-1"></i> Compartir</small></div></div></div></div><div style="height: 2px; background-color: #009668; width: 100%; margin-bottom: 2.5rem; opacity: 0.3;"></div>`; 
        } 
        
        const tHTMLLista = (d.etiquetas||[]).map(t => `<span class="tag-badge" style="color: ${d.colorTag||'#004b79'}; border-color: #d1d5db;">${escapeHTML(t)}</span>`).join('');
        const imgH = d.imagen ? `<img src="${d.imagen}" class="post-img-rect shadow-sm" onclick="abrirModal('${d.id}', 'noticias')">` : `<div class="post-img-rect bg-light d-flex align-items-center justify-content-center text-muted border shadow-sm" onclick="abrirModal('${d.id}', 'noticias')"><i class="bi bi-image fs-1"></i></div>`; 
        hLista += `<div class="card border-0 border-bottom rounded-0 mb-4 pb-4 bg-transparent"><div class="row g-4 align-items-center"><div class="col-md-5">${imgH}</div><div class="col-md-7 d-flex flex-column"><div class="d-flex justify-content-between mb-2"><div>${tHTMLLista}</div><div><i class="bi bi-share text-muted me-2 cursor-pointer" onclick="compartir('${d.id}', 'noticias')"></i><i class="bi bi-pencil-fill text-warning me-2 admin-only-inline cursor-pointer" onclick="editarNoticia('${d.id}')"></i><i class="bi bi-trash text-danger admin-only-inline cursor-pointer" onclick="borrarPost('noticias', '${d.id}')"></i></div></div><h3 class="fw-bold mb-2 text-truncate-2 cursor-pointer font-serif text-dark" style="font-size: 1.5rem;" onclick="abrirModal('${d.id}', 'noticias')">${d.titulo}</h3><small class="text-muted fw-semibold mt-1 d-flex align-items-center"><i class="bi bi-calendar3 me-1"></i> ${date} <span class="ms-2">${avgStr}</span></small></div></div></div>`;
    }); 
    cPrinc.innerHTML = principalDefinitiva ? hPrinc : ''; cLista.innerHTML = hLista; 
}
window.editarNoticia = (id) => { const d = window.postsData[id]; document.getElementById('not-titulo').value = d.titulo; document.getElementById('not-tags').value = (d.etiquetas||[]).join(', '); document.getElementById('not-color').value = d.colorTag || '#004b79'; document.getElementById('not-principal').checked = !!d.principal; selectorEditorOpinion.value = seccionesOpinion.some(s => s.id === d.seccionId) ? d.seccionId : ''; actualizarPrincipalPorSeccion(); document.getElementById('not-principal-seccion').checked = !!d.principalSeccion && !!selectorEditorOpinion.value; if(tinymce.get('editor-noticias')) tinymce.get('editor-noticias').setContent(d.contenido || ''); window.editandoId = id; document.getElementById('not-form-title').innerText = "Editando Columna"; document.getElementById('btn-pub-noticia').innerText = "Guardar"; bootstrap.Modal.getOrCreateInstance(document.getElementById('colNoticia')).show(); };

document.getElementById('btn-pub-articulo').onclick = async () => { const t = document.getElementById('art-titulo').value; const l = document.getElementById('art-link').value; if(!t||!l) return alert("Falta Título o Link."); const et = document.getElementById('art-tags').value ? document.getElementById('art-tags').value.split(',').map(x=>x.trim()).filter(Boolean) : ['Paper']; const data = { titulo: t, link: l, resumen: document.getElementById('art-resumen').value, etiquetas: et, colorTag: document.getElementById('art-color').value, vistas: 0 }; if(window.editandoId) await updateDoc(doc(db, "articulos", window.editandoId), data); else { data.fecha = serverTimestamp(); data.comentarios = []; await addDoc(collection(db, "articulos"), data); } cancelarEdicion(); };
onSnapshot(query(collection(db, "articulos"), orderBy("fecha", "desc")), (snap) => { const cont = document.getElementById('contenedor-articulos'); if(snap.empty) return cont.innerHTML = '<div class="col-12 text-center text-muted font-inter">No hay papers.</div>'; let h = ''; snap.forEach(d => { const data = d.data(); window.postsData[d.id] = data; checkDeepLink(d.id, 'articulos'); const date = data.fecha ? data.fecha.toDate().toLocaleDateString() : ''; const avgStr = getPromedioStars(data.comentarios); const tHTML = (data.etiquetas||[]).map(t => `<span class="tag-badge" style="color: ${data.colorTag||'#004b79'}; border-color: #d1d5db;">${escapeHTML(t)}</span>`).join(''); h += `<article class="col-12 mb-5 pb-4 border-bottom border-light-subtle"><div class="row align-items-start"><div class="col-md-2 col-4 cursor-pointer" onclick="abrirModal('${d.id}', 'articulos')"><div class="paper-cover mx-auto rounded-1"><i class="bi bi-file-earmark-pdf-fill text-secondary fs-1"></i><div class="mt-2" style="width: 80%; height: 3px; background: #e2e8f0; border-radius: 2px;"></div><div class="mt-1" style="width: 60%; height: 3px; background: #e2e8f0; border-radius: 2px;"></div><div class="mt-auto" style="width: 40%; height: 4px; background: #cbd5e1; border-radius: 2px;"></div></div></div><div class="col-md-10 col-8 d-flex flex-column h-100 ps-md-4"><div class="d-flex justify-content-between align-items-start mb-2"><div>${tHTML} <span class="badge bg-secondary ms-1 fw-semibold font-inter" style="letter-spacing: 0.5px;">Acceso Abierto</span></div><div class="text-nowrap ms-3"><i class="bi bi-share-fill text-primary cursor-pointer me-3" onclick="compartir('${d.id}', 'articulos')"></i><i class="bi bi-pencil-fill text-warning me-3 admin-only-inline cursor-pointer" onclick="editarArt('${d.id}')"></i><i class="bi bi-trash-fill text-danger admin-only-inline cursor-pointer" onclick="borrarPost('articulos', '${d.id}')"></i></div></div><a href="javascript:void(0)" onclick="abrirModal('${d.id}', 'articulos')" class="paper-title-link fw-bold font-serif mb-1" style="font-size: 1.45rem;">${d.data().titulo}</a><div class="text-muted small mb-3 font-inter">${data.fecha ? '(Publicado el ' + data.fecha.toDate().toLocaleDateString() + ')' : ''}</div><p class="text-muted mb-3 font-inter text-truncate-3" style="font-size: 1.05rem; line-height: 1.6;">${escapeHTML(data.resumen)}</p><div class="mt-auto d-flex align-items-center"><button class="btn btn-sm text-primary fw-bold font-inter rounded-pill me-3 shadow-sm" style="border: 1px solid #004b79; color:#004b79!important;" onclick="abrirModal('${d.id}', 'articulos')">Leer documento <i class="bi bi-arrow-right ms-1"></i></button><span class="ms-2">${avgStr}</span></div></div></div></article>`; }); cont.innerHTML = h; if(window.modalActual.col === 'articulos' && window.modalActual.id) abrirModal(window.modalActual.id, 'articulos', true); });
window.editarArt = (id) => { const d = window.postsData[id]; document.getElementById('art-titulo').value = d.titulo; document.getElementById('art-link').value = d.link; document.getElementById('art-tags').value = (d.etiquetas||[]).join(', '); document.getElementById('art-color').value = d.colorTag || '#004b79'; document.getElementById('art-resumen').value = d.resumen; window.editandoId = id; bootstrap.Collapse.getOrCreateInstance(document.getElementById('colArticulo')).show(); window.scrollTo(0,0); };

onSnapshot(doc(db, "config", "reputacion"), (s) => { if(s.exists() && s.data().requerida !== undefined) { reqReputacion = s.data().requerida; const reqEl = document.getElementById('req-rep-text'); if(reqEl) reqEl.innerText = reqReputacion; } });

document.getElementById('btn-iniciar-crear-form').onclick = () => { const isOwner = document.body.classList.contains('is-owner'); if (!isOwner && userReputacion < reqReputacion) { alert(`☕ Necesitas al menos ${reqReputacion} puntos de reputación para publicar encuestas y debates.\n\nActualmente tienes ${userReputacion} cafecitos.\n\n¡Gana +5 de reputación aportando tus respuestas a la comunidad!`); return; } window.editandoFormId = null; document.getElementById('form-header-title').innerText = "Nuevo Formulario"; document.getElementById('btn-pub-formulario').innerText = "Publicar y Activar"; document.getElementById('form-titulo').value = ''; document.getElementById('form-desc').value = ''; document.getElementById('form-fecha').value = ''; document.getElementById('form-imagen').value = ''; document.getElementById('contenedor-preguntas-builder').innerHTML = ''; numPreguntasForm = 0; numPaginasForm = 0; window.agregarPreguntaFormBuilder(); bootstrap.Collapse.getOrCreateInstance(document.getElementById('colFormulario')).toggle(); };
window.editarReqReputacion = async () => { const val = prompt("¿Cuántos puntos de reputación se necesitan para crear una encuesta?", reqReputacion); if(val !== null && !isNaN(parseInt(val))) { await setDoc(doc(db, "config", "reputacion"), { requerida: parseInt(val) }, { merge: true }); alert("Configuración de reputación actualizada."); } };
window.cancelarEdicionFormulario = () => { window.editandoFormId = null; document.getElementById('form-titulo').value = ''; document.getElementById('form-desc').value = ''; document.getElementById('form-fecha').value = ''; document.getElementById('form-imagen').value = ''; document.getElementById('contenedor-preguntas-builder').innerHTML = ''; numPreguntasForm = 0; numPaginasForm = 0; bootstrap.Collapse.getInstance(document.getElementById('colFormulario'))?.hide(); };
let numPreguntasForm = 0;
let numPaginasForm = 0;

function paginasEnEditor() {
    return [...document.querySelectorAll('#contenedor-preguntas-builder > .gform-builder-page')];
}
function actualizarNumeracionPaginasForm() {
    const paginas = paginasEnEditor();
    paginas.forEach((p, i) => {
        p.querySelector('.gform-page-count').textContent = `Sección ${i + 1} de ${paginas.length}`;
        p.querySelector('.gform-page-up').disabled = i === 0;
        p.querySelector('.gform-page-down').disabled = i === paginas.length - 1;
        p.querySelector('.gform-page-remove').disabled = paginas.length === 1;
    });
}
window.agregarSeccionFormBuilder = (data = null) => {
    const id = data?.id || `pg_${Date.now().toString(36)}_${++numPaginasForm}`;
    const section = document.createElement('section');
    section.className = 'gform-builder-page';
    section.dataset.pageId = id;
    section.innerHTML = `
        <div class="gform-builder-page-head">
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                <span class="gform-page-count">Sección</span>
                <div class="d-flex align-items-center gap-1">
                    <button type="button" class="btn btn-sm btn-outline-secondary gform-page-up" onclick="moverSeccionFormBuilder(this, -1)" title="Subir sección" aria-label="Subir sección"><i class="bi bi-arrow-up"></i></button>
                    <button type="button" class="btn btn-sm btn-outline-secondary gform-page-down" onclick="moverSeccionFormBuilder(this, 1)" title="Bajar sección" aria-label="Bajar sección"><i class="bi bi-arrow-down"></i></button>
                    <button type="button" class="btn btn-sm btn-outline-danger gform-page-remove" onclick="eliminarSeccionFormBuilder(this)" title="Eliminar sección" aria-label="Eliminar sección"><i class="bi bi-trash"></i></button>
                </div>
            </div>
            <input type="text" class="form-control form-control-lg gform-page-title fw-bold shadow-none mb-2" maxlength="130" value="${escapeHTML(data?.titulo || '')}" placeholder="Título de la sección (ej.: Datos generales)">
            <textarea class="form-control gform-page-description shadow-none" rows="2" maxlength="600" placeholder="Descripción o instrucciones de esta sección (opcional)">${escapeHTML(data?.descripcion || '')}</textarea>
            <p class="small text-secondary font-inter mt-2 mb-0">Al responder, esta sección aparecerá como una página independiente.</p>
        </div>
        <div class="gform-page-questions"></div>
        <div class="d-flex justify-content-center my-3">
            <button type="button" class="btn btn-outline-secondary bg-white rounded-pill fw-semibold px-3" onclick="agregarPreguntaFormBuilder(null, this.closest('.gform-builder-page').dataset.pageId)"><i class="bi bi-plus-circle me-1"></i> Añadir pregunta aquí</button>
        </div>`;
    document.getElementById('contenedor-preguntas-builder').appendChild(section);
    actualizarNumeracionPaginasForm();
    return section;
};
window.moverSeccionFormBuilder = (button, delta) => {
    const page = button.closest('.gform-builder-page');
    const sibling = delta < 0 ? page.previousElementSibling : page.nextElementSibling;
    if (!sibling?.classList.contains('gform-builder-page')) return;
    if (delta < 0) sibling.before(page); else sibling.after(page);
    actualizarNumeracionPaginasForm();
};
window.eliminarSeccionFormBuilder = (button) => {
    const page = button.closest('.gform-builder-page');
    const pages = paginasEnEditor();
    if (pages.length < 2) return alert('Debe existir al menos una sección.');
    const target = page.previousElementSibling?.classList.contains('gform-builder-page')
        ? page.previousElementSibling : page.nextElementSibling;
    const questions = [...page.querySelectorAll('.builder-q-block')];
    if (!confirm(questions.length
        ? '¿Eliminar esta sección? Sus preguntas se moverán a la sección contigua sin perderse.'
        : '¿Eliminar esta sección?')) return;
    const receiver = target.querySelector('.gform-page-questions');
    questions.forEach(q => receiver.appendChild(q));
    page.remove();
    actualizarNumeracionPaginasForm();
};
document.addEventListener('focusin', function(e) { if(e.target.closest('.builder-q-block')) { document.querySelectorAll('.builder-q-block').forEach(b => b.classList.remove('gform-block-active')); e.target.closest('.builder-q-block').classList.add('gform-block-active'); } });
window.prevQImg = (input) => { if(input.files && input.files[0]){ let reader = new FileReader(); reader.onload = function(e){ let img = input.parentElement.parentElement.querySelector('.q-img-preview'); img.src = e.target.result; img.style.display = 'block'; }; reader.readAsDataURL(input.files[0]); } };
window.agregarPreguntaFormBuilder = (qData = null, paginaId = null) => {
    let pagina = paginaId ? paginasEnEditor().find(p => p.dataset.pageId === paginaId) : null;
    if (!pagina) pagina = document.activeElement?.closest('.gform-builder-page') || paginasEnEditor().at(-1);
    if (!pagina) pagina = window.agregarSeccionFormBuilder();
    numPreguntasForm++; const div = document.createElement('div'); div.className = 'builder-q-block position-relative bg-white p-4 border mb-3 shadow-sm'; div.id = `q-block-${numPreguntasForm}`; div.dataset.questionId = qData?.id || `pq_${Date.now().toString(36)}_${numPreguntasForm}`; div.style.borderRadius = "8px"; div.style.borderLeft = "1px solid #dee2e6"; const t = qData ? qData.titulo : ''; const desc = (qData && qData.desc) ? qData.desc : ''; const type = qData ? qData.tipo : 'radio'; const opts = (qData && qData.opciones) ? qData.opciones.join(', ') : ''; const req = qData ? qData.obligatoria : false; const img = qData ? qData.imagen : ''; div.innerHTML = ` <div class="row g-3 align-items-start mb-2"> <div class="col-md-7"> <input type="text" class="form-control fw-bold q-title font-inter bg-light border-0 border-bottom border-2 border-secondary rounded-0 shadow-none px-3 py-2 mb-2" placeholder="Pregunta" value="${escapeHTML(t)}"> <input type="text" class="form-control text-muted q-desc font-inter bg-transparent border-0 border-bottom border-1 border-light shadow-none px-2 py-1 small" placeholder="Descripción (opcional)" style="font-size: 0.85rem;" value="${escapeHTML(desc)}"> </div> <div class="col-md-4"> <select class="form-select q-type font-inter bg-white border shadow-sm py-2" onchange="toggleQOpts(this)"> <option value="text" ${type==='text'?'selected':''}>⚏ Respuesta corta</option> <option value="textarea" ${type==='textarea'?'selected':''}>☰ Párrafo</option> <option value="radio" ${type==='radio'?'selected':''}>◉ Varias opciones</option> <option value="checkbox" ${type==='checkbox'?'selected':''}>☑ Casillas</option> <option value="select" ${type==='select'?'selected':''}>▽ Desplegable</option> <option value="scale" ${type==='scale'?'selected':''}>⟷ Escala lineal</option> <option value="date" ${type==='date'?'selected':''}>📅 Fecha</option> <option value="time" ${type==='time'?'selected':''}>🕒 Hora</option> </select> </div> <div class="col-md-1 d-flex flex-column align-items-end gap-2"> <button type="button" class="btn btn-sm btn-light border-0 text-secondary hover-bg-light" onclick="duplicarPregunta(this)" title="Duplicar"><i class="bi bi-copy fs-5"></i></button> <button type="button" class="btn btn-sm btn-light border-0 text-danger hover-bg-light" onclick="this.parentElement.parentElement.parentElement.remove()" title="Eliminar"><i class="bi bi-trash fs-5"></i></button> </div> </div> <div class="mb-3 ps-2"> <input type="text" class="form-control q-opts font-inter bg-white border shadow-sm py-2" placeholder="Opciones (separadas por comas, ej: Sí, No, Tal vez)" value="${escapeHTML(opts)}" style="${['text', 'textarea', 'date', 'time', 'scale'].includes(type) ? 'display:none;' : ''}"> </div> <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top"> <div class="d-flex align-items-center"> <label class="btn btn-sm btn-outline-secondary font-inter rounded-pill me-3 shadow-sm cursor-pointer px-3"> <i class="bi bi-image me-1"></i> Añadir Imagen <input type="file" class="q-img-input d-none" accept="image/*" onchange="prevQImg(this)"> </label> <img class="q-img-preview rounded shadow-sm border" style="height: 40px; object-fit: cover; ${img ? 'display:block;' : 'display:none;'}" src="${img}"> <input type="hidden" class="q-img-existing" value="${img}"> </div> <div class="form-check form-switch mb-0 d-flex align-items-center"> <label class="form-check-label font-inter small fw-bold text-dark cursor-pointer me-2" for="req_${numPreguntasForm}">Obligatorio</label> <input class="form-check-input q-req cursor-pointer m-0 fs-5" type="checkbox" role="switch" id="req_${numPreguntasForm}" ${req?'checked':''}> </div> </div> `; pagina.querySelector('.gform-page-questions').appendChild(div); };
window.duplicarPregunta = (btn) => { const block = btn.closest('.builder-q-block'); const pTitulo = block.querySelector('.q-title').value; const pDesc = block.querySelector('.q-desc').value; const pType = block.querySelector('.q-type').value; const pOpts = block.querySelector('.q-opts').value; const pReq = block.querySelector('.q-req').checked; const pImgSrc = block.querySelector('.q-img-preview').src; const existImg = block.querySelector('.q-img-existing').value; let finalImg = ''; if (pImgSrc && pImgSrc.length > 100) finalImg = pImgSrc; else if (existImg) finalImg = existImg; window.agregarPreguntaFormBuilder({ titulo: pTitulo ? pTitulo + " (Copia)" : "Copia", desc: pDesc, tipo: pType, opciones: pOpts ? pOpts.split(',').map(s=>s.trim()) : [], obligatoria: pReq, imagen: finalImg }, block.closest('.gform-builder-page')?.dataset.pageId); };
window.toggleQOpts = (selectEl) => { const inputOpts = selectEl.parentElement.parentElement.nextElementSibling.querySelector('.q-opts'); if(['text', 'textarea', 'date', 'time', 'scale'].includes(selectEl.value)) { inputOpts.style.display = 'none'; } else { inputOpts.style.display = 'block'; } };
window.editarFormulario = (id) => { const data = window.postsData[id]; if(!data) return; window.editandoFormId = id; document.getElementById('form-header-title').innerText = "Editando Formulario"; document.getElementById('btn-pub-formulario').innerText = "Guardar Cambios"; document.getElementById('form-titulo').value = data.titulo || ''; document.getElementById('form-desc').value = data.descripcion || ''; if(data.fechaLimite) { const d = new Date(data.fechaLimite); document.getElementById('form-fecha').value = d.toISOString().split('T')[0]; } else { document.getElementById('form-fecha').value = ''; } document.getElementById('contenedor-preguntas-builder').innerHTML = ''; numPreguntasForm = 0; numPaginasForm = 0;
    const paginas = Array.isArray(data.paginas) && data.paginas.length ? data.paginas : [{ id: 'pagina_unica', titulo: '', descripcion: '' }];
    paginas.forEach(p => window.agregarSeccionFormBuilder(p));
    if (data.preguntas?.length) {
        data.preguntas.forEach(q => window.agregarPreguntaFormBuilder(q, paginas.some(p => p.id === q.paginaId) ? q.paginaId : paginas[0].id));
    } else { window.agregarPreguntaFormBuilder(null, paginas[0].id); }
    bootstrap.Collapse.getOrCreateInstance(document.getElementById('colFormulario')).show(); window.scrollTo({ top: document.getElementById('colFormulario').offsetTop - 100, behavior: 'smooth' }); };
document.getElementById('btn-pub-formulario').onclick = async () => { const titulo = document.getElementById('form-titulo').value; if(!titulo) return alert("Por favor, asigna un título principal."); const descripcion = document.getElementById('form-desc').value; const fechaStr = document.getElementById('form-fecha').value; let limitMillis = null; if (fechaStr && fechaStr.trim() !== '') limitMillis = new Date(fechaStr + "T23:59:59").getTime(); let imgFinal = ''; const imgFile = document.getElementById('form-imagen').files[0]; if (imgFile) { imgFinal = await compressImg(imgFile); } else if (window.editandoFormId && window.postsData[window.editandoFormId].imagen) { imgFinal = window.postsData[window.editandoFormId].imagen; } const paginas = paginasEnEditor().map((p, i) => ({ id: p.dataset.pageId, titulo: p.querySelector('.gform-page-title').value.trim() || `Sección ${i + 1}`, descripcion: p.querySelector('.gform-page-description').value.trim() }));
    let preguntas = []; const blocks = document.querySelectorAll('#contenedor-preguntas-builder .builder-q-block'); for (let idx = 0; idx < blocks.length; idx++) { const block = blocks[idx]; const pTitulo = block.querySelector('.q-title').value; const pDesc = block.querySelector('.q-desc').value; const pType = block.querySelector('.q-type').value; const pOpts = block.querySelector('.q-opts').value; const pReq = block.querySelector('.q-req').checked; const pImgExisting = block.querySelector('.q-img-existing').value; let qImgFinal = pImgExisting; const qFileInput = block.querySelector('.q-img-input'); if (qFileInput && qFileInput.files[0]) { qImgFinal = await compressImg(qFileInput.files[0]); } if(pTitulo) { let opcionesArr = []; if(['radio', 'checkbox', 'select'].includes(pType) && pOpts) { opcionesArr = pOpts.split(',').map(s=>s.trim()).filter(Boolean); } preguntas.push({ id: block.dataset.questionId || `pq_${idx}`, paginaId: block.closest('.gform-builder-page')?.dataset.pageId || paginas[0].id, titulo: pTitulo, desc: pDesc, tipo: pType, opciones: opcionesArr, obligatoria: pReq, imagen: qImgFinal }); } } if(preguntas.length === 0) return alert("Debes agregar al menos una pregunta válida."); const btnPub = document.getElementById('btn-pub-formulario'); const oldText = btnPub.innerHTML; btnPub.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Guardando...'; btnPub.disabled = true; try { if (window.editandoFormId) { await updateDoc(doc(db, "formularios", window.editandoFormId), { titulo, descripcion, imagen: imgFinal, fechaLimite: limitMillis, paginas, preguntas }); alert("¡Cambios guardados con éxito!"); } else { if (!document.body.classList.contains('is-owner')) { const userRef = doc(db, "usuarios", auth.currentUser.uid); await updateDoc(userRef, { reputacion: increment(-reqReputacion) }); } await addDoc(collection(db, "formularios"), { titulo, descripcion, imagen: imgFinal, fechaLimite: limitMillis, paginas, preguntas, respuestas: [], fecha: serverTimestamp(), autorId: auth.currentUser.uid, vistas: 0 }); alert("¡Encuesta publicada y activada con éxito!"); } window.cancelarEdicionFormulario(); } catch(e) { alert("Hubo un error al guardar: " + e.message); } finally { btnPub.innerHTML = oldText; btnPub.disabled = false; } };

let formulariosDataCache = [];
onSnapshot(query(collection(db, "formularios"), orderBy("fecha", "desc")), (snap) => { formulariosDataCache = []; snap.forEach(d => { formulariosDataCache.push({id: d.id, ...d.data()}); window.postsData[d.id] = d.data(); checkDeepLink(d.id, 'formularios'); }); renderFormularios(); if(window.modalActual.col === 'formularios' && window.modalActual.id) abrirModal(window.modalActual.id, 'formularios', true); });

function renderFormularios() { const cont = document.getElementById('contenedor-formularios'); if(formulariosDataCache.length === 0) { return cont.innerHTML = '<div class="text-center font-inter mt-5 py-5"><i class="bi bi-ui-checks-grid display-1 text-secondary opacity-25"></i><h4 class="mt-4 fw-bold text-dark">No hay encuestas o debates activos</h4><p class="text-secondary">Vuelve más tarde para participar en nuevas discusiones y formularios.</p></div>'; } let h = ''; const now = Date.now(); const isOwnerGlob = document.body.classList.contains('is-owner'); const uid = auth.currentUser ? auth.currentUser.uid : null; formulariosDataCache.forEach(data => { const cerrada = data.fechaLimite && data.fechaLimite < now; const statusBadge = cerrada ? `<span class="badge bg-danger rounded-pill fw-semibold" style="font-size: 0.7rem;">Finalizada</span>` : `<span class="badge bg-success rounded-pill fw-semibold" style="font-size: 0.7rem;">Activa</span>`; const numRes = data.respuestas ? data.respuestas.length : 0; const placeholderImg = `<div class="d-flex align-items-center justify-content-center bg-light text-secondary h-100 w-100" style="min-height: 140px; border-right: 1px solid #e2e8f0;"><i class="bi bi-card-checklist fs-1 opacity-50"></i></div>`; const imgHTML = data.imagen ? `<img src="${data.imagen}" class="w-100 h-100 object-fit-cover" style="min-height: 140px; border-right: 1px solid #e2e8f0;">` : placeholderImg; const isCreator = uid && data.autorId === uid; let authButtons = `<i class="bi bi-share-fill text-muted me-3 hover-bg-light p-1 rounded" onclick="event.stopPropagation(); compartir('${data.id}', 'formularios')" title="Compartir"></i>`; if (isOwnerGlob || isCreator) { authButtons += `<i class="bi bi-pencil-fill text-warning me-3 hover-bg-light p-1 rounded" onclick="event.stopPropagation(); editarFormulario('${data.id}')" title="Editar tu Formulario"></i>`; authButtons += `<i class="bi bi-trash-fill text-danger hover-bg-light p-1 rounded" onclick="event.stopPropagation(); borrarPost('formularios', '${data.id}')" title="Eliminar"></i>`; } h += `<div class="card border-0 shadow-sm rounded-4 mb-4 bg-white form-survey-card cursor-pointer overflow-hidden" onclick="abrirModal('${data.id}', 'formularios')"><div class="row g-0 align-items-stretch"><div class="col-4 col-md-3">${imgHTML}</div><div class="col-8 col-md-9 d-flex flex-column justify-content-center"><div class="card-body p-3 p-md-4 position-relative"><div class="d-flex justify-content-between align-items-start mb-2"><div><span class="tag-badge me-2" style="color: #009668; border-color: #d1d5db;">ENCUESTA</span> ${statusBadge}</div><div class="text-nowrap ms-2">${authButtons}</div></div><h4 class="fw-bold font-inter text-dark mb-1 text-truncate" style="font-size: 1.25rem;">${data.titulo}</h4><p class="text-muted font-inter mb-3 text-truncate-2 small" style="line-height: 1.5;">${escapeHTML(data.descripcion||'')}</p><div class="d-flex justify-content-between align-items-center mt-auto"><small class="text-muted fw-semibold font-inter"><i class="bi bi-person-check-fill me-1"></i> ${numRes} Respuestas</small><span class="fw-bold font-inter small" style="color:#004b79;">Participar <i class="bi bi-arrow-right ms-1"></i></span></div></div></div></div></div>`; }); cont.innerHTML = h; }

window.exportarExcel = (id) => { const data = window.postsData[id]; if (!data || !data.respuestas || data.respuestas.length === 0) return alert("No hay respuestas para exportar."); let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><style>table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt; } th { background-color: #8162b5; color: #000000; font-weight: bold; padding: 10px; border: 1px solid #6b4d9e; text-align: left; vertical-align: middle; } td { padding: 8px; border: 1px solid #d1d5db; vertical-align: top; mso-number-format:"\\@"; word-wrap: break-word; white-space: normal; } tr.alt-row td { background-color: #f8f6fa; } .col-fecha { width: 150px; } .col-email { width: 250px; } .col-pregunta { width: 300px; }</style></head><body><table><tr><th class="col-fecha">Marca temporal</th><th class="col-email">Dirección de correo electrónico</th>`; data.preguntas.forEach((q, idx) => { html += `<th class="col-pregunta">${idx + 1}. ${escapeHTML(q.titulo)}</th>`; }); html += `</tr>`; let rowIndex = 0; data.respuestas.forEach(r => { rowIndex++; const rowClass = rowIndex % 2 === 0 ? ' class="alt-row"' : ''; const fDate = r.date ? new Date(r.date).toLocaleString('es-PE') : ""; const fMail = r.email || "No registrado"; html += `<tr${rowClass}><td>${fDate}</td><td>${fMail}</td>`; data.preguntas.forEach(q => { let ans = r.datos[q.id] || ""; if (Array.isArray(ans)) ans = ans.join(", "); let safeAns = escapeHTML(ans.toString()).replace(/\n/g, "<br>"); html += `<td>${safeAns}</td>`; }); html += `</tr>`; }); html += `</table></body></html>`; const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `Resultados_${slugify(data.titulo)}.xls`); link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link); };
window.renderModalFormulario = (id, data) => { const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalFormulario')); document.getElementById('mf-titulo').innerText = data.titulo; document.getElementById('mf-desc').innerText = data.descripcion; const banner = document.getElementById('mf-banner'); if(data.imagen) { banner.style.backgroundImage = `url('${data.imagen}')`; } else { banner.style.backgroundImage = 'none'; } const isOwner = document.body.classList.contains('is-owner'); const isCreator = auth.currentUser && data.autorId === auth.currentUser.uid; const canViewStats = isOwner || isCreator; const cont = document.getElementById('mf-contenido'); const btn = document.getElementById('btn-enviar-formulario'); const status = document.getElementById('mf-status'); const footerCont = document.getElementById('mf-footer-container');
    btn.disabled = false; btn.innerHTML = 'Enviar Respuestas';
    const paginaIndicador = document.getElementById('mf-paginacion');
    const btnAnterior = document.getElementById('btn-anterior-formulario');
    const btnSiguiente = document.getElementById('btn-siguiente-formulario');
    paginaIndicador.classList.add('d-none'); btnAnterior.style.display = 'none'; btnSiguiente.style.display = 'none'; if (!canViewStats && !auth.currentUser) { cont.innerHTML = `<div class="bg-white shadow-sm p-5 text-center mt-4" style="border-radius: 12px; border-top: 5px solid #004b79;"><i class="bi bi-google d-block mb-3" style="font-size: 3.5rem; color:#db4437;"></i><h4 class="fw-bold text-dark font-inter">Acceso Restringido</h4><p class="text-secondary mb-4">Debes iniciar sesión con tu cuenta de Google para poder participar en este debate o encuesta.</p><button class="btn btn-ingresar px-5 py-2 shadow-sm fs-6" onclick="document.getElementById('btn-login').click(); bootstrap.Modal.getInstance(document.getElementById('modalFormulario')).hide();">Ingresar con Google</button></div>`; btn.style.display = 'none'; footerCont.style.display = 'none'; document.getElementById('mf-req-text').style.display = 'none'; return modal.show(); } const uid = getUid(); const yaRespondio = data.respuestas && data.respuestas.some(r => r.uid === uid); const cerrada = data.fechaLimite && data.fechaLimite < Date.now(); if (canViewStats) { document.getElementById('mf-req-text').style.display = 'none'; const exportBtnHtml = `<button class="btn btn-sm text-white fw-bold mt-2 shadow-sm px-3 py-2" style="background-color: #009668; border-color:#009668;" onclick="exportarExcel('${id}')"><i class="bi bi-file-earmark-excel-fill me-1"></i> Descargar Excel (.xls)</button>`; status.innerHTML = `<div class="d-flex flex-column align-items-start"><span class="mb-2">Total respuestas: <strong class="text-dark fs-5">${data.respuestas ? data.respuestas.length : 0}</strong></span>${exportBtnHtml}</div>`; btn.style.display = 'none'; footerCont.style.display = 'flex'; if (!data.respuestas || data.respuestas.length === 0) { cont.innerHTML = '<div class="text-muted text-center py-5 bg-white shadow-sm" style="border-radius: 12px;"><i class="bi bi-bar-chart fs-1"></i><p class="mt-3">Aún no hay respuestas para mostrar.</p></div>'; return modal.show(); } let htmlStats = ''; data.preguntas.forEach((q, idx) => { htmlStats += `<div class="mb-4 bg-white p-4 p-md-5 shadow-sm" style="border-radius: 12px; border-left: 4px solid #004b79;"><h5 class="fw-bold text-dark mb-4 font-inter">${idx + 1}. ${q.titulo}</h5>`; if (['text', 'textarea', 'date', 'time'].includes(q.tipo)) { htmlStats += `<div class="p-3 bg-light rounded-3 text-dark" style="max-height: 250px; overflow-y: auto;">`; let hasAnswers = false; data.respuestas.forEach(r => { if(r.datos[q.id]) { hasAnswers = true; htmlStats += `<div class="border-bottom border-light py-2 font-inter small text-secondary"><i class="bi bi-chat-left-text me-2 opacity-50"></i> ${escapeHTML(r.datos[q.id])}</div>`; } }); if(!hasAnswers) htmlStats += `<span class="text-muted small">Nadie ha respondido a esta pregunta.</span>`; htmlStats += `</div>`; } else { let counts = {}; if(q.tipo === 'scale') { for(let i=1; i<=5; i++) counts[i.toString()] = 0; } else { q.opciones.forEach(o => counts[o] = 0); } data.respuestas.forEach(r => { let ans = r.datos[q.id]; if(ans) { if(Array.isArray(ans)) ans.forEach(a => { if(counts[a]!==undefined) counts[a]++ }); else if(counts[ans]!==undefined) counts[ans]++; } }); const totalQRes = data.respuestas.length; Object.keys(counts).forEach(o => { const pct = totalQRes===0?0:Math.round((counts[o]/totalQRes)*100); htmlStats += `<div class="mt-3 small fw-bold d-flex justify-content-between font-inter text-dark"><span>${o}</span><span>${counts[o]} resp. (${pct}%)</span></div><div class="q-result-bar mt-1 mb-3 bg-light" style="height: 16px; border-radius: 8px; overflow: hidden;"><div class="q-result-fill" style="width:${pct}%; height: 100%; background-color: #009668; transition: width 1s ease-in-out;"></div></div>`; }); } htmlStats += `</div>`; }); cont.innerHTML = htmlStats; modal.show(); } else { document.getElementById('mf-req-text').style.display = 'block'; if (cerrada) { status.innerText = ''; btn.style.display = 'none'; footerCont.style.display = 'none'; document.getElementById('mf-req-text').style.display = 'none'; cont.innerHTML = '<div class="alert bg-white shadow-sm p-5 text-center" style="border-radius: 12px; border-left: 5px solid #dc3545;"><i class="bi bi-lock-fill d-block mb-3 text-danger" style="font-size: 3rem;"></i><h4 class="fw-bold text-dark font-inter">Formulario cerrado</h4><p class="text-secondary mb-0">El tiempo para participar en esta encuesta ha terminado.</p></div>'; return modal.show(); } if (yaRespondio) { status.innerText = ''; btn.style.display = 'none'; footerCont.style.display = 'none'; document.getElementById('mf-req-text').style.display = 'none'; cont.innerHTML = '<div class="alert bg-white shadow-sm p-5 text-center" style="border-radius: 12px; border-left: 5px solid #009668;"><i class="bi bi-check-circle-fill d-block mb-3" style="font-size: 3rem; color:#009668;"></i><h4 class="fw-bold text-dark font-inter">Respuestas Registradas</h4><p class="text-secondary mb-0">Ya hemos recibido tu información. ¡Muchas gracias por participar!</p></div>'; return modal.show(); } status.innerHTML = '☕ Ganarás <strong class="text-success">+5</strong> de Reputación.'; btn.style.display = 'block'; footerCont.style.display = 'flex'; const paginas = Array.isArray(data.paginas) && data.paginas.length ? data.paginas : [{ id: 'pagina_unica', titulo: '', descripcion: '' }];
    const primeraPaginaId = paginas[0].id;
    let hForm = '<form id="form-responder" novalidate>';
    paginas.forEach((pagina, pageIndex) => {
        hForm += `<section class="gform-response-page" data-page-index="${pageIndex}" ${pageIndex ? 'hidden' : ''}>`;
        if (paginas.length > 1 || pagina.titulo || pagina.descripcion) {
            hForm += `<div class="gform-response-section-header shadow-sm mb-4"><span class="gform-section-eyebrow">Sección ${pageIndex + 1} de ${paginas.length}</span><h3 class="font-serif text-dark fw-bold mt-2 mb-2">${escapeHTML(pagina.titulo || `Sección ${pageIndex + 1}`)}</h3>${pagina.descripcion ? `<p class="text-secondary font-inter mb-0">${escapeHTML(pagina.descripcion)}</p>` : ''}</div>`;
        }
        data.preguntas.filter(q => (q.paginaId || primeraPaginaId) === pagina.id || (!paginas.some(p => p.id === q.paginaId) && pageIndex === 0)).forEach(q => {
        const idx = data.preguntas.indexOf(q); const reqMark = q.obligatoria ? '<span class="text-danger ms-1">*</span>' : ''; const reqAttr = q.obligatoria ? 'required' : ''; const descHtml = q.desc ? `<p class="text-muted small mb-3 font-inter">${escapeHTML(q.desc)}</p>` : ''; const imgHtml = q.imagen ? `<img src="${q.imagen}" class="img-fluid rounded-3 mb-4 shadow-sm" style="max-height: 350px; width: 100%; object-fit: contain; background: #f8f9fa;">` : ''; hForm += `<div class="mb-4 bg-white p-4 p-md-5 shadow-sm" style="border-radius: 12px; border-left: 5px solid #4285f4;" data-check-required="${q.tipo === 'checkbox' && q.obligatoria ? 'true' : 'false'}"><h5 class="fw-bold text-dark font-inter mb-1" style="font-size: 1.15rem;">${idx + 1}. ${escapeHTML(q.titulo)}${reqMark}</h5>${descHtml}${imgHtml}`; if (q.tipo === 'text') { hForm += `<input type="text" class="form-control bg-light border-0 border-bottom border-2 border-secondary rounded-0 font-inter px-3 py-2 gform-input mt-2" name="${q.id}" placeholder="Tu respuesta" ${reqAttr}>`; } else if (q.tipo === 'textarea') { hForm += `<textarea class="form-control bg-light border-0 border-bottom border-2 border-secondary rounded-0 font-inter px-3 py-2 gform-input mt-2" name="${q.id}" rows="3" placeholder="Tu respuesta" ${reqAttr}></textarea>`; } else if (q.tipo === 'radio') { q.opciones.forEach((o, i) => { hForm += `<div class="form-check mb-3 ms-2 fs-6 mt-2"><input class="form-check-input border-secondary" type="radio" name="${q.id}" value="${escapeHTML(o)}" id="${q.id}_${i}" ${reqAttr}><label class="form-check-label text-dark font-inter" for="${q.id}_${i}">${escapeHTML(o)}</label></div>`; }); } else if (q.tipo === 'checkbox') { q.opciones.forEach((o, i) => { hForm += `<div class="form-check mb-3 ms-2 fs-6 mt-2"><input class="form-check-input border-secondary" type="checkbox" name="${q.id}[]" value="${escapeHTML(o)}" id="${q.id}_${i}"><label class="form-check-label text-dark font-inter" for="${q.id}_${i}">${escapeHTML(o)}</label></div>`; }); } else if (q.tipo === 'select') { hForm += `<select class="form-select bg-light border-0 border-bottom border-2 border-secondary rounded-0 font-inter text-dark py-2 px-3 gform-input w-auto mt-2" name="${q.id}" ${reqAttr}><option value="">Elegir</option>`; q.opciones.forEach(o => { hForm += `<option value="${escapeHTML(o)}">${escapeHTML(o)}</option>`; }); hForm += `</select>`; } else if (q.tipo === 'scale') { hForm += `<div class="d-flex align-items-center gap-2 gap-md-4 py-3 overflow-auto mt-2"><span class="text-muted small fw-semibold">1</span>`; for(let j=1; j<=5; j++){ hForm += `<div class="form-check form-check-inline d-flex flex-column align-items-center mx-1 mx-md-2 mb-0"><label class="form-check-label text-dark font-inter mb-2 small" for="${q.id}_${j}">${j}</label><input class="form-check-input m-0 border-secondary" style="width: 1.2rem; height: 1.2rem;" type="radio" name="${q.id}" value="${j}" id="${q.id}_${j}" ${reqAttr}></div>`; } hForm += `<span class="text-muted small fw-semibold">5</span></div>`; } else if (q.tipo === 'date') { hForm += `<input type="date" class="form-control bg-light border-0 border-bottom border-2 border-secondary rounded-0 font-inter px-3 py-2 w-auto gform-input mt-2" name="${q.id}" ${reqAttr}>`; } else if (q.tipo === 'time') { hForm += `<input type="time" class="form-control bg-light border-0 border-bottom border-2 border-secondary rounded-0 font-inter px-3 py-2 w-auto gform-input mt-2" name="${q.id}" ${reqAttr}>`; } hForm += `</div>`;
        });
        hForm += '</section>';
    });
    hForm += '</form>'; cont.innerHTML = hForm;
    const hojas = [...cont.querySelectorAll('.gform-response-page')];
    let paginaActual = 0;
    const zonaScroll = document.querySelector('#modalFormulario .modal-body');
    function mostrarPagina(index, desplazarse = false) {
        paginaActual = Math.max(0, Math.min(index, hojas.length - 1));
        hojas.forEach((hoja, i) => { hoja.hidden = i !== paginaActual; });
        btnAnterior.style.display = paginaActual > 0 ? 'inline-block' : 'none';
        btnSiguiente.style.display = paginaActual < hojas.length - 1 ? 'inline-block' : 'none';
        btn.style.display = paginaActual === hojas.length - 1 ? 'inline-block' : 'none';
        if (hojas.length > 1) {
            paginaIndicador.classList.remove('d-none');
            document.getElementById('mf-paso-actual').textContent = `Página ${paginaActual + 1} de ${hojas.length}`;
            document.getElementById('mf-paso-barra').style.width = `${Math.round((paginaActual + 1) / hojas.length * 100)}%`;
        } else { paginaIndicador.classList.add('d-none'); }
        if (desplazarse) zonaScroll?.scrollTo({ top: 0, behavior: 'smooth' });
    }
    function paginaValida(index) {
        const hoja = hojas[index];
        if (!hoja) return true;
        for (const campo of hoja.querySelectorAll('input, textarea, select')) {
            if (!campo.checkValidity()) { campo.reportValidity(); return false; }
        }
        for (const grupo of hoja.querySelectorAll('[data-check-required="true"]')) {
            if (!grupo.querySelector('input[type="checkbox"]:checked')) {
                alert('Completa las preguntas obligatorias antes de continuar.');
                grupo.querySelector('input[type="checkbox"]')?.focus(); return false;
            }
        }
        return true;
    }
    btnAnterior.onclick = () => mostrarPagina(paginaActual - 1, true);
    btnSiguiente.onclick = () => { if (paginaValida(paginaActual)) mostrarPagina(paginaActual + 1, true); };
    mostrarPagina(0);
    btn.onclick = async () => {
        const frm = document.getElementById('form-responder');
        for (let i = 0; i < hojas.length; i++) {
            if (i !== paginaActual) mostrarPagina(i);
            if (!paginaValida(i)) return;
        }
        mostrarPagina(hojas.length - 1); const fd = new FormData(frm); let ans = {}; let isComplete = true; data.preguntas.forEach(q => { if(q.tipo === 'checkbox') { const vals = fd.getAll(q.id+'[]'); if(q.obligatoria && vals.length === 0) isComplete = false; ans[q.id] = vals; } else { const v = fd.get(q.id); if(q.obligatoria && !v) isComplete = false; ans[q.id] = v; } }); if(!isComplete) return alert("Por favor, completa todas las preguntas obligatorias antes de enviar."); const btnPub = document.getElementById('btn-enviar-formulario'); btnPub.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Enviando...'; btnPub.disabled = true; try { const ref = doc(db, "formularios", id); const snap = await getDoc(ref); if(snap.exists()) { let d = snap.data(); if(!d.respuestas) d.respuestas = []; const uEmail = auth.currentUser ? auth.currentUser.email || "Sin correo" : "Sin correo"; if(auth.currentUser) { const userRef = doc(db, "usuarios", uid); const userSnap = await getDoc(userRef); if (userSnap.exists()) { await updateDoc(userRef, { reputacion: increment(5) }); } } d.respuestas.push({ uid: uid, email: uEmail, datos: ans, date: Date.now() }); await updateDoc(ref, { respuestas: d.respuestas }); cont.innerHTML = '<div class="alert bg-white shadow-sm p-5 text-center mt-4" style="border-radius: 12px; border-left: 5px solid #009668;"><i class="bi bi-check-circle-fill d-block mb-3" style="font-size: 3rem; color:#009668;"></i><h4 class="fw-bold text-dark font-inter">¡Respuestas Enviadas!</h4><p class="text-secondary mb-0">Tus respuestas han sido guardadas y has ganado <strong class="text-success">+5</strong> de reputación. ¡Gracias por participar!</p></div>'; btn.style.display = 'none'; document.getElementById('mf-req-text').style.display = 'none'; status.innerHTML = 'Completado.'; paginaIndicador.classList.add('d-none'); btnAnterior.style.display = 'none'; btnSiguiente.style.display = 'none'; } else { throw new Error('El formulario ya no está disponible.'); } } catch(e) { alert('No se pudieron guardar las respuestas: ' + e.message); btnPub.disabled = false; btnPub.innerHTML = 'Enviar Respuestas'; } }; modal.show(); } };
document.getElementById('modalNoticia').addEventListener('hidden.bs.modal', () => { if(window.modalActual.col === 'noticias') window.modalActual = { id: null, col: null }; });
document.getElementById('modalLectura').addEventListener('hidden.bs.modal', () => { if(window.modalActual.col === 'articulos') window.modalActual = { id: null, col: null }; });
document.getElementById('modalFormulario').addEventListener('hidden.bs.modal', () => { if(window.modalActual.col === 'formularios') window.modalActual = { id: null, col: null }; });


// --- DESTACADO LATERAL: esqueleto visible hasta que la imagen esté lista ---
async function cargarDestacadoCuadrado() {
    const imgElement = document.getElementById('sb-imagen');
    const placeholder = document.getElementById('sb-placeholder');
    const enlace = document.getElementById('sb-enlace');
    const skeleton = document.getElementById('sb-skeleton');
    if (!imgElement || !placeholder || !enlace || !skeleton) return;

    const ocultarEsqueleto = () => skeleton.classList.add('d-none');
    const mostrarVacio = () => {
        imgElement.classList.add('d-none');
        placeholder.classList.remove('d-none');
        placeholder.classList.add('d-flex');
        ocultarEsqueleto();
    };
    const mostrarImagen = () => {
        placeholder.classList.add('d-none');
        placeholder.classList.remove('d-flex');
        imgElement.classList.remove('d-none');
        ocultarEsqueleto();
    };
    const quitarEnlace = () => {
        enlace.removeAttribute('href');
        enlace.style.pointerEvents = 'none';
    };

    try {
        const docSnap = await getDoc(doc(db, 'configuracion', 'destacado'));
        const data = docSnap.exists() ? docSnap.data() : {};
        if (typeof data.bannerLinkUrl === 'string' && data.bannerLinkUrl.trim()) {
            enlace.href = data.bannerLinkUrl;
            enlace.style.pointerEvents = 'auto';
        } else {
            quitarEnlace();
        }

        if (typeof data.bannerImageUrl === 'string' && data.bannerImageUrl.trim()) {
            // No retirar el shimmer tras getDoc: la imagen puede seguir descargándose.
            imgElement.onload = mostrarImagen;
            imgElement.onerror = () => {
                quitarEnlace();
                mostrarVacio();
            };
            imgElement.src = data.bannerImageUrl;
            if (imgElement.complete && imgElement.naturalWidth > 0) mostrarImagen();
        } else {
            mostrarVacio();
        }
    } catch (error) {
        console.error('Error cargando el panel destacado:', error);
        quitarEnlace();
        mostrarVacio();
    }
}
document.addEventListener('DOMContentLoaded', cargarDestacadoCuadrado);

// ==========================================
// DESTACADOS PEQUEÑOS: BANNERS HORIZONTALES PÚBLICOS
// Se mantiene sincronizada con la colección de Firebase del panel admin.
// ==========================================
function cargarDestacadosPequenosPublico() {
    const contenedor = document.getElementById('contenedor-destacados-pequenos');
    if (!contenedor) return;

    const consulta = query(collection(db, 'destacados_pequenos'), orderBy('fecha', 'asc'));

    onSnapshot(consulta, (snapshot) => {
        const fragmento = document.createDocumentFragment();
        let mostrados = 0;

        snapshot.forEach((documento) => {
            if (mostrados >= 10) return;
            const datos = documento.data();
            if (typeof datos.imagen !== 'string' || !datos.imagen) return;
            if (!/^(data:image\/(jpeg|png|webp);base64,|https?:\/\/)/i.test(datos.imagen)) return;

            let enlaceSeguro;
            try {
                enlaceSeguro = new URL(datos.enlace);
                if (!['http:', 'https:'].includes(enlaceSeguro.protocol)) return;
            } catch (_) {
                return;
            }

            const columna = document.createElement('div');
            columna.className = 'col-12';

            const enlace = document.createElement('a');
            enlace.href = enlaceSeguro.href;
            enlace.target = '_blank';
            enlace.rel = 'noopener noreferrer';
            enlace.className = 'destacado-pequeno-link shadow-sm rounded-4 overflow-hidden position-relative';
            enlace.setAttribute('aria-label', `Abrir destacado ${mostrados + 1}`);

            const esqueleto = document.createElement('span');
            esqueleto.className = 'skeleton-box destacado-pequeno-skeleton';
            esqueleto.setAttribute('aria-hidden', 'true');

            const imagen = document.createElement('img');
            imagen.alt = `Destacado ${mostrados + 1}`;
            imagen.loading = 'lazy';
            imagen.decoding = 'async';
            imagen.className = 'd-block w-100 h-100 object-fit-contain';
            const mostrarImagen = () => {
                enlace.classList.add('is-loaded');
                esqueleto.remove();
            };
            const retirarImagenFallida = () => {
                columna.remove();
                if (!contenedor.querySelector('.destacado-pequeno-link')) {
                    contenedor.classList.add('d-none');
                }
            };
            imagen.addEventListener('load', mostrarImagen, { once: true });
            imagen.addEventListener('error', retirarImagenFallida, { once: true });

            enlace.appendChild(esqueleto);
            enlace.appendChild(imagen);
            columna.appendChild(enlace);
            imagen.src = datos.imagen;
            if (imagen.complete && imagen.naturalWidth > 0) mostrarImagen();
            fragmento.appendChild(columna);
            mostrados++;
        });

        contenedor.replaceChildren(fragmento);
        contenedor.setAttribute('aria-busy', 'false');
        contenedor.classList.toggle('d-none', mostrados === 0);
    }, (error) => {
        console.error('Error al cargar destacados pequeños:', error);
        contenedor.replaceChildren();
        contenedor.setAttribute('aria-busy', 'false');
        contenedor.classList.add('d-none');
    });
}
document.addEventListener('DOMContentLoaded', cargarDestacadosPequenosPublico);

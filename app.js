import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, deleteDoc, increment } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const app = initializeApp({ apiKey: "AIzaSyDvtzU8SGycfh99Cc_lLT7xabQ_uPBOpqE", authDomain: "economia-41d20.firebaseapp.com", databaseURL: "https://economia-41d20-default-rtdb.firebaseio.com", projectId: "economia-41d20", storageBucket: "economia-41d20.firebasestorage.app", messagingSenderId: "750639619847", appId: "1:750639619847:web:9a036501539ca6e3ceafa2", measurementId: "G-BWV82ZTSW1" });
const auth = getAuth(app); const db = getFirestore(app);

window.postsData = {}; window.editandoId = null; window.modalActual = { id: null, col: null };
let progress = 0; let isFirstLoad = true;
let currentTab = 'columnas'; let userReputacion = 0; let reqReputacion = 15; let userSub = null;

const progBar = document.getElementById('splash-progress'); const splash = document.getElementById('splash-screen');
const splashInterval = setInterval(() => { progress += Math.random() * 15 + 5; if(progress > 85) progress = 85; if(progBar) progBar.style.width = progress + '%'; }, 200);

setTimeout(() => { clearInterval(splashInterval); if(progBar) progBar.style.width = '100%'; if(splash && splash.parentNode) { splash.style.opacity = '0'; setTimeout(() => splash.remove(), 500); } }, 3000);

document.getElementById('current-year').innerText = new Date().getFullYear();

tinymce.init({ selector: '#editor-noticias', height: 450, menubar: false, plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table wordcount', toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | table link image | removeformat', content_style: 'body { font-family: "Inter", sans-serif; font-size: 16px; text-align: justify; line-height: 1.6; }', paste_data_images: true });

if(!localStorage.getItem('uid')) localStorage.setItem('uid', 'anon_'+Math.random().toString(36).substring(2,11));
const getUid = () => auth.currentUser ? auth.currentUser.uid : localStorage.getItem('uid');
document.getElementById('btn-login').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
document.getElementById('btn-logout').onclick = () => signOut(auth);

function updateReputationVisibility() {
    const repCont = document.getElementById('reputacion-container');
    if (auth.currentUser && currentTab === 'ensayos') {
        repCont.classList.remove('d-none');
        repCont.classList.add('d-flex');
        setTimeout(() => repCont.style.opacity = '1', 10);
    } else {
        repCont.style.opacity = '0';
        setTimeout(() => { repCont.classList.add('d-none'); repCont.classList.remove('d-flex'); }, 300);
    }
}

onAuthStateChanged(auth, async (u) => {
    document.getElementById('btn-login').classList.toggle('d-none', !!u); document.getElementById('btn-logout').classList.toggle('d-none', !u); 
    document.body.classList.remove('is-owner');
    document.querySelectorAll('.auth-only').forEach(el => el.classList.toggle('d-none', !u));
    
    if(userSub) userSub();
    
    if(u) { 
        const ref = doc(db, "usuarios", u.uid);
        userSub = onSnapshot(ref, (d) => {
            if(d.exists()) {
                if(d.data().owner) document.body.classList.add('is-owner');
                userReputacion = d.data().reputacion || 0;
            } else {
                setDoc(ref, { nombre: u.displayName, email: u.email, reputacion: 0 });
                userReputacion = 0;
            }
            document.getElementById('user-reputacion').innerText = userReputacion;
        });
    } else {
        userReputacion = 0;
    }
    updateReputationVisibility();
});

window.borrarPost = async (col, id) => { if(confirm("¿Eliminar publicación?")) await deleteDoc(doc(db, col, id)); };

const slugify = (text) => (text ? text.toString() : '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 80) || 'cafe-unp';
window.compartir = (id, col) => { const d = window.postsData[id]; if(!d) return; const tit = d.titulo || d.pregunta || 'CAFE UNP'; const slug = slugify(tit); const url = window.location.origin + window.location.pathname + `?v=${slug}---${id}---${col}`; if(navigator.share) navigator.share({ title: tit, url: url }); else { navigator.clipboard.writeText(url); alert("Link copiado: " + url); } };

let currentRating = 0; const setupStars = (selector, textId) => { document.querySelectorAll(selector).forEach(st => { st.onclick = function() { currentRating = parseInt(this.getAttribute('data-val')); const cleanClass = selector.replace('.', ''); document.querySelectorAll(selector).forEach(s => { let val = parseInt(s.getAttribute('data-val')); s.className = val <= currentRating ? `bi bi-star-fill star-gradient cursor-pointer fs-3 me-1 ${cleanClass}` : `bi bi-star text-muted cursor-pointer fs-3 me-1 ${cleanClass}`; }); document.getElementById(textId).innerText = `(${currentRating} Estrellas)`; } }); }; setupStars('.star-btn-mn', 'rating-text-mn'); setupStars('.star-btn-ml', 'rating-text-ml'); 
const getPromedioStars = (comentarios) => { if(!comentarios || comentarios.length === 0) return ''; const valid = comentarios.filter(c => c.rating > 0 && c.aprobado !== false); if(valid.length === 0) return ''; return `<span class="star-gradient fw-bold">⭐ ${(valid.reduce((acc, c) => acc + c.rating, 0) / valid.length).toFixed(1)} (${valid.length})</span>`; };
const escapeHTML = (str) => (str ? str.toString() : '').replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t] || t));

const enviarComentario = async (txtId, selector, textId) => { const txt = document.getElementById(txtId).value; if(!txt) return alert("Escribe un comentario"); const isOwner = document.body.classList.contains('is-owner'); if (!isOwner) { const lastTime = localStorage.getItem('last_comment_time'); const now = Date.now(); if (lastTime && now - parseInt(lastTime) < 120000) { const wait = Math.ceil((120000 - (now - parseInt(lastTime))) / 1000); return alert(`Anti-Spam: Por favor, espera ${wait} segundos para comentar de nuevo.`); } } const ref = doc(db, window.modalActual.col, window.modalActual.id); const snap = await getDoc(ref); if(snap.exists()) { const arr = snap.data().comentarios || []; arr.push({ id: Date.now(), autor: auth.currentUser ? auth.currentUser.displayName || "Usuario" : "Anónimo", texto: escapeHTML(txt), rating: currentRating, date: new Date().toLocaleDateString(), aprobado: isOwner }); await updateDoc(ref, { comentarios: arr }); if (!isOwner) { localStorage.setItem('last_comment_time', Date.now()); alert("Tu comentario fue enviado y está pendiente de aprobación."); } document.getElementById(txtId).value = ''; currentRating = 0; document.querySelectorAll(selector).forEach(s => s.className = `bi bi-star text-muted cursor-pointer fs-3 me-1 ${selector.replace('.','')}`); document.getElementById(textId).innerText = ''; } };
document.getElementById('btn-enviar-comentario-mn').onclick = () => enviarComentario('mn-comentario-texto', '.star-btn-mn', 'rating-text-mn'); document.getElementById('btn-enviar-comentario-ml').onclick = () => enviarComentario('ml-comentario-texto', '.star-btn-ml', 'rating-text-ml');
window.borrarComentario = async (cid) => { if(!confirm("¿Borrar comentario?")) return; const ref = doc(db, window.modalActual.col, window.modalActual.id); const snap = await getDoc(ref); if(snap.exists()) { const arr = snap.data().comentarios || []; await updateDoc(ref, { comentarios: arr.filter(c => c.id !== cid) }); } };
window.aprobarComentario = async (cid) => { const ref = doc(db, window.modalActual.col, window.modalActual.id); const snap = await getDoc(ref); if(snap.exists()) { const arr = snap.data().comentarios || []; const index = arr.findIndex(c => c.id === cid); if(index !== -1) { arr[index].aprobado = true; await updateDoc(ref, { comentarios: arr }); } } };

const renderComentarios = (comentarios, containerId) => { const box = document.getElementById(containerId); if(!box) return; const isOwner = document.body.classList.contains('is-owner'); let comsToShow = comentarios || []; if(!isOwner) comsToShow = comsToShow.filter(c => c.aprobado !== false); if(comsToShow.length===0) return box.innerHTML = '<div class="text-center mt-4 text-muted"><i class="bi bi-chat-dots fs-3"></i><p class="mt-2 small">Sé el primero en aportar.</p></div>'; box.innerHTML = comsToShow.map(c => { const starsHTML = `<span class="star-gradient" style="font-size:0.9rem;">${'★'.repeat(c.rating)}${'☆'.repeat(5-c.rating)}</span>`; const pendingBadge = c.aprobado === false ? `<span class="badge bg-warning text-dark ms-2 fw-semibold" style="font-size:0.65rem;">Pendiente</span>` : ''; const approveBtn = (c.aprobado === false && isOwner) ? `<button class="btn btn-sm btn-success py-0 px-2 ms-2 fw-bold" style="font-size:0.7rem;" onclick="aprobarComentario(${c.id})"><i class="bi bi-check-lg"></i> Aprobar</button>` : ''; return `<div class="mb-4 pb-3 border-bottom"><div class="d-flex justify-content-between align-items-center mb-1"><strong class="font-inter text-dark small">${c.autor} ${pendingBadge}</strong><div>${starsHTML}${approveBtn}<i class="bi bi-trash text-danger ms-2 cursor-pointer admin-only-inline" onclick="borrarComentario(${c.id})"></i></div></div><p class="text-secondary font-inter mb-1" style="font-size: 0.95rem;">${c.texto}</p><div class="text-muted small font-inter text-end" style="font-size: 0.75rem;">${c.date}</div></div>`; }).join(''); };
const formatEmbedUrl = (url) => { if(!url) return ''; const match = url.match(/\/(?:d|file\/d)\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/); if (match && match[1]) return `https://drive.google.com/file/d/${match[1]}/preview`; return url; };

window.abrirModal = (id, col) => {
    const d = window.postsData[id]; if(!d) return; window.modalActual = { id, col };
    if(col === 'formularios') return renderModalFormulario(id, d);
    const tagsHTML = (d.etiquetas||[]).map(t => `<span class="tag-badge" style="color: ${d.colorTag||'#004b79'}; border-color: #d1d5db;">${escapeHTML(t)}</span>`).join('');
    if (col === 'noticias') {
        document.getElementById('mn-titulo').innerText = d.titulo; document.getElementById('mn-fecha').innerHTML = `<i class="bi bi-calendar3 me-2"></i> ${d.fecha ? d.fecha.toDate().toLocaleDateString() : ''}`; document.getElementById('mn-promedio-estrellas').innerHTML = getPromedioStars(d.comentarios); document.getElementById('mn-tags').innerHTML = tagsHTML; const imgEl = document.getElementById('mn-imagen'); if(d.imagen && d.imagen.length > 20) { imgEl.src = d.imagen; imgEl.style.display = 'block'; } else { imgEl.style.display = 'none'; } document.getElementById('mn-contenido').innerHTML = d.contenido ? `<div class="contenido-apa">${d.contenido}</div>` : `<div class="contenido-apa">${escapeHTML(d.resumen||'')}</div>`; renderComentarios(d.comentarios, 'mn-lista-comentarios'); bootstrap.Modal.getOrCreateInstance(document.getElementById('modalNoticia')).show();
    } else {
        document.getElementById('modal-titulo').innerText = d.titulo || d.pregunta; document.getElementById('modal-fecha').innerHTML = `<i class="bi bi-calendar3 me-2"></i> ${d.fecha ? d.fecha.toDate().toLocaleDateString() : ''}`; document.getElementById('modal-promedio-estrellas').innerHTML = getPromedioStars(d.comentarios); document.getElementById('modal-tags').innerHTML = tagsHTML; const imgEl = document.getElementById('modal-imagen'); const iframeEl = document.getElementById('modal-iframe'); const contEl = document.getElementById('modal-contenido'); const leftCol = document.getElementById('modal-left-col'); const rightCol = document.getElementById('modal-right-col'); let hasLeftContent = false; if(d.imagen && d.imagen.length > 20) { imgEl.src = d.imagen; imgEl.style.display = 'block'; hasLeftContent = true; } else { imgEl.style.display = 'none'; } if(d.link) { iframeEl.src = formatEmbedUrl(d.link); iframeEl.style.display = 'block'; hasLeftContent = true; } else { iframeEl.style.display = 'none'; iframeEl.src = ''; } if(hasLeftContent) { leftCol.classList.remove('d-none'); leftCol.classList.add('d-flex'); rightCol.className = 'col-lg-5 h-100 overflow-y-auto bg-white px-4 py-4 d-flex flex-column'; rightCol.style.maxWidth = 'none'; } else { leftCol.classList.remove('d-flex'); leftCol.classList.add('d-none'); rightCol.className = 'col-12 h-100 overflow-y-auto bg-white px-4 px-md-5 py-4 py-md-5 d-flex flex-column mx-auto'; rightCol.style.maxWidth = '900px'; } contEl.innerHTML = d.contenido ? `<div class="contenido-apa">${d.contenido}</div>` : `<div class="contenido-apa">${escapeHTML(d.resumen||'')}</div>`; renderComentarios(d.comentarios, 'ml-lista-comentarios'); bootstrap.Modal.getOrCreateInstance(document.getElementById('modalLectura')).show();
    }
};

const checkDeepLink = (id, col) => { if(autoOpenDone) return; const urlP = new URLSearchParams(window.location.search); const v = urlP.get('v'); let tId = urlP.get('p'), tCol = urlP.get('t'); if(v) { const parts = v.split('---'); if(parts.length===3){ tId = parts[1]; tCol = parts[2]; } } if(tId === id && tCol === col) { autoOpenDone = true; setTimeout(() => { abrirModal(id, col); }, 500); } }; let autoOpenDone = false;
const compressImg = (file) => new Promise((res) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = (e) => { const img = new Image(); img.src = e.target.result; img.onload = () => { const canvas = document.createElement('canvas'); const MAX = 2000; const scale = img.width > MAX ? MAX / img.width : 1; canvas.width = img.width * scale; canvas.height = img.height * scale; canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); res(canvas.toDataURL('image/jpeg', 0.95)); }; }; });
window.cancelarEdicion = () => { window.editandoId = null; document.querySelectorAll('input:not([type="color"]), textarea').forEach(i => i.value = ''); if(tinymce.get('editor-noticias')) tinymce.get('editor-noticias').setContent(''); document.getElementById('not-principal').checked = false; document.getElementById('not-form-title').innerText = "Editor de Columnas"; bootstrap.Collapse.getInstance(document.getElementById('colNoticia'))?.hide(); bootstrap.Collapse.getInstance(document.getElementById('colArticulo'))?.hide(); };
onSnapshot(doc(db, "config", "sidebar"), (s) => { if(s.exists()){ const d = s.data(); if(d.t) document.getElementById('sb-titulo').innerText = d.t; if(d.desc) document.getElementById('sb-desc').innerText = d.desc; } }); window.editarSidebar = async () => { const t = prompt("Título:", document.getElementById('sb-titulo').innerText) || document.getElementById('sb-titulo').innerText; const desc = prompt("Descripción:", document.getElementById('sb-desc').innerText) || document.getElementById('sb-desc').innerText; await setDoc(doc(db, "config", "sidebar"), {t, desc}, {merge:true}); };
onSnapshot(doc(db, "config", "footer"), (s) => { if(s.exists()){ const d = s.data(); if(d.ubicacion) document.getElementById('f-ubicacion').innerHTML = d.ubicacion.replace(/\n/g, "<br>"); if(d.contacto) document.getElementById('f-contacto').innerHTML = d.contacto.replace(/\n/g, "<br>"); if(d.sobre) document.getElementById('f-sobre').innerHTML = d.sobre.replace(/\n/g, "<br>"); } }); window.editarFooter = async () => { const u = prompt("Ubicación (Usa Enter para saltos de línea):", document.getElementById('f-ubicacion').innerText); const c = prompt("Contacto:", document.getElementById('f-contacto').innerText); const s = prompt("Sobre la Universidad:", document.getElementById('f-sobre').innerText); if(u && c && s) await setDoc(doc(db, "config", "footer"), {ubicacion: u, contacto: c, sobre: s}, {merge:true}); };

// Escuchar cambios de Tabs
document.querySelectorAll('button[data-bs-toggle="pill"]').forEach(btn => { 
    btn.addEventListener('shown.bs.tab', (e) => { 
        const target = e.target.getAttribute('data-bs-target'); 
        currentTab = target.replace('#', '');
        document.querySelectorAll('button[data-bs-toggle="pill"]').forEach(b => b.classList.remove('active')); 
        document.querySelectorAll(`button[data-bs-target="${target}"]`).forEach(tBtn => tBtn.classList.add('active')); 
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
        updateReputationVisibility();
    }); 
});

/* NOTICIAS & ARTÍCULOS */
let noticiasData = []; let qBuscar = ''; let ordDesc = true; document.getElementById('input-buscar').addEventListener('input', (e) => { qBuscar = e.target.value.toLowerCase(); renderNoticias(); }); document.getElementById('btn-ordenar').addEventListener('click', () => { ordDesc = !ordDesc; document.getElementById('btn-ordenar').innerText = ordDesc ? 'Ordenar: Recientes ↓' : 'Ordenar: Antiguos ↑'; renderNoticias(); }); document.getElementById('btn-pub-noticia').onclick = async () => { const titulo = document.getElementById('not-titulo').value; if(!titulo) return alert("Falta el titular."); const etiquetas = document.getElementById('not-tags').value ? document.getElementById('not-tags').value.split(',').map(t=>t.trim()).filter(Boolean) : ['Opinión']; let imgFinal = ''; const imgFile = document.getElementById('not-imagen').files[0]; if (imgFile) imgFinal = await compressImg(imgFile); else if (window.editandoId && window.postsData[window.editandoId].imagen) imgFinal = window.postsData[window.editandoId].imagen; const editorContent = tinymce.get('editor-noticias').getContent(); const data = { titulo, etiquetas, colorTag: document.getElementById('not-color').value, imagen: imgFinal, principal: document.getElementById('not-principal').checked, contenido: editorContent }; if (window.editandoId) await updateDoc(doc(db, "noticias", window.editandoId), data); else { data.fecha = serverTimestamp(); data.comentarios = []; await addDoc(collection(db, "noticias"), data); } cancelarEdicion(); }; onSnapshot(collection(db, "noticias"), (snap) => { noticiasData = []; snap.forEach(d => { noticiasData.push({id: d.id, ...d.data()}); window.postsData[d.id] = d.data(); checkDeepLink(d.id, 'noticias'); }); renderNoticias(); if(window.modalActual.col === 'noticias' && window.modalActual.id) abrirModal(window.modalActual.id, 'noticias'); if(isFirstLoad) { isFirstLoad = false; clearInterval(splashInterval); if(progBar) progBar.style.width = '100%'; setTimeout(() => { if(splash && splash.parentNode) { splash.style.opacity = '0'; setTimeout(() => splash.remove(), 500); } }, 600); } });
function renderNoticias() { let filtradas = noticiasData.filter(n => (n.titulo||'').toLowerCase().includes(qBuscar) || (n.contenido||'').toLowerCase().includes(qBuscar)); filtradas.sort((a,b) => { let tA = a.fecha?.toMillis()||0; let tB = b.fecha?.toMillis()||0; return ordDesc ? tB - tA : tA - tB; }); const cLista = document.getElementById('contenedor-noticias-lista'); const cPrinc = document.getElementById('contenedor-noticia-principal'); if (filtradas.length === 0) { cPrinc.innerHTML=''; cLista.innerHTML='<div class="text-center text-muted">No hay resultados.</div>'; return; } let hLista = ''; let hPrinc = ''; let pFound = false; filtradas.forEach(d => { const date = d.fecha ? d.fecha.toDate().toLocaleDateString() : 'Reciente'; const avgStr = getPromedioStars(d.comentarios); const tHTML = (d.etiquetas||[]).map(t => `<span class="tag-badge" style="color: ${d.colorTag||'#004b79'}; border-color: #d1d5db;">${escapeHTML(t)}</span>`).join(''); const imgH = d.imagen ? `<img src="${d.imagen}" class="post-img-rect shadow-sm" onclick="abrirModal('${d.id}', 'noticias')">` : `<div class="post-img-rect bg-light d-flex align-items-center justify-content-center text-muted border shadow-sm" onclick="abrirModal('${d.id}', 'noticias')"><i class="bi bi-image fs-1"></i></div>`; const textoLimpioPreview = (d.contenido || '').replace(/<[^>]*>?/gm, ''); if (d.principal && !pFound) { pFound = true; const imgP = d.imagen ? `<img src="${d.imagen}" class="img-fluid w-100 rounded-4 shadow-sm cursor-pointer" style="height:380px; object-fit: contain; background-color: #f1f3f5;" onclick="abrirModal('${d.id}', 'noticias')">` : `<div class="w-100 rounded-4 shadow-sm d-flex align-items-center justify-content-center bg-light text-muted border cursor-pointer" style="height:380px;" onclick="abrirModal('${d.id}', 'noticias')"><i class="bi bi-image fs-1"></i></div>`; hPrinc = `<div class="row mb-5 border-bottom pb-5 align-items-center"><div class="col-lg-7 mb-4 mb-lg-0">${imgP}</div><div class="col-lg-5 ps-lg-4"><div class="mb-3">${tHTML}</div><h2 class="fw-bold mb-3 font-serif cursor-pointer" style="font-size: 2.2rem; color: #1a202c; line-height: 1.3;" onclick="abrirModal('${d.id}', 'noticias')">${d.titulo}</h2><div class="text-muted mb-4 text-truncate-3 font-inter" style="font-size: 1.1rem;">${textoLimpioPreview}</div><div class="d-flex justify-content-between"><small class="text-muted fw-semibold"><i class="bi bi-calendar3 me-1"></i> ${date} <span class="ms-2">${avgStr}</span></small><small class="text-muted fw-semibold cursor-pointer" onclick="compartir('${d.id}', 'noticias')"><i class="bi bi-share me-1"></i> Compartir</small></div></div></div>`; } hLista += `<div class="card border-0 border-bottom rounded-0 mb-4 pb-4 bg-transparent"><div class="row g-4 align-items-center"><div class="col-md-5">${imgH}</div><div class="col-md-7 d-flex flex-column"><div class="d-flex justify-content-between mb-2"><div>${tHTML}</div><div><i class="bi bi-share text-muted me-2 cursor-pointer" onclick="compartir('${d.id}', 'noticias')"></i><i class="bi bi-pencil-fill text-warning me-2 admin-only-inline cursor-pointer" onclick="editarNoticia('${d.id}')"></i><i class="bi bi-trash text-danger admin-only-inline cursor-pointer" onclick="borrarPost('noticias', '${d.id}')"></i></div></div><h3 class="fw-bold mb-2 text-truncate-2 cursor-pointer font-serif text-dark" style="font-size: 1.5rem;" onclick="abrirModal('${d.id}', 'noticias')">${d.titulo}</h3><small class="text-muted fw-semibold mt-1"><i class="bi bi-calendar3 me-1"></i> ${date} <span class="ms-2">${avgStr}</span></small></div></div></div>`; }); cPrinc.innerHTML = pFound ? hPrinc : ''; cLista.innerHTML = hLista; }
window.editarNoticia = (id) => { const d = window.postsData[id]; document.getElementById('not-titulo').value = d.titulo; document.getElementById('not-tags').value = (d.etiquetas||[]).join(', '); document.getElementById('not-color').value = d.colorTag || '#004b79'; document.getElementById('not-principal').checked = d.principal; if(tinymce.get('editor-noticias')) tinymce.get('editor-noticias').setContent(d.contenido || ''); window.editandoId = id; document.getElementById('not-form-title').innerText = "Editando Columna"; document.getElementById('btn-pub-noticia').innerText = "Guardar"; bootstrap.Collapse.getOrCreateInstance(document.getElementById('colNoticia')).show(); window.scrollTo(0,0); };
document.getElementById('btn-pub-articulo').onclick = async () => { const t = document.getElementById('art-titulo').value; const l = document.getElementById('art-link').value; if(!t||!l) return alert("Falta Título o Link."); const et = document.getElementById('art-tags').value ? document.getElementById('art-tags').value.split(',').map(x=>x.trim()).filter(Boolean) : ['Paper']; const data = { titulo: t, link: l, resumen: document.getElementById('art-resumen').value, etiquetas: et, colorTag: document.getElementById('art-color').value }; if(window.editandoId) await updateDoc(doc(db, "articulos", window.editandoId), data); else { data.fecha = serverTimestamp(); data.comentarios = []; await addDoc(collection(db, "articulos"), data); } cancelarEdicion(); };
onSnapshot(query(collection(db, "articulos"), orderBy("fecha", "desc")), (snap) => { const cont = document.getElementById('contenedor-articulos'); if(snap.empty) return cont.innerHTML = '<div class="col-12 text-center text-muted font-inter">No hay papers.</div>'; let h = ''; snap.forEach(d => { const data = d.data(); window.postsData[d.id] = data; checkDeepLink(d.id, 'articulos'); const date = data.fecha ? data.fecha.toDate().toLocaleDateString() : ''; const avgStr = getPromedioStars(data.comentarios); const tHTML = (data.etiquetas||[]).map(t => `<span class="tag-badge" style="color: ${data.colorTag||'#004b79'}; border-color: #d1d5db;">${escapeHTML(t)}</span>`).join(''); h += `<article class="col-12 mb-5 pb-4 border-bottom border-light-subtle"><div class="row align-items-start"><div class="col-md-2 col-4 cursor-pointer" onclick="abrirModal('${d.id}', 'articulos')"><div class="paper-cover mx-auto rounded-1"><i class="bi bi-file-earmark-pdf-fill text-secondary fs-1"></i><div class="mt-2" style="width: 80%; height: 3px; background: #e2e8f0; border-radius: 2px;"></div><div class="mt-1" style="width: 60%; height: 3px; background: #e2e8f0; border-radius: 2px;"></div><div class="mt-auto" style="width: 40%; height: 4px; background: #cbd5e1; border-radius: 2px;"></div></div></div><div class="col-md-10 col-8 d-flex flex-column h-100 ps-md-4"><div class="d-flex justify-content-between align-items-start mb-2"><div>${tHTML} <span class="badge bg-secondary ms-1 fw-semibold font-inter" style="letter-spacing: 0.5px;">Acceso Abierto</span></div><div class="text-nowrap ms-3"><i class="bi bi-share-fill text-primary cursor-pointer me-3" onclick="compartir('${d.id}', 'articulos')"></i><i class="bi bi-pencil-fill text-warning me-3 admin-only-inline cursor-pointer" onclick="editarArt('${d.id}')"></i><i class="bi bi-trash-fill text-danger admin-only-inline cursor-pointer" onclick="borrarPost('articulos', '${d.id}')"></i></div></div><a href="javascript:void(0)" onclick="abrirModal('${d.id}', 'articulos')" class="paper-title-link fw-bold font-serif mb-1" style="font-size: 1.45rem;">${d.data().titulo}</a><div class="text-muted small mb-3 font-inter">${data.fecha ? '(Publicado el ' + data.fecha.toDate().toLocaleDateString() + ')' : ''}</div><p class="text-muted mb-3 font-inter text-truncate-3" style="font-size: 1.05rem; line-height: 1.6;">${escapeHTML(data.resumen)}</p><div class="mt-auto d-flex align-items-center"><button class="btn btn-sm text-primary fw-bold font-inter rounded-pill me-3 shadow-sm" style="border: 1px solid #004b79; color:#004b79!important;" onclick="abrirModal('${d.id}', 'articulos')">Leer documento <i class="bi bi-arrow-right ms-1"></i></button><span class="ms-2">${avgStr}</span></div></div></div></article>`; }); cont.innerHTML = h; if(window.modalActual.col === 'articulos' && window.modalActual.id) abrirModal(window.modalActual.id, 'articulos'); });
window.editarArt = (id) => { const d = window.postsData[id]; document.getElementById('art-titulo').value = d.titulo; document.getElementById('art-link').value = d.link; document.getElementById('art-tags').value = (d.etiquetas||[]).join(', '); document.getElementById('art-color').value = d.colorTag || '#004b79'; document.getElementById('art-resumen').value = d.resumen; window.editandoId = id; bootstrap.Collapse.getOrCreateInstance(document.getElementById('colArticulo')).show(); window.scrollTo(0,0); };

/* =========================================================================
   SISTEMA DE FORMULARIOS & REPUTACION
========================================================================= */

// Traer la reputación requerida desde Firebase
onSnapshot(doc(db, "config", "reputacion"), (s) => {
    if(s.exists() && s.data().requerida !== undefined) {
        reqReputacion = s.data().requerida;
    }
});

// Botón "Crear Encuesta" (Validación de Reputación)
document.getElementById('btn-iniciar-crear-form').onclick = () => {
    const isOwner = document.body.classList.contains('is-owner');
    if (!isOwner && userReputacion < reqReputacion) {
        alert(`☕ Necesitas al menos ${reqReputacion} puntos de reputación para publicar encuestas y debates.\n\nActualmente tienes ${userReputacion} cafecitos.\n\n¡Gana +5 de reputación aportando tus respuestas a la comunidad!`);
        return;
    }
    bootstrap.Collapse.getOrCreateInstance(document.getElementById('colFormulario')).toggle();
};

window.editarReqReputacion = async () => {
    const val = prompt("¿Cuántos puntos de reputación se necesitan para crear una encuesta?", reqReputacion);
    if(val !== null && !isNaN(parseInt(val))) {
        await setDoc(doc(db, "config", "reputacion"), { requerida: parseInt(val) }, { merge: true });
        alert("Configuración de reputación actualizada.");
    }
};

let numPreguntasForm = 0;
window.prevQImg = (input) => {
    if(input.files && input.files[0]){
        let reader = new FileReader();
        reader.onload = function(e){
            let img = input.parentElement.parentElement.querySelector('.q-img-preview');
            img.src = e.target.result;
            img.style.display = 'block';
        }
        reader.readAsDataURL(input.files[0]);
    }
};

document.getElementById('btn-add-pregunta-form').onclick = () => {
    numPreguntasForm++;
    const div = document.createElement('div'); div.className = 'builder-q-block position-relative'; div.id = `q-block-${numPreguntasForm}`;
    div.innerHTML = `
        <div class="row g-3 align-items-start mb-3">
            <div class="col-md-7">
                <input type="text" class="form-control fw-bold q-title font-inter bg-light border-0 border-bottom border-2 border-secondary rounded-0 shadow-none px-2 py-2" placeholder="Pregunta ${numPreguntasForm}">
            </div>
            <div class="col-md-4">
                <select class="form-select q-type font-inter bg-white border shadow-sm" onchange="toggleQOpts(this)">
                    <option value="text">⚏ Respuesta corta</option>
                    <option value="textarea">☰ Párrafo</option>
                    <option value="radio" selected>◉ Varias opciones</option>
                    <option value="checkbox">☑ Casillas</option>
                    <option value="select">▽ Desplegable</option>
                    <option value="scale">⟷ Escala lineal</option>
                    <option value="date">📅 Fecha</option>
                    <option value="time">🕒 Hora</option>
                </select>
            </div>
            <div class="col-md-1 text-end">
                <button class="btn btn-sm btn-outline-danger border-0 hover-bg-light" onclick="this.parentElement.parentElement.parentElement.remove()"><i class="bi bi-trash fs-5"></i></button>
            </div>
        </div>
        <div class="mb-3 ps-2">
            <input type="text" class="form-control q-opts font-inter bg-white border shadow-sm" placeholder="Opciones (separadas por comas, ej: Sí, No, Tal vez)">
        </div>
        <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
            <div class="d-flex align-items-center">
                <label class="btn btn-sm btn-outline-secondary font-inter rounded-pill me-3 shadow-sm cursor-pointer">
                    <i class="bi bi-image me-1"></i> Añadir Imagen
                    <input type="file" class="q-img-input d-none" accept="image/*" onchange="prevQImg(this)">
                </label>
                <img class="q-img-preview rounded shadow-sm border" style="height: 40px; object-fit: cover; display:none;">
            </div>
            <div class="form-check form-switch mb-0">
                <input class="form-check-input q-req cursor-pointer" type="checkbox" role="switch" id="req_${numPreguntasForm}">
                <label class="form-check-label font-inter small fw-semibold text-muted cursor-pointer" for="req_${numPreguntasForm}">Obligatorio</label>
            </div>
        </div>
    `;
    document.getElementById('contenedor-preguntas-builder').appendChild(div);
};

window.toggleQOpts = (selectEl) => { 
    const inputOpts = selectEl.parentElement.parentElement.nextElementSibling.querySelector('.q-opts'); 
    if(['text', 'textarea', 'date', 'time', 'scale'].includes(selectEl.value)) { 
        inputOpts.style.display = 'none'; 
    } else { 
        inputOpts.style.display = 'block'; 
    } 
};

document.getElementById('btn-pub-formulario').onclick = async () => {
    const titulo = document.getElementById('form-titulo').value; if(!titulo) return alert("Por favor, asigna un título principal.");
    const descripcion = document.getElementById('form-desc').value;
    const fechaStr = document.getElementById('form-fecha').value;
    
    let limitMillis = null; 
    if (fechaStr && fechaStr.trim() !== '') limitMillis = new Date(fechaStr + "T23:59:59").getTime(); 
    
    let imgFinal = ''; const imgFile = document.getElementById('form-imagen').files[0]; 
    if (imgFile) imgFinal = await compressImg(imgFile);

    let preguntas = [];
    const blocks = document.querySelectorAll('.builder-q-block');
    for (let idx = 0; idx < blocks.length; idx++) {
        const block = blocks[idx];
        const pTitulo = block.querySelector('.q-title').value;
        const pType = block.querySelector('.q-type').value;
        const pOpts = block.querySelector('.q-opts').value;
        const pReq = block.querySelector('.q-req').checked;
        
        let qImgFinal = '';
        const qFileInput = block.querySelector('.q-img-input');
        if (qFileInput && qFileInput.files[0]) {
            qImgFinal = await compressImg(qFileInput.files[0]);
        }

        if(pTitulo) {
            let opcionesArr = []; 
            if(['radio', 'checkbox', 'select'].includes(pType) && pOpts) { 
                opcionesArr = pOpts.split(',').map(s=>s.trim()).filter(Boolean); 
            }
            preguntas.push({ id: `pq_${idx}`, titulo: pTitulo, tipo: pType, opciones: opcionesArr, obligatoria: pReq, imagen: qImgFinal });
        }
    }
    
    if(preguntas.length === 0) return alert("Debes agregar al menos una pregunta válida.");
    
    const btnPub = document.getElementById('btn-pub-formulario');
    const oldText = btnPub.innerHTML;
    btnPub.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Publicando...';
    btnPub.disabled = true;

    try {
        await addDoc(collection(db, "formularios"), { titulo, descripcion, imagen: imgFinal, fechaLimite: limitMillis, preguntas, respuestas: [], fecha: serverTimestamp(), autorId: auth.currentUser.uid });
        document.getElementById('form-titulo').value = ''; document.getElementById('form-desc').value = ''; document.getElementById('form-fecha').value = ''; document.getElementById('form-imagen').value = ''; document.getElementById('contenedor-preguntas-builder').innerHTML = ''; numPreguntasForm = 0; bootstrap.Collapse.getInstance(document.getElementById('colFormulario'))?.hide();
        alert("¡Encuesta publicada y activada con éxito!");
    } catch(e) { 
        alert("Hubo un error al publicar: " + e.message); 
    } finally {
        btnPub.innerHTML = oldText;
        btnPub.disabled = false;
    }
};

let formulariosDataCache = [];
onSnapshot(query(collection(db, "formularios"), orderBy("fecha", "desc")), (snap) => {
    formulariosDataCache = []; snap.forEach(d => { formulariosDataCache.push({id: d.id, ...d.data()}); window.postsData[d.id] = d.data(); checkDeepLink(d.id, 'formularios'); });
    renderFormularios();
});

function renderFormularios() {
    const cont = document.getElementById('contenedor-formularios'); 
    if(formulariosDataCache.length === 0) {
        return cont.innerHTML = '<div class="text-center font-inter mt-5 py-5"><i class="bi bi-ui-checks-grid display-1 text-secondary opacity-25"></i><h4 class="mt-4 fw-bold text-dark">No hay encuestas o debates activos</h4><p class="text-secondary">Vuelve más tarde para participar en nuevas discusiones y formularios.</p></div>';
    }
    
    let h = ''; const now = Date.now();
    formulariosDataCache.forEach(data => {
        const cerrada = data.fechaLimite && data.fechaLimite < now;
        const statusBadge = cerrada ? `<span class="badge bg-danger rounded-pill fw-semibold" style="font-size: 0.7rem;">Finalizada</span>` : `<span class="badge bg-success rounded-pill fw-semibold" style="font-size: 0.7rem;">Activa</span>`;
        const numRes = data.respuestas ? data.respuestas.length : 0;
        const placeholderImg = `<div class="d-flex align-items-center justify-content-center bg-light text-secondary h-100 w-100" style="min-height: 140px; border-right: 1px solid #e2e8f0;"><i class="bi bi-card-checklist fs-1 opacity-50"></i></div>`;
        const imgHTML = data.imagen ? `<img src="${data.imagen}" class="w-100 h-100 object-fit-cover" style="min-height: 140px; border-right: 1px solid #e2e8f0;">` : placeholderImg;
        
        h += `<div class="card border-0 shadow-sm rounded-4 mb-4 bg-white form-survey-card cursor-pointer overflow-hidden" onclick="abrirModal('${data.id}', 'formularios')">
            <div class="row g-0 align-items-stretch">
                <div class="col-4 col-md-3">
                    ${imgHTML}
                </div>
                <div class="col-8 col-md-9 d-flex flex-column justify-content-center">
                    <div class="card-body p-3 p-md-4 position-relative">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div><span class="tag-badge me-2" style="color: #009668; border-color: #d1d5db;">ENCUESTA</span> ${statusBadge}</div>
                            <div class="text-nowrap ms-2">
                                <i class="bi bi-share-fill text-muted me-3 hover-bg-light p-1 rounded" onclick="event.stopPropagation(); compartir('${data.id}', 'formularios')"></i>
                                <i class="bi bi-trash-fill text-danger admin-only-inline hover-bg-light p-1 rounded" onclick="event.stopPropagation(); borrarPost('formularios', '${data.id}')"></i>
                            </div>
                        </div>
                        <h4 class="fw-bold font-inter text-dark mb-1 text-truncate" style="font-size: 1.25rem;">${data.titulo}</h4>
                        <p class="text-muted font-inter mb-3 text-truncate-2 small" style="line-height: 1.5;">${escapeHTML(data.descripcion||'')}</p>
                        <div class="d-flex justify-content-between align-items-center mt-auto">
                            <small class="text-muted fw-semibold font-inter"><i class="bi bi-person-check-fill me-1"></i> ${numRes} Respuestas</small>
                            <span class="fw-bold font-inter small" style="color:#004b79;">Participar <i class="bi bi-arrow-right ms-1"></i></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }); 
    cont.innerHTML = h; 
    if(window.modalActual.col === 'formularios' && window.modalActual.id) abrirModal(window.modalActual.id, 'formularios');
}

window.exportarExcel = (id) => {
    const data = window.postsData[id];
    if (!data || !data.respuestas || data.respuestas.length === 0) return alert("No hay respuestas para exportar.");
    
    let csvContent = "\uFEFF"; 
    let headers = ["Marca temporal", "Dirección de correo electrónico"];
    data.preguntas.forEach(q => headers.push(`"${q.titulo.replace(/"/g, '""')}"`));
    csvContent += headers.join(";") + "\n";
    
    data.respuestas.forEach(r => {
        const fDate = r.date ? new Date(r.date).toLocaleString('es-PE') : "";
        const fMail = r.email || "No registrado";
        let row = [`"${fDate}"`, `"${fMail}"`];
        
        data.preguntas.forEach(q => {
            let ans = r.datos[q.id] || "";
            if (Array.isArray(ans)) ans = ans.join(", ");
            let safeAns = ans.toString().replace(/"/g, '""').replace(/\r?\n/g, " "); 
            row.push(`"${safeAns}"`);
        });
        csvContent += row.join(";") + "\n";
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Resultados_${slugify(data.titulo)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.renderModalFormulario = (id, data) => {
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalFormulario'));
    document.getElementById('mf-titulo').innerText = data.titulo; document.getElementById('mf-desc').innerText = data.descripcion;
    
    const banner = document.getElementById('mf-banner');
    if(data.imagen) { banner.style.backgroundImage = `url('${data.imagen}')`; } 
    else { banner.style.backgroundImage = 'none'; }
    
    const isOwner = document.body.classList.contains('is-owner'); 
    const cont = document.getElementById('mf-contenido'); const btn = document.getElementById('btn-enviar-formulario'); const status = document.getElementById('mf-status'); const footerCont = document.getElementById('mf-footer-container');

    if (!isOwner && !auth.currentUser) {
        cont.innerHTML = `<div class="bg-white shadow-sm p-5 text-center mt-4" style="border-radius: 12px; border-top: 5px solid #004b79;"><i class="bi bi-google d-block mb-3" style="font-size: 3.5rem; color:#db4437;"></i><h4 class="fw-bold text-dark font-inter">Acceso Restringido</h4><p class="text-secondary mb-4">Debes iniciar sesión con tu cuenta de Google para poder participar en este debate o encuesta.</p><button class="btn btn-ingresar px-5 py-2 shadow-sm fs-6" onclick="document.getElementById('btn-login').click(); bootstrap.Modal.getInstance(document.getElementById('modalFormulario')).hide();">Ingresar con Google</button></div>`;
        btn.style.display = 'none'; footerCont.style.display = 'none';
        return modal.show();
    }
    
    const uid = getUid();
    const yaRespondio = data.respuestas && data.respuestas.some(r => r.uid === uid);
    const cerrada = data.fechaLimite && data.fechaLimite < Date.now();
    
    if (isOwner) { 
        const exportBtnHtml = `<button class="btn btn-sm text-white fw-bold mt-2 shadow-sm px-3 py-2" style="background-color: #009668; border-color:#009668;" onclick="exportarExcel('${id}')"><i class="bi bi-file-earmark-excel-fill me-1"></i> Descargar Excel (CSV)</button>`;
        status.innerHTML = `<div class="d-flex flex-column align-items-start"><span class="mb-2">Total respuestas: <strong class="text-dark fs-5">${data.respuestas ? data.respuestas.length : 0}</strong></span>${exportBtnHtml}</div>`; 
        btn.style.display = 'none'; footerCont.style.display = 'flex';
        
        if (!data.respuestas || data.respuestas.length === 0) { cont.innerHTML = '<div class="text-muted text-center py-5 bg-white shadow-sm" style="border-radius: 12px;"><i class="bi bi-bar-chart fs-1"></i><p class="mt-3">Aún no hay respuestas para mostrar.</p></div>'; return modal.show(); }
        
        let htmlStats = '';
        data.preguntas.forEach((q, idx) => {
            htmlStats += `<div class="mb-4 bg-white p-4 p-md-5 shadow-sm" style="border-radius: 12px;"><h5 class="fw-bold text-dark mb-4 font-inter">${idx + 1}. ${q.titulo}</h5>`;
            if (['text', 'textarea', 'date', 'time'].includes(q.tipo)) {
                htmlStats += `<div class="p-3 bg-light rounded-3 text-dark" style="max-height: 250px; overflow-y: auto;">`;
                let hasAnswers = false;
                data.respuestas.forEach(r => { if(r.datos[q.id]) { hasAnswers = true; htmlStats += `<div class="border-bottom border-light py-2 font-inter small text-secondary"><i class="bi bi-chat-left-text me-2 opacity-50"></i> ${escapeHTML(r.datos[q.id])}</div>`; } });
                if(!hasAnswers) htmlStats += `<span class="text-muted small">Nadie ha respondido a esta pregunta.</span>`;
                htmlStats += `</div>`;
            } else {
                let counts = {}; 
                if(q.tipo === 'scale') { for(let i=1; i<=5; i++) counts[i.toString()] = 0; }
                else { q.opciones.forEach(o => counts[o] = 0); }
                
                data.respuestas.forEach(r => { let ans = r.datos[q.id]; if(ans) { if(Array.isArray(ans)) ans.forEach(a => { if(counts[a]!==undefined) counts[a]++ }); else if(counts[ans]!==undefined) counts[ans]++; } });
                const totalQRes = data.respuestas.length;
                
                Object.keys(counts).forEach(o => { 
                    const pct = totalQRes===0?0:Math.round((counts[o]/totalQRes)*100); 
                    htmlStats += `<div class="mt-3 small fw-bold d-flex justify-content-between font-inter text-dark"><span>${o}</span><span>${counts[o]} resp. (${pct}%)</span></div><div class="q-result-bar mt-1 mb-3 bg-light" style="height: 16px; border-radius: 8px; overflow: hidden;"><div class="q-result-fill" style="width:${pct}%; height: 100%; background-color: #009668; transition: width 1s ease-in-out;"></div></div>`; 
                });
            } htmlStats += `</div>`;
        }); cont.innerHTML = htmlStats; modal.show();
        
    } else { 
        if (cerrada) { status.innerText = ''; btn.style.display = 'none'; footerCont.style.display = 'none'; cont.innerHTML = '<div class="alert bg-white shadow-sm p-5 text-center" style="border-radius: 12px; border-left: 5px solid #dc3545;"><i class="bi bi-lock-fill d-block mb-3 text-danger" style="font-size: 3rem;"></i><h4 class="fw-bold text-dark font-inter">Formulario cerrado</h4><p class="text-secondary mb-0">El tiempo para participar en esta encuesta ha terminado.</p></div>'; return modal.show(); }
        if (yaRespondio) { status.innerText = ''; btn.style.display = 'none'; footerCont.style.display = 'none'; cont.innerHTML = '<div class="alert bg-white shadow-sm p-5 text-center" style="border-radius: 12px; border-left: 5px solid #009668;"><i class="bi bi-check-circle-fill d-block mb-3" style="font-size: 3rem; color:#009668;"></i><h4 class="fw-bold text-dark font-inter">Respuestas Registradas</h4><p class="text-secondary mb-0">Ya hemos recibido tu información. ¡Muchas gracias por participar!</p></div>'; return modal.show(); }
        
        status.innerHTML = '☕ Ganarás <strong class="text-success">+5</strong> de Reputación.'; btn.style.display = 'block'; footerCont.style.display = 'flex';
        let hForm = '<form id="form-responder">';
        
        data.preguntas.forEach((q, idx) => {
            const reqMark = q.obligatoria ? '<span class="text-danger ms-1">*</span>' : '';
            const reqAttr = q.obligatoria ? 'required' : '';
            const imgHtml = q.imagen ? `<img src="${q.imagen}" class="img-fluid rounded-3 mb-4 shadow-sm" style="max-height: 350px; width: 100%; object-fit: contain; background: #f8f9fa;">` : '';
            
            hForm += `<div class="mb-4 bg-white p-4 p-md-5 shadow-sm" style="border-radius: 12px; border-left: 5px solid #004b79;">
                        <h5 class="fw-bold text-dark mb-3 font-inter" style="font-size: 1.15rem;">${idx + 1}. ${q.titulo}${reqMark}</h5>
                        ${imgHtml}`;
            
            if (q.tipo === 'text') { hForm += `<input type="text" class="form-control bg-light border-0 border-bottom border-2 border-secondary rounded-0 font-inter px-3 py-2 gform-input" name="${q.id}" placeholder="Tu respuesta" ${reqAttr}>`; }
            else if (q.tipo === 'textarea') { hForm += `<textarea class="form-control bg-light border-0 border-bottom border-2 border-secondary rounded-0 font-inter px-3 py-2 gform-input" name="${q.id}" rows="3" placeholder="Tu respuesta" ${reqAttr}></textarea>`; }
            else if (q.tipo === 'radio') { q.opciones.forEach((o, i) => { hForm += `<div class="form-check mb-3 ms-2 fs-6"><input class="form-check-input border-secondary" type="radio" name="${q.id}" value="${escapeHTML(o)}" id="${q.id}_${i}" ${reqAttr}><label class="form-check-label text-dark font-inter" for="${q.id}_${i}">${escapeHTML(o)}</label></div>`; }); }
            else if (q.tipo === 'checkbox') { q.opciones.forEach((o, i) => { hForm += `<div class="form-check mb-3 ms-2 fs-6"><input class="form-check-input border-secondary" type="checkbox" name="${q.id}[]" value="${escapeHTML(o)}" id="${q.id}_${i}"><label class="form-check-label text-dark font-inter" for="${q.id}_${i}">${escapeHTML(o)}</label></div>`; }); }
            else if (q.tipo === 'select') { hForm += `<select class="form-select bg-light border-0 border-bottom border-2 border-secondary rounded-0 font-inter text-dark py-2 px-3 gform-input w-auto" name="${q.id}" ${reqAttr}><option value="">Elegir</option>`; q.opciones.forEach(o => { hForm += `<option value="${escapeHTML(o)}">${escapeHTML(o)}</option>`; }); hForm += `</select>`; }
            else if (q.tipo === 'scale') { 
                hForm += `<div class="d-flex align-items-center gap-2 gap-md-4 py-3 overflow-auto">
                            <span class="text-muted small fw-semibold">1</span>`;
                for(let j=1; j<=5; j++){
                    hForm += `<div class="form-check form-check-inline d-flex flex-column align-items-center mx-1 mx-md-2 mb-0">
                                <label class="form-check-label text-dark font-inter mb-2 small" for="${q.id}_${j}">${j}</label>
                                <input class="form-check-input m-0 border-secondary" style="width: 1.2rem; height: 1.2rem;" type="radio" name="${q.id}" value="${j}" id="${q.id}_${j}" ${reqAttr}>
                              </div>`;
                }
                hForm += `<span class="text-muted small fw-semibold">5</span></div>`;
            }
            else if (q.tipo === 'date') { hForm += `<input type="date" class="form-control bg-light border-0 border-bottom border-2 border-secondary rounded-0 font-inter px-3 py-2 w-auto gform-input" name="${q.id}" ${reqAttr}>`; }
            else if (q.tipo === 'time') { hForm += `<input type="time" class="form-control bg-light border-0 border-bottom border-2 border-secondary rounded-0 font-inter px-3 py-2 w-auto gform-input" name="${q.id}" ${reqAttr}>`; }
            hForm += `</div>`;
        }); hForm += '</form>'; cont.innerHTML = hForm;
        
        btn.onclick = async () => {
            const frm = document.getElementById('form-responder'); 
            if (!frm.reportValidity()) return;
            
            const fd = new FormData(frm); let ans = {}; let isComplete = true;
            data.preguntas.forEach(q => {
                if(q.tipo === 'checkbox') { 
                    const vals = fd.getAll(q.id+'[]'); 
                    if(q.obligatoria && vals.length === 0) isComplete = false; 
                    ans[q.id] = vals; 
                } else { 
                    const v = fd.get(q.id); 
                    if(q.obligatoria && !v) isComplete = false; 
                    ans[q.id] = v; 
                }
            });
            
            if(!isComplete) return alert("Por favor, completa todas las preguntas obligatorias antes de enviar.");
            
            const btnPub = document.getElementById('btn-enviar-formulario');
            btnPub.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Enviando...';
            btnPub.disabled = true;

            const ref = doc(db, "formularios", id); const snap = await getDoc(ref);
            if(snap.exists()) {
                let d = snap.data(); if(!d.respuestas) d.respuestas = [];
                const uEmail = auth.currentUser ? auth.currentUser.email || "Sin correo" : "Sin correo";
                
                if(auth.currentUser) {
                    const userRef = doc(db, "usuarios", uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        await updateDoc(userRef, { reputacion: increment(5) });
                    }
                }
                
                d.respuestas.push({ uid: uid, email: uEmail, datos: ans, date: Date.now() });
                await updateDoc(ref, { respuestas: d.respuestas });
                
                cont.innerHTML = '<div class="alert bg-white shadow-sm p-5 text-center mt-4" style="border-radius: 12px; border-left: 5px solid #009668;"><i class="bi bi-check-circle-fill d-block mb-3" style="font-size: 3rem; color:#009668;"></i><h4 class="fw-bold text-dark font-inter">¡Respuestas Enviadas!</h4><p class="text-secondary mb-0">Tus respuestas han sido guardadas y has ganado <strong class="text-success">+5</strong> de reputación. ¡Gracias por participar!</p></div>'; 
                btn.style.display = 'none'; status.innerHTML = 'Completado.';
            }
        };
        modal.show();
    }
};
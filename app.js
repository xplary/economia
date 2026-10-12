import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const app = initializeApp({ apiKey: "AIzaSyDvtzU8SGycfh99Cc_lLT7xabQ_uPBOpqE", authDomain: "economia-41d20.firebaseapp.com", databaseURL: "https://economia-41d20-default-rtdb.firebaseio.com", projectId: "economia-41d20", storageBucket: "economia-41d20.firebasestorage.app", messagingSenderId: "750639619847", appId: "1:750639619847:web:9a036501539ca6e3ceafa2", measurementId: "G-BWV82ZTSW1" });
const auth = getAuth(app); const db = getFirestore(app);

window.postsData = {}; window.editandoId = null; window.modalActual = { id: null, col: null };
let progress = 0; let isFirstLoad = true;
const progBar = document.getElementById('splash-progress'); const splash = document.getElementById('splash-screen');
const splashInterval = setInterval(() => { progress += Math.random() * 15 + 5; if(progress > 85) progress = 85; if(progBar) progBar.style.width = progress + '%'; }, 200);

document.getElementById('current-year').innerText = new Date().getFullYear();

tinymce.init({
    selector: '#editor-noticias', height: 450, menubar: false,
    plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table wordcount',
    toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | table link image | removeformat',
    content_style: 'body { font-family: "Inter", sans-serif; font-size: 16px; text-align: justify; line-height: 1.6; }', paste_data_images: true
});

if(!localStorage.getItem('uid')) localStorage.setItem('uid', 'anon_'+Math.random().toString(36).substring(2,11));
const getUid = () => auth.currentUser ? auth.currentUser.uid : localStorage.getItem('uid');
document.getElementById('btn-login').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
document.getElementById('btn-logout').onclick = () => signOut(auth);

onAuthStateChanged(auth, async (u) => {
    document.getElementById('btn-login').classList.toggle('d-none', !!u); document.getElementById('btn-logout').classList.toggle('d-none', !u); document.body.classList.remove('is-owner');
    if(u) { const d = await getDoc(doc(db, "usuarios", u.uid)); if(d.exists() && d.data().owner) { document.body.classList.add('is-owner'); renderEncuestas(); } }
});

window.borrarPost = async (col, id) => { if(confirm("¿Eliminar publicación?")) await deleteDoc(doc(db, col, id)); };

// FUNCIONES PARA ENLACES LIMPIOS Y COMPARTIR (Solución a comillas que rompían el botón)
const slugify = (text) => text ? text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").substring(0, 80) : 'cafe-unp';
window.compartir = (id, col) => { 
    const d = window.postsData[id]; if(!d) return; 
    const tit = d.titulo || d.pregunta || 'CAFE UNP';
    const slug = slugify(tit);
    const url = window.location.origin + window.location.pathname + `?v=${slug}---${id}---${col}`; 
    if(navigator.share) navigator.share({ title: tit, url: url }); 
    else { navigator.clipboard.writeText(url); alert("Link copiado: " + url); } 
};

let currentRating = 0;
const setupStars = (selector, textId) => { document.querySelectorAll(selector).forEach(st => { st.onclick = function() { currentRating = parseInt(this.getAttribute('data-val')); const cleanClass = selector.replace('.', ''); document.querySelectorAll(selector).forEach(s => { let val = parseInt(s.getAttribute('data-val')); s.className = val <= currentRating ? `bi bi-star-fill star-gradient cursor-pointer fs-3 me-1 ${cleanClass}` : `bi bi-star text-muted cursor-pointer fs-3 me-1 ${cleanClass}`; }); document.getElementById(textId).innerText = `(${currentRating} Estrellas)`; } }); };
setupStars('.star-btn-mn', 'rating-text-mn'); setupStars('.star-btn-ml', 'rating-text-ml'); 

const getPromedioStars = (comentarios) => { if(!comentarios || comentarios.length === 0) return ''; const valid = comentarios.filter(c => c.rating > 0 && c.aprobado !== false); if(valid.length === 0) return ''; return `<span class="star-gradient fw-bold">⭐ ${(valid.reduce((acc, c) => acc + c.rating, 0) / valid.length).toFixed(1)} (${valid.length})</span>`; };

const escapeHTML = (str) => str.replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t] || t));

const enviarComentario = async (txtId, selector, textId) => {
    const txt = document.getElementById(txtId).value; if(!txt) return alert("Escribe un comentario");
    const isOwner = document.body.classList.contains('is-owner');
    if (!isOwner) { const lastTime = localStorage.getItem('last_comment_time'); const now = Date.now(); if (lastTime && now - parseInt(lastTime) < 120000) { const wait = Math.ceil((120000 - (now - parseInt(lastTime))) / 1000); return alert(`Anti-Spam: Por favor, espera ${wait} segundos para comentar de nuevo.`); } }
    
    const ref = doc(db, window.modalActual.col, window.modalActual.id); const snap = await getDoc(ref);
    if(snap.exists()) {
        const arr = snap.data().comentarios || []; 
        arr.push({ id: Date.now(), autor: auth.currentUser ? auth.currentUser.displayName || "Usuario" : "Anónimo", texto: escapeHTML(txt), rating: currentRating, date: new Date().toLocaleDateString(), aprobado: isOwner });
        await updateDoc(ref, { comentarios: arr }); 
        if (!isOwner) { localStorage.setItem('last_comment_time', Date.now()); alert("Tu comentario fue enviado y está pendiente de aprobación."); }
        document.getElementById(txtId).value = ''; currentRating = 0; document.querySelectorAll(selector).forEach(s => s.className = `bi bi-star text-muted cursor-pointer fs-3 me-1 ${selector.replace('.','')}`); document.getElementById(textId).innerText = '';
    }
};

document.getElementById('btn-enviar-comentario-mn').onclick = () => enviarComentario('mn-comentario-texto', '.star-btn-mn', 'rating-text-mn');
document.getElementById('btn-enviar-comentario-ml').onclick = () => enviarComentario('ml-comentario-texto', '.star-btn-ml', 'rating-text-ml');

window.borrarComentario = async (cid) => { if(!confirm("¿Borrar comentario?")) return; const ref = doc(db, window.modalActual.col, window.modalActual.id); const snap = await getDoc(ref); if(snap.exists()) { const arr = snap.data().comentarios || []; await updateDoc(ref, { comentarios: arr.filter(c => c.id !== cid) }); } };
window.aprobarComentario = async (cid) => { const ref = doc(db, window.modalActual.col, window.modalActual.id); const snap = await getDoc(ref); if(snap.exists()) { const arr = snap.data().comentarios || []; const index = arr.findIndex(c => c.id === cid); if(index !== -1) { arr[index].aprobado = true; await updateDoc(ref, { comentarios: arr }); } } };

const renderComentarios = (comentarios, containerId) => {
    const box = document.getElementById(containerId); if(!box) return; const isOwner = document.body.classList.contains('is-owner');
    let comsToShow = comentarios || []; if(!isOwner) comsToShow = comsToShow.filter(c => c.aprobado !== false);
    if(comsToShow.length===0) return box.innerHTML = '<div class="text-center mt-4 text-muted"><i class="bi bi-chat-dots fs-3"></i><p class="mt-2 small">Sé el primero en aportar.</p></div>';
    
    box.innerHTML = comsToShow.map(c => {
        const starsHTML = `<span class="star-gradient" style="font-size:0.9rem;">${'★'.repeat(c.rating)}${'☆'.repeat(5-c.rating)}</span>`;
        const pendingBadge = c.aprobado === false ? `<span class="badge bg-warning text-dark ms-2 fw-semibold" style="font-size:0.65rem;">Pendiente</span>` : '';
        const approveBtn = (c.aprobado === false && isOwner) ? `<button class="btn btn-sm btn-success py-0 px-2 ms-2 fw-bold" style="font-size:0.7rem;" onclick="aprobarComentario(${c.id})"><i class="bi bi-check-lg"></i> Aprobar</button>` : '';
        return `<div class="mb-4 pb-3 border-bottom"><div class="d-flex justify-content-between align-items-center mb-1"><strong class="font-inter text-dark small">${c.autor} ${pendingBadge}</strong><div>${starsHTML}${approveBtn}<i class="bi bi-trash text-danger ms-2 cursor-pointer admin-only-inline" onclick="borrarComentario(${c.id})"></i></div></div><p class="text-secondary font-inter mb-1" style="font-size: 0.95rem;">${c.texto}</p><div class="text-muted small font-inter text-end" style="font-size: 0.75rem;">${c.date}</div></div>`;
    }).join('');
};

const generarHTMLOpcionesEncuesta = (id, data) => { let h = `<div class="mt-3 w-100">`; const isOwner = document.body.classList.contains('is-owner'); const uid = getUid(); const yaVoto = data.votantes && data.votantes.includes(uid); data.opciones.forEach((o, i) => { const pct = data.totalVotos === 0 ? 0 : Math.round((o.votos / data.totalVotos) * 100); const hidePct = data.ocultarPct && !isOwner; const showResults = yaVoto || isOwner; const width = showResults && !hidePct ? pct : 0; const txtPct = hidePct ? '?' : pct; h += `<button class="poll-btn ${yaVoto ? 'voted' : ''}" onclick="votar('${id}', ${i})"><div class="poll-fill" style="width: ${width}%;"></div><div class="poll-content"><span class="poll-text">${escapeHTML(o.texto)}</span>${showResults ? `<span class="poll-pct">${txtPct}%</span>` : ''}</div></button>`; }); return h + `</div>`; };

const formatEmbedUrl = (url) => { if(!url) return ''; const match = url.match(/\/(?:d|file\/d)\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/); if (match && match[1]) return `https://drive.google.com/file/d/${match[1]}/preview`; return url; };

window.abrirModal = (id, col) => {
    const d = window.postsData[id]; if(!d) return; window.modalActual = { id, col };
    const tagsHTML = (d.etiquetas||[]).map(t => `<span class="tag-badge" style="color: ${d.colorTag||'#004b79'}; border-color: #d1d5db;">${escapeHTML(t)}</span>`).join('');
    
    if (col === 'noticias') {
        document.getElementById('mn-titulo').innerText = d.titulo; document.getElementById('mn-fecha').innerHTML = `<i class="bi bi-calendar3 me-2"></i> ${d.fecha ? d.fecha.toDate().toLocaleDateString() : ''}`; document.getElementById('mn-promedio-estrellas').innerHTML = getPromedioStars(d.comentarios); document.getElementById('mn-tags').innerHTML = tagsHTML;
        const imgEl = document.getElementById('mn-imagen'); if(d.imagen && d.imagen.length > 20) { imgEl.src = d.imagen; imgEl.style.display = 'block'; } else { imgEl.style.display = 'none'; }
        document.getElementById('mn-contenido').innerHTML = d.contenido ? `<div class="contenido-apa">${d.contenido}</div>` : `<div class="contenido-apa">${escapeHTML(d.resumen||'')}</div>`; renderComentarios(d.comentarios, 'mn-lista-comentarios'); bootstrap.Modal.getOrCreateInstance(document.getElementById('modalNoticia')).show();
    } else {
        document.getElementById('modal-titulo').innerText = d.titulo || d.pregunta; document.getElementById('modal-fecha').innerHTML = `<i class="bi bi-calendar3 me-2"></i> ${d.fecha ? d.fecha.toDate().toLocaleDateString() : ''}`; document.getElementById('modal-promedio-estrellas').innerHTML = getPromedioStars(d.comentarios); document.getElementById('modal-tags').innerHTML = tagsHTML;
        const imgEl = document.getElementById('modal-imagen'); const iframeEl = document.getElementById('modal-iframe'); const contEl = document.getElementById('modal-contenido'); const leftCol = document.getElementById('modal-left-col'); const rightCol = document.getElementById('modal-right-col');
        let hasLeftContent = false; if(d.imagen && d.imagen.length > 20) { imgEl.src = d.imagen; imgEl.style.display = 'block'; hasLeftContent = true; } else { imgEl.style.display = 'none'; } if(d.link) { iframeEl.src = formatEmbedUrl(d.link); iframeEl.style.display = 'block'; hasLeftContent = true; } else { iframeEl.style.display = 'none'; iframeEl.src = ''; }
        if(hasLeftContent) { leftCol.classList.remove('d-none'); leftCol.classList.add('d-flex'); rightCol.className = 'col-lg-5 h-100 overflow-y-auto bg-white px-4 py-4 d-flex flex-column'; rightCol.style.maxWidth = 'none'; } else { leftCol.classList.remove('d-flex'); leftCol.classList.add('d-none'); rightCol.className = 'col-12 h-100 overflow-y-auto bg-white px-4 px-md-5 py-4 py-md-5 d-flex flex-column mx-auto'; rightCol.style.maxWidth = '900px'; }
        if(col === 'encuestas') contEl.innerHTML = `<p class="mb-4 font-inter text-dark" style="font-size: 1.15rem;">${escapeHTML(d.resumen||'')}</p>` + generarHTMLOpcionesEncuesta(id, d); else contEl.innerHTML = d.contenido ? `<div class="contenido-apa">${d.contenido}</div>` : `<div class="contenido-apa">${escapeHTML(d.resumen||'')}</div>`; renderComentarios(d.comentarios, 'ml-lista-comentarios'); bootstrap.Modal.getOrCreateInstance(document.getElementById('modalLectura')).show();
    }
};

const checkDeepLink = (id, col) => { 
    if(autoOpenDone) return; 
    const urlP = new URLSearchParams(window.location.search); 
    const v = urlP.get('v');
    let tId = urlP.get('p'), tCol = urlP.get('t');
    if(v) { const parts = v.split('---'); if(parts.length===3){ tId = parts[1]; tCol = parts[2]; } }
    if(tId === id && tCol === col) { autoOpenDone = true; setTimeout(() => { abrirModal(id, col); }, 500); } 
}; let autoOpenDone = false;

const compressImg = (file) => new Promise((res) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = (e) => { const img = new Image(); img.src = e.target.result; img.onload = () => { const canvas = document.createElement('canvas'); const MAX = 2000; const scale = img.width > MAX ? MAX / img.width : 1; canvas.width = img.width * scale; canvas.height = img.height * scale; canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); res(canvas.toDataURL
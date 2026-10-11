import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const app = initializeApp({
    apiKey: "AIzaSyDvtzU8SGycfh99Cc_lLT7xabQ_uPBOpqE", authDomain: "economia-41d20.firebaseapp.com", databaseURL: "https://economia-41d20-default-rtdb.firebaseio.com", projectId: "economia-41d20", storageBucket: "economia-41d20.firebasestorage.app", messagingSenderId: "750639619847", appId: "1:750639619847:web:9a036501539ca6e3ceafa2", measurementId: "G-BWV82ZTSW1"
});
const auth = getAuth(app); const db = getFirestore(app);

window.postsData = {}; window.editandoId = null; window.modalActual = { id: null, col: null };

let progress = 0; let isFirstLoad = true;
const progBar = document.getElementById('splash-progress'); const splash = document.getElementById('splash-screen');
const splashInterval = setInterval(() => { progress += Math.random() * 15 + 5; if(progress > 85) progress = 85; if(progBar) progBar.style.width = progress + '%'; }, 200);

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
    document.getElementById('btn-login').classList.toggle('d-none', !!u);
    document.getElementById('btn-logout').classList.toggle('d-none', !u);
    document.body.classList.remove('is-owner');
    if(u) { const d = await getDoc(doc(db, "usuarios", u.uid)); if(d.exists() && d.data().owner) { document.body.classList.add('is-owner'); renderEncuestas(); } }
});

window.borrarPost = async (col, id) => { if(confirm("¿Eliminar publicación?")) await deleteDoc(doc(db, col, id)); };

window.compartir = (tit, id, col) => { 
    const url = window.location.origin + window.location.pathname + `?p=${id}&t=${col}`;
    if(navigator.share) navigator.share({ title: tit, url: url }); else { navigator.clipboard.writeText(url); alert("Link copiado: " + url); }
};

let currentRating = 0;
document.querySelectorAll('.star-btn').forEach(st => {
    st.onclick = function() {
        currentRating = parseInt(this.getAttribute('data-val'));
        document.querySelectorAll('.star-btn').forEach(s => s.className = parseInt(s.getAttribute('data-val')) <= currentRating ? 'bi bi-star-fill text-warning cursor-pointer star-btn' : 'bi bi-star cursor-pointer star-btn');
        document.getElementById('rating-text').innerText = `(${currentRating} Estrellas)`;
    }
});

const getPromedioStars = (comentarios) => {
    if(!comentarios || comentarios.length === 0) return '';
    const valid = comentarios.filter(c => c.rating > 0);
    if(valid.length === 0) return '';
    const avg = valid.reduce((acc, c) => acc + c.rating, 0) / valid.length;
    return `⭐ ${avg.toFixed(1)} (${valid.length})`;
};

document.getElementById('btn-enviar-comentario').onclick = async () => {
    const txt = document.getElementById('comentario-texto').value; if(!txt) return alert("Escribe un comentario");
    const ref = doc(db, window.modalActual.col, window.modalActual.id); const snap = await getDoc(ref);
    if(snap.exists()) {
        const arr = snap.data().comentarios || [];
        arr.push({ id: Date.now(), autor: auth.currentUser ? auth.currentUser.displayName || "Usuario" : "Anónimo", texto: txt, rating: currentRating, date: new Date().toLocaleDateString() });
        await updateDoc(ref, { comentarios: arr });
        document.getElementById('comentario-texto').value = ''; currentRating = 0;
        document.querySelectorAll('.star-btn').forEach(s => s.className = 'bi bi-star cursor-pointer star-btn'); document.getElementById('rating-text').innerText = '';
    }
};

window.borrarComentario = async (cid) => {
    if(!confirm("¿Borrar comentario?")) return;
    const ref = doc(db, window.modalActual.col, window.modalActual.id); const snap = await getDoc(ref);
    if(snap.exists()) { const arr = snap.data().comentarios || []; await updateDoc(ref, { comentarios: arr.filter(c => c.id !== cid) }); }
};

const renderComentarios = (comentarios) => {
    const box = document.getElementById('lista-comentarios');
    if(!comentarios || comentarios.length===0) return box.innerHTML = '<div class="text-center mt-5 text-muted"><i class="bi bi-chat-dots fs-1"></i><p class="mt-2">Sé el primero en comentar.</p></div>';
    box.innerHTML = comentarios.map(c => `
        <div class="mb-4 pb-3 border-bottom">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <strong class="font-inter text-dark">${c.autor}</strong>
                <div>
                    <span class="text-warning small">${'★'.repeat(c.rating)}${'☆'.repeat(5-c.rating)}</span>
                    <i class="bi bi-trash text-danger ms-2 cursor-pointer admin-only-inline" onclick="borrarComentario(${c.id})"></i>
                </div>
            </div>
            <p class="text-secondary font-inter mb-1" style="font-size: 0.95rem;">${c.texto}</p>
            <div class="text-muted small font-inter text-end">${c.date}</div>
        </div>`).join('');
};

const generarHTMLOpcionesEncuesta = (id, data) => {
    let h = `<div class="d-grid gap-2 border-start border-4 border-primary ps-3 mt-3">`;
    const isOwner = document.body.classList.contains('is-owner');
    data.opciones.forEach((o, i) => {
        const pct = data.totalVotos === 0 ? 0 : Math.round((o.votos / data.totalVotos) * 100);
        const hidePct = data.ocultarPct && !isOwner; const txtPct = hidePct ? '?' : pct; const width = hidePct ? 0 : pct;
        h += `<button class="btn btn-white border text-start position-relative rounded-3 py-2 shadow-sm" onclick="votar('${id}', ${i})"><div class="position-absolute top-0 start-0 h-100 bg-primary opacity-10 rounded-3" style="width: ${width}%;"></div><span class="position-relative z-1 d-flex justify-content-between px-2 font-inter"><span class="small fw-semibold text-dark">${o.texto}</span><span class="fw-bold text-primary small">${txtPct}%</span></span></button>`;
    }); return h + `</div>`;
};

const formatEmbedUrl = (url) => {
    if(!url) return '';
    const match = url.match(/\/(?:d|file\/d)\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return `https://drive.google.com/file/d/${match[1]}/preview`;
    return url;
};

// =====================================
// ABRIR MODAL (DISEÑO 2 COLUMNAS)
// =====================================
window.abrirModal = (id, col) => {
    const d = window.postsData[id]; if(!d) return;
    window.modalActual = { id, col };
    document.getElementById('modal-titulo').innerText = d.titulo || d.pregunta;
    document.getElementById('modal-fecha').innerHTML = `<i class="bi bi-calendar3 me-2"></i> ${d.fecha ? d.fecha.toDate().toLocaleDateString() : ''}`;
    document.getElementById('modal-promedio-estrellas').innerText = getPromedioStars(d.comentarios);
    document.getElementById('modal-tags').innerHTML = (d.etiquetas||[]).map(t => `<span class="tag-badge" style="background-color: ${d.colorTag||'#1976d2'};">${t}</span>`).join('');
    
    const imgEl = document.getElementById('modal-imagen'); const iframeEl = document.getElementById('modal-iframe'); const contEl = document.getElementById('modal-contenido');
    
    if(d.imagen && d.imagen.length > 20) { imgEl.src = d.imagen; imgEl.style.display = 'block'; } else { imgEl.style.display = 'none'; }
    if(d.link) { iframeEl.src = formatEmbedUrl(d.link); iframeEl.style.display = 'block'; } else { iframeEl.style.display = 'none'; iframeEl.src = ''; }
    
    if(col === 'encuestas') {
        contEl.innerHTML = `<p class="mb-4 font-inter text-dark" style="font-size: 1.15rem;">${d.resumen||''}</p>` + generarHTMLOpcionesEncuesta(id, d);
    } else {
        contEl.innerHTML = d.contenido ? `<div class="contenido-apa">${d.contenido}</div>` : `<div class="contenido-apa">${d.resumen||''}</div>`;
    }
    
    renderComentarios(d.comentarios);
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalLectura')).show();
};

const checkDeepLink = (id, col) => {
    if(autoOpenDone) return; const urlP = new URLSearchParams(window.location.search);
    if(urlP.get('p') === id && urlP.get('t') === col) { autoOpenDone = true; setTimeout(() => { abrirModal(id, col); }, 500); }
}; let autoOpenDone = false;

const compressImg = (file) => new Promise((res) => {
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = (e) => {
        const img = new Image(); img.src = e.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas'); const MAX = 1600; const scale = img.width > MAX ? MAX / img.width : 1;
            canvas.width = img.width * scale; canvas.height = img.height * scale;
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); res(canvas.toDataURL('image/jpeg', 0.85)); 
        };
    };
});

window.cancelarEdicion = () => {
    window.editandoId = null; document.querySelectorAll('input:not([type="color"]), textarea').forEach(i => i.value = '');
    if(tinymce.get('editor-noticias')) tinymce.get('editor-noticias').setContent(''); 
    document.getElementById('not-principal').checked = false; document.getElementById('not-form-title').innerText = "Editor de Columnas";
    bootstrap.Collapse.getInstance(document.getElementById('colNoticia'))?.hide(); bootstrap.Collapse.getInstance(document.getElementById('colArticulo'))?.hide();
};

onSnapshot(doc(db, "config", "sidebar"), (s) => {
    if(s.exists()){ const d = s.data(); if(d.t) document.getElementById('sb-titulo').innerText = d.t; if(d.desc) document.getElementById('sb-desc').innerText = d.desc; }
});
window.editarSidebar = async () => {
    const t = prompt("Título:", document.getElementById('sb-titulo').innerText) || document.getElementById('sb-titulo').innerText;
    const desc = prompt("Descripción:", document.getElementById('sb-desc').innerText) || document.getElementById('sb-desc').innerText;
    await setDoc(doc(db, "config", "sidebar"), {t, desc}, {merge:true});
};

// =====================================
// 1. NOTICIAS Y COLUMNAS
// =====================================
let noticiasData = []; let qBuscar = ''; let ordDesc = true;
document.getElementById('input-buscar').addEventListener('input', (e) => { qBuscar = e.target.value.toLowerCase(); renderNoticias(); });
document.getElementById('btn-ordenar').addEventListener('click', () => { ordDesc = !ordDesc; document.getElementById('btn-ordenar').innerText = ordDesc ? 'Ordenar: Recientes ↓' : 'Ordenar: Antiguos ↑'; renderNoticias(); });

document.getElementById('btn-pub-noticia').onclick = async () => {
    const titulo = document.getElementById('not-titulo').value; if(!titulo) return alert("Falta el titular.");
    const etiquetas = document.getElementById('not-tags').value ? document.getElementById('not-tags').value.split(',').map(t=>t.trim()).filter(Boolean) : ['Opinión'];
    let imgFinal = ''; const imgFile = document.getElementById('not-imagen').files[0];
    if (imgFile) imgFinal = await compressImg(imgFile); else if (window.editandoId && window.postsData[window.editandoId].imagen) imgFinal = window.postsData[window.editandoId].imagen;
    const editorContent = tinymce.get('editor-noticias').getContent();
    const data = { titulo, etiquetas, colorTag: document.getElementById('not-color').value, imagen: imgFinal, principal: document.getElementById('not-principal').checked, contenido: editorContent };
    if (window.editandoId) await updateDoc(doc(db, "noticias", window.editandoId), data); else { data.fecha = serverTimestamp(); data.comentarios = []; await addDoc(collection(db, "noticias"), data); }
    cancelarEdicion();
};

onSnapshot(collection(db, "noticias"), (snap) => {
    noticiasData = []; snap.forEach(d => { noticiasData.push({id: d.id, ...d.data()}); window.postsData[d.id] = d.data(); checkDeepLink(d.id, 'noticias'); });
    renderNoticias();
    if(window.modalActual.col === 'noticias' && window.modalActual.id) abrirModal(window.modalActual.id, 'noticias'); 
    
    if(isFirstLoad) {
        isFirstLoad = false; clearInterval(splashInterval); if(progBar) progBar.style.width = '100%';
        setTimeout(() => { if(splash) { splash.style.opacity = '0'; setTimeout(() => splash.remove(), 500); } }, 600); 
    }
});

function renderNoticias() {
    let filtradas = noticiasData.filter(n => (n.titulo||'').toLowerCase().includes(qBuscar) || (n.contenido||'').toLowerCase().includes(qBuscar));
    filtradas.sort((a,b) => { let tA = a.fecha?.toMillis()||0; let tB = b.fecha?.toMillis()||0; return ordDesc ? tB - tA : tA - tB; });
    const cLista = document.getElementById('contenedor-noticias-lista'); const cPrinc = document.getElementById('contenedor-noticia-principal');
    if (filtradas.length === 0) { cPrinc.innerHTML=''; cLista.innerHTML='<div class="text-center text-muted font-inter">No hay resultados.</div>'; return; }
    
    let hLista = ''; let hPrinc = ''; let pFound = false;
    filtradas.forEach(d => {
        const date = d.fecha ? d.fecha.toDate().toLocaleDateString() : 'Reciente'; const avgStr = getPromedioStars(d.comentarios);
        const tHTML = (d.etiquetas||[]).map(t => `<span class="tag-badge" style="background-color: ${d.colorTag||'#1976d2'}">${t}</span>`).join('');
        const imgH = d.imagen ? `<img src="${d.imagen}" class="post-img-rect shadow-sm" onclick="abrirModal('${d.id}', 'noticias')">` : `<div class="post-img-rect bg-light d-flex align-items-center justify-content-center text-muted border shadow-sm" onclick="abrirModal('${d.id}', 'noticias')"><i class="bi bi-image fs-1"></i></div>`;
        const textoLimpioPreview = d.contenido.replace(/<[^>]*>?/gm, '');

        if (d.principal && !pFound) {
            pFound = true;
            const imgP = d.imagen ? `<img src="${d.imagen}" class="img-fluid w-100 rounded-4 cursor-pointer" style="height:400px; object-fit: contain; background-color: #f1f3f5;" onclick="abrirModal('${d.id}', 'noticias')">` : `<div class="w-100 rounded-4 d-flex align-items-center justify-content-center bg-light text-muted border cursor-pointer" style="height:400px;" onclick="abrirModal('${d.id}', 'noticias')"><i class="bi bi-image fs-1"></i></div>`;
            hPrinc = `
            <article class="mb-5 pb-5 border-bottom border-light-subtle align-items-center">
                <div class="row">
                    <div class="col-lg-7 mb-4 mb-lg-0">${imgP}</div>
                    <div class="col-lg-5 ps-lg-4 d-flex flex-column justify-content-center">
                        <div class="mb-3">${tHTML}</div>
                        <h2 class="fw-bold mb-3 font-serif cursor-pointer text-dark" style="font-size: 2.3rem; line-height: 1.25;" onclick="abrirModal('${d.id}', 'noticias')">${d.titulo}</h2>
                        <div class="text-muted mb-4 text-truncate-3 font-inter" style="font-size: 1.1rem; line-height: 1.7;">${textoLimpioPreview}</div>
                        <div class="d-flex justify-content-between align-items-center mt-auto">
                            <small class="text-muted fw-semibold font-inter"><i class="bi bi-calendar3 me-1"></i> ${date} <span class="ms-2 text-warning fw-bold">${avgStr}</span></small>
                            <button class="btn btn-sm btn-outline-primary fw-bold font-inter rounded-pill px-3" onclick="abrirModal('${d.id}', 'noticias')">Leer columna <i class="bi bi-arrow-right"></i></button>
                        </div>
                    </div>
                </div>
            </article>`;
        }
        
        hLista += `
        <article class="mb-4 pb-4 border-bottom border-light-subtle">
            <div class="row g-4 align-items-center">
                <div class="col-md-4">${imgH}</div>
                <div class="col-md-8 d-flex flex-column">
                    <div class="d-flex justify-content-between mb-2">
                        <div>${tHTML}</div>
                        <div>
                            <i class="bi bi-share text-muted me-3 cursor-pointer" onclick="compartir('${d.titulo}', '${d.id}', 'noticias')"></i>
                            <i class="bi bi-pencil-fill text-warning me-3 admin-only-inline cursor-pointer" onclick="editarNoticia('${d.id}')"></i>
                            <i class="bi bi-trash text-danger admin-only-inline cursor-pointer" onclick="borrarPost('noticias', '${d.id}')"></i>
                        </div>
                    </div>
                    <h3 class="fw-bold mb-2 text-truncate-2 cursor-pointer font-serif text-dark" onclick="abrirModal('${d.id}', 'noticias')" style="font-size: 1.5rem;">${d.titulo}</h3>
                    <div class="text-muted mb-3 text-truncate-2 font-inter small" style="line-height: 1.6;">${textoLimpioPreview}</div>
                    <div class="d-flex justify-content-between align-items-center mt-auto">
                        <small class="text-muted fw-semibold font-inter"><i class="bi bi-calendar3 me-1"></i> ${date} <span class="ms-2 text-warning fw-bold">${avgStr}</span></small>
                        <button class="btn btn-sm btn-light text-primary fw-bold font-inter rounded-pill px-3" onclick="abrirModal('${d.id}', 'noticias')">Leer más</button>
                    </div>
                </div>
            </div>
        </article>`;
    });
    cPrinc.innerHTML = pFound ? hPrinc : ''; cLista.innerHTML = hLista;
}

// ==========================================
// 2. INVESTIGACIÓN & PAPERS (ESTILO REPOSITORIO ACADÉMICO)
// ==========================================
document.getElementById('btn-pub-articulo').onclick = async () => {
    const t = document.getElementById('art-titulo').value; const l = document.getElementById('art-link').value; if(!t||!l) return alert("Falta Título o Link.");
    const et = document.getElementById('art-tags').value ? document.getElementById('art-tags').value.split(',').map(x=>x.trim()).filter(Boolean) : ['Paper'];
    const data = { titulo: t, link: l, resumen: document.getElementById('art-resumen').value, etiquetas: et, colorTag: document.getElementById('art-color').value };
    if(window.editandoId) await updateDoc(doc(db, "articulos", window.editandoId), data); else { data.fecha = serverTimestamp(); data.comentarios = []; await addDoc(collection(db, "articulos"), data); }
    cancelarEdicion();
};

onSnapshot(query(collection(db, "articulos"), orderBy("fecha", "desc")), (snap) => {
    const cont = document.getElementById('contenedor-articulos'); if(snap.empty) return cont.innerHTML = '<div class="col-12 text-center text-muted font-inter">No hay papers.</div>';
    let h = ''; snap.forEach(d => {
        const data = d.data(); window.postsData[d.id] = data; checkDeepLink(d.id, 'articulos');
        const date = data.fecha ? data.fecha.toDate().toLocaleDateString() : ''; const avgStr = getPromedioStars(data.comentarios);
        const tHTML = (data.etiquetas||[]).map(t => `<span class="tag-badge" style="background-color: ${data.colorTag||'#dc3545'}">${t}</span>`).join('');
        
        // DISEÑO REPOSITORIO (PORTADA IZQUIERDA, TEXTO DERECHA)
        h += `
        <article class="col-12 mb-5 pb-4 border-bottom border-light-subtle">
            <div class="row align-items-start">
                <div class="col-md-2 col-4 cursor-pointer" onclick="abrirModal('${d.id}', 'articulos')">
                    <div class="paper-cover mx-auto rounded-1">
                        <i class="bi bi-file-earmark-pdf-fill text-secondary fs-1"></i>
                        <div class="mt-2" style="width: 80%; height: 3px; background: #e2e8f0; border-radius: 2px;"></div>
                        <div class="mt-1" style="width: 60%; height: 3px; background: #e2e8f0; border-radius: 2px;"></div>
                        <div class="mt-auto" style="width: 40%; height: 4px; background: #cbd5e1; border-radius: 2px;"></div>
                    </div>
                </div>
                <div class="col-md-10 col-8 d-flex flex-column h-100 ps-md-4">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            ${tHTML} 
                            <span class="badge bg-secondary ms-1 fw-semibold font-inter" style="letter-spacing: 0.5px;">Acceso Abierto</span>
                        </div>
                        <div class="text-nowrap ms-3">
                            <i class="bi bi-share-fill text-primary cursor-pointer me-3" onclick="compartir('${data.titulo}', '${d.id}', 'articulos')"></i>
                            <i class="bi bi-pencil-fill text-warning me-3 admin-only-inline cursor-pointer" onclick="editarArt('${d.id}')"></i>
                            <i class="bi bi-trash-fill text-danger admin-only-inline cursor-pointer" onclick="borrarPost('articulos', '${d.id}')"></i>
                        </div>
                    </div>
                    <a href="javascript:void(0)" onclick="abrirModal('${d.id}', 'articulos')" class="paper-title-link fw-bold font-serif mb-1" style="font-size: 1.45rem;">${data.titulo}</a>
                    <div class="text-muted small mb-3 font-inter">${data.fecha ? '(Publicado el ' + data.fecha.toDate().toLocaleDateString() + ')' : ''}</div>
                    <p class="text-muted mb-3 font-inter text-truncate-3" style="font-size: 1.05rem; line-height: 1.6;">${data.resumen}</p>
                    <div class="mt-auto d-flex align-items-center">
                        <button class="btn btn-sm btn-outline-primary fw-bold font-inter rounded-pill px-3 me-3 shadow-sm" onclick="abrirModal('${d.id}', 'articulos')">Leer documento <i class="bi bi-arrow-right ms-1"></i></button>
                        <span class="text-warning fw-bold small">${avgStr}</span>
                    </div>
                </div>
            </div>
        </article>`;
    }); cont.innerHTML = h;
    if(window.modalActual.col === 'articulos' && window.modalActual.id) abrirModal(window.modalActual.id, 'articulos');
});

window.editarArt = (id) => {
    const d = window.postsData[id];
    document.getElementById('art-titulo').value = d.titulo; document.getElementById('art-link').value = d.link;
    document.getElementById('art-tags').value = (d.etiquetas||[]).join(', '); document.getElementById('art-color').value = d.colorTag || '#dc3545';
    document.getElementById('art-resumen').value = d.resumen; window.editandoId = id;
    bootstrap.Collapse.getOrCreateInstance(document.getElementById('colArticulo')).show(); window.scrollTo(0,0);
};

// ==========================================
// 3. DEBATES Y ENCUESTAS (ESTILO INTERACTIVO CLARO)
// ==========================================
document.getElementById('btn-add-opcion').onclick = () => {
    const i = document.createElement('input'); i.type = 'text'; i.className = 'form-control border-0 shadow-sm mb-2 opcion-input font-inter'; i.placeholder = 'Nueva Opción';
    document.getElementById('opciones-encuesta').appendChild(i);
};

document.getElementById('btn-pub-encuesta').onclick = async () => {
    const p = document.getElementById('enc-pregunta').value; if(!p) return alert("Falta pregunta.");
    const ocultarPct = document.getElementById('enc-ocultar-pct').checked;
    let opc = []; document.querySelectorAll('.opcion-input').forEach(i => { if(i.value.trim()) opc.push({ texto: i.value, votos: 0 }); });
    if(opc.length < 2) return alert("Mínimo 2 opciones.");
    
    await addDoc(collection(db, "encuestas"), { pregunta: p, resumen: document.getElementById('enc-desc').value, opciones: opc, totalVotos: 0, votantes: [], ocultarPct: ocultarPct, fecha: serverTimestamp(), comentarios: [] });
    document.getElementById('enc-pregunta').value=''; document.getElementById('enc-desc').value=''; document.querySelectorAll('.opcion-input').forEach(i => i.value=''); document.getElementById('enc-ocultar-pct').checked = false;
    bootstrap.Collapse.getInstance(document.getElementById('colEncuesta'))?.hide();
};

let chartInstances = {}; let encuestasDataCache = [];
onSnapshot(query(collection(db, "encuestas"), orderBy("fecha", "desc")), (snap) => {
    encuestasDataCache = []; snap.forEach(d => { encuestasDataCache.push({id: d.id, ...d.data()}); window.postsData[d.id] = d.data(); checkDeepLink(d.id, 'encuestas'); });
    renderEncuestas();
});

function renderEncuestas() {
    const cont = document.getElementById('contenedor-encuestas'); 
    if(encuestasDataCache.length === 0) return cont.innerHTML = '<div class="text-center text-muted font-inter">No hay debates.</div>';
    
    let h = ''; 
    encuestasDataCache.forEach(data => {
        const date = data.fecha ? data.fecha.toDate().toLocaleDateString() : ''; const avgStr = getPromedioStars(data.comentarios);
        
        h += `
        <article class="mb-5 pb-5 border-bottom border-light-subtle row" id="encuesta-${data.id}">
            <div class="col-md-8 d-flex flex-column">
                <div class="d-flex justify-content-between mb-2">
                    <div class="cursor-pointer" onclick="abrirModal('${data.id}', 'encuestas')">
                        <span class="tag-badge bg-primary mb-2">DEBATE ABIERTO</span>
                    </div>
                </div>
                <h3 class="fw-bold font-serif text-dark cursor-pointer mb-3" style="font-size: 1.6rem; line-height: 1.35;" onclick="abrirModal('${data.id}', 'encuestas')">${data.pregunta}</h3>
                <p class="text-muted font-inter mb-4 cursor-pointer text-truncate-3" style="font-size: 1.05rem;" onclick="abrirModal('${data.id}', 'encuestas')">${data.resumen||''}</p>
                <div class="mt-auto d-flex align-items-center">
                    <button class="btn btn-primary btn-sm fw-bold rounded-pill px-4 me-4 shadow-sm" onclick="abrirModal('${data.id}', 'encuestas')">Participar y Votar <i class="bi bi-chat-text ms-1"></i></button>
                    <small class="text-muted fw-semibold font-inter"><i class="bi bi-calendar3 me-1"></i> ${date} <span class="ms-2 text-warning fw-bold">${avgStr}</span></small>
                    <small class="text-muted fw-bold font-inter ms-3">${data.totalVotos} votos</small>
                </div>
            </div>
            <div class="col-md-4 mt-4 mt-md-0 d-flex flex-column align-items-end justify-content-between">
                <div class="text-nowrap mb-3 w-100 text-end">
                    <i class="bi bi-share-fill text-primary cursor-pointer me-3" onclick="compartir('${data.pregunta}', '${data.id}', 'encuestas')"></i>
                    <i class="bi bi-trash-fill text-danger admin-only-inline cursor-pointer" onclick="borrarPost('encuestas', '${data.id}')"></i>
                </div>
                <div class="admin-only w-100 d-flex justify-content-end"><div style="width:180px;"><canvas id="chart-${data.id}"></canvas></div></div>
            </div>
        </article>`;
    }); cont.innerHTML = h;

    encuestasDataCache.forEach(d => {
        if(chartInstances[d.id]) chartInstances[d.id].destroy(); 
        const ctx = document.getElementById('chart-'+d.id);
        if(ctx) chartInstances[d.id] = new Chart(ctx, { type: 'pie', data: { labels: d.opciones.map(o=>o.texto), datasets: [{ data: d.opciones.map(o=>o.votos), backgroundColor: ['#092e6e', '#1976d2', '#00c853', '#ffc107', '#dc3545'] }] }, options: { plugins: { legend: { display: false } }, responsive: true } });
    });
    if(window.modalActual.col === 'encuestas' && window.modalActual.id) abrirModal(window.modalActual.id, 'encuestas'); 
}

window.votar = async (id, idx) => {
    const uid = getUid(); const ref = doc(db, "encuestas", id); const snap = await getDoc(ref);
    if(snap.exists()){ 
        let d = snap.data(); if(!d.votantes) d.votantes = [];
        if(d.votantes.includes(uid)) return alert("Ya registramos tu voto, gracias por participar.");
        d.votantes.push(uid); d.opciones[idx].votos++; d.totalVotos++; 
        await updateDoc(ref, { opciones: d.opciones, totalVotos: d.totalVotos, votantes: d.votantes }); 
    }
};
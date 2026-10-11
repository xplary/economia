import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const app = initializeApp({
    apiKey: "AIzaSyDvtzU8SGycfh99Cc_lLT7xabQ_uPBOpqE", authDomain: "economia-41d20.firebaseapp.com", databaseURL: "https://economia-41d20-default-rtdb.firebaseio.com", projectId: "economia-41d20", storageBucket: "economia-41d20.firebasestorage.app", messagingSenderId: "750639619847", appId: "1:750639619847:web:9a036501539ca6e3ceafa2", measurementId: "G-BWV82ZTSW1"
});
const auth = getAuth(app); const db = getFirestore(app);

window.postsData = {}; window.editandoId = null; window.modalActual = { id: null, col: null };

// CONFIGURACIÓN FULL DE QUILL PARA MODO APA Y WORD
const quill = new Quill('#editor-noticias', { 
    theme: 'snow', 
    modules: { 
        toolbar: [
            [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'script': 'sub'}, { 'script': 'super' }],
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }, 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            [{ 'align': [] }],
            ['link', 'image', 'video'],
            ['clean']
        ],
        clipboard: {
            matchVisual: false 
        }
    } 
});

// =====================================
// UTILIDADES GLOBALES Y AUTO-LOGIN
// =====================================
if(!localStorage.getItem('uid')) localStorage.setItem('uid', 'anon_'+Math.random().toString(36).substring(2,11));
const getUid = () => auth.currentUser ? auth.currentUser.uid : localStorage.getItem('uid');

document.getElementById('btn-login').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
document.getElementById('btn-logout').onclick = () => signOut(auth);

onAuthStateChanged(auth, async (u) => {
    document.getElementById('btn-login').classList.toggle('d-none', !!u);
    document.getElementById('btn-logout').classList.toggle('d-none', !u);
    document.body.classList.remove('is-owner');
    if(u) { 
        const d = await getDoc(doc(db, "usuarios", u.uid)); 
        if(d.exists() && d.data().owner) {
            document.body.classList.add('is-owner'); 
            renderEncuestas();
        }
    }
});

window.borrarPost = async (col, id) => { if(confirm("¿Eliminar publicación?")) await deleteDoc(doc(db, col, id)); };

window.compartir = (tit, id, col) => { 
    const url = window.location.origin + window.location.pathname + `?p=${id}&t=${col}`;
    if(navigator.share) navigator.share({ title: tit, url: url }); else { navigator.clipboard.writeText(url); alert("Link copiado: " + url); }
};

// =====================================
// ESTRELLAS Y COMENTARIOS EN MODAL
// =====================================
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
    const ref = doc(db, window.modalActual.col, window.modalActual.id);
    const snap = await getDoc(ref);
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
    const ref = doc(db, window.modalActual.col, window.modalActual.id);
    const snap = await getDoc(ref);
    if(snap.exists()) {
        const arr = snap.data().comentarios || [];
        await updateDoc(ref, { comentarios: arr.filter(c => c.id !== cid) });
    }
};

const renderComentarios = (comentarios) => {
    const box = document.getElementById('lista-comentarios');
    if(!comentarios || comentarios.length===0) return box.innerHTML = '<p class="text-muted small">Sé el primero en comentar.</p>';
    box.innerHTML = comentarios.map(c => `
        <div class="mb-3 border-bottom pb-2">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <strong class="font-inter">${c.autor}</strong>
                <div>
                    <span class="text-warning small">${'★'.repeat(c.rating)}${'☆'.repeat(5-c.rating)}</span>
                    <span class="text-muted small ms-2">${c.date}</span>
                    <i class="bi bi-trash text-danger ms-2 cursor-pointer admin-only-inline" onclick="borrarComentario(${c.id})"></i>
                </div>
            </div>
            <p class="text-secondary font-inter mb-0">${c.texto}</p>
        </div>`).join('');
};

const generarHTMLOpcionesEncuesta = (id, data) => {
    let h = `<div class="d-grid gap-2 border-start border-4 border-primary ps-3">`;
    const isOwner = document.body.classList.contains('is-owner');
    data.opciones.forEach((o, i) => {
        const pct = data.totalVotos === 0 ? 0 : Math.round((o.votos / data.totalVotos) * 100);
        const hidePct = data.ocultarPct && !isOwner;
        const txtPct = hidePct ? '?' : pct;
        const width = hidePct ? 0 : pct;
        h += `<button class="btn btn-light text-start position-relative border-0 rounded-3 py-2 shadow-sm" onclick="votar('${id}', ${i})"><div class="position-absolute top-0 start-0 h-100 bg-primary opacity-25 rounded-3" style="width: ${width}%;"></div><span class="position-relative z-1 d-flex justify-content-between px-2"><span class="small fw-semibold text-dark">${o.texto}</span><span class="fw-bold text-primary small">${txtPct}%</span></span></button>`;
    });
    return h + `</div>`;
};

// TRANSFORMADOR DE ENLACES PARA VISOR PDF
const formatEmbedUrl = (url) => {
    if(!url) return '';
    if(url.includes('drive.google.com/file/d/')) {
        return url.replace(/\/view.*$/, '/preview'); // Obliga a Drive a mostrar en visor web
    }
    return url;
};

// ABRIR EL MODAL (Ahora con soporte de iframe en vivo)
window.abrirModal = (id, col) => {
    const d = window.postsData[id]; if(!d) return;
    window.modalActual = { id, col };
    document.getElementById('modal-titulo').innerText = d.titulo || d.pregunta;
    document.getElementById('modal-fecha').innerHTML = `<i class="bi bi-calendar3 me-2"></i> ${d.fecha ? d.fecha.toDate().toLocaleDateString() : ''}`;
    document.getElementById('modal-promedio-estrellas').innerText = getPromedioStars(d.comentarios);
    document.getElementById('modal-tags').innerHTML = (d.etiquetas||[]).map(t => `<span class="tag-badge" style="background-color: ${d.colorTag||'#1976d2'};">${t}</span>`).join('');
    
    // Imagen
    const imgEl = document.getElementById('modal-imagen');
    if(d.imagen && d.imagen.length > 20) { imgEl.src = d.imagen; imgEl.style.display = 'block'; } else { imgEl.style.display = 'none'; }
    
    // PDF Iframe directamente
    document.getElementById('modal-btn-drive').innerHTML = ''; // Quitamos el botón "Ver PDF"
    const iframeEl = document.getElementById('modal-iframe');
    if(d.link) {
        iframeEl.src = formatEmbedUrl(d.link);
        iframeEl.style.display = 'block';
    } else {
        iframeEl.style.display = 'none';
        iframeEl.src = '';
    }
    
    // Contenido
    if(col === 'encuestas') {
        document.getElementById('modal-contenido').innerHTML = `<p class="mb-4">${d.resumen||''}</p>` + generarHTMLOpcionesEncuesta(id, d);
    } else {
        document.getElementById('modal-contenido').innerHTML = `<div class="ql-snow"><div class="ql-editor font-inter" style="padding:0;">${d.contenido || d.resumen || ''}</div></div>`;
    }
    
    renderComentarios(d.comentarios);
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalLectura')).show();
};

let autoOpenDone = false;
const checkDeepLink = (id, col) => {
    if(autoOpenDone) return;
    const urlP = new URLSearchParams(window.location.search);
    if(urlP.get('p') === id && urlP.get('t') === col) {
        autoOpenDone = true; 
        setTimeout(() => { abrirModal(id, col); }, 500);
    }
};

// =====================================
// OTRAS FUNCIONES (Compresor, Sidebar)
// =====================================
const compressImg = (file) => new Promise((res) => {
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = (e) => {
        const img = new Image(); img.src = e.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas'); const MAX = 800; const scale = MAX / img.width;
            canvas.width = MAX; canvas.height = img.height * scale;
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); res(canvas.toDataURL('image/jpeg', 0.6));
        };
    };
});

window.cancelarEdicion = () => {
    window.editandoId = null;
    document.querySelectorAll('input:not([type="color"]), textarea').forEach(i => i.value = '');
    quill.setContents([]); document.getElementById('not-principal').checked = false;
    document.getElementById('not-form-title').innerText = "Editor de Columnas";
    bootstrap.Collapse.getInstance(document.getElementById('colNoticia'))?.hide(); bootstrap.Collapse.getInstance(document.getElementById('colArticulo'))?.hide();
};

onSnapshot(doc(db, "config", "sidebar"), (s) => {
    if(s.exists()){
        const d = s.data();
        if(d.t) document.getElementById('sb-titulo').innerText = d.t;
        if(d.dia) document.getElementById('sb-dia').innerText = d.dia;
        if(d.m) document.getElementById('sb-mes').innerText = d.m;
        if(d.desc) document.getElementById('sb-desc').innerText = d.desc;
    }
});
window.editarSidebar = async () => {
    const t = prompt("Título:", document.getElementById('sb-titulo').innerText) || document.getElementById('sb-titulo').innerText;
    const dia = prompt("Día:", document.getElementById('sb-dia').innerText) || document.getElementById('sb-dia').innerText;
    const m = prompt("Mes:", document.getElementById('sb-mes').innerText) || document.getElementById('sb-mes').innerText;
    const desc = prompt("Descripción:", document.getElementById('sb-desc').innerText) || document.getElementById('sb-desc').innerText;
    await setDoc(doc(db, "config", "sidebar"), {t, dia, m, desc}, {merge:true});
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
    const data = { titulo, etiquetas, colorTag: document.getElementById('not-color').value, imagen: imgFinal, principal: document.getElementById('not-principal').checked, contenido: quill.root.innerHTML };
    if (window.editandoId) await updateDoc(doc(db, "noticias", window.editandoId), data); else { data.fecha = serverTimestamp(); data.comentarios = []; await addDoc(collection(db, "noticias"), data); }
    cancelarEdicion();
};

onSnapshot(collection(db, "noticias"), (snap) => {
    noticiasData = []; snap.forEach(d => { noticiasData.push({id: d.id, ...d.data()}); window.postsData[d.id] = d.data(); checkDeepLink(d.id, 'noticias'); });
    renderNoticias();
    if(window.modalActual.col === 'noticias' && window.modalActual.id) abrirModal(window.modalActual.id, 'noticias'); 
});

function renderNoticias() {
    let filtradas = noticiasData.filter(n => (n.titulo||'').toLowerCase().includes(qBuscar) || (n.contenido||'').toLowerCase().includes(qBuscar));
    filtradas.sort((a,b) => { let tA = a.fecha?.toMillis()||0; let tB = b.fecha?.toMillis()||0; return ordDesc ? tB - tA : tA - tB; });
    const cLista = document.getElementById('contenedor-noticias-lista'); const cPrinc = document.getElementById('contenedor-noticia-principal');
    if (filtradas.length === 0) { cPrinc.innerHTML=''; cLista.innerHTML='<div class="text-center text-muted">No hay resultados.</div>'; return; }
    
    let hLista = ''; let hPrinc = ''; let pFound = false;
    filtradas.forEach(d => {
        const date = d.fecha ? d.fecha.toDate().toLocaleDateString() : 'Reciente'; const avgStr = getPromedioStars(d.comentarios);
        const tHTML = (d.etiquetas||[]).map(t => `<span class="tag-badge" style="background-color: ${d.colorTag||'#1976d2'}">${t}</span>`).join('');
        const imgH = d.imagen ? `<img src="${d.imagen}" class="post-img-rect shadow-sm" onclick="abrirModal('${d.id}', 'noticias')">` : `<div class="post-img-rect bg-light d-flex align-items-center justify-content-center text-muted border shadow-sm" onclick="abrirModal('${d.id}', 'noticias')"><i class="bi bi-image fs-1"></i></div>`;
        const textoLimpioPreview = d.contenido.replace(/<[^>]*>?/gm, '');

        if (d.principal && !pFound && ordDesc) {
            pFound = true;
            const imgP = d.imagen ? `<img src="${d.imagen}" class="img-fluid w-100 object-fit-cover rounded-4 shadow-sm cursor-pointer" style="height:380px;" onclick="abrirModal('${d.id}', 'noticias')">` : `<div class="w-100 rounded-4 shadow-sm d-flex align-items-center justify-content-center bg-light text-muted border cursor-pointer" style="height:380px;" onclick="abrirModal('${d.id}', 'noticias')"><i class="bi bi-image fs-1"></i></div>`;
            hPrinc = `
            <div class="row mb-5 border-bottom pb-5 align-items-center">
                <div class="col-lg-7 mb-4 mb-lg-0">${imgP}</div>
                <div class="col-lg-5 ps-lg-4">
                    <div class="mb-3">${tHTML}</div>
                    <h2 class="fw-bold mb-3 font-serif cursor-pointer" style="font-size: 2.2rem; color: #1a202c; line-height: 1.3;" onclick="abrirModal('${d.id}', 'noticias')">${d.titulo}</h2>
                    <div class="text-muted mb-4 text-truncate-3 font-inter" style="font-size: 1.1rem;">${textoLimpioPreview}</div>
                    <div class="d-flex justify-content-between">
                        <small class="text-muted fw-semibold"><i class="bi bi-calendar3 me-1"></i> ${date} <span class="ms-2 text-warning fw-bold">${avgStr}</span></small>
                        <small class="text-muted fw-semibold cursor-pointer" onclick="compartir('${d.titulo}', '${d.id}', 'noticias')"><i class="bi bi-share me-1"></i> Compartir</small>
                    </div>
                </div>
            </div>`;
        }
        hLista += `
        <div class="card border-0 border-bottom rounded-0 mb-4 pb-4">
            <div class="row g-4 align-items-center">
                <div class="col-md-5">${imgH}</div>
                <div class="col-md-7 d-flex flex-column">
                    <div class="d-flex justify-content-between mb-2">
                        <div>${tHTML}</div>
                        <div><i class="bi bi-share text-muted me-2 cursor-pointer" onclick="compartir('${d.titulo}', '${d.id}', 'noticias')"></i><i class="bi bi-pencil-fill text-warning me-2 admin-only-inline cursor-pointer" onclick="editarNoticia('${d.id}')"></i><i class="bi bi-trash text-danger admin-only-inline cursor-pointer" onclick="borrarPost('noticias', '${d.id}')"></i></div>
                    </div>
                    <h3 class="fw-bold mb-2 text-truncate-2 cursor-pointer font-serif" style="color: #1a202c;" onclick="abrirModal('${d.id}', 'noticias')">${d.titulo}</h3>
                    <small class="text-muted fw-semibold mt-1"><i class="bi bi-calendar3 me-1"></i> ${date} <span class="ms-2 text-warning fw-bold">${avgStr}</span></small>
                </div>
            </div>
        </div>`;
    });
    cPrinc.innerHTML = pFound ? hPrinc : ''; cLista.innerHTML = hLista;
}

window.editarNoticia = (id) => {
    const d = window.postsData[id];
    document.getElementById('not-titulo').value = d.titulo; document.getElementById('not-tags').value = (d.etiquetas||[]).join(', ');
    document.getElementById('not-color').value = d.colorTag || '#1976d2'; document.getElementById('not-principal').checked = d.principal;
    quill.root.innerHTML = d.contenido; window.editandoId = id;
    document.getElementById('not-form-title').innerText = "Editando Columna"; document.getElementById('btn-pub-noticia').innerText = "Guardar";
    bootstrap.Collapse.getOrCreateInstance(document.getElementById('colNoticia')).show(); window.scrollTo(0,0);
};

// ==========================================
// 2. INVESTIGACIÓN & PAPERS
// ==========================================
document.getElementById('btn-pub-articulo').onclick = async () => {
    const t = document.getElementById('art-titulo').value; const l = document.getElementById('art-link').value; if(!t||!l) return alert("Falta Título o Link.");
    const et = document.getElementById('art-tags').value ? document.getElementById('art-tags').value.split(',').map(x=>x.trim()).filter(Boolean) : ['Paper'];
    const data = { titulo: t, link: l, resumen: document.getElementById('art-resumen').value, etiquetas: et, colorTag: document.getElementById('art-color').value };
    if(window.editandoId) await updateDoc(doc(db, "articulos", window.editandoId), data); else { data.fecha = serverTimestamp(); data.comentarios = []; await addDoc(collection(db, "articulos"), data); }
    cancelarEdicion();
};

onSnapshot(query(collection(db, "articulos"), orderBy("fecha", "desc")), (snap) => {
    const cont = document.getElementById('contenedor-articulos'); if(snap.empty) return cont.innerHTML = '<div class="col-12 text-center text-muted">No hay papers.</div>';
    let h = ''; snap.forEach(d => {
        const data = d.data(); window.postsData[d.id] = data; checkDeepLink(d.id, 'articulos');
        const date = data.fecha ? data.fecha.toDate().toLocaleDateString() : ''; const avgStr = getPromedioStars(data.comentarios);
        const tHTML = (data.etiquetas||[]).map(t => `<span class="tag-badge" style="background-color: ${data.colorTag||'#dc3545'}">${t}</span>`).join('');
        h += `
        <div class="col-md-6 mb-4">
            <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden">
                <div class="card-body p-4 d-flex flex-column">
                    <div class="d-flex justify-content-between"><div class="mb-2">${tHTML}</div><div>
                        <i class="bi bi-pencil-fill text-warning me-2 admin-only-inline cursor-pointer" onclick="editarArt('${d.id}')"></i>
                        <i class="bi bi-trash-fill text-danger admin-only-inline cursor-pointer" onclick="borrarPost('articulos', '${d.id}')"></i>
                    </div></div>
                    <h5 class="fw-bold font-serif text-dark mb-2 cursor-pointer" onclick="abrirModal('${d.id}', 'articulos')">${data.titulo}</h5>
                    <p class="text-muted small mb-4 text-truncate-2 flex-grow-1">${data.resumen}</p>
                    <div class="d-flex justify-content-between border-top pt-3">
                        <small class="text-muted fw-semibold"><i class="bi bi-calendar3 me-1"></i> ${date} <span class="ms-1 text-warning fw-bold">${avgStr}</span></small>
                        <i class="bi bi-share-fill text-primary cursor-pointer" onclick="compartir('${data.titulo}', '${d.id}', 'articulos')"></i>
                    </div>
                </div>
            </div>
        </div>`;
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
// 3. DEBATES Y ENCUESTAS
// ==========================================
document.getElementById('btn-add-opcion').onclick = () => {
    const i = document.createElement('input'); i.type = 'text'; i.className = 'form-control border-0 shadow-sm mb-2 opcion-input'; i.placeholder = 'Nueva Opción';
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

let chartInstances = {};
let encuestasDataCache = [];

onSnapshot(query(collection(db, "encuestas"), orderBy("fecha", "desc")), (snap) => {
    encuestasDataCache = [];
    snap.forEach(d => {
        encuestasDataCache.push({id: d.id, ...d.data()});
        window.postsData[d.id] = d.data();
        checkDeepLink(d.id, 'encuestas');
    });
    renderEncuestas();
});

function renderEncuestas() {
    const cont = document.getElementById('contenedor-encuestas'); 
    if(encuestasDataCache.length === 0) return cont.innerHTML = '<div class="text-center text-muted">No hay debates.</div>';
    
    let h = ''; 
    encuestasDataCache.forEach(data => {
        const date = data.fecha ? data.fecha.toDate().toLocaleDateString() : ''; 
        const avgStr = getPromedioStars(data.comentarios);
        
        h += `
        <div class="card mb-4 border-0 shadow-sm rounded-4 overflow-hidden" id="encuesta-${data.id}">
            <div class="card-body p-4 p-md-5">
                <div class="d-flex justify-content-between mb-3">
                    <div class="cursor-pointer" onclick="abrirModal('${data.id}', 'encuestas')">
                        <span class="tag-badge bg-primary">DEBATE</span>
                        <h4 class="fw-bold font-serif mt-2" style="color: #1a202c;">${data.pregunta}</h4>
                    </div>
                    <div>
                        <i class="bi bi-share-fill text-primary cursor-pointer me-2" onclick="compartir('${data.pregunta}', '${data.id}', 'encuestas')"></i>
                        <i class="bi bi-trash-fill text-danger admin-only-inline cursor-pointer" onclick="borrarPost('encuestas', '${data.id}')"></i>
                    </div>
                </div>
                <p class="text-muted font-inter mb-4 cursor-pointer" onclick="abrirModal('${data.id}', 'encuestas')">${data.resumen||''}</p>
                ${generarHTMLOpcionesEncuesta(data.id, data)}
                <div class="mt-4 pt-3 border-top d-flex justify-content-between">
                    <small class="text-muted fw-semibold"><i class="bi bi-calendar3 me-1"></i> ${date} <span class="ms-2 text-warning fw-bold">${avgStr}</span></small>
                    <small class="text-muted fw-bold">${data.totalVotos} votos</small>
                </div>
                <div class="mt-3 admin-only w-100 d-flex justify-content-center"><div style="width:250px;"><canvas id="chart-${data.id}"></canvas></div></div>
            </div>
        </div>`;
    }); 
    cont.innerHTML = h;

    encuestasDataCache.forEach(d => {
        if(chartInstances[d.id]) chartInstances[d.id].destroy(); 
        const ctx = document.getElementById('chart-'+d.id);
        if(ctx) {
            chartInstances[d.id] = new Chart(ctx, { type: 'pie', data: { labels: d.opciones.map(o=>o.texto), datasets: [{ data: d.opciones.map(o=>o.votos), backgroundColor: ['#092e6e', '#1976d2', '#00c853', '#ffc107', '#dc3545'] }] }, options: { plugins: { legend: { display: false } }, responsive: true } });
        }
    });

    if(window.modalActual.col === 'encuestas' && window.modalActual.id) {
        abrirModal(window.modalActual.id, 'encuestas'); 
    }
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
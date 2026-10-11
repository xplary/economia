import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot, query, serverTimestamp, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const app = initializeApp({
    apiKey: "AIzaSyDvtzU8SGycfh99Cc_lLT7xabQ_uPBOpqE", authDomain: "economia-41d20.firebaseapp.com", databaseURL: "https://economia-41d20-default-rtdb.firebaseio.com", projectId: "economia-41d20", storageBucket: "economia-41d20.firebasestorage.app", messagingSenderId: "750639619847", appId: "1:750639619847:web:9a036501539ca6e3ceafa2", measurementId: "G-BWV82ZTSW1"
});
const auth = getAuth(app); const db = getFirestore(app);

window.postsData = {}; window.editandoId = null; 
const quill = new Quill('#editor-noticias', { theme: 'snow', modules: { toolbar: [['bold', 'italic'], [{'color':[]}], ['link'], ['clean']] }});

document.getElementById('btn-login').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
document.getElementById('btn-logout').onclick = () => signOut(auth);

onAuthStateChanged(auth, async (u) => {
    document.getElementById('btn-login').classList.toggle('d-none', !!u);
    document.getElementById('btn-logout').classList.toggle('d-none', !u);
    document.body.classList.remove('is-owner');
    if(u) { const d = await getDoc(doc(db, "usuarios", u.uid)); if(d.exists() && d.data().owner) document.body.classList.add('is-owner'); }
});

window.borrarPost = async (col, id) => { if(confirm("¿Eliminar publicación?")) await deleteDoc(doc(db, col, id)); };
window.compartir = (tit) => { if(navigator.share) navigator.share({ title: tit, url: window.location.href }); };

// COMPRESOR DE IMÁGENES
const compressImg = (file) => new Promise((res) => {
    const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = (e) => {
        const img = new Image(); img.src = e.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas'); const MAX = 800; const scale = MAX / img.width;
            canvas.width = MAX; canvas.height = img.height * scale;
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            res(canvas.toDataURL('image/jpeg', 0.6));
        };
    };
});

window.cancelarEdicion = () => {
    window.editandoId = null;
    document.querySelectorAll('input:not([type="color"]), textarea').forEach(i => i.value = '');
    quill.setContents([]); document.getElementById('not-principal').checked = false;
    document.getElementById('btn-pub-noticia').innerText = "Publicar Columna";
    document.getElementById('btn-pub-articulo').innerText = "Publicar Paper";
    document.getElementById('not-form-title').innerText = "Editor de Columnas";
    bootstrap.Collapse.getInstance(document.getElementById('colNoticia'))?.hide();
    bootstrap.Collapse.getInstance(document.getElementById('colArticulo'))?.hide();
};

// SIDEBAR EDITABLE
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

// MODAL LECTURA
window.abrirModal = (id) => {
    const d = window.postsData[id]; if(!d) return;
    document.getElementById('modal-titulo').innerText = d.titulo;
    document.getElementById('modal-fecha').innerHTML = `<i class="bi bi-calendar3 me-2"></i> ${d.fecha ? d.fecha.toDate().toLocaleDateString() : ''}`;
    document.getElementById('modal-tags').innerHTML = (d.etiquetas||[]).map(t => `<span class="tag-badge" style="background-color: ${d.colorTag||'#1976d2'};">${t}</span>`).join('');
    
    const imgEl = document.getElementById('modal-imagen');
    if(d.imagen && d.imagen.length > 20) { imgEl.src = d.imagen; imgEl.style.display = 'block'; } else { imgEl.style.display = 'none'; }
    
    document.getElementById('modal-btn-drive').innerHTML = d.link ? `<a href="${d.link}" target="_blank" class="btn btn-danger fw-bold rounded-pill shadow-sm"><i class="bi bi-file-pdf-fill me-1"></i> Ver PDF</a>` : '';
    document.getElementById('modal-contenido').innerHTML = d.contenido || d.resumen || '';
    new bootstrap.Modal(document.getElementById('modalLectura')).show();
};

// ========================================================
// 1. COLUMNAS / NOTICIAS (Buscador, Orden, Edición, Foto)
// ========================================================
let noticiasData = []; let qBuscar = ''; let ordDesc = true;

document.getElementById('input-buscar').addEventListener('input', (e) => { qBuscar = e.target.value.toLowerCase(); renderNoticias(); });
document.getElementById('btn-ordenar').addEventListener('click', () => { ordDesc = !ordDesc; document.getElementById('btn-ordenar').innerText = ordDesc ? 'Ordenar: Recientes ↓' : 'Ordenar: Antiguos ↑'; renderNoticias(); });

window.editarNoticia = (id) => {
    const d = window.postsData[id];
    document.getElementById('not-titulo').value = d.titulo; document.getElementById('not-tags').value = (d.etiquetas||[]).join(', ');
    document.getElementById('not-color').value = d.colorTag || '#1976d2'; document.getElementById('not-principal').checked = d.principal;
    quill.root.innerHTML = d.contenido; window.editandoId = id;
    document.getElementById('not-form-title').innerText = "Editando Columna"; document.getElementById('btn-pub-noticia').innerText = "Guardar Cambios";
    bootstrap.Collapse.getOrCreateInstance(document.getElementById('colNoticia')).show(); window.scrollTo(0,0);
};

document.getElementById('btn-pub-noticia').onclick = async () => {
    const titulo = document.getElementById('not-titulo').value; if(!titulo) return alert("Falta el titular.");
    const etiquetas = document.getElementById('not-tags').value ? document.getElementById('not-tags').value.split(',').map(t=>t.trim()).filter(Boolean) : ['Opinión'];
    
    let imgFinal = ''; const imgFile = document.getElementById('not-imagen').files[0];
    if (imgFile) imgFinal = await compressImg(imgFile);
    else if (window.editandoId && window.postsData[window.editandoId].imagen) imgFinal = window.postsData[window.editandoId].imagen;
    
    const data = { titulo, etiquetas, colorTag: document.getElementById('not-color').value, imagen: imgFinal, principal: document.getElementById('not-principal').checked, contenido: quill.root.innerHTML };
    if (window.editandoId) await updateDoc(doc(db, "noticias", window.editandoId), data);
    else { data.fecha = serverTimestamp(); await addDoc(collection(db, "noticias"), data); }
    cancelarEdicion();
};

onSnapshot(collection(db, "noticias"), (snap) => {
    noticiasData = []; snap.forEach(d => { noticiasData.push({id: d.id, ...d.data()}); window.postsData[d.id] = d.data(); });
    renderNoticias();
});

function renderNoticias() {
    let filtradas = noticiasData.filter(n => (n.titulo||'').toLowerCase().includes(qBuscar) || (n.contenido||'').toLowerCase().includes(qBuscar));
    filtradas.sort((a,b) => { let tA = a.fecha?.toMillis()||0; let tB = b.fecha?.toMillis()||0; return ordDesc ? tB - tA : tA - tB; });

    const cLista = document.getElementById('contenedor-noticias-lista'); const cPrinc = document.getElementById('contenedor-noticia-principal');
    if (filtradas.length === 0) { cPrinc.innerHTML=''; cLista.innerHTML='<div class="text-center text-muted">No hay resultados.</div>'; return; }
    
    let hLista = ''; let hPrinc = ''; let pFound = false;

    filtradas.forEach(d => {
        const date = d.fecha ? d.fecha.toDate().toLocaleDateString() : 'Reciente';
        const tHTML = (d.etiquetas||[]).map(t => `<span class="tag-badge" style="background-color: ${d.colorTag||'#1976d2'}">${t}</span>`).join('');
        const imgH = d.imagen ? `<img src="${d.imagen}" class="post-img-rect shadow-sm" onclick="abrirModal('${d.id}')">` : `<div class="post-img-rect bg-light d-flex align-items-center justify-content-center text-muted border shadow-sm" onclick="abrirModal('${d.id}')"><i class="bi bi-image fs-1"></i></div>`;
        
        if (d.principal && !pFound && ordDesc) { // Solo muestra el principal arriba si el orden es descendente
            pFound = true;
            const imgP = d.imagen ? `<img src="${d.imagen}" class="img-fluid w-100 object-fit-cover rounded-4 shadow-sm cursor-pointer" style="height:380px;" onclick="abrirModal('${d.id}')">` : `<div class="w-100 rounded-4 shadow-sm d-flex align-items-center justify-content-center bg-light text-muted border cursor-pointer" style="height:380px;" onclick="abrirModal('${d.id}')"><i class="bi bi-image fs-1"></i></div>`;
            hPrinc = `
            <div class="row mb-5 border-bottom pb-5 align-items-center">
                <div class="col-lg-7 mb-4 mb-lg-0">${imgP}</div>
                <div class="col-lg-5 ps-lg-4">
                    <div class="mb-3">${tHTML}</div>
                    <h2 class="fw-bold mb-3 font-serif cursor-pointer" style="font-size: 2.2rem; color: #1a202c; line-height: 1.3;" onclick="abrirModal('${d.id}')">${d.titulo}</h2>
                    <div class="text-muted mb-4 text-truncate-3 font-inter" style="font-size: 1.1rem;">${d.contenido}</div>
                    <div class="d-flex justify-content-between">
                        <small class="text-muted fw-semibold"><i class="bi bi-calendar3 me-1"></i> ${date}</small>
                        <small class="text-muted fw-semibold cursor-pointer" onclick="compartir('${d.titulo}')"><i class="bi bi-share me-1"></i> Compartir</small>
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
                        <div>
                           <i class="bi bi-pencil-fill text-warning me-2 admin-only-inline cursor-pointer" onclick="editarNoticia('${d.id}')"></i>
                           <i class="bi bi-trash text-danger admin-only-inline cursor-pointer" onclick="borrarPost('noticias', '${d.id}')"></i>
                        </div>
                    </div>
                    <h3 class="fw-bold mb-2 text-truncate-2 cursor-pointer font-serif" style="color: #1a202c;" onclick="abrirModal('${d.id}')">${d.titulo}</h3>
                    <small class="text-muted fw-semibold mt-1"><i class="bi bi-calendar3 me-1"></i> ${date}</small>
                </div>
            </div>
        </div>`;
    });
    
    cPrinc.innerHTML = pFound ? hPrinc : ''; cLista.innerHTML = hLista;
}

// ==========================================
// 2. INVESTIGACIÓN & PAPERS (Edición)
// ==========================================
window.editarArt = (id) => {
    const d = window.postsData[id];
    document.getElementById('art-titulo').value = d.titulo; document.getElementById('art-link').value = d.link;
    document.getElementById('art-tags').value = (d.etiquetas||[]).join(', '); document.getElementById('art-color').value = d.colorTag || '#dc3545';
    document.getElementById('art-resumen').value = d.resumen; window.editandoId = id;
    document.getElementById('btn-pub-articulo').innerText = "Guardar Cambios"; bootstrap.Collapse.getOrCreateInstance(document.getElementById('colArticulo')).show(); window.scrollTo(0,0);
};

document.getElementById('btn-pub-articulo').onclick = async () => {
    const t = document.getElementById('art-titulo').value; const l = document.getElementById('art-link').value; if(!t||!l) return alert("Falta Título o Link.");
    const et = document.getElementById('art-tags').value ? document.getElementById('art-tags').value.split(',').map(x=>x.trim()).filter(Boolean) : ['Paper'];
    const data = { titulo: t, link: l, resumen: document.getElementById('art-resumen').value, etiquetas: et, colorTag: document.getElementById('art-color').value };
    if(window.editandoId) await updateDoc(doc(db, "articulos", window.editandoId), data);
    else { data.fecha = serverTimestamp(); await addDoc(collection(db, "articulos"), data); }
    cancelarEdicion();
};

onSnapshot(query(collection(db, "articulos"), orderBy("fecha", "desc")), (snap) => {
    const cont = document.getElementById('contenedor-articulos'); if(snap.empty) return cont.innerHTML = '<div class="col-12 text-center text-muted">No hay papers.</div>';
    let h = ''; snap.forEach(d => {
        const data = d.data(); window.postsData[d.id] = data; const date = data.fecha ? data.fecha.toDate().toLocaleDateString() : '';
        const tHTML = (data.etiquetas||[]).map(t => `<span class="tag-badge" style="background-color: ${data.colorTag||'#dc3545'}">${t}</span>`).join('');
        h += `
        <div class="col-md-6 mb-4">
            <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden">
                <div class="card-body p-4 d-flex flex-column">
                    <div class="d-flex justify-content-between"><div class="mb-2">${tHTML}</div><div>
                        <i class="bi bi-pencil-fill text-warning me-2 admin-only-inline cursor-pointer" onclick="editarArt('${d.id}')"></i>
                        <i class="bi bi-trash-fill text-danger admin-only-inline cursor-pointer" onclick="borrarPost('articulos', '${d.id}')"></i>
                    </div></div>
                    <h5 class="fw-bold font-serif text-dark mb-2 cursor-pointer" onclick="abrirModal('${d.id}')">${data.titulo}</h5>
                    <p class="text-muted small mb-4 text-truncate-2 flex-grow-1">${data.resumen}</p>
                    <div class="d-flex justify-content-between border-top pt-3">
                        <small class="text-muted fw-semibold"><i class="bi bi-calendar3 me-1"></i> ${date}</small>
                        <i class="bi bi-share-fill text-primary cursor-pointer" onclick="compartir('${data.titulo}')"></i>
                    </div>
                </div>
            </div>
        </div>`;
    }); cont.innerHTML = h;
});

// ==========================================
// 3. DEBATES Y ENCUESTAS (Estilo Publicación)
// ==========================================
document.getElementById('btn-add-opcion').onclick = () => {
    const i = document.createElement('input'); i.type = 'text'; i.className = 'form-control border-0 shadow-sm mb-2 opcion-input'; i.placeholder = 'Nueva Opción';
    document.getElementById('opciones-encuesta').appendChild(i);
};

document.getElementById('btn-pub-encuesta').onclick = async () => {
    const p = document.getElementById('enc-pregunta').value; if(!p) return alert("Falta el título/pregunta.");
    const d = document.getElementById('enc-desc').value;
    let opc = []; document.querySelectorAll('.opcion-input').forEach(i => { if(i.value.trim()) opc.push({ texto: i.value, votos: 0 }); });
    if(opc.length < 2) return alert("Mínimo 2 opciones.");
    
    await addDoc(collection(db, "encuestas"), { pregunta: p, resumen: d, opciones: opc, totalVotos: 0, fecha: serverTimestamp() });
    document.getElementById('enc-pregunta').value=''; document.getElementById('enc-desc').value='';
    document.querySelectorAll('.opcion-input').forEach(i => i.value='');
    bootstrap.Collapse.getInstance(document.getElementById('colEncuesta'))?.hide();
};

onSnapshot(query(collection(db, "encuestas"), orderBy("fecha", "desc")), (snap) => {
    const cont = document.getElementById('contenedor-encuestas'); if(snap.empty) return cont.innerHTML = '<div class="text-center text-muted">No hay debates.</div>';
    let h = ''; snap.forEach(d => {
        const data = d.data(); const date = data.fecha ? data.fecha.toDate().toLocaleDateString() : '';
        h += `
        <div class="card mb-4 border-0 shadow-sm rounded-4 overflow-hidden">
            <div class="card-body p-4 p-md-5">
                <div class="d-flex justify-content-between mb-3">
                    <div>
                        <span class="tag-badge bg-primary">DEBATE</span>
                        <h4 class="fw-bold font-serif mt-2" style="color: #1a202c;">${data.pregunta}</h4>
                    </div>
                    <i class="bi bi-trash-fill text-danger admin-only-inline cursor-pointer" onclick="borrarPost('encuestas', '${d.id}')"></i>
                </div>
                <p class="text-muted font-inter mb-4">${data.resumen||''}</p>
                <div class="d-grid gap-2 border-start border-4 border-primary ps-3">`;
        data.opciones.forEach((o, i) => {
            const pct = data.totalVotos===0 ? 0 : Math.round((o.votos/data.totalVotos)*100);
            h += `<button class="btn btn-light text-start position-relative border-0 rounded-3 py-2 shadow-sm" onclick="votar('${d.id}', ${i})"><div class="position-absolute top-0 start-0 h-100 bg-primary opacity-25 rounded-3" style="width: ${pct}%;"></div><span class="position-relative z-1 d-flex justify-content-between px-2"><span class="small fw-semibold text-dark">${o.texto}</span><span class="fw-bold text-primary small">${pct}%</span></span></button>`;
        });
        h += `</div><div class="mt-4 pt-3 border-top d-flex justify-content-between">
                <small class="text-muted fw-semibold"><i class="bi bi-calendar3 me-1"></i> ${date}</small>
                <small class="text-muted fw-bold">${data.totalVotos} votos</small>
              </div></div></div>`;
    }); cont.innerHTML = h;
});

window.votar = async (id, idx) => {
    const ref = doc(db, "encuestas", id); const snap = await getDoc(ref);
    if(snap.exists()){ let d = snap.data(); d.opciones[idx].votos++; d.totalVotos++; await updateDoc(ref, { opciones: d.opciones, totalVotos: d.totalVotos }); }
};
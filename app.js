import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const app = initializeApp({
    apiKey: "AIzaSyDvtzU8SGycfh99Cc_lLT7xabQ_uPBOpqE", authDomain: "economia-41d20.firebaseapp.com", databaseURL: "https://economia-41d20-default-rtdb.firebaseio.com", projectId: "economia-41d20", storageBucket: "economia-41d20.firebasestorage.app", messagingSenderId: "750639619847", appId: "1:750639619847:web:9a036501539ca6e3ceafa2", measurementId: "G-BWV82ZTSW1"
});
const auth = getAuth(app);
const db = getFirestore(app);

// Guardamos datos globalmente para abrirlos en el Modal
window.postsData = {};

const quillNoticias = new Quill('#editor-noticias', { theme: 'snow', modules: { toolbar: [['bold', 'italic'], [{'color':[]}], ['link'], ['clean']] }});

document.getElementById('btn-login').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
document.getElementById('btn-logout').onclick = () => signOut(auth);

onAuthStateChanged(auth, async (user) => {
    document.getElementById('btn-login').classList.toggle('d-none', !!user);
    document.getElementById('btn-logout').classList.toggle('d-none', !user);
    document.body.classList.remove('is-owner');
    if (user) {
        const d = await getDoc(doc(db, "usuarios", user.uid));
        if (d.exists() && d.data().owner) document.body.classList.add('is-owner');
    }
});

// Funciones Globales
window.borrarPost = async (coleccion, id) => { if(confirm("¿Eliminar publicación?")) await deleteDoc(doc(db, coleccion, id)); };
window.compartir = (titulo) => { if (navigator.share) navigator.share({ title: titulo, url: window.location.href }); };

// LÓGICA DEL MODAL DE LECTURA (Fullscreen)
window.abrirModal = (id) => {
    const data = window.postsData[id];
    if(!data) return;
    
    document.getElementById('modal-titulo').innerText = data.titulo;
    document.getElementById('modal-fecha').innerHTML = `<i class="bi bi-calendar3 me-2"></i> ${data.fecha ? data.fecha.toDate().toLocaleDateString() : ''}`;
    
    // Dibujar Etiquetas Múltiples y Color
    const tagsArr = data.etiquetas || (data.etiqueta ? [data.etiqueta] : []);
    const color = data.colorTag || '#1976d2';
    document.getElementById('modal-tags').innerHTML = tagsArr.map(t => `<span class="tag-badge" style="background-color: ${color};">${t}</span>`).join('');
    
    // Control de Imagen
    const imgEl = document.getElementById('modal-imagen');
    if(data.imagen && data.imagen.startsWith('http')) {
        imgEl.src = data.imagen; imgEl.style.display = 'block';
    } else { imgEl.style.display = 'none'; }
    
    // Control de Botón de Drive (solo Papers)
    const btnDrive = document.getElementById('modal-btn-drive');
    if(data.link) {
        btnDrive.innerHTML = `<a href="${data.link}" target="_blank" class="btn btn-danger fw-bold rounded-pill shadow-sm"><i class="bi bi-file-pdf-fill me-1"></i> Ver PDF Original</a>`;
    } else { btnDrive.innerHTML = ''; }
    
    document.getElementById('modal-contenido').innerHTML = data.contenido || data.resumen || '';
    new bootstrap.Modal(document.getElementById('modalLectura')).show();
};

// ==========================================
// 1. COLUMNAS / NOTICIAS
// ==========================================
document.getElementById('btn-pub-noticia').onclick = async () => {
    const titulo = document.getElementById('not-titulo').value;
    const tagsRaw = document.getElementById('not-tags').value;
    const etiquetas = tagsRaw ? tagsRaw.split(',').map(t=>t.trim()).filter(Boolean) : ['General'];
    const colorTag = document.getElementById('not-color').value;
    const imagen = document.getElementById('not-imagen').value || '';
    const contenido = quillNoticias.root.innerHTML;
    
    if (!titulo) return alert("Falta el titular.");
    await addDoc(collection(db, "noticias"), { titulo, etiquetas, colorTag, imagen, contenido, fecha: serverTimestamp() });
    
    document.querySelectorAll('#colNoticia input').forEach(i => i.value = '');
    quillNoticias.setContents([]);
    bootstrap.Collapse.getInstance(document.getElementById('colNoticia'))?.hide();
};

onSnapshot(query(collection(db, "noticias"), orderBy("fecha", "desc")), (snap) => {
    const cont = document.getElementById('contenedor-noticias-lista');
    if (snap.empty) return cont.innerHTML = '<div class="text-center text-muted">No hay publicaciones.</div>';
    
    let html = '';
    snap.forEach(d => {
        const data = d.data();
        window.postsData[d.id] = data; // Guardamos para el Modal
        const date = data.fecha ? data.fecha.toDate().toLocaleDateString() : 'Reciente';
        const imgHTML = data.imagen ? `<img src="${data.imagen}" class="post-img-rect shadow-sm" onclick="abrirModal('${d.id}')">` : `<div class="post-img-rect bg-light d-flex align-items-center justify-content-center text-muted border shadow-sm" onclick="abrirModal('${d.id}')"><i class="bi bi-image fs-1"></i></div>`;
        const tagsHTML = (data.etiquetas || []).map(t => `<span class="tag-badge" style="background-color: ${data.colorTag || '#1976d2'}">${t}</span>`).join('');
        
        // Estructura Grande Rectangular
        html += `
        <div class="card border-0 border-bottom rounded-0 mb-4 pb-4">
            <div class="row g-4 align-items-center">
                <div class="col-md-5 position-relative">
                    ${imgHTML}
                </div>
                <div class="col-md-7 d-flex flex-column justify-content-center">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>${tagsHTML}</div>
                        <div class="text-nowrap">
                           <i class="bi bi-share text-muted me-2" onclick="compartir('${data.titulo}')" style="cursor:pointer"></i>
                           <i class="bi bi-trash text-danger admin-only-inline" onclick="borrarPost('noticias', '${d.id}')" style="cursor:pointer"></i>
                        </div>
                    </div>
                    <h3 class="fw-bold mb-2 text-truncate-2 cursor-pointer font-serif" style="color: #1a202c; line-height: 1.3;" onclick="abrirModal('${d.id}')">${data.titulo}</h3>
                    <small class="text-muted fw-semibold mt-1"><i class="bi bi-calendar3 me-1"></i> ${date}</small>
                </div>
            </div>
        </div>`;
    });
    cont.innerHTML = html;
});

// ==========================================
// 2. INVESTIGACIÓN & PAPERS
// ==========================================
document.getElementById('btn-pub-articulo').onclick = async () => {
    const titulo = document.getElementById('art-titulo').value;
    const link = document.getElementById('art-link').value;
    const resumen = document.getElementById('art-resumen').value;
    const tagsRaw = document.getElementById('art-tags').value;
    const etiquetas = tagsRaw ? tagsRaw.split(',').map(t=>t.trim()).filter(Boolean) : ['Paper'];
    const colorTag = document.getElementById('art-color').value;

    if (!titulo || !link) return alert("Título y enlace obligatorios.");
    await addDoc(collection(db, "articulos"), { titulo, link, resumen, etiquetas, colorTag, fecha: serverTimestamp() });
    document.querySelectorAll('#colArticulo input, #colArticulo textarea').forEach(i => i.value = '');
    bootstrap.Collapse.getInstance(document.getElementById('colArticulo'))?.hide();
};

onSnapshot(query(collection(db, "articulos"), orderBy("fecha", "desc")), (snap) => {
    const cont = document.getElementById('contenedor-articulos');
    if (snap.empty) return cont.innerHTML = '<div class="col-12 text-center text-muted">No hay papers publicados.</div>';
    
    let html = '';
    snap.forEach(d => {
        const data = d.data();
        window.postsData[d.id] = data;
        const date = data.fecha ? data.fecha.toDate().toLocaleDateString() : 'Reciente';
        const tagsHTML = (data.etiquetas || []).map(t => `<span class="tag-badge" style="background-color: ${data.colorTag || '#dc3545'}">${t}</span>`).join('');
        
        html += `
        <div class="col-md-6 mb-4">
            <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden">
                <div class="card-body p-4 d-flex flex-column">
                    <div class="mb-2">${tagsHTML}</div>
                    <h5 class="fw-bold font-serif text-dark mb-2 cursor-pointer" onclick="abrirModal('${d.id}')">${data.titulo}</h5>
                    <p class="text-muted small mb-4 text-truncate-2 flex-grow-1">${data.resumen}</p>
                    <div class="d-flex align-items-center justify-content-between border-top pt-3">
                        <small class="text-muted fw-semibold"><i class="bi bi-calendar3 me-1"></i> ${date}</small>
                        <div>
                            <button class="btn btn-sm btn-light text-primary rounded-circle" onclick="compartir('${data.titulo}')"><i class="bi bi-share-fill"></i></button>
                            <button class="btn btn-sm btn-danger rounded-circle ms-1 admin-only-inline" onclick="borrarPost('articulos', '${d.id}')"><i class="bi bi-trash-fill"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    });
    cont.innerHTML = html;
});

// ==========================================
// 3. DEBATES (Encuestas) - Mantenido igual
// ==========================================
document.getElementById('btn-add-opcion').onclick = () => {
    const i = document.createElement('input'); i.type = 'text'; i.className = 'form-control bg-light border-0 mb-2 opcion-input'; i.placeholder = 'Nueva Opción';
    document.getElementById('opciones-encuesta').appendChild(i);
};

document.getElementById('btn-pub-encuesta').onclick = async () => {
    const pregunta = document.getElementById('enc-pregunta').value;
    const inputs = document.querySelectorAll('.opcion-input');
    if (!pregunta) return alert("Falta la pregunta.");
    let opciones = []; inputs.forEach(i => { if(i.value.trim() !== '') opciones.push({ texto: i.value, votos: 0 }); });
    if (opciones.length < 2) return alert("Mínimo 2 opciones.");
    await addDoc(collection(db, "encuestas"), { pregunta, opciones, totalVotos: 0, fecha: serverTimestamp() });
    document.getElementById('enc-pregunta').value = ''; inputs.forEach(i => i.value = '');
    bootstrap.Collapse.getInstance(document.getElementById('colEncuesta'))?.hide();
};

onSnapshot(query(collection(db, "encuestas"), orderBy("fecha", "desc")), (snap) => {
    const cont = document.getElementById('contenedor-encuestas');
    if (snap.empty) return cont.innerHTML = '<div class="text-center text-muted">No hay debates activos.</div>';
    let html = '';
    snap.forEach(d => {
        const data = d.data();
        html += `
        <div class="card mb-4 border-0 shadow-sm rounded-4">
            <div class="card-body p-4">
                <div class="d-flex justify-content-between mb-3">
                    <h5 class="fw-bold font-serif m-0">${data.pregunta}</h5>
                    <button class="btn btn-sm text-danger px-2 py-0 admin-only-inline" onclick="borrarPost('encuestas', '${d.id}')"><i class="bi bi-trash"></i></button>
                </div>
                <div class="d-grid gap-2">`;
        data.opciones.forEach((opc, index) => {
            const pct = data.totalVotos === 0 ? 0 : Math.round((opc.votos / data.totalVotos) * 100);
            html += `<button class="btn btn-light text-start position-relative border-0 rounded-3 py-2 shadow-sm" onclick="votar('${d.id}', ${index})"><div class="position-absolute top-0 start-0 h-100 bg-primary opacity-25 rounded-3" style="width: ${pct}%;"></div><span class="position-relative z-1 d-flex justify-content-between px-2"><span class="small fw-semibold text-dark">${opc.texto}</span><span class="fw-bold text-primary small">${pct}%</span></span></button>`;
        });
        html += `</div><div class="mt-3 text-end small text-muted fw-bold">${data.totalVotos} votos totales</div></div></div>`;
    });
    cont.innerHTML = html;
});

window.votar = async (id, index) => {
    const ref = doc(db, "encuestas", id); const snap = await getDoc(ref);
    if(snap.exists()){ let data = snap.data(); data.opciones[index].votos += 1; data.totalVotos += 1; await updateDoc(ref, { opciones: data.opciones, totalVotos: data.totalVotos }); }
};
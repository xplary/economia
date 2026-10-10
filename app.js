import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, onSnapshot, query, serverTimestamp, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const app = initializeApp({
    apiKey: "AIzaSyDvtzU8SGycfh99Cc_lLT7xabQ_uPBOpqE", authDomain: "economia-41d20.firebaseapp.com", databaseURL: "https://economia-41d20-default-rtdb.firebaseio.com", projectId: "economia-41d20", storageBucket: "economia-41d20.firebasestorage.app", messagingSenderId: "750639619847", appId: "1:750639619847:web:9a036501539ca6e3ceafa2", measurementId: "G-BWV82ZTSW1"
});
const auth = getAuth(app);
const db = getFirestore(app);

window.postsData = {};
window.editandoId = null; 

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

// Utilidades Globales
window.borrarPost = async (col, id) => { if(confirm("¿Eliminar permanentemente?")) await deleteDoc(doc(db, col, id)); };
window.compartir = (tit) => { if (navigator.share) navigator.share({ title: tit, url: window.location.href }); };

// COMPRESOR DE IMÁGENES (Evita colapso de Firestore)
const compressImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; // Calidad óptima
                const scale = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH; canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.6)); // Comprime al 60%
            };
        };
    });
};

window.cancelarEdicion = () => {
    window.editandoId = null;
    document.querySelectorAll('input, textarea').forEach(i => { if(i.type !== 'color') i.value = '' });
    quillNoticias.setContents([]);
    document.getElementById('btn-pub-noticia').innerText = "Publicar Columna";
    document.getElementById('btn-pub-articulo').innerText = "Publicar Paper";
    document.getElementById('not-form-title').innerText = "Editor de Columnas";
    bootstrap.Collapse.getInstance(document.getElementById('colNoticia'))?.hide();
    bootstrap.Collapse.getInstance(document.getElementById('colArticulo'))?.hide();
};

// ==========================================
// CONFIGURACIÓN DEL SIDEBAR ROJO
// ==========================================
onSnapshot(doc(db, "configuracion", "sidebar"), (docSnap) => {
    if(docSnap.exists()) {
        const d = docSnap.data();
        if(d.titulo) document.getElementById('sb-titulo').innerText = d.titulo;
        if(d.dia) document.getElementById('sb-dia').innerText = d.dia;
        if(d.mes) document.getElementById('sb-mes').innerText = d.mes;
        if(d.desc) document.getElementById('sb-desc').innerText = d.desc;
    }
});

window.editarSidebar = async () => {
    const titulo = prompt("Título Principal:", document.getElementById('sb-titulo').innerText) || document.getElementById('sb-titulo').innerText;
    const dia = prompt("Día (Ej: 15):", document.getElementById('sb-dia').innerText) || document.getElementById('sb-dia').innerText;
    const mes = prompt("Mes (Ej: OCT):", document.getElementById('sb-mes').innerText) || document.getElementById('sb-mes').innerText;
    const desc = prompt("Descripción breve:", document.getElementById('sb-desc').innerText) || document.getElementById('sb-desc').innerText;
    await setDoc(doc(db, "configuracion", "sidebar"), { titulo, dia, mes, desc }, { merge: true });
};

// ==========================================
// MODAL DE LECTURA
// ==========================================
window.abrirModal = (id) => {
    const data = window.postsData[id];
    if(!data) return;
    document.getElementById('modal-titulo').innerText = data.titulo;
    document.getElementById('modal-fecha').innerHTML = `<i class="bi bi-calendar3 me-2"></i> ${data.fecha ? data.fecha.toDate().toLocaleDateString() : ''}`;
    document.getElementById('modal-tags').innerHTML = (data.etiquetas||[]).map(t => `<span class="tag-badge" style="background-color: ${data.colorTag || '#1976d2'};">${t}</span>`).join('');
    
    const imgEl = document.getElementById('modal-imagen');
    if(data.imagen && data.imagen.length > 10) { imgEl.src = data.imagen; imgEl.style.display = 'block'; } else { imgEl.style.display = 'none'; }
    
    const btnDrive = document.getElementById('modal-btn-drive');
    if(data.link) { btnDrive.innerHTML = `<a href="${data.link}" target="_blank" class="btn btn-danger fw-bold rounded-pill shadow-sm"><i class="bi bi-file-pdf-fill me-1"></i> Ver PDF Original</a>`; } else { btnDrive.innerHTML = ''; }
    
    document.getElementById('modal-contenido').innerHTML = data.contenido || data.resumen || '';
    new bootstrap.Modal(document.getElementById('modalLectura')).show();
};

// ==========================================
// 1. COLUMNAS Y NOTICIAS (Buscador, Orden y Edición)
// ==========================================
let noticiasCache = [];
let queryBuscar = '';
let ordenDescendente = true;

document.getElementById('input-buscar').addEventListener('input', (e) => { queryBuscar = e.target.value.toLowerCase(); renderNoticias(); });
document.getElementById('btn-ordenar').addEventListener('click', () => { 
    ordenDescendente = !ordenDescendente; 
    document.getElementById('btn-ordenar').innerHTML = ordenDescendente ? 'Ordenar por: Recientes ↓' : 'Ordenar por: Antiguos ↑';
    renderNoticias(); 
});

window.editarNoticia = (id) => {
    const data = window.postsData[id];
    document.getElementById('not-titulo').value = data.titulo;
    document.getElementById('not-tags').value = (data.etiquetas||[]).join(', ');
    document.getElementById('not-color').value = data.colorTag || '#1976d2';
    document.getElementById('not-principal').checked = data.principal;
    quillNoticias.root.innerHTML = data.contenido;
    window.editandoId = id;
    document.getElementById('not-form-title').innerText = "Editando Columna";
    document.getElementById('btn-pub-noticia').innerText = "Guardar Cambios";
    bootstrap.Collapse.getOrCreateInstance(document.getElementById('colNoticia')).show();
    window.scrollTo(0,0);
};

document.getElementById('btn-pub-noticia').onclick = async () => {
    const titulo = document.getElementById('not-titulo').value;
    const etiquetas = document.getElementById('not-tags').value ? document.getElementById('not-tags').value.split(',').map(t=>t.trim()).filter(Boolean) : ['General'];
    const colorTag = document.getElementById('not-color').value;
    const principal = document.getElementById('not-principal').checked;
    const contenido = quillNoticias.root.innerHTML;
    
    if (!titulo) return alert("Falta el titular.");
    
    // Lógica de Imagen (Nueva o Existente)
    let imagenFinal = '';
    const imgFile = document.getElementById('not-imagen').files[0];
    if (imgFile) {
        imagenFinal = await compressImage(imgFile);
    } else if (window.editandoId && window.postsData[window.editandoId].imagen) {
        imagenFinal = window.postsData[window.editandoId].imagen; // Mantener imagen anterior si edita
    }

    const docData = { titulo, etiquetas, colorTag, imagen: imagenFinal, principal, contenido };

    if (window.editandoId) {
        await updateDoc(doc(db, "noticias", window.editandoId), docData);
    } else {
        docData.fecha = serverTimestamp();
        await addDoc(collection(db, "noticias"), docData);
    }
    cancelarEdicion();
};

onSnapshot(collection(db, "noticias"), (snap) => {
    noticiasCache = [];
    snap.forEach(d => { noticiasCache.push({id: d.id, ...d.data()}); window.postsData[d.id] = d.data(); });
    renderNoticias();
});

function renderNoticias() {
    const contLista = document.getElementById('contenedor-noticias-lista');
    const contPrincipal = document.getElementById('contenedor-noticia-principal');
    
    // Filtrar por Buscador
    let filtradas = noticiasCache.filter(n => n.titulo.toLowerCase().includes(queryBuscar) || n.contenido.toLowerCase().includes(queryBuscar));
    
    // Ordenar
    filtradas.sort((a,b) => {
        let tA = a.fecha ? a.fecha.toMillis() : 0; let tB = b.fecha ? b.fecha.toMillis() : 0;
        return ordenDescendente ? tB - tA : tA - tB;
    });

    if (filtradas.length === 0) { contPrincipal.innerHTML = ''; contLista.innerHTML = '<div class="text-center text-muted">No se encontraron resultados.</div>'; return; }
    
    let htmlLista = ''; let htmlPrincipal = ''; let principalEncontrada = false;

    filtradas.forEach(data => {
        const date = data.fecha ? data.fecha.toDate().toLocaleDateString() : 'Reciente';
        const imgHTML = data.imagen ? `<img src="${data.imagen}" class="post-img-rect shadow-sm" onclick="abrirModal('${data.id}')">` : `<div class="post-img-rect bg-light d-flex align-items-center justify-content-center text-muted border shadow-sm" onclick="abrirModal('${data.id}')"><i class="bi bi-image fs-1"></i></div>`;
        const tagsHTML = (data.etiquetas || []).map(t => `<span class="tag-badge" style="background-color: ${data.colorTag || '#1976d2'}">${t}</span>`).join('');
        
        // El principal SIEMPRE se imprime en la lista normal. Además, si es el primer principal, llena el bloque superior.
        if (data.principal && !principalEncontrada) {
            principalEncontrada = true;
            const imgP = data.imagen ? `<img src="${data.imagen}" class="img-fluid w-100 object-fit-cover rounded-4 shadow-sm cursor-pointer" style="height: 380px;" onclick="abrirModal('${data.id}')">` : `<div class="w-100 rounded-4 shadow-sm d-flex align-items-center justify-content-center bg-light text-muted border cursor-pointer" style="height:380px;" onclick="abrirModal('${data.id}')"><i class="bi bi-image fs-1"></i></div>`;
            htmlPrincipal = `
            <div class="row mb-5 border-bottom pb-5 align-items-center">
                <div class="col-lg-7 mb-4 mb-lg-0">${imgP}</div>
                <div class="col-lg-5 ps-lg-4">
                    <div class="mb-3">${tagsHTML}</div>
                    <h2 class="fw-bold mb-3 font-serif cursor-pointer" style="font-size: 2.2rem; color: #1a202c; line-height: 1.3;" onclick="abrirModal('${data.id}')">${data.titulo}</h2>
                    <div class="text-muted mb-4 text-truncate-3 font-inter" style="line-height: 1.6; font-size: 1.1rem;">${data.contenido}</div>
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted fw-semibold"><i class="bi bi-calendar3 me-1"></i> ${date}</small>
                        <small class="text-muted fw-semibold cursor-pointer" onclick="compartir('${data.titulo}')"><i class="bi bi-share me-1"></i> Compartir</small>
                    </div>
                </div>
            </div>`;
        }

        // Siempre agregarlo a la lista de abajo
        htmlLista += `
        <div class="card border-0 border-bottom rounded-0 mb-4 pb-4">
            <div class="row g-4 align-items-center">
                <div class="col-md-5 position-relative">${imgHTML}</div>
                <div class="col-md-7 d-flex flex-column justify-content-center">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>${tagsHTML}</div>
                        <div class="text-nowrap">
                           <i class="bi bi-share text-muted me-2 cursor-pointer" onclick="compartir('${data.titulo}')"></i>
                           <i class="bi bi-pencil-fill text-warning me-2 admin-only-inline cursor-pointer" onclick="editarNoticia('${data.id}')" title="Editar"></i>
                           <i class="bi bi-trash text-danger admin-only-inline cursor-pointer" onclick="borrarPost('noticias', '${data.id}')"></i>
                        </div>
                    </div>
                    <h3 class="fw-bold mb-2 text-truncate-2 cursor-pointer font-serif" style="color: #1a202c; line-height: 1.3;" onclick="abrirModal('${data.id}')">${data.titulo}</h3>
                    <small class="text-muted fw-semibold mt-1"><i class="bi bi-calendar3 me-1"></i> ${date}</small>
                </div>
            </div>
        </div>`;
    });
    
    contPrincipal.innerHTML = principalEncontrada ? htmlPrincipal : '';
    contLista.innerHTML = htmlLista;
}

// ==========================================
// 2. INVESTIGACIÓN & PAPERS (Con Edición)
// ==========================================
window.editarArticulo = (id) => {
    const data = window.postsData[id];
    document.getElementById('art-titulo').value = data.titulo;
    document.getElementById('art-link').value = data.link;
    document.getElementById('art-tags').value = (data.etiquetas||[]).join(', ');
    document.getElementById('art-color').value = data.colorTag || '#dc3545';
    document.getElementById('art-resumen').value = data.resumen;
    window.editandoId = id;
    document.getElementById('btn-pub-articulo').innerText = "Guardar Cambios";
    bootstrap.Collapse.getOrCreateInstance(document.getElementById('colArticulo')).show();
    window.scrollTo(0,0);
};

document.getElementById('btn-pub-articulo').onclick = async () => {
    const titulo = document.getElementById('art-titulo').value;
    const link = document.getElementById('art-link').value;
    const resumen = document.getElementById('art-resumen').value;
    const etiquetas = document.getElementById('art-tags').value ? document.getElementById('art-tags').value.split(',').map(t=>t.trim()).filter(Boolean) : ['Paper'];
    const colorTag = document.getElementById('art-color').value;

    if (!titulo || !link) return alert("Título y enlace obligatorios.");
    const docData = { titulo, link, resumen, etiquetas, colorTag };

    if(window.editandoId) {
        await updateDoc(doc(db, "articulos", window.editandoId), docData);
    } else {
        docData.fecha = serverTimestamp();
        await addDoc(collection(db, "articulos"), docData);
    }
    cancelarEdicion();
};

onSnapshot(query(collection(db, "articulos"), orderBy("fecha", "desc")), (snap) => {
    const cont = document.getElementById('contenedor-articulos');
    if (snap.empty) return cont.innerHTML = '<div class="col-12 text-center text-muted">No hay papers publicados.</div>';
    let html = '';
    snap.forEach(d => {
        const data = d.data(); window.postsData[d.id] = data;
        const date = data.fecha ? data.fecha.toDate().toLocaleDateString() : 'Reciente';
        const tagsHTML = (data.etiquetas || []).map(t => `<span class="tag-badge" style="background-color: ${data.colorTag || '#dc3545'}">${t}</span>`).join('');
        
        html += `
        <div class="col-md-6 mb-4">
            <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden">
                <div class="card-body p-4 d-flex flex-column">
                    <div class="d-flex justify-content-between">
                        <div class="mb-2">${tagsHTML}</div>
                        <div>
                            <i class="bi bi-pencil-fill text-warning me-2 admin-only-inline cursor-pointer" onclick="editarArticulo('${d.id}')"></i>
                            <i class="bi bi-trash-fill text-danger admin-only-inline cursor-pointer" onclick="borrarPost('articulos', '${d.id}')"></i>
                        </div>
                    </div>
                    <h5 class="fw-bold font-serif text-dark mb-2 cursor-pointer" onclick="abrirModal('${d.id}')">${data.titulo}</h5>
                    <p class="text-muted small mb-4 text-truncate-2 flex-grow-1">${data.resumen}</p>
                    <div class="d-flex align-items-center justify-content-between border-top pt-3">
                        <small class="text-muted fw-semibold"><i class="bi bi-calendar3 me-1"></i> ${date}</small>
                        <button class="btn btn-sm btn-light text-primary rounded-circle" onclick="compartir('${data.titulo}')"><i class="bi bi-share-fill"></i></button>
                    </div>
                </div>
            </div>
        </div>`;
    });
    cont.innerHTML = html;
});
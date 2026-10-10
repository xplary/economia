import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const app = initializeApp({
    apiKey: "AIzaSyDvtzU8SGycfh99Cc_lLT7xabQ_uPBOpqE",
    authDomain: "economia-41d20.firebaseapp.com",
    projectId: "economia-41d20"
});
const auth = getAuth(app);
const db = getFirestore(app);

// Inicializar Editor Compacto
const quillNoticias = new Quill('#editor-noticias', {
    theme: 'snow',
    placeholder: 'Escribe tu columna aquí...',
    modules: { toolbar: [['bold', 'italic'], [{'color':[]}], ['link', 'image'], ['clean']] }
});

// Autenticación
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

// Función Global para Borrar Documentos
window.borrarPost = async (coleccion, id) => {
    if(confirm("¿Estás seguro de que deseas eliminar esta publicación permanentemente?")) {
        await deleteDoc(doc(db, coleccion, id));
    }
};

// ==========================================
// 1. INVESTIGACIÓN & PAPERS (Artículos)
// ==========================================
document.getElementById('btn-pub-articulo').onclick = async () => {
    const titulo = document.getElementById('art-titulo').value;
    const resumen = document.getElementById('art-resumen').value;
    const link = document.getElementById('art-link').value;
    if (!titulo || !link) return alert("Título y enlace obligatorios.");

    await addDoc(collection(db, "articulos"), { titulo, resumen, link, fecha: serverTimestamp() });
    document.getElementById('art-titulo').value = '';
    document.getElementById('art-resumen').value = '';
    document.getElementById('art-link').value = '';
    bootstrap.Collapse.getInstance(document.getElementById('colArticulo')).hide();
};

onSnapshot(query(collection(db, "articulos"), orderBy("fecha", "desc")), (snap) => {
    const cont = document.getElementById('contenedor-articulos');
    if (snap.empty) return cont.innerHTML = '<div class="col-12 text-center text-muted py-4">No hay papers publicados.</div>';
    
    let html = '';
    snap.forEach(d => {
        const data = d.data();
        const date = data.fecha ? data.fecha.toDate().toLocaleDateString() : 'Reciente';
        html += `
        <div class="col-12 mb-3">
            <div class="card articulo-card border-0 shadow-sm h-100">
                <div class="card-body p-3">
                    <h5 class="fw-bold text-dark mb-1">${data.titulo}</h5>
                    <p class="text-muted small mb-3">${data.resumen}</p>
                    <div class="d-flex align-items-center justify-content-between">
                        <a href="${data.link}" target="_blank" class="btn btn-sm btn-outline-danger rounded-pill fw-bold px-3">
                            <i class="bi bi-file-pdf-fill"></i> Leer Documento
                        </a>
                        <div>
                            <small class="text-muted">${date}</small>
                            <button class="btn btn-sm btn-outline-danger px-2 py-0 ms-2 admin-only-inline" onclick="borrarPost('articulos', '${d.id}')" title="Borrar"><i class="bi bi-trash"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    });
    cont.innerHTML = html;
});

// ==========================================
// 2. COLUMNAS DE OPINIÓN (Noticias)
// ==========================================
document.getElementById('btn-pub-noticia').onclick = async () => {
    const titulo = document.getElementById('not-titulo').value;
    const etiqueta = document.getElementById('not-etiqueta').value || 'Opinión';
    const contenido = quillNoticias.root.innerHTML;
    if (!titulo) return alert("Falta el titular.");

    await addDoc(collection(db, "noticias"), { titulo, etiqueta, contenido, fecha: serverTimestamp() });
    document.getElementById('not-titulo').value = '';
    document.getElementById('not-etiqueta').value = '';
    quillNoticias.setContents([]);
    bootstrap.Collapse.getInstance(document.getElementById('colNoticia')).hide();
};

onSnapshot(query(collection(db, "noticias"), orderBy("fecha", "desc")), (snap) => {
    const cont = document.getElementById('contenedor-noticias');
    if (snap.empty) return cont.innerHTML = '<div class="text-center text-muted py-4">No hay columnas publicadas.</div>';
    
    let html = '';
    snap.forEach(d => {
        const data = d.data();
        const date = data.fecha ? data.fecha.toDate().toLocaleDateString() : 'Reciente';
        html += `
        <div class="mb-4 border-bottom pb-4">
            <span class="badge bg-light text-secondary border px-2 py-1 mb-2 text-uppercase">${data.etiqueta}</span>
            <h3 class="fw-bold mb-3" style="font-family: Georgia, serif;">${data.titulo}</h3>
            <div class="text-muted mb-3">${data.contenido}</div>
            <div class="d-flex justify-content-between align-items-center">
                <small class="text-muted fw-bold">${date}</small>
                <div>
                    <button class="btn btn-sm btn-light text-primary rounded-pill px-3" onclick="compartir('${data.titulo}')"><i class="bi bi-share"></i> Compartir</button>
                    <button class="btn btn-sm btn-outline-danger px-2 py-1 ms-2 admin-only-inline" onclick="borrarPost('noticias', '${d.id}')" title="Borrar"><i class="bi bi-trash"></i></button>
                </div>
            </div>
        </div>`;
    });
    cont.innerHTML = html;
});

// ==========================================
// 3. ENSAYOS & DEBATES (Encuestas)
// ==========================================
document.getElementById('btn-add-opcion').onclick = () => {
    const i = document.createElement('input');
    i.type = 'text'; i.className = 'form-control form-control-sm mb-1 opcion-input bg-light'; i.placeholder = 'Nueva Opción';
    document.getElementById('opciones-encuesta').appendChild(i);
};

document.getElementById('btn-pub-encuesta').onclick = async () => {
    const pregunta = document.getElementById('enc-pregunta').value;
    const inputs = document.querySelectorAll('.opcion-input');
    if (!pregunta) return alert("Falta la pregunta.");

    let opciones = [];
    inputs.forEach(i => { if(i.value.trim() !== '') opciones.push({ texto: i.value, votos: 0 }); });
    if (opciones.length < 2) return alert("Mínimo 2 opciones.");

    await addDoc(collection(db, "encuestas"), { pregunta, opciones, totalVotos: 0, fecha: serverTimestamp() });
    document.getElementById('enc-pregunta').value = '';
    inputs.forEach(i => i.value = '');
    bootstrap.Collapse.getInstance(document.getElementById('colEncuesta')).hide();
};

onSnapshot(query(collection(db, "encuestas"), orderBy("fecha", "desc")), (snap) => {
    const cont = document.getElementById('contenedor-encuestas');
    if (snap.empty) return cont.innerHTML = '<div class="text-center text-muted py-4">No hay debates activos.</div>';
    
    let html = '';
    snap.forEach(d => {
        const data = d.data();
        html += `
        <div class="card mb-3 border-0 shadow-sm">
            <div class="card-body p-3">
                <div class="d-flex justify-content-between">
                    <h5 class="fw-bold mb-3">${data.pregunta}</h5>
                    <button class="btn btn-sm text-danger px-2 py-0 admin-only-inline" style="height:fit-content;" onclick="borrarPost('encuestas', '${d.id}')" title="Borrar"><i class="bi bi-trash"></i></button>
                </div>
                <div class="d-grid gap-2">`;
                
        data.opciones.forEach((opc, index) => {
            const pct = data.totalVotos === 0 ? 0 : Math.round((opc.votos / data.totalVotos) * 100);
            html += `
                <button class="btn btn-light text-start position-relative border py-2" onclick="votar('${d.id}', ${index})">
                    <div class="position-absolute top-0 start-0 h-100 bg-primary opacity-25" style="width: ${pct}%;"></div>
                    <span class="position-relative z-1 d-flex justify-content-between px-2">
                        <span class="small">${opc.texto}</span>
                        <span class="fw-bold text-primary small">${pct}%</span>
                    </span>
                </button>`;
        });
        html += `</div>
                <div class="mt-2 text-end small text-muted">${data.totalVotos} votos</div>
            </div>
        </div>`;
    });
    cont.innerHTML = html;
});

window.votar = async (id, index) => {
    const ref = doc(db, "encuestas", id);
    const snap = await getDoc(ref);
    if(snap.exists()){
        let data = snap.data();
        data.opciones[index].votos += 1;
        data.totalVotos += 1;
        await updateDoc(ref, { opciones: data.opciones, totalVotos: data.totalVotos });
    }
};

window.compartir = (titulo) => {
    if (navigator.share) navigator.share({ title: titulo, url: window.location.href });
};
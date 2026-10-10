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

// Quill Editor
const quillNoticias = new Quill('#editor-noticias', {
    theme: 'snow',
    placeholder: 'Escribe tu publicación...',
    modules: { toolbar: [['bold', 'italic'], [{'color':[]}], ['link'], ['clean']] }
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

// Borrar Documentos
window.borrarPost = async (coleccion, id) => {
    if(confirm("¿Estás seguro de que deseas eliminar esto permanentemente?")) {
        await deleteDoc(doc(db, coleccion, id));
    }
};

window.compartir = (titulo) => {
    if (navigator.share) navigator.share({ title: titulo, url: window.location.href });
};

// ==========================================
// 1. NOTICIAS Y COLUMNAS (DISEÑO MODERNO)
// ==========================================
document.getElementById('btn-pub-noticia').onclick = async () => {
    const titulo = document.getElementById('not-titulo').value;
    const etiqueta = document.getElementById('not-etiqueta').value || 'General';
    const imagenUrl = document.getElementById('not-imagen').value || 'https://via.placeholder.com/800x500/eaeaea/a0a0a0?text=Imagen+No+Disponible';
    const esPrincipal = document.getElementById('not-principal').checked;
    const contenido = quillNoticias.root.innerHTML;
    
    if (!titulo) return alert("Falta el titular.");

    await addDoc(collection(db, "noticias"), { 
        titulo, etiqueta, imagen: imagenUrl, principal: esPrincipal, contenido, fecha: serverTimestamp() 
    });
    
    document.getElementById('not-titulo').value = '';
    document.getElementById('not-etiqueta').value = '';
    document.getElementById('not-imagen').value = '';
    document.getElementById('not-principal').checked = false;
    quillNoticias.setContents([]);
    bootstrap.Collapse.getInstance(document.getElementById('colNoticia')).hide();
};

onSnapshot(query(collection(db, "noticias"), orderBy("fecha", "desc")), (snap) => {
    const contPrincipal = document.getElementById('contenedor-noticia-principal');
    const contLista = document.getElementById('contenedor-noticias-lista');
    
    if (snap.empty) {
        contPrincipal.innerHTML = '';
        contLista.innerHTML = '<div class="text-center text-muted py-4">No hay publicaciones disponibles.</div>';
        return;
    }
    
    let htmlPrincipal = '';
    let htmlLista = '';
    let principalEncontrada = false;

    snap.forEach(d => {
        const data = d.data();
        const date = data.fecha ? data.fecha.toDate().toLocaleDateString() : 'Reciente';
        
        // Si es marcada como principal y aún no hemos dibujado una principal
        if (data.principal && !principalEncontrada) {
            principalEncontrada = true;
            htmlPrincipal = `
            <div class="row mb-5 border-bottom pb-5">
                <div class="col-lg-7 position-relative">
                    <img src="${data.imagen}" class="img-fluid w-100 object-fit-cover rounded-1" style="height: 380px; background: #eaeaea;" alt="Noticia Principal">
                    <button class="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 admin-only-inline shadow" onclick="borrarPost('noticias', '${d.id}')" title="Borrar Principal"><i class="bi bi-trash"></i></button>
                </div>
                <div class="col-lg-5 d-flex flex-column justify-content-center ps-lg-4 mt-3 mt-lg-0">
                    <span class="badge bg-white text-secondary border border-secondary-subtle px-2 py-1 mb-3 align-self-start text-uppercase" style="letter-spacing: 0.5px;">${data.etiqueta}</span>
                    <h2 class="fw-bold mb-3" style="font-family: Georgia, serif; font-size: 2.2rem; color: #1a202c;">${data.titulo}</h2>
                    <div class="text-muted mb-4 text-truncate-3" style="line-height: 1.6;">${data.contenido}</div>
                    <div class="d-flex justify-content-between mt-auto align-items-center">
                        <small class="text-muted">${date}</small>
                        <small class="text-muted" style="cursor: pointer;" onclick="compartir('${data.titulo}')">Compartir <i class="bi bi-share ms-1"></i></small>
                    </div>
                </div>
            </div>`;
        } else {
            // El resto va a la lista normal
            htmlLista += `
            <div class="card border-0 border-bottom rounded-0 mb-4 pb-3">
                <div class="row g-0">
                    <div class="col-md-4 position-relative">
                        <img src="${data.imagen}" class="img-fluid w-100 object-fit-cover rounded-1" style="height: 140px; background: #eaeaea;" alt="Imagen">
                    </div>
                    <div class="col-md-8 ps-3 d-flex flex-column">
                        <div class="d-flex justify-content-between mb-2">
                            <span class="badge bg-white border border-secondary-subtle text-secondary px-2 py-1 text-uppercase" style="font-size:0.7rem;">${data.etiqueta}</span>
                            <div>
                               <i class="bi bi-share text-muted me-2" onclick="compartir('${data.titulo}')" style="cursor:pointer"></i>
                               <i class="bi bi-trash text-danger admin-only-inline" onclick="borrarPost('noticias', '${d.id}')" style="cursor:pointer"></i>
                            </div>
                        </div>
                        <h5 class="fw-bold mb-2" style="font-family: Georgia, serif; color: #1a202c; font-size: 1.25rem;">${data.titulo}</h5>
                        <div class="mt-auto">
                            <small class="text-muted">${date}</small>
                        </div>
                    </div>
                </div>
            </div>`;
        }
    });

    // Si no se encontró ninguna noticia principal, limpiamos el contenedor superior
    contPrincipal.innerHTML = principalEncontrada ? htmlPrincipal : '';
    contLista.innerHTML = htmlLista;
});


// ==========================================
// 2. INVESTIGACIÓN & PAPERS
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
            <div class="card border border-primary-subtle shadow-sm h-100 rounded-3">
                <div class="card-body p-3">
                    <h5 class="fw-bold text-dark mb-1">${data.titulo}</h5>
                    <p class="text-muted small mb-3">${data.resumen}</p>
                    <div class="d-flex align-items-center justify-content-between">
                        <a href="${data.link}" target="_blank" class="btn btn-sm btn-outline-danger rounded-pill fw-bold px-3"><i class="bi bi-file-pdf-fill"></i> Leer Documento</a>
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
        <div class="card mb-3 border border-secondary-subtle shadow-sm rounded-3">
            <div class="card-body p-3">
                <div class="d-flex justify-content-between mb-3">
                    <h5 class="fw-bold m-0">${data.pregunta}</h5>
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
                <div class="mt-2 text-end small text-muted">${data.totalVotos} votos totales</div>
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
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDvtzU8SGycfh99Cc_lLT7xabQ_uPBOpqE",
    authDomain: "economia-41d20.firebaseapp.com",
    databaseURL: "https://economia-41d20-default-rtdb.firebaseio.com",
    projectId: "economia-41d20",
    storageBucket: "economia-41d20.firebasestorage.app",
    messagingSenderId: "750639619847",
    appId: "1:750639619847:web:9a036501539ca6e3ceafa2",
    measurementId: "G-BWV82ZTSW1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Inicializar Quill (Editor de Noticias)
const quillNoticias = new Quill('#editor-noticias', {
    theme: 'snow',
    placeholder: 'Escribe tu noticia con formato profesional aquí...',
    modules: {
        toolbar: [
            [{ 'header': [2, 3, false] }],
            ['bold', 'italic', 'underline'],
            [{ 'color': [] }],
            ['blockquote', 'list'],
            ['link', 'image', 'video'],
            ['clean']
        ]
    }
});

// Autenticación
document.getElementById('btn-login').addEventListener('click', () => signInWithPopup(auth, provider));
document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('btn-login').classList.add('d-none');
        document.getElementById('btn-logout').classList.remove('d-none');
        try {
            const userDoc = await getDoc(doc(db, "usuarios", user.uid));
            if (userDoc.exists() && userDoc.data().owner === true) {
                document.body.classList.add('is-owner');
            } else { document.body.classList.remove('is-owner'); }
        } catch (e) { document.body.classList.remove('is-owner'); }
    } else {
        document.getElementById('btn-login').classList.remove('d-none');
        document.getElementById('btn-logout').classList.add('d-none');
        document.body.classList.remove('is-owner');
    }
});

// ==========================================
// MÓDULO 1: NOTICIAS
// ==========================================
document.getElementById('btn-publicar-noticia').addEventListener('click', async () => {
    const titulo = document.getElementById('noticia-titulo').value;
    const etiqueta = document.getElementById('noticia-etiqueta').value || 'GENERAL';
    const contenido = quillNoticias.root.innerHTML;

    if (!titulo) return alert("El titular es obligatorio.");

    await addDoc(collection(db, "noticias"), { titulo, etiqueta, contenido, fecha: serverTimestamp() });

    document.getElementById('noticia-titulo').value = '';
    document.getElementById('noticia-etiqueta').value = '';
    quillNoticias.setContents([]);
    alert("Noticia publicada exitosamente.");
    
    // Cerrar el acordeón con Bootstrap
    bootstrap.Collapse.getInstance(document.getElementById('collapseNoticia')).hide();
});

onSnapshot(query(collection(db, "noticias"), orderBy("fecha", "desc")), (snapshot) => {
    const contenedor = document.getElementById('contenedor-noticias');
    if (snapshot.empty) {
        contenedor.innerHTML = '<div class="text-center text-muted py-5"><i class="bi bi-journal-x fs-1 d-block mb-3"></i>No hay noticias publicadas.</div>';
        return;
    }

    let html = '';
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const date = data.fecha ? data.fecha.toDate().toLocaleDateString() : 'Reciente';
        html += `
        <div class="mb-5 border-bottom pb-5">
            <span class="badge bg-light text-secondary border border-secondary-subtle mb-3 align-self-start text-uppercase px-3 py-2 rounded-pill"><i class="bi bi-tag-fill me-1"></i>${data.etiqueta}</span>
            <h2 class="fw-bold mb-4" style="font-family: Georgia, serif; font-size: 2.2rem; color: #1a202c;">${data.titulo}</h2>
            <div class="noticia-content mb-4">${data.contenido}</div>
            <div class="d-flex justify-content-between align-items-center mt-4">
                <small class="text-muted fw-bold"><i class="bi bi-calendar3 me-2"></i>${date}</small>
                <button class="btn btn-sm btn-light text-primary fw-bold px-3 rounded-pill" onclick="compartir('${data.titulo}')"><i class="bi bi-share-fill me-2"></i>Compartir</button>
            </div>
        </div>`;
    });
    contenedor.innerHTML = html;
});

// ==========================================
// MÓDULO 2: TRABAJOS Y ARTÍCULOS (Google Drive)
// ==========================================
document.getElementById('btn-publicar-articulo').addEventListener('click', async () => {
    const titulo = document.getElementById('articulo-titulo').value;
    const resumen = document.getElementById('articulo-resumen').value;
    const link = document.getElementById('articulo-link').value;

    if (!titulo || !link) return alert("El título y el enlace son obligatorios.");

    await addDoc(collection(db, "articulos"), { titulo, resumen, link, fecha: serverTimestamp() });

    document.getElementById('articulo-titulo').value = '';
    document.getElementById('articulo-resumen').value = '';
    document.getElementById('articulo-link').value = '';
    alert("Artículo académico publicado.");
    bootstrap.Collapse.getInstance(document.getElementById('collapseArticulo')).hide();
});

onSnapshot(query(collection(db, "articulos"), orderBy("fecha", "desc")), (snapshot) => {
    const contenedor = document.getElementById('contenedor-articulos');
    if (snapshot.empty) {
        contenedor.innerHTML = '<div class="col-12 text-center text-muted py-5"><i class="bi bi-file-earmark-x fs-1 d-block mb-3"></i>No hay artículos en el repositorio.</div>';
        return;
    }

    let html = '';
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const date = data.fecha ? data.fecha.toDate().toLocaleDateString() : 'Reciente';
        html += `
        <div class="col-12 mb-4">
            <div class="card articulo-card border-0 shadow-sm rounded-4 h-100">
                <div class="card-body p-4 d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h4 class="fw-bold text-dark mb-0">${data.titulo}</h4>
                        <small class="text-muted text-nowrap ms-3">${date}</small>
                    </div>
                    <p class="text-muted mt-3 mb-4 flex-grow-1">${data.resumen}</p>
                    <div class="d-flex gap-2">
                        <a href="${data.link}" target="_blank" class="btn btn-outline-danger fw-bold rounded-pill px-4">
                            <i class="bi bi-file-earmark-pdf-fill me-2"></i>Leer Documento Completo
                        </a>
                        <button class="btn btn-light rounded-pill px-3 text-secondary" onclick="compartir('${data.titulo}')"><i class="bi bi-share"></i></button>
                    </div>
                </div>
            </div>
        </div>`;
    });
    contenedor.innerHTML = html;
});

// ==========================================
// MÓDULO 3: ENCUESTAS
// ==========================================
document.getElementById('btn-agregar-opcion').addEventListener('click', () => {
    const contenedor = document.getElementById('opciones-encuesta');
    const div = document.createElement('div');
    div.className = 'input-group mb-2 shadow-sm rounded-3 overflow-hidden';
    div.innerHTML = `
        <span class="input-group-text bg-white border-0 text-muted"><i class="bi bi-check-circle"></i></span>
        <input type="text" class="form-control border-0 opcion-input bg-white" placeholder="Nueva Opción">
    `;
    contenedor.appendChild(div);
});

document.getElementById('btn-publicar-encuesta').addEventListener('click', async () => {
    const pregunta = document.getElementById('encuesta-pregunta').value;
    const inputs = document.querySelectorAll('.opcion-input');
    
    if (!pregunta) return alert("Escribe la pregunta central.");

    let opciones = [];
    inputs.forEach(input => {
        if(input.value.trim() !== '') { opciones.push({ texto: input.value, votos: 0 }); }
    });

    if (opciones.length < 2) return alert("Se necesitan al menos 2 opciones válidas.");

    await addDoc(collection(db, "encuestas"), { pregunta, opciones, totalVotos: 0, fecha: serverTimestamp() });

    document.getElementById('encuesta-pregunta').value = '';
    inputs.forEach(i => i.value = '');
    alert("Encuesta creada.");
    bootstrap.Collapse.getInstance(document.getElementById('collapseEncuesta')).hide();
});

onSnapshot(query(collection(db, "encuestas"), orderBy("fecha", "desc")), (snapshot) => {
    const contenedor = document.getElementById('contenedor-encuestas');
    if (snapshot.empty) {
        contenedor.innerHTML = '<div class="text-center text-muted py-5"><i class="bi bi-ui-radios fs-1 d-block mb-3"></i>No hay debates activos.</div>';
        return;
    }

    let html = '';
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        html += `
        <div class="card mb-4 border-0 shadow-sm rounded-4">
            <div class="card-body p-4 p-md-5">
                <h4 class="fw-bold mb-4 text-dark"><i class="bi bi-question-circle-fill text-primary me-2"></i>${data.pregunta}</h4>
                <div class="d-grid gap-3 mt-4">`;
                
        data.opciones.forEach((opc, index) => {
            const porcentaje = data.totalVotos === 0 ? 0 : Math.round((opc.votos / data.totalVotos) * 100);
            html += `
                <button class="btn btn-light text-start position-relative overflow-hidden border border-secondary-subtle py-3 rounded-3" onclick="votar('${docSnap.id}', ${index})">
                    <div class="position-absolute top-0 start-0 h-100 bg-primary opacity-10" style="width: ${porcentaje}%; transition: width 0.5s ease;"></div>
                    <span class="position-relative z-1 d-flex justify-content-between px-2 text-dark">
                        <span class="fw-semibold">${opc.texto}</span>
                        <span class="fw-bold text-primary">${porcentaje}% <small class="text-muted fw-normal ms-1">(${opc.votos})</small></span>
                    </span>
                </button>`;
        });

        html += `</div>
                <div class="mt-4 pt-3 border-top d-flex justify-content-between align-items-center">
                    <span class="badge bg-light text-dark border px-3 py-2 rounded-pill">${data.totalVotos} Participaciones</span>
                    <button class="btn btn-sm btn-link text-decoration-none" onclick="compartir('${data.pregunta}')"><i class="bi bi-share me-1"></i>Compartir</button>
                </div>
            </div>
        </div>`;
    });
    contenedor.innerHTML = html;
});

window.votar = async (encuestaId, opcionIndex) => {
    const ref = doc(db, "encuestas", encuestaId);
    const snap = await getDoc(ref);
    if(snap.exists()){
        let data = snap.data();
        data.opciones[opcionIndex].votos += 1;
        data.totalVotos += 1;
        await updateDoc(ref, { opciones: data.opciones, totalVotos: data.totalVotos });
    }
};

window.compartir = (titulo) => {
    if (navigator.share) {
        navigator.share({ title: titulo, url: window.location.href });
    } else {
        alert("Tu navegador no soporta esta función.");
    }
};
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

// Inicializar Quill Editor con opciones profesionales
const quillNoticias = new Quill('#editor-noticias', {
    theme: 'snow',
    placeholder: 'Escribe el contenido de la noticia aquí...',
    modules: {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline'],
            [{ 'color': [] }, { 'background': [] }],
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
// MÓDULO 1: NOTICIAS (Publicar y Leer)
// ==========================================

document.getElementById('btn-publicar-noticia').addEventListener('click', async () => {
    const titulo = document.getElementById('noticia-titulo').value;
    const etiqueta = document.getElementById('noticia-etiqueta').value || 'GENERAL';
    const contenido = quillNoticias.root.innerHTML;

    if (!titulo) return alert("Añade un título");

    await addDoc(collection(db, "noticias"), {
        titulo: titulo,
        etiqueta: etiqueta,
        contenido: contenido,
        fecha: serverTimestamp()
    });

    document.getElementById('noticia-titulo').value = '';
    document.getElementById('noticia-etiqueta').value = '';
    quillNoticias.setContents([]);
    alert("Noticia publicada con éxito");
});

// Escuchar noticias en tiempo real
onSnapshot(query(collection(db, "noticias"), orderBy("fecha", "desc")), (snapshot) => {
    const contenedor = document.getElementById('contenedor-noticias');
    
    if (snapshot.empty) {
        contenedor.innerHTML = '<p class="text-center text-muted mt-5">Aún no hay noticias publicadas.</p>';
        return;
    }

    let html = '';
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const date = data.fecha ? data.fecha.toDate().toLocaleDateString() : 'Reciente';
        const docId = docSnap.id;
        
        // Estructura de noticia grande
        html += `
        <div class="row mb-5 border-bottom pb-5">
            <div class="col-lg-12 d-flex flex-column justify-content-center">
                <span class="badge bg-white text-secondary border border-secondary-subtle mb-3 align-self-start text-uppercase">${data.etiqueta}</span>
                <h2 class="fw-bold mb-3" style="font-family: Georgia, serif; font-size: 2rem;">${data.titulo}</h2>
                <div class="noticia-content mb-4">${data.contenido}</div>
                <div class="d-flex justify-content-between mt-auto pt-3 border-top">
                    <small class="text-muted">${date}</small>
                    <small class="text-muted text-primary" style="cursor: pointer;" onclick="compartir('${data.titulo}')">Compartir <i class="bi bi-share"></i></small>
                </div>
            </div>
        </div>`;
    });
    contenedor.innerHTML = html;
});

// ==========================================
// MÓDULO 2: ENCUESTAS (Publicar y Leer)
// ==========================================

document.getElementById('btn-agregar-opcion').addEventListener('click', () => {
    const div = document.createElement('input');
    div.type = 'text';
    div.className = 'form-control mb-2 opcion-input';
    div.placeholder = 'Nueva Opción';
    document.getElementById('opciones-encuesta').appendChild(div);
});

document.getElementById('btn-publicar-encuesta').addEventListener('click', async () => {
    const pregunta = document.getElementById('encuesta-pregunta').value;
    const inputs = document.querySelectorAll('.opcion-input');
    
    if (!pregunta) return alert("Escribe una pregunta");

    let opciones = [];
    inputs.forEach(input => {
        if(input.value.trim() !== '') {
            opciones.push({ texto: input.value, votos: 0 });
        }
    });

    if (opciones.length < 2) return alert("Añade al menos 2 opciones");

    await addDoc(collection(db, "encuestas"), {
        pregunta: pregunta,
        opciones: opciones,
        totalVotos: 0,
        fecha: serverTimestamp()
    });

    document.getElementById('encuesta-pregunta').value = '';
    inputs.forEach(i => i.value = '');
    alert("Encuesta publicada");
});

// Escuchar encuestas
onSnapshot(query(collection(db, "encuestas"), orderBy("fecha", "desc")), (snapshot) => {
    const contenedor = document.getElementById('contenedor-encuestas');
    if (snapshot.empty) {
        contenedor.innerHTML = '<p class="text-center text-muted">Aún no hay encuestas.</p>';
        return;
    }

    let html = '';
    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        html += `
        <div class="card mb-4 border-0 shadow-sm">
            <div class="card-body p-4">
                <h4 class="fw-bold mb-4">${data.pregunta}</h4>
                <div class="d-grid gap-2">`;
                
        data.opciones.forEach((opc, index) => {
            const porcentaje = data.totalVotos === 0 ? 0 : Math.round((opc.votos / data.totalVotos) * 100);
            html += `
                <button class="btn btn-outline-primary text-start position-relative overflow-hidden" onclick="votar('${docSnap.id}', ${index})">
                    <div class="position-absolute top-0 start-0 h-100 bg-primary opacity-25" style="width: ${porcentaje}%"></div>
                    <span class="position-relative z-1 d-flex justify-content-between">
                        <span>${opc.texto}</span>
                        <span class="fw-bold">${porcentaje}% (${opc.votos})</span>
                    </span>
                </button>`;
        });

        html += `</div>
                <div class="mt-3 text-muted small text-end">${data.totalVotos} votos totales</div>
            </div>
        </div>`;
    });
    contenedor.innerHTML = html;
});

// Lógica para votar (Expuesta a global para que el HTML la detecte)
window.votar = async (encuestaId, opcionIndex) => {
    // Si queremos restringir a 1 voto, necesitaríamos guardar quién votó, 
    // pero para este ejemplo incrementamos libremente.
    const ref = doc(db, "encuestas", encuestaId);
    const snap = await getDoc(ref);
    if(snap.exists()){
        let data = snap.data();
        data.opciones[opcionIndex].votos += 1;
        data.totalVotos += 1;
        await updateDoc(ref, {
            opciones: data.opciones,
            totalVotos: data.totalVotos
        });
    }
};

// Función para Web Share API
window.compartir = (titulo) => {
    if (navigator.share) {
        navigator.share({
            title: titulo,
            text: `Mira esta publicación en la plataforma de Economía: ${titulo}`,
            url: window.location.href
        }).catch(err => console.log('Error al compartir', err));
    } else {
        alert("Tu navegador no soporta la función de compartir nativa.");
    }
};
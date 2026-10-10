import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const app = initializeApp({
    apiKey: "AIzaSyDvtzU8SGycfh99Cc_lLT7xabQ_uPBOpqE",
    authDomain: "economia-41d20.firebaseapp.com",
    projectId: "economia-41d20" // Versión súper comprimida de tu config
});
const auth = getAuth(app);
const db = getFirestore(app);
const quill = new Quill('#editor-global', { theme: 'snow', modules: { toolbar: [['bold', 'italic'], [{'color':[]}], ['link', 'image', 'video'], ['clean']] }});

// SECCIONES ACADÉMICAS (Basadas en FEUNP)
const secciones = [
    { id: 'investigacion', nombre: 'Investigación & Papers', icono: '📄' },
    { id: 'ensayos', nombre: 'Ensayos & Debates', icono: '✍️' },
    { id: 'columnas', nombre: 'Columnas de Opinión', icono: '💭' },
    { id: 'voz', nombre: 'Voz FEUNP', icono: '🎙️' }
];

// GENERAR TABS HTML DINÁMICAMENTE (Comprime código HTML)
const tabsCont = document.getElementById('tabs-secciones');
const contentCont = document.getElementById('contenido-secciones');
secciones.forEach((sec, i) => {
    tabsCont.innerHTML += `<li class="nav-item"><button class="nav-link ${i===0?'active':''}" data-bs-toggle="pill" data-bs-target="#${sec.id}">${sec.icono} ${sec.nombre}</button></li>`;
    contentCont.innerHTML += `<div class="tab-pane fade ${i===0?'show active':''}" id="${sec.id}"><div class="row g-4" id="grid-${sec.id}">Cargando...</div></div>`;
});

// AUTENTICACIÓN
document.getElementById('btn-login').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
document.getElementById('btn-logout').onclick = () => signOut(auth);

onAuthStateChanged(auth, async (user) => {
    document.getElementById('btn-login').classList.toggle('d-none', !!user);
    document.getElementById('btn-logout').classList.toggle('d-none', !user);
    document.body.classList.remove('is-owner');
    if (user) {
        const docSnap = await getDoc(doc(db, "usuarios", user.uid));
        if (docSnap.exists() && docSnap.data().owner) document.body.classList.add('is-owner');
    }
});

// FUNCIÓN: PUBLICAR UNIFICADA
document.getElementById('btn-publicar').onclick = async () => {
    const titulo = document.getElementById('p-titulo').value;
    if (!titulo) return alert("Ponle un título");

    // Procesar etiquetas (separa por comas y quita espacios extra)
    const tagsRaw = document.getElementById('p-tags').value;
    const etiquetas = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(t => t) : [];

    await addDoc(collection(db, "publicaciones_feunp"), {
        titulo: titulo,
        seccion: document.getElementById('p-seccion').value,
        etiquetas: etiquetas,
        colorTag: document.getElementById('p-color').value,
        principal: document.getElementById('p-principal').checked,
        driveLink: document.getElementById('p-drive').value,
        contenido: quill.root.innerHTML,
        fecha: serverTimestamp()
    });

    alert("¡Publicado con éxito!");
    // Limpiar formulario y cerrar panel
    document.getElementById('p-titulo').value = '';
    document.getElementById('p-tags').value = '';
    document.getElementById('p-drive').value = '';
    document.getElementById('p-principal').checked = false;
    quill.setContents([]);
    bootstrap.Collapse.getInstance(document.getElementById('panelAdmin')).hide();
};

// FUNCIÓN: LEER Y DIBUJAR TODO EN TIEMPO REAL
onSnapshot(query(collection(db, "publicaciones_feunp"), orderBy("fecha", "desc")), (snapshot) => {
    // Preparar contenedores vacíos
    let htmls = { investigacion: '', ensayos: '', columnas: '', voz: '' };
    
    snapshot.forEach(docSnap => {
        const d = docSnap.data();
        if(!htmls[d.seccion]) return; // Por si hay basura en la DB
        
        // Dibujar etiquetas dinámicas con su color
        const tagsHTML = d.etiquetas.map(t => `<span class="tag-badge" style="background-color: ${d.colorTag};">${t}</span>`).join('');
        const btnDrive = d.driveLink ? `<a href="${d.driveLink}" target="_blank" class="btn btn-sm btn-outline-danger mt-3 rounded-pill fw-bold w-100"><i class="bi bi-file-pdf-fill"></i> Leer Documento</a>` : '';
        const fechaTxt = d.fecha ? d.fecha.toDate().toLocaleDateString() : 'Nuevo';

        // Lógica de diseño: ¿Es Principal o Normal?
        if (d.principal) {
            htmls[d.seccion] += `
            <div class="col-12 mb-2">
                <div class="post-principal">
                    <div class="mb-2">${tagsHTML}</div>
                    <h2 class="fw-bold mb-3" style="font-family: Georgia, serif; font-size: 2.5rem;">${d.titulo}</h2>
                    <div class="text-muted mb-3">${d.contenido}</div>
                    ${btnDrive}
                    <div class="text-end text-muted small mt-3 fw-bold">${fechaTxt}</div>
                </div>
            </div>`;
        } else {
            htmls[d.seccion] += `
            <div class="col-md-6 col-lg-4 mb-2">
                <div class="post-normal">
                    <div class="mb-2">${tagsHTML}</div>
                    <h4 class="fw-bold text-dark">${d.titulo}</h4>
                    <div class="text-muted small flex-grow-1" style="max-height: 100px; overflow: hidden;">${d.contenido}</div>
                    ${btnDrive}
                    <div class="text-end text-muted small mt-3 border-top pt-2">${fechaTxt}</div>
                </div>
            </div>`;
        }
    });

    // Inyectar HTML en las 4 secciones
    secciones.forEach(sec => {
        document.getElementById(`grid-${sec.id}`).innerHTML = htmls[sec.id] || `<div class="col-12 text-center text-muted py-5">Aún no hay publicaciones en ${sec.nombre}</div>`;
    });
});
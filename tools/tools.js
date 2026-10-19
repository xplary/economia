import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, collection, addDoc, onSnapshot, updateDoc, deleteDoc, serverTimestamp, orderBy, query } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

// Tu misma configuración de Firebase
const app = initializeApp({ 
    apiKey: "AIzaSyDvtzU8SGycfh99Cc_lLT7xabQ_uPBOpqE", 
    authDomain: "economia-41d20.firebaseapp.com", 
    databaseURL: "https://economia-41d20-default-rtdb.firebaseio.com", 
    projectId: "economia-41d20", 
    storageBucket: "economia-41d20.firebasestorage.app", 
    messagingSenderId: "750639619847", 
    appId: "1:750639619847:web:9a036501539ca6e3ceafa2", 
    measurementId: "G-BWV82ZTSW1" 
});

const auth = getAuth(app); 
const db = getFirestore(app);

// Variables de estado
let toolsData = [];
let editingToolId = null;

// Escapar texto para seguridad
const escapeHTML = (str) => (str ? str.toString() : '').replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t] || t));

// Año del footer
document.getElementById('current-year').innerText = new Date().getFullYear();

// ==========================================
// MANEJO DE SESIÓN Y ROL (OWNER)
// ==========================================
document.getElementById('btn-login').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());

onAuthStateChanged(auth, (u) => {
    const btnLogin = document.getElementById('btn-login');
    let ddCont = document.getElementById('user-dropdown-container');

    if(u) { 
        btnLogin.classList.add('d-none');
        ddCont.classList.remove('d-none');
        
        // Cargar dropdown del usuario
        ddCont.innerHTML = `
            <div class="position-relative cursor-pointer" data-bs-toggle="dropdown" aria-expanded="false" title="Mi Cuenta">
                <img src="${u.photoURL || 'https://via.placeholder.com/42'}" id="user-avatar-img" class="rounded-circle shadow-sm" style="width: 40px; height: 40px; object-fit: cover; border: 2px solid rgba(255,255,255,0.4);">
            </div>
            <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-3 rounded-4 py-2" style="min-width: 250px; z-index: 1070; right: 0;">
                <li class="px-4 py-3 border-bottom mb-2 text-center">
                    <img src="${u.photoURL || 'https://via.placeholder.com/60'}" class="rounded-circle mb-3 shadow-sm border" style="width: 55px; height: 55px; object-fit: cover;">
                    <span class="fw-bold font-inter text-dark d-block text-truncate mb-2" style="max-width: 210px; margin: 0 auto; font-size: 1.05rem;">${escapeHTML(u.displayName || 'Usuario')}</span>
                    <span class="badge font-inter px-3 py-1 rounded-pill shadow-sm text-white" id="user-plan-badge" style="background-color: #6c757d;">Usuario</span>
                </li>
                <li><a class="dropdown-item fw-bold text-danger py-2 cursor-pointer font-inter text-center hover-bg-light rounded-bottom-4" id="btn-logout-dropdown"><i class="bi bi-box-arrow-right me-2"></i> Cerrar Sesión</a></li>
            </ul>
        `;
        document.getElementById('btn-logout-dropdown').onclick = () => signOut(auth);

        // Comprobar rol de owner
        onSnapshot(doc(db, "usuarios", u.uid), (d) => {
            const badge = document.getElementById('user-plan-badge');
            if(d.exists() && d.data().owner) {
                document.body.classList.add('is-owner');
                if(badge) { badge.innerText = 'Administrador'; badge.style.backgroundColor = '#004b79'; }
            } else {
                document.body.classList.remove('is-owner');
                if(badge) { badge.innerText = 'Usuario'; badge.style.backgroundColor = '#6c757d'; }
            }
        });
    } else {
        btnLogin.classList.remove('d-none');
        ddCont.classList.add('d-none');
        document.body.classList.remove('is-owner');
    }
});

// ==========================================
// CRUD Y RENDERIZADO DE TOOLS (HERRAMIENTAS)
// ==========================================

// Escuchar cambios en la base de datos
onSnapshot(query(collection(db, "tools"), orderBy("fecha", "desc")), (snap) => {
    toolsData = [];
    snap.forEach(d => {
        toolsData.push({ id: d.id, ...d.data() });
    });
    renderTools();
});

function renderTools() {
    const container = document.getElementById('tools-container');
    
    if(toolsData.length === 0) {
        container.innerHTML = `<div class="col-12 text-center text-muted font-inter py-5"><i class="bi bi-tools display-1 opacity-25"></i><h4 class="mt-3 text-dark">No hay herramientas disponibles</h4></div>`;
        return;
    }

    let html = '';
    toolsData.forEach(tool => {
        const defaultImg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="%23d1d5db" viewBox="0 0 16 16"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"/></svg>';
        const imagenUrl = tool.imagen ? tool.imagen : defaultImg;
        
        html += `
        <div class="col-sm-6 col-md-4 col-lg-3">
            <div class="tool-card">
                <div class="tool-card-title font-inter">${escapeHTML(tool.titulo)}</div>
                <div class="tool-card-desc font-inter">${escapeHTML(tool.descripcion)}</div>
                <div class="tool-card-img-wrapper">
                    <img src="${imagenUrl}" alt="Herramienta Icono" class="tool-card-img">
                </div>
                <div class="tool-card-footer">
                    <!-- Icono izquierdo (Abrir Link) -->
                    <a href="${escapeHTML(tool.url)}" target="_blank" class="tool-icon-btn" title="Abrir Herramienta">
                        <i class="bi bi-box-arrow-up-right"></i>
                    </a>
                    <!-- Iconos derechos (Solo Admin) -->
                    <div class="admin-only-inline">
                        <button onclick="editarTool('${tool.id}')" class="tool-icon-btn text-warning" style="color:#d97706!important;" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button onclick="borrarTool('${tool.id}')" class="tool-icon-btn text-danger" style="color:#dc2626!important;" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
}

// Convertidor de Imagen a Base64 rápido y seguro
const compressImg = (file) => new Promise((res) => { 
    const reader = new FileReader(); 
    reader.readAsDataURL(file); 
    reader.onload = (e) => { 
        const img = new Image(); 
        img.src = e.target.result; 
        img.onload = () => { 
            const canvas = document.createElement('canvas'); 
            const MAX = 600; // Resolución pequeña para íconos
            const scale = img.width > MAX ? MAX / img.width : 1; 
            canvas.width = img.width * scale; 
            canvas.height = img.height * scale; 
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); 
            res(canvas.toDataURL('image/png', 0.9)); 
        }; 
    }; 
});

// Mostrar previsualización al seleccionar archivo en modal
document.getElementById('tool-imagen').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('tool-img-preview').src = event.target.result;
            document.getElementById('tool-img-preview-container').classList.remove('d-none');
        };
        reader.readAsDataURL(file);
    }
});

// Botón de reset al abrir el modal "Nuevo"
document.getElementById('btn-nueva-herramienta').addEventListener('click', () => {
    editingToolId = null;
    document.getElementById('form-tool').reset();
    document.getElementById('tool-form-title').innerText = "Añadir Nueva Herramienta";
    document.getElementById('tool-img-preview-container').classList.add('d-none');
});

// Enviar formulario (Agregar / Editar)
document.getElementById('form-tool').addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = document.getElementById('tool-titulo').value;
    const descripcion = document.getElementById('tool-desc').value;
    const url = document.getElementById('tool-url').value;
    const btnSubmit = document.getElementById('btn-guardar-tool');
    
    let imgFinal = '';
    const imgFile = document.getElementById('tool-imagen').files[0];
    
    // Si hay archivo nuevo, comprimirlo
    if (imgFile) {
        imgFinal = await compressImg(imgFile);
    } else if (editingToolId) {
        // Recuperar imagen antigua si estamos editando y no subió una nueva
        const existingTool = toolsData.find(t => t.id === editingToolId);
        if(existingTool) imgFinal = existingTool.imagen || '';
    }

    const toolData = { titulo, descripcion, url, imagen: imgFinal };

    btnSubmit.disabled = true;
    btnSubmit.innerText = "Guardando...";

    try {
        if (editingToolId) {
            await updateDoc(doc(db, "tools", editingToolId), toolData);
        } else {
            toolData.fecha = serverTimestamp();
            await addDoc(collection(db, "tools"), toolData);
        }
        bootstrap.Modal.getInstance(document.getElementById('modalTool')).hide();
    } catch(err) {
        alert("Error al guardar: " + err.message);
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerText = "Guardar";
    }
});

// Función Global en Windows para editar desde el HTML
window.editarTool = (id) => {
    const tool = toolsData.find(t => t.id === id);
    if(!tool) return;
    
    editingToolId = id;
    document.getElementById('tool-form-title').innerText = "Editar Herramienta";
    document.getElementById('tool-titulo').value = tool.titulo;
    document.getElementById('tool-desc').value = tool.descripcion;
    document.getElementById('tool-url').value = tool.url;
    
    // Preview de imagen existente
    if (tool.imagen) {
        document.getElementById('tool-img-preview').src = tool.imagen;
        document.getElementById('tool-img-preview-container').classList.remove('d-none');
    } else {
        document.getElementById('tool-img-preview-container').classList.add('d-none');
    }
    
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalTool')).show();
};

// Función Global en Windows para borrar desde el HTML
window.borrarTool = async (id) => {
    if(confirm("¿Estás seguro de que deseas eliminar esta herramienta permanentemente?")) {
        try {
            await deleteDoc(doc(db, "tools", id));
        } catch(e) {
            alert("Error al eliminar: " + e.message);
        }
    }
};

// ==========================================
// FOOTER EN VIVO (Misma lógica de la pág original)
// ==========================================
onSnapshot(doc(db, "config", "footer"), (s) => { 
    if(s.exists()){ 
        const d = s.data(); 
        if(d.ubicacion) document.getElementById('f-ubicacion').innerHTML = escapeHTML(d.ubicacion).replace(/\n/g, "<br>"); 
        if(d.contacto) document.getElementById('f-contacto').innerHTML = escapeHTML(d.contacto).replace(/\n/g, "<br>"); 
        if(d.sobre) document.getElementById('f-sobre').innerHTML = escapeHTML(d.sobre).replace(/\n/g, "<br>"); 

        const updateLink = (idStr, valObj) => {
            if(valObj) {
                const elText = document.getElementById(idStr+'-text');
                const elUrl = document.getElementById(idStr+'-url');
                if(elText && valObj.text) elText.innerText = valObj.text;
                if(elUrl && valObj.url) elUrl.href = valObj.url;
            }
        };
        
        updateLink('f-link1', d.link1); updateLink('f-link2', d.link2);
        updateLink('f-link3', d.link3); updateLink('f-link4', d.link4);
        updateLink('f-link5', d.link5); updateLink('f-link6', d.link6);
        updateLink('f-btn1', d.btn1);   updateLink('f-btn2', d.btn2);
        
        const fLink1Txt = (d.link1 && d.link1.text) ? d.link1.text.toLowerCase() : '';
        if(fLink1Txt.includes('cómo llegar') || fLink1Txt.includes('como llegar')) {
            document.getElementById('f-link1-icon').style.display = 'inline-block';
        } else {
            document.getElementById('f-link1-icon').style.display = 'none';
        }
    } 
});

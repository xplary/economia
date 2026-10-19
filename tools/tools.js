import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, collection, addDoc, onSnapshot, updateDoc, deleteDoc, serverTimestamp, orderBy, query } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

// Tu configuración de Firebase
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

let toolsData = [];
let editingToolId = null;

const escapeHTML = (str) => (str ? str.toString() : '').replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t] || t));

document.getElementById('current-year').innerText = new Date().getFullYear();

// ==========================================
// SESIÓN Y ROL (OWNER)
// ==========================================
document.getElementById('btn-login').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());

onAuthStateChanged(auth, (u) => {
    const btnLogin = document.getElementById('btn-login');
    let ddCont = document.getElementById('user-dropdown-container');

    if(u) { 
        btnLogin.classList.add('d-none');
        ddCont.classList.remove('d-none');
        
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

        onSnapshot(doc(db, "usuarios", u.uid), (d) => {
            const badge = document.getElementById('user-plan-badge');
            if(d.exists() && d.data().owner) {
                document.body.classList.add('is-owner');
                if(badge) { badge.innerText = 'Administrador'; badge.style.backgroundColor = '#004b79'; }
                renderTools(); // Re-renderiza para mostrar botones de admin
            } else {
                document.body.classList.remove('is-owner');
                if(badge) { badge.innerText = 'Usuario'; badge.style.backgroundColor = '#6c757d'; }
                renderTools();
            }
        });
    } else {
        btnLogin.classList.remove('d-none');
        ddCont.classList.add('d-none');
        document.body.classList.remove('is-owner');
        renderTools();
    }
});

// ==========================================
// RENDERIZADO Y CRUD
// ==========================================
onSnapshot(query(collection(db, "tools"), orderBy("fecha", "asc")), (snap) => {
    toolsData = [];
    snap.forEach(d => {
        toolsData.push({ id: d.id, ...d.data() });
    });
    renderTools();
});

function renderTools() {
    const container = document.getElementById('tools-container');
    const isOwner = document.body.classList.contains('is-owner');
    
    if(toolsData.length === 0) {
        if(isOwner) {
            // Botón para inicializar las 8 herramientas
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-tools display-1 text-primary opacity-50 mb-3"></i>
                    <h4 class="text-dark fw-bold font-inter">Base de datos vacía</h4>
                    <p class="text-muted mb-4">Como administrador, puedes generar las 8 herramientas por defecto.</p>
                    <button class="btn btn-success px-4 py-2 rounded-pill fw-bold" onclick="sembrarHerramientasPorDefecto()" style="background-color: #009668; border-color:#009668;">
                        <i class="bi bi-magic me-2"></i>Generar 8 Herramientas Base
                    </button>
                </div>`;
        } else {
            container.innerHTML = `<div class="col-12 text-center text-muted font-inter py-5"><i class="bi bi-tools display-1 opacity-25"></i><h4 class="mt-3 text-dark">No hay herramientas disponibles</h4></div>`;
        }
        return;
    }

    let html = '';
    // SVG por defecto con un diseño tipo "interfaz wireframe" con amarillo (inspirado en tu imagen)
    const defaultImg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 70"><rect x="10" y="10" width="80" height="50" rx="3" fill="none" stroke="%23cbd5e1" stroke-width="2"/><line x1="10" y1="20" x2="90" y2="20" stroke="%23cbd5e1" stroke-width="2"/><circle cx="70" cy="50" r="10" fill="none" stroke="%23facc15" stroke-width="3"/><line x1="77" y1="57" x2="85" y2="65" stroke="%23facc15" stroke-width="3" stroke-linecap="round"/></svg>';
    
    toolsData.forEach(tool => {
        const imagenUrl = (tool.imagen && tool.imagen.length > 20) ? tool.imagen : defaultImg;
        
        html += `
        <div class="col-sm-6 col-md-4 col-lg-3">
            <div class="tool-card">
                <div class="tool-card-title font-inter">${escapeHTML(tool.titulo)}</div>
                <div class="tool-card-desc font-inter">${escapeHTML(tool.descripcion)}</div>
                <div class="tool-card-img-wrapper">
                    <img src="${imagenUrl}" alt="${escapeHTML(tool.titulo)}" class="tool-card-img">
                </div>
                <div class="tool-card-footer">
                    <a href="${escapeHTML(tool.url)}" target="_blank" class="tool-icon-btn" title="Abrir Herramienta">
                        <i class="bi bi-box-arrow-up-right"></i>
                    </a>
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

// ==========================================
// FUNCIÓN PARA AUTO-GENERAR LAS 8 HERRAMIENTAS
// ==========================================
window.sembrarHerramientasPorDefecto = async () => {
    if(!confirm("¿Deseas crear las 8 herramientas por defecto?")) return;
    
    const herramientasBase = [
        { titulo: "Keywords", descripcion: "Details and analysis of the most important terms.", url: "#" },
        { titulo: "Monitoring", descripcion: "Daily Keyword-Monitoring of your own key terms.", url: "#" },
        { titulo: "On-Page", descripcion: "Analyze and optimize all the most important On-Page factors.", url: "#" },
        { titulo: "Backlinks", descripcion: "Analyze and track all the backlinks of a domain.", url: "#" },
        { titulo: "Disavow", descripcion: "Detects Google's penalties so you can prevent or remove them.", url: "#" },
        { titulo: "Search Analytics", descripcion: "Identifies traffic sources and visitor flow.", url: "#" },
        { titulo: "SEA", descripcion: "Analyze and optimize your Google Ads ads.", url: "#" },
        { titulo: "Reporting", descripcion: "White label and personalized reports for you and your clients.", url: "#" }
    ];

    try {
        for (let i = 0; i < herramientasBase.length; i++) {
            const tool = herramientasBase[i];
            tool.fecha = serverTimestamp();
            tool.imagen = ''; // Usará el SVG por defecto generado arriba
            await addDoc(collection(db, "tools"), tool);
        }
        alert("¡Las 8 herramientas fueron creadas exitosamente!");
    } catch(err) {
        alert("Error al crear herramientas: " + err.message);
    }
};

// Compresor de imagen
const compressImg = (file) => new Promise((res) => { 
    const reader = new FileReader(); 
    reader.readAsDataURL(file); 
    reader.onload = (e) => { 
        const img = new Image(); 
        img.src = e.target.result; 
        img.onload = () => { 
            const canvas = document.createElement('canvas'); 
            const MAX = 600; 
            const scale = img.width > MAX ? MAX / img.width : 1; 
            canvas.width = img.width * scale; 
            canvas.height = img.height * scale; 
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); 
            res(canvas.toDataURL('image/png', 0.9)); 
        }; 
    }; 
});

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

document.getElementById('btn-nueva-herramienta').addEventListener('click', () => {
    editingToolId = null;
    document.getElementById('form-tool').reset();
    document.getElementById('tool-form-title').innerText = "Añadir Nueva Herramienta";
    document.getElementById('tool-img-preview-container').classList.add('d-none');
    document.getElementById('tool-img-preview').src = "";
});

document.getElementById('form-tool').addEventListener('submit', async (e) => {
    e.preventDefault();
    const titulo = document.getElementById('tool-titulo').value;
    const descripcion = document.getElementById('tool-desc').value;
    const url = document.getElementById('tool-url').value;
    const btnSubmit = document.getElementById('btn-guardar-tool');
    
    let imgFinal = '';
    const imgFile = document.getElementById('tool-imagen').files[0];
    
    if (imgFile) {
        imgFinal = await compressImg(imgFile);
    } else if (editingToolId) {
        const existingTool = toolsData.find(t => t.id === editingToolId);
        if(existingTool) imgFinal = existingTool.imagen || '';
    }

    const toolData = { titulo, descripcion, url, imagen: imgFinal };

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

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

window.editarTool = (id) => {
    const tool = toolsData.find(t => t.id === id);
    if(!tool) return;
    
    editingToolId = id;
    document.getElementById('tool-form-title').innerText = "Editar Herramienta";
    document.getElementById('tool-titulo').value = tool.titulo;
    document.getElementById('tool-desc').value = tool.descripcion;
    document.getElementById('tool-url').value = tool.url;
    
    if (tool.imagen && tool.imagen.length > 20) {
        document.getElementById('tool-img-preview').src = tool.imagen;
        document.getElementById('tool-img-preview-container').classList.remove('d-none');
    } else {
        document.getElementById('tool-img-preview-container').classList.add('d-none');
        document.getElementById('tool-img-preview').src = "";
    }
    
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalTool')).show();
};

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
// FOOTER EN VIVO
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

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, collection, addDoc, onSnapshot, updateDoc, deleteDoc, serverTimestamp, orderBy, query } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

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
                renderTools();
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
            container.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi bi-tools display-1 text-primary opacity-50 mb-3"></i>
                    <h4 class="text-dark fw-bold font-inter">Base de datos vacía</h4>
                    <button class="btn btn-success px-4 py-2 rounded-pill fw-bold mt-3" onclick="sembrarHerramientasPorDefecto()" style="background-color: #009668; border-color:#009668;">
                        <i class="bi bi-magic me-2"></i>Generar Diseño Base Exacto
                    </button>
                </div>`;
        } else {
            container.innerHTML = `<div class="col-12 text-center text-muted font-inter py-5"><i class="bi bi-tools display-1 opacity-25"></i><h4 class="mt-3 text-dark">No hay herramientas disponibles</h4></div>`;
        }
        return;
    }

    let html = '';
    
    toolsData.forEach(tool => {
        const imagenUrl = tool.imagen || '';
        
        // Si es Admin muestra Lápiz y Basura, si no, muestra las imágenes decorativas exactas de tu captura.
        const centerIcon = isOwner ? 
            `<button onclick="editarTool('${tool.id}')" class="tool-icon-btn" title="Editar"><i class="bi bi-pencil-square"></i></button>` : 
            `<button class="tool-icon-btn" style="opacity:0.8; cursor:default;" disabled><i class="bi bi-image"></i></button>`;
            
        const rightIcon = isOwner ? 
            `<button onclick="borrarTool('${tool.id}')" class="tool-icon-btn" title="Eliminar"><i class="bi bi-trash"></i></button>` : 
            `<button class="tool-icon-btn" style="opacity:0.8; cursor:default;" disabled><i class="bi bi-film"></i></button>`;
        
        html += `
        <div class="col-sm-6 col-md-4 col-lg-3">
            <div class="tool-card">
                <div class="tool-card-title">${escapeHTML(tool.titulo)}</div>
                <div class="tool-card-desc">${escapeHTML(tool.descripcion)}</div>
                <div class="tool-card-img-wrapper">
                    <img src="${imagenUrl}" alt="${escapeHTML(tool.titulo)}" class="tool-card-img">
                </div>
                <div class="tool-card-footer">
                    <a href="${escapeHTML(tool.url)}" target="_blank" class="tool-icon-btn" title="Abrir Herramienta">
                        <i class="bi bi-box-arrow-up-right"></i>
                    </a>
                    ${centerIcon}
                    ${rightIcon}
                </div>
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
}

// ==========================================
// FUNCIÓN PARA AUTO-GENERAR LAS 8 HERRAMIENTAS (DISEÑO EXACTO)
// ==========================================
window.sembrarHerramientasPorDefecto = async () => {
    if(!confirm("¿Deseas crear las 8 herramientas con el diseño exacto de la imagen?")) return;
    
    const encodeSVG = (svgString) => "data:image/svg+xml;utf8," + encodeURIComponent(svgString);

    const svgKeywords = `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg"><rect x="25" y="30" width="110" height="70" rx="3" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><line x1="25" y1="40" x2="135" y2="40" stroke="#cbd5e1" stroke-width="2"/><circle cx="32" cy="35" r="1.5" fill="#cbd5e1"/><circle cx="37" cy="35" r="1.5" fill="#cbd5e1"/><circle cx="42" cy="35" r="1.5" fill="#cbd5e1"/><rect x="35" y="50" width="60" height="6" fill="#bfdbfe"/><line x1="35" y1="62" x2="90" y2="62" stroke="#e2e8f0" stroke-width="3"/><line x1="35" y1="70" x2="80" y2="70" stroke="#e2e8f0" stroke-width="3"/><line x1="35" y1="78" x2="70" y2="78" stroke="#e2e8f0" stroke-width="3"/><circle cx="120" cy="85" r="12" fill="#fff" stroke="#facc15" stroke-width="4"/><line x1="128" y1="93" x2="140" y2="105" stroke="#facc15" stroke-width="4" stroke-linecap="round"/></svg>`;
    const svgMonitoring = `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg"><rect x="25" y="30" width="110" height="70" rx="3" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><line x1="25" y1="40" x2="135" y2="40" stroke="#cbd5e1" stroke-width="2"/><path d="M 26 100 L 26 70 Q 50 65 70 75 T 134 60 L 134 100 Z" fill="#bfdbfe" opacity="0.6"/><path d="M 26 70 Q 50 65 70 75 T 134 60" fill="none" stroke="#60a5fa" stroke-width="2"/><path d="M 105 85 Q 120 73 135 85 Q 120 97 105 85 Z" fill="#fff" stroke="#facc15" stroke-width="3"/><circle cx="120" cy="85" r="4" fill="#facc15"/></svg>`;
    const svgOnPage = `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg"><rect x="25" y="30" width="110" height="70" rx="3" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><line x1="25" y1="40" x2="135" y2="40" stroke="#cbd5e1" stroke-width="2"/><rect x="35" y="50" width="35" height="25" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/><line x1="35" y1="50" x2="70" y2="75" stroke="#cbd5e1" stroke-width="1"/><line x1="70" y1="50" x2="35" y2="75" stroke="#cbd5e1" stroke-width="1"/><line x1="75" y1="55" x2="125" y2="55" stroke="#e2e8f0" stroke-width="2"/><line x1="75" y1="65" x2="115" y2="65" stroke="#e2e8f0" stroke-width="2"/><path d="M 105 75 Q 115 65 125 75 L 140 100 L 135 105 L 115 85 Z" fill="#facc15"/><circle cx="115" cy="75" r="5" fill="#fff" stroke="#facc15" stroke-width="2"/></svg>`;
    const svgBacklinks = `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg"><rect x="25" y="30" width="110" height="70" rx="3" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><line x1="25" y1="40" x2="135" y2="40" stroke="#cbd5e1" stroke-width="2"/><rect x="35" y="50" width="25" height="15" fill="#facc15" opacity="0.2"/><line x1="65" y1="55" x2="120" y2="55" stroke="#cbd5e1" stroke-width="2"/><line x1="65" y1="62" x2="100" y2="62" stroke="#cbd5e1" stroke-width="2"/><rect x="35" y="75" width="25" height="15" fill="#facc15" opacity="0.2"/><line x1="65" y1="80" x2="110" y2="80" stroke="#cbd5e1" stroke-width="2"/><line x1="65" y1="87" x2="90" y2="87" stroke="#cbd5e1" stroke-width="2"/><rect x="115" y="70" width="15" height="25" rx="7" fill="none" stroke="#facc15" stroke-width="3"/><rect x="125" y="80" width="15" height="25" rx="7" fill="none" stroke="#facc15" stroke-width="3"/></svg>`;
    const svgDisavow = `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg"><rect x="25" y="30" width="110" height="70" rx="3" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><line x1="25" y1="40" x2="135" y2="40" stroke="#cbd5e1" stroke-width="2"/><path d="M 30 50 L 35 55 L 42 48 M 30 65 L 35 70 L 42 63 M 30 80 L 35 85 L 42 78" fill="none" stroke="#4ade80" stroke-width="2"/><line x1="48" y1="52" x2="80" y2="52" stroke="#cbd5e1" stroke-width="2"/><line x1="48" y1="67" x2="80" y2="67" stroke="#cbd5e1" stroke-width="2"/><line x1="48" y1="82" x2="80" y2="82" stroke="#cbd5e1" stroke-width="2"/><rect x="85" y="45" width="40" height="45" rx="2" fill="#475569"/><rect x="90" y="50" width="30" height="10" fill="#94a3b8"/><path d="M 125 70 Q 115 65 105 75 L 120 90" fill="none" stroke="#facc15" stroke-width="3"/><path d="M 140 85 Q 150 95 135 105 L 125 95" fill="none" stroke="#facc15" stroke-width="3"/><line x1="125" y1="75" x2="135" y2="95" stroke="#facc15" stroke-width="2"/></svg>`;
    const svgSearch = `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg"><rect x="25" y="30" width="110" height="70" rx="3" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><line x1="25" y1="40" x2="135" y2="40" stroke="#cbd5e1" stroke-width="2"/><rect x="35" y="45" width="90" height="4" fill="#f97316"/><line x1="35" y1="55" x2="60" y2="55" stroke="#94a3b8" stroke-width="2"/><line x1="35" y1="62" x2="70" y2="62" stroke="#cbd5e1" stroke-width="1.5"/><line x1="35" y1="68" x2="65" y2="68" stroke="#cbd5e1" stroke-width="1.5"/><circle cx="95" cy="65" r="12" fill="#fff" stroke="#cbd5e1" stroke-width="3"/><path d="M 95 65 L 95 53 A 12 12 0 0 1 107 65 Z" fill="#4ade80"/><rect x="110" y="80" width="8" height="30" fill="#facc15"/><rect x="122" y="65" width="8" height="45" fill="#facc15"/><rect x="134" y="90" width="8" height="20" fill="#facc15"/></svg>`;
    const svgSEA = `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg"><rect x="25" y="30" width="110" height="70" rx="3" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><line x1="25" y1="40" x2="135" y2="40" stroke="#cbd5e1" stroke-width="2"/><rect x="35" y="45" width="10" height="4" fill="#ef4444"/><rect x="47" y="45" width="10" height="4" fill="#facc15"/><rect x="59" y="45" width="10" height="4" fill="#3b82f6"/><rect x="71" y="45" width="10" height="4" fill="#22c55e"/><rect x="35" y="55" width="70" height="15" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/><line x1="40" y1="60" x2="80" y2="60" stroke="#3b82f6" stroke-width="2"/><line x1="40" y1="65" x2="95" y2="65" stroke="#94a3b8" stroke-width="1"/><line x1="35" y1="75" x2="70" y2="75" stroke="#cbd5e1" stroke-width="2"/><rect x="110" y="65" width="35" height="20" rx="2" fill="#fff" stroke="#facc15" stroke-width="2"/><text x="127.5" y="80" font-family="Arial" font-size="12" font-weight="bold" fill="#facc15" text-anchor="middle">SEA</text><line x1="115" y1="85" x2="115" y2="95" stroke="#facc15" stroke-width="2"/><line x1="140" y1="85" x2="140" y2="95" stroke="#facc15" stroke-width="2"/></svg>`;
    const svgReporting = `<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg"><path d="M 25 100 L 25 40 L 60 40 L 70 50 L 135 50 L 135 100 Z" fill="#cbd5e1"/><path d="M 25 100 L 35 55 L 145 55 L 135 100 Z" fill="#e2e8f0"/><rect x="110" y="65" width="25" height="35" fill="#facc15"/><line x1="115" y1="72" x2="130" y2="72" stroke="#fff" stroke-width="2"/><line x1="115" y1="78" x2="130" y2="78" stroke="#fff" stroke-width="2"/><line x1="115" y1="84" x2="130" y2="84" stroke="#fff" stroke-width="2"/><path d="M 145 75 L 150 70 L 135 90 L 130 95 L 130 90 Z" fill="#fff" stroke="#facc15" stroke-width="2"/></svg>`;

    const herramientasBase = [
        { titulo: "Keywords", descripcion: "Details and analysis of the most important terms.", url: "#", imagen: encodeSVG(svgKeywords) },
        { titulo: "Monitoring", descripcion: "Daily Keyword-Monitoring of your own key terms.", url: "#", imagen: encodeSVG(svgMonitoring) },
        { titulo: "On-Page", descripcion: "Analyze and optimize all the most important On-Page factors.", url: "#", imagen: encodeSVG(svgOnPage) },
        { titulo: "Backlinks", descripcion: "Analyze and track all the backlinks of a domain.", url: "#", imagen: encodeSVG(svgBacklinks) },
        { titulo: "Disavow", descripcion: "Detects Google's penalties so you can prevent or remove them.", url: "#", imagen: encodeSVG(svgDisavow) },
        { titulo: "Search Analytics", descripcion: "Identifies traffic sources and visitor flow.", url: "#", imagen: encodeSVG(svgSearch) },
        { titulo: "SEA", descripcion: "Analyze and optimize your Google Ads ads.", url: "#", imagen: encodeSVG(svgSEA) },
        { titulo: "Reporting", descripcion: "White label and personalized reports for you and your clients.", url: "#", imagen: encodeSVG(svgReporting) }
    ];

    try {
        for (let i = 0; i < herramientasBase.length; i++) {
            const tool = herramientasBase[i];
            tool.fecha = serverTimestamp();
            await addDoc(collection(db, "tools"), tool);
        }
        alert("¡Las 8 herramientas gráficas fueron creadas exitosamente!");
    } catch(err) {
        alert("Error al crear herramientas: " + err.message);
    }
};

// Compresor de imagen manual
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

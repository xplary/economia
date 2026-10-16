import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const app = initializeApp({ apiKey: "AIzaSyDvtzU8SGycfh99Cc_lLT7xabQ_uPBOpqE", authDomain: "economia-41d20.firebaseapp.com", databaseURL: "https://economia-41d20-default-rtdb.firebaseio.com", projectId: "economia-41d20", storageBucket: "economia-41d20.firebasestorage.app", messagingSenderId: "750639619847", appId: "1:750639619847:web:9a036501539ca6e3ceafa2", measurementId: "G-BWV82ZTSW1" });
const auth = getAuth(app); 
const db = getFirestore(app);

let allUsers = [];

// ==========================================
// 1. AUTENTICACIÓN Y SEGURIDAD
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDoc = await getDoc(doc(db, "usuarios", user.uid));
            if (userDoc.exists() && userDoc.data().owner === true) {
                document.getElementById('loading-screen').style.display = 'none';
                document.getElementById('dashboard-wrapper').style.display = 'block';
                document.getElementById('admin-avatar').src = user.photoURL || 'https://via.placeholder.com/32';
                document.getElementById('admin-name').innerText = user.displayName || 'Admin';
                
                cargarDatosDashboard();
                cargarUsuarios();
            } else {
                document.getElementById('loading-screen').style.display = 'none';
                document.getElementById('access-denied').style.display = 'flex';
            }
        } catch (error) {
            document.getElementById('loading-screen').style.display = 'none';
            document.getElementById('access-denied').style.display = 'flex';
        }
    } else {
        window.location.href = "../index.html"; 
    }
});

// ==========================================
// 2. NAVEGACIÓN ENTRE PESTAÑAS
// ==========================================
document.querySelectorAll('#sidebar-nav .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        if(link.getAttribute('href')) return; 
        document.querySelectorAll('#sidebar-nav .nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        document.getElementById('page-title').innerText = link.innerText.trim();
        const targetId = link.getAttribute('data-target');
        document.querySelectorAll('.admin-section').forEach(sec => sec.style.display = 'none');
        document.getElementById(targetId).style.display = 'block';
    });
});

// ==========================================
// 3. CARGAR GRÁFICOS (DASHBOARD REAL)
// ==========================================
async function cargarDatosDashboard() {
    try {
        const [noticiasSnap, articulosSnap, formsSnap, statsDoc] = await Promise.all([
            getDocs(collection(db, "noticias")),
            getDocs(collection(db, "articulos")),
            getDocs(collection(db, "formularios")),
            getDoc(doc(db, "config", "estadisticas"))
        ]);

        let todasPublicaciones = [];
        let statsCat = { 'Opinión': 0, 'Papers': 0, 'Encuestas': 0 };

        noticiasSnap.forEach(d => {
            const vistas = d.data().vistas || 0;
            todasPublicaciones.push({ id: d.id, titulo: d.data().titulo, tipo: 'Opinión', vistas: vistas });
            statsCat['Opinión'] += vistas;
        });

        articulosSnap.forEach(d => {
            const vistas = d.data().vistas || 0;
            todasPublicaciones.push({ id: d.id, titulo: d.data().titulo, tipo: 'Paper', vistas: vistas });
            statsCat['Papers'] += vistas;
        });

        formsSnap.forEach(d => {
            const vistas = d.data().vistas || 0;
            todasPublicaciones.push({ id: d.id, titulo: d.data().titulo, tipo: 'Encuesta', vistas: vistas });
            statsCat['Encuestas'] += vistas;
        });

        todasPublicaciones.sort((a, b) => b.vistas - a.vistas);

        const totalVistasPosts = todasPublicaciones.reduce((acc, curr) => acc + curr.vistas, 0);
        const totalPosts = todasPublicaciones.length;
        
        let globalViews = totalVistasPosts;
        if(statsDoc.exists() && statsDoc.data().visitasGlobales) {
            globalViews = statsDoc.data().visitasGlobales;
        }

        // Si prefieres mostrar las vistas globales en el dashboard o las vistas en post:
        // Vamos a cambiar los KPI en el HTML de index.html con estos datos.
        document.getElementById('kpi-vistas').innerText = globalViews.toLocaleString();
        document.getElementById('kpi-posts').innerText = totalPosts;
        
        // Ahora el kpi-avg mostrará total de Vistas exclusivamente en Posts
        const avgEl = document.getElementById('kpi-avg');
        if(avgEl) {
            avgEl.innerText = totalVistasPosts.toLocaleString(); 
            avgEl.previousElementSibling.innerText = "VISTAS EN POSTS"; 
        }

        const top5 = todasPublicaciones.slice(0, 5);
        new Chart(document.getElementById('barChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: top5.map(t => t.titulo.length > 20 ? t.titulo.substring(0, 20)+'...' : t.titulo),
                datasets: [{ label: 'Vistas', data: top5.map(t => t.vistas), backgroundColor: '#004b79', borderRadius: 6 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });

        new Chart(document.getElementById('doughnutChart').getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(statsCat),
                datasets: [{ data: Object.values(statsCat), backgroundColor: ['#009668', '#4285f4', '#fbbc05'], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
        });
    } catch(e) { 
        console.error("Error Dashboard:", e); 
    }
}

// ==========================================
// 4. SISTEMA DE GESTIÓN DE USUARIOS
// ==========================================
async function cargarUsuarios() {
    try {
        const snap = await getDocs(collection(db, "usuarios"));
        allUsers = [];
        snap.forEach(d => {
            allUsers.push({ id: d.id, ...d.data() });
        });
        renderUsuarios(allUsers);
    } catch(e) {}
}

function renderUsuarios(usersList) {
    const tbody = document.getElementById('usuarios-table-body');
    tbody.innerHTML = '';

    if(usersList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No se encontraron usuarios.</td></tr>';
        return;
    }

    usersList.forEach(u => {
        const isAdmin = u.owner === true;
        const nombre = u.nombre || 'Sin nombre';
        const email = u.email || 'Sin correo';
        const rep = u.reputacion || 0;
        
        const badge = isAdmin 
            ? '<span class="badge bg-primary px-3 rounded-pill shadow-sm">Admin</span>' 
            : '<span class="badge bg-secondary px-3 rounded-pill shadow-sm">Usuario</span>';
            
        const btnAccion = isAdmin
            ? `<button class="btn btn-sm btn-outline-danger rounded-pill px-3 fw-semibold shadow-sm" onclick="window.cambiarRol('${u.id}', false)">Quitar Admin</button>`
            : `<button class="btn btn-sm btn-success rounded-pill px-3 fw-semibold shadow-sm" style="background-color: #009668; border: none;" onclick="window.cambiarRol('${u.id}', true)">Hacer Admin</button>`;

        tbody.innerHTML += `
            <tr>
                <td class="fw-semibold text-dark font-inter">${nombre}</td>
                <td class="text-secondary font-inter">${email}</td>
                <td class="fw-bold font-inter" style="color: #004b79;"><i class="bi bi-cup-hot-fill text-warning me-1"></i> ${rep}</td>
                <td>${badge}</td>
                <td class="text-center">${btnAccion}</td>
            </tr>
        `;
    });
}

document.getElementById('buscar-usuario').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtrados = allUsers.filter(u => 
        (u.nombre && u.nombre.toLowerCase().includes(q)) || 
        (u.email && u.email.toLowerCase().includes(q))
    );
    renderUsuarios(filtrados);
});

window.cambiarRol = async (uid, nuevoEstadoOwner) => {
    const msj = nuevoEstadoOwner 
        ? "¿Dar permisos de Administrador a este usuario?"
        : "¿Quitar los permisos de Administrador a este usuario?";
        
    if(confirm(msj)) {
        try {
            await updateDoc(doc(db, "usuarios", uid), { owner: nuevoEstadoOwner });
            const index = allUsers.findIndex(u => u.id === uid);
            if(index !== -1) allUsers[index].owner = nuevoEstadoOwner;
            
            const q = document.getElementById('buscar-usuario').value.toLowerCase();
            const filtrados = allUsers.filter(u => 
                (u.nombre && u.nombre.toLowerCase().includes(q)) || 
                (u.email && u.email.toLowerCase().includes(q))
            );
            renderUsuarios(filtrados);
        } catch(e) { alert("Error: " + e.message); }
    }
};

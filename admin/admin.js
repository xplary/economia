import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const app = initializeApp({ apiKey: "AIzaSyDvtzU8SGycfh99Cc_lLT7xabQ_uPBOpqE", authDomain: "economia-41d20.firebaseapp.com", databaseURL: "https://economia-41d20-default-rtdb.firebaseio.com", projectId: "economia-41d20", storageBucket: "economia-41d20.firebasestorage.app", messagingSenderId: "750639619847", appId: "1:750639619847:web:9a036501539ca6e3ceafa2", measurementId: "G-BWV82ZTSW1" });
const auth = getAuth(app); 
const db = getFirestore(app);

let allUsers = [];
let chartInstances = {}; // Para destruir gráficos viejos si se recarga

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
                cargarUsuarios(); // Carga usuarios también para el KPI
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
// 3. LÓGICA DEL DASHBOARD AVANZADO
// ==========================================
async function cargarDatosDashboard() {
    try {
        const [noticiasSnap, articulosSnap, formsSnap, statsDoc, usersSnap] = await Promise.all([
            getDocs(collection(db, "noticias")),
            getDocs(collection(db, "articulos")),
            getDocs(collection(db, "formularios")),
            getDoc(doc(db, "config", "estadisticas")),
            getDocs(collection(db, "usuarios"))
        ]);

        let todasPublicaciones = [];
        let statsCat = { 'Opinión': 0, 'Papers': 0, 'Encuestas': 0 };
        let totalInteracciones = 0;
        
        // Arrays para el gráfico temporal (Ene - Dic)
        let conteoMeses = {0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0};

        const procesarItem = (d, tipoStr) => {
            const data = d.data();
            const vistas = data.vistas || 0;
            const comentarios = data.comentarios ? data.comentarios.length : 0;
            const respuestas = data.respuestas ? data.respuestas.length : 0;
            const eng = comentarios + respuestas;
            
            totalInteracciones += eng;
            statsCat[tipoStr] += vistas;

            // Extraer mes para el Line Chart
            if(data.fecha) {
                const mes = data.fecha.toDate().getMonth();
                conteoMeses[mes]++;
            }

            todasPublicaciones.push({ 
                id: d.id, titulo: data.titulo, tipo: tipoStr, vistas: vistas, engagement: eng 
            });
        };

        noticiasSnap.forEach(d => procesarItem(d, 'Opinión'));
        articulosSnap.forEach(d => procesarItem(d, 'Paper'));
        formsSnap.forEach(d => procesarItem(d, 'Encuesta'));

        // Ordenamos las publicaciones por Vistas (Mayor a Menor)
        todasPublicaciones.sort((a, b) => b.vistas - a.vistas);

        // Vistas globales vs Usuarios
        let globalViews = 0;
        if(statsDoc.exists() && statsDoc.data().visitasGlobales) globalViews = statsDoc.data().visitasGlobales;

        // KPI Update
        document.getElementById('kpi-vistas').innerText = globalViews.toLocaleString();
        document.getElementById('kpi-usuarios').innerText = usersSnap.size.toLocaleString();
        document.getElementById('kpi-posts').innerText = todasPublicaciones.length;
        document.getElementById('kpi-interacciones').innerText = totalInteracciones.toLocaleString();

        // ==========================================
        // CONFIGURACIÓN DE CHART.JS (COLORES Y ESTILO)
        // ==========================================
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = '#64748b';

        // 1. Line Chart (Evolución Histórica)
        const ctxLine = document.getElementById('lineChart').getContext('2d');
        const gradientLine = ctxLine.createLinearGradient(0, 0, 0, 300);
        gradientLine.addColorStop(0, 'rgba(0, 150, 104, 0.4)'); // Color de UNP Verde
        gradientLine.addColorStop(1, 'rgba(0, 150, 104, 0.0)');

        if(chartInstances['line']) chartInstances['line'].destroy();
        chartInstances['line'] = new Chart(ctxLine, {
            type: 'line',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                datasets: [{
                    label: 'Publicaciones Creadas',
                    data: Object.values(conteoMeses),
                    borderColor: '#009668',
                    backgroundColor: gradientLine,
                    borderWidth: 3,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#009668',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    fill: true,
                    tension: 0.4 // Hace que la línea sea curva suavemente
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { borderDash: [5, 5], color: '#e2e8f0' } }, x: { grid: { display: false } } } }
        });

        // 2. Bar Chart (Top 5)
        if(chartInstances['bar']) chartInstances['bar'].destroy();
        const top5 = todasPublicaciones.slice(0, 5);
        chartInstances['bar'] = new Chart(document.getElementById('barChart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: top5.map(t => t.titulo.length > 15 ? t.titulo.substring(0, 15)+'...' : t.titulo),
                datasets: [{ label: 'Vistas Reales', data: top5.map(t => t.vistas), backgroundColor: '#3b82f6', borderRadius: 8, barThickness: 25 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { borderDash: [5, 5] } }, x: { grid: { display: false } } } }
        });

        // 3. Doughnut Chart (Tipos de Contenido)
        if(chartInstances['doughnut']) chartInstances['doughnut'].destroy();
        chartInstances['doughnut'] = new Chart(document.getElementById('doughnutChart').getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(statsCat),
                datasets: [{ data: Object.values(statsCat), backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'], borderWidth: 0, hoverOffset: 4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } } } }
        });

        // ==========================================
        // TABLA DE RENDIMIENTO DETALLADO
        // ==========================================
        const tbodyPosts = document.getElementById('posts-table-body');
        if (tbodyPosts) {
            tbodyPosts.innerHTML = '';
            if (todasPublicaciones.length === 0) {
                tbodyPosts.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">No hay publicaciones aún.</td></tr>';
            } else {
                todasPublicaciones.forEach(post => {
                    let badgeClass = '';
                    let badgeIcon = '';
                    if(post.tipo === 'Opinión') { badgeClass = 'bg-primary bg-opacity-10 text-primary'; badgeIcon = 'bi-chat-left-quote'; }
                    else if(post.tipo === 'Paper') { badgeClass = 'bg-success bg-opacity-10 text-success'; badgeIcon = 'bi-file-earmark-pdf'; }
                    else if(post.tipo === 'Encuesta') { badgeClass = 'bg-warning bg-opacity-10 text-warning'; badgeIcon = 'bi-ui-radios'; }

                    // Color del texto de engagement dependiendo si es alto o bajo
                    const engColor = post.engagement > 5 ? 'text-success fw-bold' : 'text-secondary';

                    tbodyPosts.innerHTML += `
                        <tr>
                            <td class="fw-semibold text-dark font-inter" style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${post.titulo}">
                                ${post.titulo}
                            </td>
                            <td class="text-center"><span class="badge badge-soft ${badgeClass}"><i class="bi ${badgeIcon} me-1"></i> ${post.tipo}</span></td>
                            <td class="text-center fw-bold font-inter text-dark">
                                ${post.vistas.toLocaleString()}
                            </td>
                            <td class="text-center font-inter ${engColor}">
                                <i class="bi bi-fire me-1 opacity-75"></i> ${post.engagement}
                            </td>
                        </tr>
                    `;
                });
            }
        }
    } catch(e) { console.error("Error Dashboard:", e); }
}

// ==========================================
// 4. SISTEMA DE GESTIÓN Y EXPORTACIÓN DE USUARIOS
// ==========================================
async function cargarUsuarios() {
    try {
        const snap = await getDocs(collection(db, "usuarios"));
        allUsers = [];
        snap.forEach(d => { allUsers.push({ id: d.id, ...d.data() }); });
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
            ? '<span class="badge badge-soft bg-primary bg-opacity-10 text-primary">Admin</span>' 
            : '<span class="badge badge-soft bg-secondary bg-opacity-10 text-secondary">Usuario</span>';
            
        const btnAccion = isAdmin
            ? `<button class="btn btn-sm btn-outline-danger rounded-pill px-3 fw-semibold shadow-sm" style="font-size: 0.75rem;" onclick="window.cambiarRol('${u.id}', false)">Revocar Admin</button>`
            : `<button class="btn btn-sm text-white rounded-pill px-3 fw-semibold shadow-sm" style="background-color: #009668; border: none; font-size: 0.75rem;" onclick="window.cambiarRol('${u.id}', true)">Hacer Admin</button>`;

        tbody.innerHTML += `
            <tr>
                <td class="fw-semibold text-dark font-inter">
                    <div class="d-flex align-items-center">
                        <div class="bg-light rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold me-2" style="width: 32px; height: 32px;">${nombre.charAt(0).toUpperCase()}</div>
                        ${nombre}
                    </div>
                </td>
                <td class="text-secondary font-inter" style="font-size: 0.9rem;">${email}</td>
                <td class="text-center fw-bold font-inter" style="color: #f59e0b;"><i class="bi bi-cup-hot-fill me-1"></i> ${rep}</td>
                <td class="text-center">${badge}</td>
                <td class="text-center">${btnAccion}</td>
            </tr>
        `;
    });
}

document.getElementById('buscar-usuario').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtrados = allUsers.filter(u => (u.nombre && u.nombre.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q)));
    renderUsuarios(filtrados);
});

window.cambiarRol = async (uid, nuevoEstadoOwner) => {
    const msj = nuevoEstadoOwner ? "¿Conceder privilegios de Administrador del Sistema?" : "¿Revocar privilegios de Administrador?";
    if(confirm(msj)) {
        try {
            await updateDoc(doc(db, "usuarios", uid), { owner: nuevoEstadoOwner });
            const index = allUsers.findIndex(u => u.id === uid);
            if(index !== -1) allUsers[index].owner = nuevoEstadoOwner;
            const q = document.getElementById('buscar-usuario').value.toLowerCase();
            const filtrados = allUsers.filter(u => (u.nombre && u.nombre.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q)));
            renderUsuarios(filtrados);
        } catch(e) { alert("Error de sistema: " + e.message); }
    }
};

// BOTÓN: EXPORTAR A CSV
window.exportarUsuariosCSV = () => {
    if(allUsers.length === 0) return alert("No hay usuarios para exportar.");
    let csvContent = "data:text/csv;charset=utf-8,Nombre,Correo,Reputacion,Rol\n";
    allUsers.forEach(u => {
        const nombre = (u.nombre || 'Sin nombre').replace(/,/g, ""); 
        const email = u.email || 'Sin correo';
        const rep = u.reputacion || 0;
        const rol = u.owner ? 'Administrador' : 'Usuario';
        csvContent += `${nombre},${email},${rep},${rol}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Usuarios_CafeUNP.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

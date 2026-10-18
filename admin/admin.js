import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, getDocs, updateDoc, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const app = initializeApp({ apiKey: "AIzaSyDvtzU8SGycfh99Cc_lLT7xabQ_uPBOpqE", authDomain: "economia-41d20.firebaseapp.com", databaseURL: "https://economia-41d20-default-rtdb.firebaseio.com", projectId: "economia-41d20", storageBucket: "economia-41d20.firebasestorage.app", messagingSenderId: "750639619847", appId: "1:750639619847:web:9a036501539ca6e3ceafa2", measurementId: "G-BWV82ZTSW1" });
const auth = getAuth(app); 
const db = getFirestore(app);

let allUsers = [];
let allRoles = [];
let chartInstances = {}; 

// Variables de Permisos de Sesión
let misPermisos = { panel: false, stats: false, users: false, roles: false };
let isSuperAdminLogueado = false; // El dueño supremo
let miRolId = null;

// ==========================================
// 1. AUTENTICACIÓN Y SEGURIDAD DINÁMICA
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDoc = await getDoc(doc(db, "usuarios", user.uid));
            if (userDoc.exists()) {
                const uData = userDoc.data();
                let tieneAcceso = false;

                if (uData.owner === true) {
                    // Es SuperAdmin, todo permitido
                    tieneAcceso = true;
                    isSuperAdminLogueado = true;
                    misPermisos = { panel: true, stats: true, users: true, roles: true };
                } else if (uData.rolId) {
                    // Es un Rango Personalizado, verificamos sus permisos
                    const roleDoc = await getDoc(doc(db, "roles", uData.rolId));
                    if (roleDoc.exists() && roleDoc.data().permisos.panel) {
                        tieneAcceso = true;
                        misPermisos = roleDoc.data().permisos;
                        miRolId = uData.rolId;
                    }
                }

                if (tieneAcceso) {
                    document.getElementById('loading-screen').style.display = 'none';
                    document.getElementById('dashboard-wrapper').style.display = 'block';
                    document.getElementById('admin-avatar').src = user.photoURL || 'https://via.placeholder.com/32';
                    document.getElementById('admin-name').innerText = user.displayName || 'Equipo';

                    // Ocultar tabs prohibidas según el rol
                    if(!misPermisos.stats) document.getElementById('nav-overview').style.display = 'none'; else document.getElementById('nav-overview').style.display = 'block';
                    if(!misPermisos.users) document.getElementById('nav-users').style.display = 'none'; else document.getElementById('nav-users').style.display = 'block';
                    if(!misPermisos.roles) document.getElementById('nav-roles').style.display = 'none'; else document.getElementById('nav-roles').style.display = 'block';

                    // Navegar a la primera tab que tenga permitida
                    if(misPermisos.stats) { document.getElementById('nav-overview').querySelector('.nav-link').click(); }
                    else if(misPermisos.users) { document.getElementById('nav-users').querySelector('.nav-link').click(); }
                    else if(misPermisos.roles) { document.getElementById('nav-roles').querySelector('.nav-link').click(); }

                    // Cargar datos
                    await cargarRolesBD(); 
                    if (misPermisos.stats) cargarDatosDashboard();
                    if (misPermisos.users) cargarUsuarios();
                } else {
                    document.getElementById('loading-screen').style.display = 'none';
                    document.getElementById('access-denied').style.display = 'flex';
                }
            } else {
                window.location.href = "../index.html";
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
// 3. DASHBOARD Y GRÁFICOS
// ==========================================
async function cargarDatosDashboard() {
    try {
        const [noticiasSnap, articulosSnap, formsSnap, statsDoc, usersSnap] = await Promise.all([
            getDocs(collection(db, "noticias")), getDocs(collection(db, "articulos")), getDocs(collection(db, "formularios")),
            getDoc(doc(db, "config", "estadisticas")), getDocs(collection(db, "usuarios"))
        ]);

        let todasPublicaciones = []; let statsCat = { 'Opinión': 0, 'Papers': 0, 'Encuestas': 0 };
        let totalInteracciones = 0; let conteoMeses = {0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, 7:0, 8:0, 9:0, 10:0, 11:0};

        const procesarItem = (d, tipoStr) => {
            const data = d.data();
            const vistas = data.vistas || 0;
            const comentarios = data.comentarios ? data.comentarios.length : 0;
            const respuestas = data.respuestas ? data.respuestas.length : 0;
            const eng = comentarios + respuestas;
            totalInteracciones += eng; statsCat[tipoStr] += vistas;
            if(data.fecha) { const mes = data.fecha.toDate().getMonth(); conteoMeses[mes]++; }
            todasPublicaciones.push({ id: d.id, titulo: data.titulo, tipo: tipoStr, vistas: vistas, engagement: eng });
        };

        noticiasSnap.forEach(d => procesarItem(d, 'Opinión'));
        articulosSnap.forEach(d => procesarItem(d, 'Paper'));
        formsSnap.forEach(d => procesarItem(d, 'Encuesta'));

        todasPublicaciones.sort((a, b) => b.vistas - a.vistas);
        let globalViews = statsDoc.exists() && statsDoc.data().visitasGlobales ? statsDoc.data().visitasGlobales : 0;

        document.getElementById('kpi-vistas').innerText = globalViews.toLocaleString();
        document.getElementById('kpi-usuarios').innerText = usersSnap.size.toLocaleString();
        document.getElementById('kpi-posts').innerText = todasPublicaciones.length;
        document.getElementById('kpi-interacciones').innerText = totalInteracciones.toLocaleString();

        Chart.defaults.font.family = "'Inter', sans-serif"; Chart.defaults.color = '#64748b';
        
        const ctxLine = document.getElementById('lineChart').getContext('2d');
        const gradientLine = ctxLine.createLinearGradient(0, 0, 0, 300);
        gradientLine.addColorStop(0, 'rgba(0, 150, 104, 0.4)'); gradientLine.addColorStop(1, 'rgba(0, 150, 104, 0.0)');

        if(chartInstances['line']) chartInstances['line'].destroy();
        chartInstances['line'] = new Chart(ctxLine, { type: 'line', data: { labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'], datasets: [{ label: 'Posts', data: Object.values(conteoMeses), borderColor: '#009668', backgroundColor: gradientLine, borderWidth: 3, pointBackgroundColor: '#fff', pointBorderColor: '#009668', fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { borderDash: [5, 5] } }, x: { grid: { display: false } } } } });

        const top5 = todasPublicaciones.slice(0, 5);
        if(chartInstances['bar']) chartInstances['bar'].destroy();
        chartInstances['bar'] = new Chart(document.getElementById('barChart').getContext('2d'), { type: 'bar', data: { labels: top5.map(t => t.titulo.length > 15 ? t.titulo.substring(0, 15)+'...' : t.titulo), datasets: [{ data: top5.map(t => t.vistas), backgroundColor: '#3b82f6', borderRadius: 8, barThickness: 25 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { borderDash: [5, 5] } }, x: { grid: { display: false } } } } });

        if(chartInstances['doughnut']) chartInstances['doughnut'].destroy();
        chartInstances['doughnut'] = new Chart(document.getElementById('doughnutChart').getContext('2d'), { type: 'doughnut', data: { labels: Object.keys(statsCat), datasets: [{ data: Object.values(statsCat), backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } } } } });

        const tbodyPosts = document.getElementById('posts-table-body');
        if (tbodyPosts) {
            tbodyPosts.innerHTML = todasPublicaciones.length === 0 ? '<tr><td colspan="4" class="text-center text-muted py-4">No hay publicaciones aún.</td></tr>' : '';
            todasPublicaciones.forEach(post => {
                let badgeClass = post.tipo === 'Opinión' ? 'bg-primary bg-opacity-10 text-primary' : post.tipo === 'Paper' ? 'bg-success bg-opacity-10 text-success' : 'bg-warning bg-opacity-10 text-warning';
                let engColor = post.engagement > 5 ? 'text-success fw-bold' : 'text-secondary';
                tbodyPosts.innerHTML += `<tr><td class="fw-semibold text-dark font-inter" style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${post.titulo}">${post.titulo}</td><td class="text-center"><span class="badge badge-soft ${badgeClass}">${post.tipo}</span></td><td class="text-center fw-bold font-inter text-dark">${post.vistas.toLocaleString()}</td><td class="text-center font-inter ${engColor}"><i class="bi bi-fire me-1 opacity-75"></i> ${post.engagement}</td></tr>`;
            });
        }
    } catch(e) {}
}

// ==========================================
// 4. SISTEMA DE ROLES Y PERMISOS
// ==========================================
async function cargarRolesBD() {
    try {
        const snap = await getDocs(collection(db, "roles"));
        allRoles = [];
        snap.forEach(d => { allRoles.push({ id: d.id, ...d.data() }); });
        if(misPermisos.roles) renderListaRoles();
    } catch(e) {}
}

function renderListaRoles() {
    const tbody = document.getElementById('roles-table-body');
    tbody.innerHTML = '';
    
    // Fila fija para el SuperAdmin que no se puede borrar
    tbody.innerHTML += `
        <tr>
            <td class="fw-bold text-dark font-inter"><i class="bi bi-star-fill text-warning me-2"></i> Super Administrador (Dueño)</td>
            <td><span class="badge badge-soft bg-primary bg-opacity-10 text-primary">Todos los permisos</span></td>
            <td class="text-center"><span class="text-muted small">Sistema</span></td>
        </tr>
    `;

    allRoles.forEach(r => {
        let tags = [];
        if(r.permisos.panel) tags.push('Ingresar al Panel');
        if(r.permisos.stats) tags.push('Estadísticas');
        if(r.permisos.users) tags.push('Usuarios');
        if(r.permisos.roles) tags.push('Rangos');
        
        const badges = tags.length > 0 ? tags.map(t => `<span class="badge badge-soft bg-secondary bg-opacity-10 text-secondary me-1 mb-1">${t}</span>`).join('') : '<span class="text-muted small">Sin permisos especiales</span>';
        
        tbody.innerHTML += `
            <tr>
                <td class="fw-bold text-dark font-inter">${r.nombre}</td>
                <td style="max-width:300px;">${badges}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-light text-primary me-2 shadow-sm" onclick="window.editarRol('${r.id}')"><i class="bi bi-pencil-fill"></i></button>
                    <button class="btn btn-sm btn-light text-danger shadow-sm" onclick="window.eliminarRol('${r.id}')"><i class="bi bi-trash-fill"></i></button>
                </td>
            </tr>
        `;
    });
}

window.abrirModalRol = () => {
    document.getElementById('rol-id').value = '';
    document.getElementById('rol-nombre').value = '';
    document.getElementById('perm-panel').checked = true; // Por defecto
    document.getElementById('perm-stats').checked = false;
    document.getElementById('perm-users').checked = false;
    document.getElementById('perm-roles').checked = false;
    document.getElementById('modalRolTitle').innerText = 'Nuevo Rango';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalRol')).show();
};

window.editarRol = (id) => {
    const rol = allRoles.find(r => r.id === id);
    if(!rol) return;
    document.getElementById('rol-id').value = rol.id;
    document.getElementById('rol-nombre').value = rol.nombre;
    document.getElementById('perm-panel').checked = rol.permisos.panel || false;
    document.getElementById('perm-stats').checked = rol.permisos.stats || false;
    document.getElementById('perm-users').checked = rol.permisos.users || false;
    document.getElementById('perm-roles').checked = rol.permisos.roles || false;
    document.getElementById('modalRolTitle').innerText = 'Editar Rango';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalRol')).show();
};

window.guardarRol = async () => {
    const id = document.getElementById('rol-id').value;
    const nombre = document.getElementById('rol-nombre').value.trim();
    if(!nombre) return alert("Debes asignarle un nombre al rango.");

    const permisos = {
        panel: document.getElementById('perm-panel').checked,
        stats: document.getElementById('perm-stats').checked,
        users: document.getElementById('perm-users').checked,
        roles: document.getElementById('perm-roles').checked
    };

    const dataObj = { nombre, permisos };
    const btn = document.getElementById('btn-save-rol');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    try {
        if(id) {
            await updateDoc(doc(db, "roles", id), dataObj);
        } else {
            await addDoc(collection(db, "roles"), dataObj);
        }
        await cargarRolesBD(); 
        if(misPermisos.users) await cargarUsuarios(); // Refrescar los selectores en el directorio
        bootstrap.Modal.getInstance(document.getElementById('modalRol')).hide();
    } catch(e) {
        alert("Error al guardar: " + e.message);
    } finally {
        btn.innerHTML = 'Guardar Rango';
    }
};

window.eliminarRol = async (id) => {
    if(confirm("¿Seguro que deseas eliminar este rango? Los usuarios que lo tengan volverán a ser usuarios normales.")) {
        try {
            await deleteDoc(doc(db, "roles", id));
            await cargarRolesBD();
            if(misPermisos.users) await cargarUsuarios();
        } catch (e) { alert("Error: " + e.message); }
    }
};

// ==========================================
// 5. GESTIÓN DE USUARIOS Y ASIGNACIÓN DE RANGOS
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
        const isSuperAdmin = u.owner === true;
        let roleName = "Usuario Normal";
        let badgeClass = "bg-secondary bg-opacity-10 text-secondary";
        
        if (isSuperAdmin) {
            roleName = "Super Admin";
            badgeClass = "bg-primary bg-opacity-10 text-primary fw-bold";
        } else if (u.rolId) {
            const matchedRole = allRoles.find(r => r.id === u.rolId);
            if (matchedRole) {
                roleName = matchedRole.nombre;
                badgeClass = "bg-success bg-opacity-10 text-success fw-bold";
            }
        }

        // CONTROL DE ASIGNACIÓN (Select Dropdown)
        let htmlAsignar = '';
        if (misPermisos.users) {
            let currVal = isSuperAdmin ? "SUPERADMIN" : (u.rolId || "NONE");
            
            // Regla estricta: Solo un SuperAdmin puede dar o quitar el rango de SuperAdmin.
            let selectDisabled = (!isSuperAdminLogueado && isSuperAdmin) ? 'disabled title="Solo otro Super Admin puede editar esto"' : '';
            
            htmlAsignar = `<select class="form-select form-select-sm font-inter shadow-sm bg-light" style="max-width: 170px; margin: 0 auto; cursor:pointer;" onchange="window.cambiarRangoUsuario('${u.id}', this.value)" ${selectDisabled}>
                <option value="NONE" ${currVal === 'NONE' ? 'selected' : ''}>Usuario Normal</option>`;
            
            if (isSuperAdminLogueado) {
                htmlAsignar += `<option value="SUPERADMIN" ${currVal === 'SUPERADMIN' ? 'selected' : ''}>Super Admin (Dueño)</option>`;
            }

            allRoles.forEach(r => {
                htmlAsignar += `<option value="${r.id}" ${currVal === r.id ? 'selected' : ''}>${r.nombre}</option>`;
            });
            htmlAsignar += `</select>`;
        } else {
            htmlAsignar = '<span class="text-muted small">Sin permiso</span>';
        }

        const nombre = u.nombre || 'Sin nombre';

        tbody.innerHTML += `
            <tr>
                <td class="fw-semibold text-dark font-inter">
                    <div class="d-flex align-items-center">
                        <div class="bg-light rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold me-2" style="width: 32px; height: 32px;">${nombre.charAt(0).toUpperCase()}</div>
                        ${nombre}
                    </div>
                </td>
                <td class="text-secondary font-inter" style="font-size: 0.9rem;">${u.email || 'Sin correo'}</td>
                <td class="text-center fw-bold font-inter" style="color: #f59e0b;"><i class="bi bi-cup-hot-fill me-1"></i> ${u.reputacion || 0}</td>
                <td class="text-center"><span class="badge badge-soft ${badgeClass}">${roleName}</span></td>
                <td class="text-center">${htmlAsignar}</td>
            </tr>
        `;
    });
}

document.getElementById('buscar-usuario').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtrados = allUsers.filter(u => (u.nombre && u.nombre.toLowerCase().includes(q)) || (u.email && u.email.toLowerCase().includes(q)));
    renderUsuarios(filtrados);
});

// Función de Cambio Dinámico de Roles
window.cambiarRangoUsuario = async (uid, nuevoRangoVal) => {
    if(confirm("¿Estás seguro de modificar los permisos de este usuario?")) {
        try {
            let updates = {};
            if (nuevoRangoVal === 'SUPERADMIN') {
                updates = { owner: true, rolId: null };
            } else if (nuevoRangoVal === 'NONE') {
                updates = { owner: false, rolId: null };
            } else {
                updates = { owner: false, rolId: nuevoRangoVal };
            }
            
            await updateDoc(doc(db, "usuarios", uid), updates);
            
            // Actualizar tabla en vivo
            const index = allUsers.findIndex(u => u.id === uid);
            if(index !== -1) {
                allUsers[index].owner = updates.owner;
                allUsers[index].rolId = updates.rolId;
            }
            renderUsuarios(allUsers);
        } catch(e) {
            alert("Error al actualizar el rango: " + e.message);
            renderUsuarios(allUsers); // Revertir select si falla
        }
    } else {
        renderUsuarios(allUsers); // Revertir visualmente si cancela
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
        let rol = 'Usuario';
        if (u.owner) rol = 'Super Admin';
        else if (u.rolId) { const rx = allRoles.find(r=>r.id===u.rolId); if(rx) rol = rx.nombre; }
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

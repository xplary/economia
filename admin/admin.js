import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, updateDoc, addDoc, deleteDoc, query, orderBy, limit, onSnapshot, where, writeBatch } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const app = initializeApp({ apiKey: "AIzaSyDvtzU8SGycfh99Cc_lLT7xabQ_uPBOpqE", authDomain: "economia-41d20.firebaseapp.com", databaseURL: "https://economia-41d20-default-rtdb.firebaseio.com", projectId: "economia-41d20", storageBucket: "economia-41d20.firebasestorage.app", messagingSenderId: "750639619847", appId: "1:750639619847:web:9a036501539ca6e3ceafa2", measurementId: "G-BWV82ZTSW1" });
const auth = getAuth(app); 
const db = getFirestore(app);

let allUsers = [];
let allRoles = [];
let chartInstances = {}; 

let misPermisos = { panel: false, stats: false, users: false, roles: false };
let isSuperAdminLogueado = false;
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
                    tieneAcceso = true;
                    isSuperAdminLogueado = true;
                    misPermisos = { panel: true, stats: true, users: true, roles: true };
                } else if (uData.rolId) {
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

                    if(!misPermisos.stats) document.getElementById('nav-overview').style.display = 'none'; else document.getElementById('nav-overview').style.display = 'block';
                    if(!misPermisos.users) document.getElementById('nav-users').style.display = 'none'; else document.getElementById('nav-users').style.display = 'block';
                    if(!misPermisos.roles) document.getElementById('nav-roles').style.display = 'none'; else document.getElementById('nav-roles').style.display = 'block';
                    
                    document.getElementById('nav-edicion').style.display = 'block';

                    if(misPermisos.stats) { document.getElementById('nav-overview').querySelector('.nav-link').click(); }
                    else if(misPermisos.users) { document.getElementById('nav-users').querySelector('.nav-link').click(); }
                    else if(misPermisos.roles) { document.getElementById('nav-roles').querySelector('.nav-link').click(); }
                    else { document.getElementById('nav-edicion').querySelector('.nav-link').click(); }

                    await cargarRolesBD(); 
                    if (misPermisos.stats) cargarDatosDashboard();
                    if (misPermisos.users) cargarUsuarios();
                    cargarDatosFooterAdmin();
                    iniciarDestacadosPequenosAdmin();
                    iniciarSeccionesOpinionAdmin();
                } else {
                    document.getElementById('loading-screen').style.display = 'none';
                    document.getElementById('access-denied').style.display = 'flex';
                }
            } else {
                window.location.href = "../index.html";
            }
        } catch (error) {
            console.error("Error de permisos: ", error);
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
    } catch(e) { console.error("Error al cargar roles", e); }
}

function renderListaRoles() {
    const tbody = document.getElementById('roles-table-body');
    tbody.innerHTML = `
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
    document.getElementById('perm-panel').checked = true;
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

    const btn = document.getElementById('btn-save-rol');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    try {
        if(id) await updateDoc(doc(db, "roles", id), { nombre, permisos });
        else await addDoc(collection(db, "roles"), { nombre, permisos });
        
        await cargarRolesBD(); 
        if(misPermisos.users) await cargarUsuarios(); 
        bootstrap.Modal.getInstance(document.getElementById('modalRol')).hide();
    } catch(e) {
        alert("Error al guardar: " + e.message);
    } finally {
        btn.innerHTML = 'Guardar Rango';
    }
};

window.eliminarRol = async (id) => {
    if(confirm("¿Seguro que deseas eliminar este rango? Los usuarios volverán a ser normales.")) {
        try {
            await deleteDoc(doc(db, "roles", id));
            await cargarRolesBD();
            if(misPermisos.users) await cargarUsuarios();
        } catch (e) { alert("Error: " + e.message); }
    }
};

// ==========================================
// 5. GESTIÓN DE USUARIOS
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

        let htmlAsignar = '';
        if (misPermisos.users) {
            let currVal = isSuperAdmin ? "SUPERADMIN" : (u.rolId || "NONE");
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

window.cambiarRangoUsuario = async (uid, nuevoRangoVal) => {
    if(confirm("¿Estás seguro de modificar los permisos de este usuario?")) {
        try {
            let updates = {};
            if (nuevoRangoVal === 'SUPERADMIN') updates = { owner: true, rolId: null };
            else if (nuevoRangoVal === 'NONE') updates = { owner: false, rolId: null };
            else updates = { owner: false, rolId: nuevoRangoVal };
            
            await updateDoc(doc(db, "usuarios", uid), updates);
            
            const index = allUsers.findIndex(u => u.id === uid);
            if(index !== -1) {
                allUsers[index].owner = updates.owner;
                allUsers[index].rolId = updates.rolId;
            }
            renderUsuarios(allUsers);
        } catch(e) {
            alert("Error al actualizar el rango: " + e.message);
            renderUsuarios(allUsers);
        }
    } else {
        renderUsuarios(allUsers); 
    }
};

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

// ==========================================
// 6. GESTIÓN DEL PIE DE PÁGINA 
// ==========================================
async function cargarDatosFooterAdmin() {
    try {
        const s = await getDoc(doc(db, "config", "footer"));
        const d = s.exists() ? s.data() : {};
        
        document.getElementById('admin-f-ubicacion').value = d.ubicacion || '';
        document.getElementById('admin-f-contacto').value = d.contacto || '';
        document.getElementById('admin-f-sobre').value = d.sobre || '';

        const setVal = (idStr, valObj, defText, defUrl) => {
            const textEl = document.getElementById(`admin-${idStr}-text`);
            const urlEl = document.getElementById(`admin-${idStr}-url`);
            if (textEl) textEl.value = (valObj && valObj.text) ? valObj.text : defText;
            if (urlEl) urlEl.value = (valObj && valObj.url) ? valObj.url : defUrl;
        };

        setVal('f-link1', d.link1, 'Cómo llegar', '#');
        setVal('f-link2', d.link2, 'Ver mapa del campus', '#');
        setVal('f-link3', d.link3, 'Mapa del sitio', '#');
        setVal('f-link4', d.link4, 'Términos y condiciones de uso', '#');
        setVal('f-link5', d.link5, 'Política de privacidad', '#');
        setVal('f-link6', d.link6, 'Procedimiento de devoluciones', '#');
        setVal('f-btn1', d.btn1, 'Enviar mensaje', '#');
        setVal('f-btn2', d.btn2, 'Libro de Reclamaciones', '#');
    } catch(e) {}
}

window.guardarFooterAdmin = async () => {
    const btn = document.getElementById('btn-save-footer');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Guardando...';
    btn.disabled = true;

    const getVal = (idStr) => {
        return {
            text: document.getElementById(`admin-${idStr}-text`)?.value || '',
            url: document.getElementById(`admin-${idStr}-url`)?.value || ''
        };
    };

    const newData = {
        ubicacion: document.getElementById('admin-f-ubicacion')?.value || '',
        contacto: document.getElementById('admin-f-contacto')?.value || '',
        sobre: document.getElementById('admin-f-sobre')?.value || '',
        link1: getVal('f-link1'), link2: getVal('f-link2'),
        link3: getVal('f-link3'), link4: getVal('f-link4'),
        link5: getVal('f-link5'), link6: getVal('f-link6'),
        btn1: getVal('f-btn1'), btn2: getVal('f-btn2')
    };

    try {
        await setDoc(doc(db, "config", "footer"), newData, { merge: true });
        alert("¡Pie de página actualizado correctamente en la web pública!");
    } catch(e) {
        alert("Error al guardar: " + e.message);
    } finally {
        btn.innerHTML = oldHtml;
        btn.disabled = false;
    }
};

// ==========================================
// 7. SISTEMA DE DESTACADO CON CROPPER
// ==========================================
let cropperDestacado = null;
let imagenGuardada = ''; 

const inputFile = document.getElementById('admin-sb-imagen-file');
if (inputFile) {
    inputFile.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = document.getElementById('cropper-image-destacado');
                img.src = event.target.result;
                document.getElementById('cropper-container-destacado').style.display = 'block';
                
                if (cropperDestacado) cropperDestacado.destroy();
                
                cropperDestacado = new Cropper(img, {
                    aspectRatio: 1, 
                    viewMode: 2,
                    autoCropArea: 1,
                    guides: true,
                    center: true
                });
            };
            reader.readAsDataURL(file);
        }
    });
}

const btnGuardarDestacado = document.getElementById('btn-guardar-destacado');
if (btnGuardarDestacado) {
    btnGuardarDestacado.addEventListener('click', async (e) => {
        const btn = e.target;
        const link = document.getElementById('admin-sb-enlace')?.value || '';
        const textoOriginal = btn.innerHTML;
        
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';
        btn.disabled = true;

        let imgFinal = imagenGuardada;
        
        if (cropperDestacado) {
            imgFinal = cropperDestacado.getCroppedCanvas({ width: 800, height: 800 }).toDataURL('image/jpeg', 0.85);
        } else if (!imgFinal) {
            alert("Por favor, selecciona y recorta una imagen primero.");
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
            return;
        }

        try {
            const dataPayload = { 
                sb_imagen: imgFinal, 
                sb_enlace: link,
                bannerImageUrl: imgFinal, 
                bannerLinkUrl: link 
            };

            await setDoc(doc(db, "configuracion", "general"), dataPayload, { merge: true });
            await setDoc(doc(db, "configuracion", "destacado"), dataPayload, { merge: true });
            await setDoc(doc(db, "destacados", "principal"), {
                imagen: imgFinal,
                fecha: new Date().toISOString()
            });

            imagenGuardada = imgFinal;

            if (cropperDestacado) {
                cropperDestacado.destroy();
                cropperDestacado = null;
            }
            document.getElementById('cropper-container-destacado').style.display = 'none';
            if(inputFile) inputFile.value = '';

            alert("¡Destacado guardado con éxito! Se creó en la base de datos.");
        } catch (error) {
            console.error("Error al guardar destacado:", error);
            alert("Error de permisos o conexión. Revisa la consola.");
        } finally {
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
        }
    });
}

setTimeout(async () => {
    try {
        let docSnap = await getDoc(doc(db, "configuracion", "general"));
        if (!docSnap.exists() || !docSnap.data().sb_imagen) {
            docSnap = await getDoc(doc(db, "configuracion", "destacado"));
        }
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            imagenGuardada = data.sb_imagen || data.bannerImageUrl || '';
            const linkInput = document.getElementById('admin-sb-enlace');
            if (linkInput) linkInput.value = data.sb_enlace || data.bannerLinkUrl || '';
        }
    } catch (e) {}
}, 1500);


// ==========================================
// 8. DESTACADOS PEQUEÑOS (BANNER HORIZONTAL 12:5)
// Esta sección vive DENTRO de "Edición de Web".
// Los cambios se guardan en "destacados_pequenos" y se ven en index.html.
// ==========================================
let cropperDp = null;
let dpCount = 0;
let dejarDeEscucharDp = null;

const inputFileDp = document.getElementById('admin-dp-file');
const btnGuardarDp = document.getElementById('btn-guardar-dp');

function normalizarEnlaceDp(valor) {
    const url = new URL(valor);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new Error('Ingresa un enlace válido que comience por https:// o http://.');
    }
    return url.href;
}

if (inputFileDp) {
    inputFileDp.addEventListener('change', (evento) => {
        const archivo = evento.target.files?.[0];
        const contenedorRecorte = document.getElementById('cropper-container-dp');
        const imagenRecorte = document.getElementById('cropper-image-dp');

        if (cropperDp) {
            cropperDp.destroy();
            cropperDp = null;
        }
        contenedorRecorte.style.display = 'none';
        if (!archivo) return;
        if (!archivo.type.startsWith('image/')) {
            alert('Selecciona un archivo de imagen válido.');
            inputFileDp.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (lectura) => {
            imagenRecorte.onload = () => {
                imagenRecorte.onload = null;
                contenedorRecorte.style.display = 'block';
                cropperDp = new Cropper(imagenRecorte, {
                    aspectRatio: 12 / 5,
                    viewMode: 2,
                    autoCropArea: 1,
                    responsive: true,
                    background: false
                });
            };
            imagenRecorte.onerror = () => {
                alert('No se pudo abrir la imagen seleccionada.');
                inputFileDp.value = '';
            };
            imagenRecorte.src = lectura.target.result;
        };
        reader.onerror = () => alert('No se pudo leer la imagen seleccionada.');
        reader.readAsDataURL(archivo);
    });
}

if (btnGuardarDp) {
    btnGuardarDp.addEventListener('click', async () => {
        const valor = document.getElementById('admin-dp-enlace').value.trim();
        if (!valor) return alert('El enlace de redirección es obligatorio.');

        let enlace;
        try {
            enlace = normalizarEnlaceDp(valor);
        } catch (_) {
            return alert('Ingresa un enlace válido que empiece por https:// o http://.');
        }

        if (!cropperDp) return alert('Selecciona una imagen y ajusta su recorte horizontal primero.');
        if (dpCount >= 10) return alert('Ya hay 10 destacados pequeños. Elimina uno para agregar otro.');

        const textoOriginal = btnGuardarDp.innerHTML;
        btnGuardarDp.disabled = true;
        btnGuardarDp.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...';

        try {
            // Revalidar el límite, por si otro administrador añadió una imagen.
            const consulta = query(collection(db, 'destacados_pequenos'), orderBy('fecha', 'asc'));
            const existentes = await getDocs(consulta);
            if (existentes.size >= 10) {
                throw new Error('Ya existen 10 destacados pequeños. Elimina uno antes de guardar.');
            }

            const lienzo = cropperDp.getCroppedCanvas({
                width: 960,
                height: 400,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });
            if (!lienzo) throw new Error('No se pudo recortar la imagen. Selecciónala otra vez.');
            const imagen = lienzo.toDataURL('image/jpeg', 0.85);

            await addDoc(collection(db, 'destacados_pequenos'), {
                imagen,
                enlace,
                fecha: new Date().toISOString()
            });

            document.getElementById('admin-dp-enlace').value = '';
            inputFileDp.value = '';
            cropperDp.destroy();
            cropperDp = null;
            document.getElementById('cropper-container-dp').style.display = 'none';
            alert('¡Destacado pequeño publicado correctamente!');
        } catch (error) {
            console.error('Error al guardar destacado pequeño:', error);
            alert('No se pudo guardar el destacado: ' + error.message);
        } finally {
            btnGuardarDp.innerHTML = textoOriginal;
            btnGuardarDp.disabled = false;
        }
    });
}

function mostrarDestacadosPequenosAdmin(snapshot) {
    const tbody = document.getElementById('lista-dp-body');
    const contador = document.getElementById('admin-dp-count');
    if (!tbody) return;

    dpCount = snapshot.size;
    if (contador) contador.textContent = `${dpCount} de 10 publicados`;
    tbody.replaceChildren();

    if (snapshot.empty) {
        const fila = document.createElement('tr');
        const celda = document.createElement('td');
        celda.colSpan = 3;
        celda.className = 'text-muted py-3';
        celda.textContent = 'Aún no hay destacados pequeños.';
        fila.appendChild(celda);
        tbody.appendChild(fila);
        return;
    }

    snapshot.forEach((documento) => {
        const datos = documento.data();
        const fila = document.createElement('tr');

        const celdaImagen = document.createElement('td');
        const imagen = document.createElement('img');
        imagen.src = datos.imagen || '';
        imagen.alt = 'Vista previa del destacado';
        imagen.width = 120;
        imagen.height = 50;
        imagen.className = 'rounded shadow-sm';
        imagen.style.objectFit = 'cover';
        celdaImagen.appendChild(imagen);

        const celdaEnlace = document.createElement('td');
        const enlace = document.createElement('a');
        enlace.className = 'small text-primary text-truncate d-inline-block';
        enlace.style.maxWidth = '230px';
        enlace.textContent = datos.enlace || '(Sin enlace)';
        enlace.target = '_blank';
        enlace.rel = 'noopener noreferrer';
        try {
            enlace.href = normalizarEnlaceDp(datos.enlace || '');
        } catch (_) {
            enlace.removeAttribute('href');
        }
        celdaEnlace.appendChild(enlace);

        const celdaAccion = document.createElement('td');
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'btn btn-sm btn-outline-danger shadow-sm';
        boton.setAttribute('aria-label', 'Eliminar destacado');
        boton.title = 'Eliminar destacado';
        boton.innerHTML = '<i class="bi bi-trash-fill"></i>';
        boton.addEventListener('click', () => window.eliminarDp(documento.id));
        celdaAccion.appendChild(boton);

        fila.append(celdaImagen, celdaEnlace, celdaAccion);
        tbody.appendChild(fila);
    });
}

function iniciarDestacadosPequenosAdmin() {
    if (dejarDeEscucharDp) return;
    const tbody = document.getElementById('lista-dp-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="3" class="text-muted py-3">Cargando destacados...</td></tr>';

    const consulta = query(collection(db, 'destacados_pequenos'), orderBy('fecha', 'asc'));
    dejarDeEscucharDp = onSnapshot(consulta, mostrarDestacadosPequenosAdmin, (error) => {
        console.error('Error al cargar destacados pequeños:', error);
        if (tbody) tbody.innerHTML = '<tr><td colspan="3" class="text-danger py-3">No se pudo cargar la lista. Revisa los permisos de Firebase.</td></tr>';
        const contador = document.getElementById('admin-dp-count');
        if (contador) contador.textContent = 'No disponible';
    });
}

window.eliminarDp = async (id) => {
    if (!confirm('¿Eliminar este destacado pequeño? También desaparecerá de la web pública.')) return;
    try {
        await deleteDoc(doc(db, 'destacados_pequenos', id));
        // El listener actualiza automáticamente la tabla y la web pública.
    } catch (error) {
        console.error('Error al eliminar destacado pequeño:', error);
        alert('No se pudo eliminar el destacado: ' + error.message);
    }
};


// ==========================================
// 9. SECCIONES DEL MENÚ ARTÍCULOS Y OPINIÓN
// ==========================================
let seccionesOpinionAdmin = [];
let seccionEnEdicion = null;
let unsubscribeSeccionesOpinion = null;
const formSeccion = document.getElementById('admin-seccion-form');
const inputSeccion = document.getElementById('admin-seccion-nombre');
const btnGuardarSeccion = document.getElementById('admin-seccion-guardar');
const btnCancelarSeccion = document.getElementById('admin-seccion-cancelar');
const tablaSecciones = document.getElementById('admin-secciones-lista');
const msgSecciones = document.getElementById('admin-seccion-mensaje');

function informarSeccion(mensaje, error = false) {
    msgSecciones.textContent = mensaje;
    msgSecciones.className = `small mb-2 ${error ? 'text-danger' : 'text-success'}`;
}
function reiniciarEditorSeccion() {
    seccionEnEdicion = null;
    inputSeccion.value = '';
    btnGuardarSeccion.innerHTML = '<i class="bi bi-plus-lg me-1"></i> Crear sección';
    btnCancelarSeccion.classList.add('d-none');
}
btnCancelarSeccion.addEventListener('click', () => {
    reiniciarEditorSeccion();
    informarSeccion('');
});

function iniciarSeccionesOpinionAdmin() {
    if (unsubscribeSeccionesOpinion) return;
    unsubscribeSeccionesOpinion = onSnapshot(collection(db, 'secciones_opinion'), snapshot => {
        seccionesOpinionAdmin = snapshot.docs.map(d => ({ id: d.id, nombre: d.data().nombre || '' }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
        tablaSecciones.replaceChildren();
        if (!seccionesOpinionAdmin.length) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 2;
            td.className = 'text-secondary small py-3';
            td.textContent = 'Todavía no hay secciones. Crea la primera usando el formulario.';
            tr.append(td);
            tablaSecciones.append(tr);
            return;
        }
        seccionesOpinionAdmin.forEach(seccion => {
            const tr = document.createElement('tr');
            const nombre = document.createElement('td');
            nombre.className = 'fw-semibold text-dark';
            nombre.textContent = seccion.nombre;
            const acciones = document.createElement('td');
            acciones.className = 'text-end text-nowrap';
            const editar = document.createElement('button');
            editar.type = 'button';
            editar.className = 'btn btn-sm btn-outline-primary me-2';
            editar.innerHTML = '<i class="bi bi-pencil-square me-1"></i> Editar';
            editar.addEventListener('click', () => {
                seccionEnEdicion = seccion.id;
                inputSeccion.value = seccion.nombre;
                btnGuardarSeccion.innerHTML = '<i class="bi bi-floppy me-1"></i> Guardar nombre';
                btnCancelarSeccion.classList.remove('d-none');
                informarSeccion('');
                inputSeccion.focus();
            });
            const eliminar = document.createElement('button');
            eliminar.type = 'button';
            eliminar.className = 'btn btn-sm btn-outline-danger';
            eliminar.innerHTML = '<i class="bi bi-trash me-1"></i> Borrar';
            eliminar.addEventListener('click', () => eliminarSeccionOpinion(seccion));
            acciones.append(editar, eliminar);
            tr.append(nombre, acciones);
            tablaSecciones.append(tr);
        });
        if (seccionEnEdicion && !seccionesOpinionAdmin.some(s => s.id === seccionEnEdicion)) reiniciarEditorSeccion();
    }, error => {
        console.error('Error al escuchar secciones:', error);
        informarSeccion('No se pudieron cargar las secciones. Revisa las reglas de Firestore.', true);
    });
}

// El formulario es controlado desde el HTML para evitar cualquier envío nativo
// (y recarga) incluso si Firebase no llega a cargar este módulo.
window.guardarSeccionOpinion = async () => {
    if (btnGuardarSeccion.disabled) return;
    const nombre = inputSeccion.value.trim().replace(/\s+/g, ' ');
    if (!nombre || nombre.length > 60) return informarSeccion('El nombre debe tener entre 1 y 60 caracteres.', true);
    if (seccionesOpinionAdmin.some(s => s.id !== seccionEnEdicion && s.nombre.toLocaleLowerCase('es') === nombre.toLocaleLowerCase('es'))) {
        return informarSeccion('Ya existe una sección con ese nombre.', true);
    }
    btnGuardarSeccion.disabled = true;
    try {
        if (seccionEnEdicion) {
            await updateDoc(doc(db, 'secciones_opinion', seccionEnEdicion), { nombre });
            informarSeccion('Sección actualizada. El menú y las columnas se actualizarán automáticamente.');
        } else {
            await addDoc(collection(db, 'secciones_opinion'), { nombre });
            informarSeccion('Sección creada correctamente. Ya puedes asignarle columnas.');
        }
        reiniciarEditorSeccion();
    } catch (error) {
        console.error('Error al guardar sección:', error);
        informarSeccion(error.code === 'permission-denied'
            ? 'Firebase rechazó el guardado. Verifica que publicaste las reglas con permisos para secciones_opinion y que tu cuenta sea administradora.'
            : 'No se pudo guardar la sección: ' + (error.message || 'Error desconocido.'), true);
    } finally {
        btnGuardarSeccion.disabled = false;
    }
};

async function eliminarSeccionOpinion(seccion) {
    if (!confirm(`¿Eliminar la sección "${seccion.nombre}"? Las columnas que pertenezcan a ella pasarán a General, sin perder contenido, comentarios ni destacado general.`)) return;
    btnGuardarSeccion.disabled = true;
    try {
        // Se reasignan antes de borrar para no dejar columnas apuntando a una sección inexistente.
        const columnas = await getDocs(query(collection(db, 'noticias'), where('seccionId', '==', seccion.id)));
        const documentos = columnas.docs;
        // Firestore permite un máximo de 500 operaciones por lote.
        for (let i = 0; i < documentos.length; i += 450) {
            const lote = writeBatch(db);
            documentos.slice(i, i + 450).forEach(d => {
                lote.update(d.ref, { seccionId: null, principalSeccion: false });
            });
            await lote.commit();
        }
        await deleteDoc(doc(db, 'secciones_opinion', seccion.id));
        if (seccionEnEdicion === seccion.id) reiniciarEditorSeccion();
        informarSeccion(`${seccion.nombre} eliminada. ${documentos.length} columna(s) se movieron a General.`);
    } catch (error) {
        console.error('Error al borrar sección:', error);
        informarSeccion('No se pudo completar la eliminación. La sección se conservará hasta completar la operación.', true);
    } finally {
        btnGuardarSeccion.disabled = false;
    }
}

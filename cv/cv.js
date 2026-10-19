import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

// Tu Firebase
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

// ==========================================
// 1. SISTEMA DE AUTENTICACIÓN Y NAVBAR
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
                <img src="${u.photoURL || 'https://via.placeholder.com/42'}" class="rounded-circle shadow-sm" style="width: 40px; height: 40px; object-fit: cover; border: 2px solid rgba(255,255,255,0.4);">
            </div>
            <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-3 rounded-4 py-2" style="min-width: 250px; z-index: 1070; right: 0;">
                <li class="px-4 py-3 border-bottom mb-2 text-center">
                    <img src="${u.photoURL || 'https://via.placeholder.com/60'}" class="rounded-circle mb-3 shadow-sm border" style="width: 55px; height: 55px; object-fit: cover;">
                    <span class="fw-bold font-inter text-dark d-block text-truncate mb-2" style="max-width: 210px; margin: 0 auto; font-size: 1.05rem;">${u.displayName || 'Usuario'}</span>
                    <span class="badge font-inter px-3 py-1 rounded-pill shadow-sm text-white" id="user-plan-badge" style="background-color: #6c757d;">Usuario</span>
                </li>
                <li><a class="dropdown-item fw-bold text-danger py-2 cursor-pointer font-inter text-center hover-bg-light rounded-bottom-4" id="btn-logout-dropdown"><i class="bi bi-box-arrow-right me-2"></i> Cerrar Sesión</a></li>
            </ul>
        `;
        document.getElementById('btn-logout-dropdown').onclick = () => signOut(auth);

        onSnapshot(doc(db, "usuarios", u.uid), (d) => {
            const badge = document.getElementById('user-plan-badge');
            if(d.exists() && d.data().owner) {
                if(badge) { badge.innerText = 'Administrador'; badge.style.backgroundColor = '#004b79'; }
            } else {
                if(badge) { badge.innerText = 'Usuario'; badge.style.backgroundColor = '#6c757d'; }
            }
        });
    } else {
        btnLogin.classList.remove('d-none');
        ddCont.classList.add('d-none');
    }
});

// ==========================================
// 2. LÓGICA DEL EDITOR Y PLANTILLAS
// ==========================================
const templates = {
    harvard: `
        <h1>Cristhian Daniel</h1>
        <div class="contact-info">Piura, Perú | +51 942 000 000 | cristhian@unp.edu.pe | linkedin.com/in/cristhian-daniel</div>
        
        <div class="section-title">PERFIL PROFESIONAL</div>
        <p>Estudiante de Economía en la Universidad Nacional de Piura (UNP) especializado en econometría aplicada y matemáticas financieras. Desarrollador de herramientas tecnológicas y plataformas web (HTML, CSS, JS, Firebase) orientadas a la investigación académica. Capacidad para liderar proyectos combinando análisis de datos de panel con soluciones Full-Stack.</p>
        
        <div class="section-title">EXPERIENCIA PROFESIONAL</div>
        <div>
            <div class="item-header"><span>Creador y Desarrollador Web Full-Stack</span><span>Oct 2026 – Presente</span></div>
            <div class="item-sub">Plataforma de Investigación "VEST"</div>
            <ul>
                <li>Diseñé e implementé una red académica integrando Bootstrap 5 y Firebase Auth, incrementando la accesibilidad de usuarios.</li>
                <li>Desarrollé reglas de seguridad en Cloud Firestore para proteger datos.</li>
            </ul>
        </div>

        <div class="section-title">EDUCACIÓN</div>
        <div>
            <div class="item-header"><span>Universidad Nacional de Piura (UNP)</span><span>2022 – 2026</span></div>
            <div class="item-sub">Bachiller en Economía</div>
            <ul>
                <li>Investigación destacada: Análisis de determinantes de morosidad usando bases del BCRP y SBS.</li>
            </ul>
        </div>
    `,
    executive: `
        <h1>Cristhian Daniel</h1>
        <div class="contact-info">
            Piura, Perú | cristhian@unp.edu.pe | linkedin.com/in/cristhian-daniel
        </div>
        
        <div class="section-title">Perfil</div>
        <p>Economista en formación y Desarrollador Full-Stack. Combino el rigor analítico de la econometría con la creación de ecosistemas web robustos.</p>
        <hr>
        <div class="section-title">Experiencia</div>
        <div>
            <div class="item-header"><span>Plataforma "VEST" - Lead Developer</span><span>2026</span></div>
            <ul><li>Lideré la creación de una plataforma académica desde cero usando JS y Firebase.</li></ul>
        </div>
    `,
    blank: `
        <h1>Nombre Apellido</h1>
        <div class="contact-info">Ciudad | Correo | Teléfono</div>
        <hr>
        <div class="section-title">SECCIÓN NUEVA</div>
        <p>Escribe tu contenido aquí...</p>
    `
};

const editor = document.getElementById('cv-document');
const tplSelector = document.getElementById('cv-template');
let debounceTimer;

document.addEventListener('DOMContentLoaded', () => {
    editor.innerHTML = templates.harvard;
    analizarATS();
});

tplSelector.addEventListener('change', (e) => {
    editor.className = `cv-page theme-${e.target.value} shadow`;
    editor.innerHTML = templates[e.target.value];
    analizarATS();
});

document.getElementById('doc-margin').addEventListener('change', (e) => editor.setAttribute('data-margin', e.target.value));
document.getElementById('doc-lineheight').addEventListener('change', (e) => editor.setAttribute('data-lineheight', e.target.value));

editor.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(analizarATS, 800);
});

// Función Global para borrar todas las líneas (hr)
window.borrarLineas = () => {
    const lineas = editor.querySelectorAll('hr');
    if (lineas.length === 0) return alert("No hay líneas separadoras en el documento.");
    lineas.forEach(l => l.remove());
    analizarATS();
};

// =========================================
// 3. MOTOR ATS AVANZADO
// =========================================
function analizarATS() {
    const html = editor.innerHTML;
    const text = editor.innerText;
    const textLower = text.toLowerCase();
    
    let score = 0;
    let feedback = [];
    
    // 1. Conteo
    const words = text.match(/\b\w+\b/g) || [];
    document.getElementById('stat-words').innerText = words.length;
    
    if (words.length < 150) feedback.push('<li class="text-danger mb-2"><i class="bi bi-x-circle me-1"></i> CV muy corto. Detalla más tus logros (Ideal 300+).</li>');
    else if (words.length > 800) { feedback.push('<li class="text-warning mb-2"><i class="bi bi-exclamation-triangle me-1"></i> CV extenso. Trata de resumir.</li>'); score += 10; }
    else { feedback.push('<li class="text-success mb-2"><i class="bi bi-check-circle me-1"></i> Longitud óptima.</li>'); score += 25; }

    // 2. Secciones
    if (/experiencia|experience/i.test(textLower) && /educación|education/i.test(textLower)) {
        score += 25;
        feedback.push('<li class="text-success mb-2"><i class="bi bi-check-circle me-1"></i> Estructura base completa.</li>');
    } else {
        feedback.push(`<li class="text-danger mb-2"><i class="bi bi-x-circle me-1"></i> Faltan secciones clave (Experiencia, Educación).</li>`);
    }

    // 3. Métricas
    const numbers = text.match(/\d+%|\d+x|\$\d+|\d+\s*(usuarios|datos|meses|años)/gi) || [];
    document.getElementById('stat-metrics').innerText = numbers.length;
    
    if (numbers.length >= 2) { score += 25; feedback.push('<li class="text-success mb-2"><i class="bi bi-check-circle me-1"></i> Uso excelente de métricas.</li>'); }
    else { feedback.push('<li class="text-warning mb-2"><i class="bi bi-exclamation-triangle me-1"></i> Añade números y porcentajes a tus logros.</li>'); score += 10; }

    // 4. Verbos
    const verbosAccion = ['diseñé', 'implementé', 'lideré', 'desarrollé', 'optimicé', 'programé', 'gestioné', 'aumenté', 'creé'];
    let verbosEncontrados = verbosAccion.filter(v => textLower.includes(v));

    const verbsContainer = document.getElementById('ats-verbs');
    verbsContainer.innerHTML = verbosEncontrados.length > 0 ? verbosEncontrados.map(v => `<span class="verb-badge">${v}</span>`).join('') : '<span class="text-muted small">No se detectaron.</span>';

    if (verbosEncontrados.length >= 3) score += 25;
    else { feedback.push('<li class="text-danger mb-2"><i class="bi bi-x-circle me-1"></i> Usa verbos de acción fuertes al iniciar oraciones.</li>'); score += 10; }

    // UI Actualización
    const scoreCircle = document.getElementById('ats-circle-path');
    const scoreText = document.getElementById('ats-score');
    const msg = document.getElementById('ats-feedback-msg');
    
    scoreText.innerText = score;
    scoreCircle.setAttribute('stroke-dasharray', `${score}, 100`);
    document.getElementById('ats-improvements').innerHTML = feedback.join('');

    if (score >= 80) { scoreCircle.setAttribute('stroke', '#10b981'); msg.innerHTML = '<span class="text-success fw-bold">¡CV Optimizado!</span>'; }
    else if (score >= 50) { scoreCircle.setAttribute('stroke', '#f59e0b'); msg.innerHTML = '<span class="text-warning fw-bold">Aceptable. Puede mejorar.</span>'; }
    else { scoreCircle.setAttribute('stroke', '#ef4444'); msg.innerHTML = '<span class="text-danger fw-bold">Riesgo de rechazo ATS.</span>'; }
}

// =========================================
// 4. EXPORTAR PDF
// =========================================
document.getElementById('btn-export-pdf').addEventListener('click', () => {
    editor.classList.remove('shadow'); // Quitar sombra para imprimir
    html2pdf().set({
        margin: 0, filename: 'Mi_Curriculum.pdf', image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(editor).save().then(() => editor.classList.add('shadow'));
});

// =========================================
// 5. ASISTENTE IA (CREACIÓN COMPLETA O MEJORA)
// =========================================
const aiMode = document.getElementById('ai-mode');
const aiPromptLabel = document.getElementById('ai-prompt-label');
const aiInput = document.getElementById('ai-input-text');
const aiOutput = document.getElementById('ai-output-text');
const btnGenerar = document.getElementById('btn-generar-ia');
const btnAplicar = document.getElementById('btn-aplicar-ia');

aiMode.addEventListener('change', (e) => {
    if (e.target.value === 'full') {
        aiPromptLabel.innerText = "2. Cuéntale a la IA toda tu historia (Educación, Experiencia, Habilidades):";
        aiInput.placeholder = "Me llamo Cristhian Daniel, estudio Economía en la UNP, trabajé en un proyecto llamado VEST usando HTML y Firebase...";
    } else {
        aiPromptLabel.innerText = "2. Pega el fragmento de texto que quieres mejorar:";
        aiInput.placeholder = "Ej: Hice una pagina web y soy bueno en econometria.";
    }
});

btnGenerar.addEventListener('click', async () => {
    const text = aiInput.value.trim();
    if (!text) return alert("Por favor, ingresa los datos o el texto solicitado.");

    const mode = aiMode.value;
    const apiKey = document.getElementById('gemini-api-key').value.trim();
    
    if (mode === 'full' && !apiKey) return alert("Para generar un CV COMPLETO necesitas ingresar tu API Key de Gemini. El procesamiento es complejo.");

    btnGenerar.disabled = true;
    btnGenerar.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    if (apiKey) {
        let promptText = "";
        
        if (mode === 'full') {
            promptText = `Actúa como un reclutador experto en sistemas ATS. Construye un currículum vitae COMPLETO basándote en la siguiente información del usuario: "${text}". 
            REGLA ESTRICTA: Devuelve ÚNICAMENTE CÓDIGO HTML CRUDO. Usa estrictamente esta estructura de clases: 
            <h1>Nombre del Usuario</h1>
            <div class="contact-info">Información de contacto (invento profesional si no hay)</div>
            <div class="section-title">PERFIL PROFESIONAL</div><p>Resumen atractivo con métricas y verbos de acción...</p>
            <div class="section-title">EXPERIENCIA PROFESIONAL</div><div><div class="item-header"><span>Puesto</span><span>Fecha</span></div><ul><li>Logro 1</li></ul></div>
            <div class="section-title">EDUCACIÓN</div>...
            No envuelvas el resultado en \`\`\`html ni uses markdown, solo el texto HTML puro listo para inyectar.`;
        } else {
            promptText = `Mejora este texto para un CV. Hazlo sonar profesional, usa verbos de acción y métricas. Devuelve solo el HTML de un párrafo <p> o viñetas <ul><li>: "${text}"`;
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
            });
            const data = await response.json();
            if (data.candidates) {
                // Limpiar posibles bloques de markdown que Gemini a veces manda
                let cleanHTML = data.candidates[0].content.parts[0].text.trim();
                cleanHTML = cleanHTML.replace(/^```html/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
                aiOutput.value = cleanHTML;
            } else { throw new Error("Sin respuesta"); }
        } catch (error) {
            alert("Error con la API de Gemini. Revisa tu Key.");
        }
    } else {
        // Simulación solo si es modo 'Mejorar'
        setTimeout(() => {
            aiOutput.value = `<p>Desarrollé y lideré estrategias innovadoras, optimizando los resultados generales en un 20% y garantizando un impacto positivo.</p>`;
            btnGenerar.innerHTML = '<i class="bi bi-stars"></i> Generar';
            btnGenerar.disabled = false;
        }, 1500);
    }
    
    btnGenerar.innerHTML = '<i class="bi bi-stars"></i> Generar';
    btnGenerar.disabled = false;
});

// Reemplazar todo el editor con lo generado
btnAplicar.addEventListener('click', () => {
    if (!aiOutput.value) return alert("Primero genera un resultado con la IA.");
    
    if (aiMode.value === 'full') {
        if(confirm("¿Estás seguro? Esto borrará el CV actual y lo reemplazará por el generado por la IA.")) {
            editor.innerHTML = aiOutput.value;
            analizarATS();
            bootstrap.Modal.getInstance(document.getElementById('modalAI')).hide();
        }
    } else {
        // En modo mejora, usa el execCommand para pegarlo donde estaba el cursor
        document.execCommand('insertHTML', false, aiOutput.value);
        analizarATS();
        bootstrap.Modal.getInstance(document.getElementById('modalAI')).hide();
    }
});

// Contenido Pre-llenado (Optimizado con tu perfil implícito para máximo score ATS)
const harvardHTML = `
<div style="width:100%;">
    <h1>Cristhian Daniel</h1>
    <div class="contact-info">
        Piura, Perú | +51 900 000 000 | cristhian.daniel@unp.edu.pe | linkedin.com/in/cristhian-daniel
    </div>

    <div class="section-title">Resumen Profesional</div>
    <p>Estudiante de Economía en la Universidad Nacional de Piura (UNP) con sólida formación en econometría aplicada y matemáticas financieras. Especialista en la creación de herramientas tecnológicas y plataformas web para la investigación académica. Capacidad probada para liderar proyectos interdisciplinarios, fusionando el análisis de datos (modelos GMM, datos de panel) con el desarrollo Full-Stack.</p>

    <div class="section-title">Educación</div>
    <div>
        <span class="job-title">Universidad Nacional de Piura (UNP)</span>
        <span class="job-date">2022 - Presente</span>
        <div class="job-company">Bachiller en Economía</div>
        <ul>
            <li>Destacado en cursos de Econometría, Matemáticas Financieras y Economía Internacional.</li>
            <li>Investigación académica sobre determinantes de la morosidad utilizando bases del BCRP y SBS.</li>
        </ul>
    </div>

    <div class="section-title">Experiencia y Proyectos</div>
    <div>
        <span class="job-title">Desarrollador y Creador</span>
        <span class="job-date">2026</span>
        <div class="job-company">Plataforma Web de Investigación "VEST"</div>
        <ul>
            <li>Diseñé e implementé una plataforma web integral utilizando HTML, CSS, JavaScript y Bootstrap 5.</li>
            <li>Integré sistemas de autenticación de usuarios y bases de datos en tiempo real mediante Firebase y Cloud Firestore.</li>
            <li>Optimicé el panel de control y el feed de usuarios para mejorar la experiencia de interacción académica.</li>
        </ul>
    </div>
    <div style="margin-top:15px;">
        <span class="job-title">Desarrollador de Sistemas Lógicos</span>
        <span class="job-date">2026</span>
        <div class="job-company">Proyectos Interactivos (Godot Engine & Roblox Studio)</div>
        <ul>
            <li>Programé máquinas de estado, lógicas de movimiento y mezcla de animaciones avanzadas en GDScript.</li>
            <li>Desarrollé interfaces de usuario (UI), sistemas de inventario y lógicas de inteligencia artificial en Luau.</li>
        </ul>
    </div>

    <div class="section-title">Habilidades Técnicas</div>
    <ul>
        <li><strong>Análisis Económico:</strong> Econometría aplicada, Datos de Panel (System GMM), Macroeconomía Cuantitativa.</li>
        <li><strong>Desarrollo Web:</strong> HTML, CSS, JavaScript, Bootstrap 5, Firebase Auth, Firestore.</li>
        <li><strong>Software y Herramientas:</strong> EViews, Godot Engine (GDScript), Roblox Studio (Luau), Git.</li>
    </ul>
</div>
`;

// Variables globales
const editor = document.getElementById('cv-document');
const themeSelector = document.getElementById('cv-theme-selector');

// Inicializar el editor
document.addEventListener('DOMContentLoaded', () => {
    editor.innerHTML = harvardHTML;
    evaluarATS();
});

// Escuchar cambios en el editor para recalcular ATS en tiempo real
editor.addEventListener('input', () => {
    evaluarATS();
});

// Cambiar Formato (Tema)
themeSelector.addEventListener('change', (e) => {
    const val = e.target.value;
    
    if (val === 'harvard') {
        editor.className = 'cv-page theme-harvard shadow-lg position-relative';
        editor.innerHTML = harvardHTML; // Reiniciamos al texto estructurado base para evitar que se rompa el CSS
    } else {
        editor.className = 'cv-page theme-modern shadow-lg position-relative';
        // Estructura moderna inyectada
        editor.innerHTML = `
        <div class="modern-left">
            <div class="cv-image-container" contenteditable="false">
                <img src="https://via.placeholder.com/150" alt="Foto Perfil" onclick="this.src = prompt('Pega la URL de tu imagen (Ej: https://...):', this.src) || this.src">
            </div>
            <h2 style="font-size: 16pt; text-align:center; font-weight:700;">Cristhian Daniel</h2>
            <p style="text-align:center; font-size:10pt;">Economista & Desarrollador</p>
            
            <div class="section-title">Contacto</div>
            <p style="font-size:10pt; margin-bottom:5px;"><i class="bi bi-geo-alt"></i> Piura, Perú</p>
            <p style="font-size:10pt; margin-bottom:5px;"><i class="bi bi-envelope"></i> correo@unp.edu.pe</p>
            <p style="font-size:10pt; margin-bottom:5px;"><i class="bi bi-linkedin"></i> /in/cristhian-daniel</p>
            
            <div class="section-title">Skills</div>
            <ul style="font-size:10pt; padding-left:15px;">
                <li>Econometría y Análisis</li>
                <li>HTML, CSS, JS</li>
                <li>Firebase & Firestore</li>
            </ul>
        </div>
        <div class="modern-right">
            <h1>Perfil Profesional</h1>
            <p>Estudiante de Economía en la UNP, fusionando el análisis de datos con el desarrollo web. Creador de la plataforma VEST y experto en sistemas lógicos interactivos.</p>
            
            <div class="section-title">Experiencia</div>
            <div>
                <strong>Creador y Desarrollador Full-Stack</strong><br>
                <em>Plataforma VEST | 2026</em>
                <ul style="font-size:10pt; margin-top:5px;">
                    <li>Desarrollo de plataforma con Firebase y Bootstrap.</li>
                    <li>Gestión de reglas de seguridad y autenticación.</li>
                </ul>
            </div>
            
            <div class="section-title">Educación</div>
            <div>
                <strong>Bachiller en Economía</strong><br>
                <em>Universidad Nacional de Piura | Presente</em>
            </div>
        </div>
        `;
    }
    evaluarATS();
});

// Lógica del Evaluador ATS (Sistema de Rastreo de Candidatos)
function evaluarATS() {
    let score = 0;
    const text = editor.innerText.toLowerCase();
    const html = editor.innerHTML.toLowerCase();
    const checklist = document.getElementById('ats-checklist');
    const circle = document.getElementById('ats-circle');
    const scoreText = document.getElementById('ats-score');

    let checks = [];

    // 1. Verificación de Formato (Si es Moderno, pierde puntos porque ATS odia columnas e imágenes)
    const isHarvard = editor.classList.contains('theme-harvard');
    if (isHarvard) {
        score += 40;
        checks.push('<li class="list-group-item px-0 text-success border-0 py-1"><i class="bi bi-check-circle-fill me-2"></i> Formato limpio (Harvard)</li>');
        checks.push('<li class="list-group-item px-0 text-success border-0 py-1"><i class="bi bi-check-circle-fill me-2"></i> Sin elementos gráficos complejos</li>');
    } else {
        score += 10;
        checks.push('<li class="list-group-item px-0 text-danger border-0 py-1"><i class="bi bi-x-circle-fill me-2"></i> Formato de columnas (Riesgo ATS)</li>');
        checks.push('<li class="list-group-item px-0 text-danger border-0 py-1"><i class="bi bi-x-circle-fill me-2"></i> Imagen detectada (No legible por ATS)</li>');
    }

    // 2. Extensión del CV (Mayor a 150 palabras)
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 150) {
        score += 20;
        checks.push('<li class="list-group-item px-0 text-success border-0 py-1"><i class="bi bi-check-circle-fill me-2"></i> Longitud óptima de texto</li>');
    } else {
        checks.push('<li class="list-group-item px-0 text-danger border-0 py-1"><i class="bi bi-x-circle-fill me-2"></i> Muy corto (Añade más detalles)</li>');
    }

    // 3. Verbos de Acción
    const actionVerbs = ['diseñé', 'implementé', 'lideré', 'desarrollé', 'optimicé', 'programé', 'investigación', 'creación', 'creé'];
    const foundVerbs = actionVerbs.filter(v => text.includes(v));
    if (foundVerbs.length >= 3) {
        score += 20;
        checks.push('<li class="list-group-item px-0 text-success border-0 py-1"><i class="bi bi-check-circle-fill me-2"></i> Verbos de acción orientados a logros</li>');
    } else {
        checks.push('<li class="list-group-item px-0 text-danger border-0 py-1"><i class="bi bi-x-circle-fill me-2"></i> Faltan verbos de acción fuertes</li>');
    }

    // 4. Palabras Clave de la Industria (Economía / Web)
    const keywords = ['econometría', 'datos', 'html', 'css', 'javascript', 'firebase', 'análisis', 'bootstrap'];
    const foundKeys = keywords.filter(k => text.includes(k));
    if (foundKeys.length >= 4) {
        score += 20;
        checks.push('<li class="list-group-item px-0 text-success border-0 py-1"><i class="bi bi-check-circle-fill me-2"></i> Buena densidad de palabras clave</li>');
    } else {
        checks.push('<li class="list-group-item px-0 text-danger border-0 py-1"><i class="bi bi-x-circle-fill me-2"></i> Faltan palabras clave (Hard Skills)</li>');
    }

    // Actualizar UI
    scoreText.innerText = score;
    checklist.innerHTML = checks.join('');

    let color = '#ef4444'; // Rojo
    if (score >= 80) color = '#10b981'; // Verde
    else if (score >= 50) color = '#f59e0b'; // Amarillo

    document.documentElement.style.setProperty('--ats-color', color);
    circle.style.background = `conic-gradient(${color} ${score}%, #f1f5f9 ${score}%)`;
}

// Descargar PDF usando html2pdf.js
document.getElementById('btn-export-pdf').addEventListener('click', () => {
    const element = document.getElementById('cv-document');
    
    // Configuración para mantener máxima calidad A4
    const opt = {
        margin:       0,
        filename:     'Mi_CV_Profesional.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Agregar clase temporal para quitar sombras/bordes al renderizar
    element.style.boxShadow = 'none';
    element.style.transform = 'scale(1)';
    
    html2pdf().set(opt).from(element).save().then(() => {
        // Restaurar estilos
        element.style.boxShadow = '';
    });
});

// =========================================
// ASISTENTE DE INTELIGENCIA ARTIFICIAL
// =========================================
const aiInput = document.getElementById('ai-input-text');
const aiOutput = document.getElementById('ai-output-text');
const btnGenerarIA = document.getElementById('btn-generar-ia');
const btnAplicarIA = document.getElementById('btn-aplicar-ia');

// Capturar texto seleccionado del editor al abrir el modal
document.getElementById('modalAI').addEventListener('show.bs.modal', () => {
    const selection = window.getSelection().toString();
    if(selection.trim().length > 0) {
        aiInput.value = selection;
    }
});

// Función para invocar a Gemini API o usar simulación
btnGenerarIA.addEventListener('click', async () => {
    const text = aiInput.value.trim();
    if (!text) return alert("Por favor, ingresa o selecciona un texto.");

    const apiKey = document.getElementById('gemini-api-key').value.trim();
    
    btnGenerarIA.disabled = true;
    btnGenerarIA.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Analizando...';

    if (apiKey) {
        // Llamada real a la API de Gemini (Google)
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Actúa como un experto reclutador. Reescribe el siguiente texto para un CV. Debe sonar extremadamente profesional, usar verbos de acción fuertes y estar orientado a resultados o logros. Mantenlo conciso. Texto original: "${text}"`
                        }]
                    }]
                })
            });
            const data = await response.json();
            if (data.candidates && data.candidates.length > 0) {
                aiOutput.value = data.candidates[0].content.parts[0].text.trim();
            } else {
                throw new Error("Respuesta inválida de la API");
            }
        } catch (error) {
            alert("Error con la API de Gemini. Revisa tu Key.");
            aiOutput.value = "";
        }
    } else {
        // Simulación inteligente mediante reglas locales si no hay API Key
        setTimeout(() => {
            let mejora = text
                .replace(/hice/gi, 'Desarrollé e implementé')
                .replace(/trabajé en/gi, 'Lideré la ejecución de')
                .replace(/ayudé/gi, 'Colaboré estratégicamente en')
                .replace(/creé/gi, 'Diseñé y programé')
                .replace(/bueno en/gi, 'Altamente capacitado en');
            
            aiOutput.value = `✔ ${mejora} (Nota: Añade tu API Key para redacciones generativas completas con IA).`;
            btnGenerarIA.innerHTML = 'Generar Mejora';
            btnGenerarIA.disabled = false;
        }, 1500);
    }
    
    if (apiKey) {
        btnGenerarIA.innerHTML = 'Generar Mejora';
        btnGenerarIA.disabled = false;
    }
    
    btnAplicarIA.classList.remove('d-none');
});

// Reemplazar texto en el CV (requiere reemplazar texto exacto seleccionado)
btnAplicarIA.addEventListener('click', () => {
    const original = aiInput.value;
    const mejora = aiOutput.value.replace('✔ ', '');
    
    if (original && mejora) {
        // Usar la función de reemplazo de contenido
        editor.innerHTML = editor.innerHTML.replace(original, mejora);
        evaluarATS();
        bootstrap.Modal.getInstance(document.getElementById('modalAI')).hide();
        aiOutput.value = '';
        btnAplicarIA.classList.add('d-none');
    }
});

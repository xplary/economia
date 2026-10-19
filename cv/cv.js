// Plantillas base inyectando tus datos reales para que sea profesional y funcional
const templates = {
    harvard: `
        <h1>Cristhian Daniel</h1>
        <div class="contact-info">Piura, Perú | +51 942 000 000 | cristhian@unp.edu.pe | linkedin.com/in/cristhian-daniel</div>
        
        <div class="section-title">PERFIL PROFESIONAL</div>
        <p>Estudiante de Economía en la Universidad Nacional de Piura (UNP) especializado en econometría aplicada y matemáticas financieras. Desarrollador de herramientas tecnológicas y plataformas web (HTML, CSS, JS, Firebase) orientadas a la investigación académica. Capacidad para liderar proyectos combinando análisis de datos de panel (System GMM) con soluciones Full-Stack.</p>
        
        <div class="section-title">EXPERIENCIA PROFESIONAL</div>
        <div>
            <div class="item-header"><span>Creador y Desarrollador Web Full-Stack</span><span>Oct 2026 – Presente</span></div>
            <div class="item-sub">Plataforma de Investigación "VEST"</div>
            <ul>
                <li>Diseñé e implementé una red académica integrando Bootstrap 5 y Firebase Auth, incrementando la accesibilidad de 100+ usuarios.</li>
                <li>Desarrollé reglas de seguridad en Cloud Firestore para proteger datos y optimicé el feed interactivo.</li>
            </ul>
        </div>
        <br>
        <div>
            <div class="item-header"><span>Desarrollador de Sistemas Lógicos e IA</span><span>Ago 2026 – Sep 2026</span></div>
            <div class="item-sub">Godot Engine & Roblox Studio (Luau)</div>
            <ul>
                <li>Programé mecánicas avanzadas (máquinas de estado, animaciones) para proyectos interactivos tácticos.</li>
                <li>Optimicé el rendimiento de algoritmos de inteligencia artificial para gestión de inventarios y UI.</li>
            </ul>
        </div>

        <div class="section-title">EDUCACIÓN</div>
        <div>
            <div class="item-header"><span>Universidad Nacional de Piura (UNP)</span><span>2022 – 2026</span></div>
            <div class="item-sub">Bachiller en Economía</div>
            <ul>
                <li>Investigación destacada: Análisis de determinantes de morosidad usando bases del BCRP y SBS.</li>
                <li>Cursos relevantes: Econometría Aplicada, Macroeconomía Cuantitativa, Matemáticas Financieras.</li>
            </ul>
        </div>

        <div class="section-title">HABILIDADES TÉCNICAS</div>
        <ul>
            <li><strong>Análisis de Datos:</strong> Modelos GMM, EViews, Excel Avanzado, Análisis Financiero.</li>
            <li><strong>Desarrollo de Software:</strong> HTML, CSS, JavaScript, Bootstrap 5, Firebase, Luau, GDScript, Git.</li>
        </ul>
    `,
    executive: `
        <h1>Cristhian Daniel</h1>
        <div class="contact-info">
            <i class="bi bi-geo-alt-fill"></i> Piura, Perú &nbsp;&nbsp;|&nbsp;&nbsp; 
            <i class="bi bi-envelope-fill"></i> cristhian@unp.edu.pe &nbsp;&nbsp;|&nbsp;&nbsp; 
            <i class="bi bi-linkedin"></i> /in/cristhian-daniel
        </div>
        
        <div class="section-title">Perfil</div>
        <p>Economista en formación y Desarrollador Full-Stack. Combino el rigor analítico de la econometría con la creación de ecosistemas web robustos. Orientado a resultados, con experiencia demostrable en desarrollo con bases de datos en tiempo real y modelado de datos macroeconómicos.</p>
        
        <div class="section-title">Experiencia</div>
        <div>
            <div class="item-header"><span>Plataforma "VEST" - Lead Developer</span><span>2026</span></div>
            <div class="item-sub">Desarrollo Web & Bases de Datos</div>
            <ul>
                <li>Lideré la creación de una plataforma académica desde cero usando JS y Firebase.</li>
                <li>Gestioné bases de datos Firestore, asegurando tiempos de respuesta menores a 200ms.</li>
            </ul>
        </div>
        <div>
            <div class="item-header"><span>Proyectos Lógicos (Godot / Roblox)</span><span>2026</span></div>
            <div class="item-sub">Programación de Sistemas (GDScript / Luau)</div>
            <ul>
                <li>Implementé inteligencia artificial y máquinas de estado para NPCs y mecánicas tácticas.</li>
            </ul>
        </div>

        <div class="section-title">Educación</div>
        <div>
            <div class="item-header"><span>Bachiller en Economía</span><span>UNP (2022 - 2026)</span></div>
            <ul>
                <li>Especialización en modelos de datos de panel y morosidad financiera (BCRP/SBS).</li>
            </ul>
        </div>
        
        <div class="section-title">Core Skills</div>
        <ul>
            <li>Econometría (GMM), Macroeconomía, EViews.</li>
            <li>HTML5, CSS3, JavaScript, Bootstrap 5, Cloud Firestore.</li>
        </ul>
    `
};

// Variables DOM
const editor = document.getElementById('cv-document');
const tplSelector = document.getElementById('cv-template');
const marginSelector = document.getElementById('doc-margin');
const lineheightSelector = document.getElementById('doc-lineheight');
let debounceTimer;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    editor.innerHTML = templates.harvard;
    analizarATS();
});

// Cambios de Configuración Global (Diseño Word-like)
tplSelector.addEventListener('change', (e) => {
    editor.className = `cv-page theme-${e.target.value} shadow`;
    editor.innerHTML = templates[e.target.value];
    analizarATS();
});

marginSelector.addEventListener('change', (e) => {
    editor.setAttribute('data-margin', e.target.value);
});

lineheightSelector.addEventListener('change', (e) => {
    editor.setAttribute('data-lineheight', e.target.value);
});

// Escuchar cambios de texto para ATS (con Anti-lag/Debounce)
editor.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(analizarATS, 800);
});

// =========================================
// MOTOR ATS AVANZADO
// =========================================
function analizarATS() {
    const html = editor.innerHTML;
    const text = editor.innerText;
    const textLower = text.toLowerCase();
    
    let score = 0;
    let feedback = [];
    
    // 1. Conteo de Palabras
    const words = text.match(/\b\w+\b/g) || [];
    const wordCount = words.length;
    document.getElementById('stat-words').innerText = wordCount;
    
    if (wordCount < 150) {
        feedback.push('<li class="text-danger mb-2"><i class="bi bi-x-circle me-1"></i> CV muy corto. Detalla más tus logros (Ideal 300-600 palabras).</li>');
    } else if (wordCount > 800) {
        feedback.push('<li class="text-warning mb-2"><i class="bi bi-exclamation-triangle me-1"></i> CV muy extenso. Podría ser ignorado.</li>');
        score += 10;
    } else {
        feedback.push('<li class="text-success mb-2"><i class="bi bi-check-circle me-1"></i> Longitud de palabras óptima.</li>');
        score += 25;
    }

    // 2. Detección de Secciones Clave (ATS estándar)
    const hasExp = /experiencia|experience/i.test(textLower);
    const hasEdu = /educación|education|estudios/i.test(textLower);
    const hasSkills = /habilidades|skills|conocimientos/i.test(textLower);
    
    if (hasExp && hasEdu && hasSkills) {
        score += 25;
        feedback.push('<li class="text-success mb-2"><i class="bi bi-check-circle me-1"></i> Secciones estructurales (Exp, Edu, Habilidades) correctas.</li>');
    } else {
        feedback.push(`<li class="text-danger mb-2"><i class="bi bi-x-circle me-1"></i> Faltan secciones clave. Asegúrate de incluir: Experiencia, Educación y Habilidades.</li>`);
    }

    // 3. Detección de Métricas y Números (Crucial para impacto)
    const numbers = text.match(/\d+%|\d+x|\$\d+|\d+\s*(usuarios|datos|meses|años|horas|ms)/gi) || [];
    document.getElementById('stat-metrics').innerText = numbers.length;
    
    if (numbers.length >= 3) {
        score += 25;
        feedback.push('<li class="text-success mb-2"><i class="bi bi-check-circle me-1"></i> Uso excelente de métricas y datos cuantificables.</li>');
    } else {
        feedback.push('<li class="text-warning mb-2"><i class="bi bi-exclamation-triangle me-1"></i> Añade números y porcentajes (Ej: "Aumenté eficiencia en 20%").</li>');
        score += 10; // Da algo por intentarlo
    }

    // 4. Verbos de Acción (Análisis Léxico)
    const verbosAccion = ['diseñé', 'implementé', 'lideré', 'desarrollé', 'optimicé', 'programé', 'gestioné', 'aumenté', 'creé', 'analicé', 'coordiné', 'investigué'];
    let verbosEncontrados = [];
    
    verbosAccion.forEach(v => {
        if (textLower.includes(v)) verbosEncontrados.push(v);
    });

    const verbsContainer = document.getElementById('ats-verbs');
    if (verbosEncontrados.length > 0) {
        verbsContainer.innerHTML = verbosEncontrados.map(v => `<span class="verb-badge">${v}</span>`).join('');
    } else {
        verbsContainer.innerHTML = '<span class="text-muted small">No se detectaron verbos fuertes.</span>';
    }

    if (verbosEncontrados.length >= 4) {
        score += 25;
    } else {
        feedback.push('<li class="text-danger mb-2"><i class="bi bi-x-circle me-1"></i> Inicia tus viñetas con verbos de acción fuertes (ej. Desarrollé, Lideré).</li>');
        score += 10;
    }

    // Actualizar Gauge Chart y UI
    const scoreCircle = document.getElementById('ats-circle-path');
    const scoreText = document.getElementById('ats-score');
    const msg = document.getElementById('ats-feedback-msg');
    
    scoreText.innerText = score;
    scoreCircle.setAttribute('stroke-dasharray', `${score}, 100`);
    document.getElementById('ats-improvements').innerHTML = feedback.join('');

    if (score >= 80) {
        scoreCircle.setAttribute('stroke', '#10b981'); // Verde
        msg.innerHTML = '<span class="text-success fw-bold">¡CV Altamente Optimizado!</span>';
    } else if (score >= 50) {
        scoreCircle.setAttribute('stroke', '#f59e0b'); // Amarillo
        msg.innerHTML = '<span class="text-warning fw-bold">Aceptable. Puede mejorar.</span>';
    } else {
        scoreCircle.setAttribute('stroke', '#ef4444'); // Rojo
        msg.innerHTML = '<span class="text-danger fw-bold">Riesgo de rechazo por ATS.</span>';
    }
}

// =========================================
// EXPORTAR A PDF (Calidad Alta)
// =========================================
document.getElementById('btn-export-pdf').addEventListener('click', () => {
    const opt = {
        margin:       0,
        filename:     'CV_Cristhian_Daniel.pdf',
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Quitamos la sombra para la impresión limpia
    editor.classList.remove('shadow');
    
    html2pdf().set(opt).from(editor).save().then(() => {
        editor.classList.add('shadow');
    });
});

// =========================================
// ASISTENTE GEMINI IA
// =========================================
const aiInput = document.getElementById('ai-input-text');
const aiOutput = document.getElementById('ai-output-text');
const btnGenerar = document.getElementById('btn-generar-ia');

btnGenerar.addEventListener('click', async () => {
    const text = aiInput.value.trim();
    if (!text) return alert("Pega el texto que quieres mejorar.");

    const tone = document.getElementById('ai-tone').value;
    const apiKey = document.getElementById('gemini-api-key').value.trim();
    
    btnGenerar.disabled = true;
    btnGenerar.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    if (apiKey) {
        let promptText = "";
        if(tone === 'profesional') promptText = `Reescribe este texto para un CV. Hazlo sonar muy profesional, formal y corporativo: "${text}"`;
        if(tone === 'logros') promptText = `Reescribe esto enfocándote en métricas, KPIs y logros concretos. Usa verbos de acción fuertes: "${text}"`;
        if(tone === 'ingles') promptText = `Translate this to professional Business English for a resume: "${text}"`;
        if(tone === 'gramatica') promptText = `Corrige la ortografía y gramática de esto sin cambiar su significado original: "${text}"`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
            });
            const data = await response.json();
            if (data.candidates) {
                aiOutput.value = data.candidates[0].content.parts[0].text.trim();
            } else { throw new Error("Sin respuesta"); }
        } catch (error) {
            alert("Error con la API de Gemini. Revisa tu Key.");
        }
    } else {
        // Simulación local según tono
        setTimeout(() => {
            let res = text;
            if(tone === 'profesional') res = "Desarrollé e implementé soluciones integrales, optimizando los procesos y garantizando estándares de alta calidad.";
            if(tone === 'logros') res = "Lideré el proyecto reduciendo tiempos en un 20% e impactando positivamente en el flujo de 100+ usuarios activos mediante tecnologías robustas.";
            if(tone === 'ingles') res = "Spearheaded the development of robust solutions, improving overall efficiency by 20% and successfully delivering the project ahead of schedule.";
            if(tone === 'gramatica') res = text.replace(/hize/gi, 'hice').replace(/proyeto/gi, 'proyecto') + " (Corregido)";
            
            aiOutput.value = `[Demostración Local] -> ${res}\n\n*Pon tu API Key para usar la IA real de Google.*`;
            btnGenerar.innerHTML = '<i class="bi bi-stars"></i> Generar';
            btnGenerar.disabled = false;
        }, 1200);
    }
    
    if(apiKey) {
        btnGenerar.innerHTML = '<i class="bi bi-stars"></i> Generar';
        btnGenerar.disabled = false;
    }
});

document.getElementById('btn-copiar-ia').addEventListener('click', () => {
    if(aiOutput.value) {
        navigator.clipboard.writeText(aiOutput.value);
        alert("¡Texto copiado! Ahora puedes pegarlo en tu CV.");
    }
});

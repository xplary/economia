/* CAFÉ UNP · ¿Tienes un minuto?
   Módulo aislado: no cambia la lógica de artículos, formularios ni destacados.
   El permiso real de publicación/eliminación se valida en Firestore.
*/
import { getApp } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js';
import { getFirestore, doc, collection, addDoc, deleteDoc, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js';

const appMinuto = getApp();
const authMinuto = getAuth(appMinuto);
const dbMinuto = getFirestore(appMinuto);
const seccionMinuto = document.getElementById('tienes-un-minuto');
const lista = document.getElementById('cafe-minuto-lista');
const botonAgregar = document.getElementById('cafe-minuto-agregar');
const flechas = document.getElementById('cafe-minuto-flechas');
const anterior = document.getElementById('cafe-minuto-anterior');
const siguiente = document.getElementById('cafe-minuto-siguiente');
const form = document.getElementById('cafe-minuto-form');
const enlaceInput = document.getElementById('cafe-minuto-url');
const tituloInput = document.getElementById('cafe-minuto-nombre');
const estado = document.getElementById('cafe-minuto-form-status');
const botonGuardar = document.getElementById('cafe-minuto-guardar');
const playerModal = document.getElementById('cafeMinutoPlayer');
const playerContenedor = document.getElementById('cafe-minuto-player-frame');
const playerTitulo = document.getElementById('cafe-minuto-player-title');
const playerLink = document.getElementById('cafe-minuto-player-link');
const editorModal = document.getElementById('cafeMinutoEditor');

let esOwner = false;
let videos = [];
let desuscribirPerfil = null;
const cacheMiniaturas = new Map();

function urlVideoEnlace(raw) {
    let url;
    try { url = new URL(raw.trim()); }
    catch (_) { throw new Error('Pega un enlace válido de YouTube Shorts o TikTok.'); }
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('El enlace debe ser https:// de YouTube o TikTok.');
    const host = url.hostname.toLowerCase();
    const partes = url.pathname.split('/').filter(Boolean);

    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'].includes(host)) {
        let id = '';
        if (host.endsWith('youtu.be')) id = partes[0] || '';
        else if (['shorts', 'embed'].includes(partes[0])) id = partes[1] || '';
        else if (partes[0] === 'watch') id = url.searchParams.get('v') || '';
        if (!/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error('Necesitamos el enlace de un video de YouTube Shorts válido.');
        return { plataforma: 'youtube', idVideo: id, url: `https://www.youtube.com/shorts/${id}` };
    }

    if (['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'].includes(host)) {
        const nombre = partes[0] || '';
        const id = partes[2] || '';
        if (/^@[A-Za-z0-9_.]+$/.test(nombre) && partes[1] === 'video' && /^[0-9]{8,25}$/.test(id)) {
            return { plataforma: 'tiktok', idVideo: id, url: `https://www.tiktok.com/${nombre}/video/${id}` };
        }
    }

    if (['vt.tiktok.com', 'vm.tiktok.com'].includes(host) || (host.endsWith('tiktok.com') && partes[0] === 't')) {
        return { acortado: true, url: url.href };
    }
    throw new Error('Utiliza un enlace de Shorts o un TikTok que contenga /@usuario/video/número.');
}

async function normalizarVideo(raw) {
    const resultado = urlVideoEnlace(raw);
    if (!resultado.acortado) return resultado;
    // El servicio oficial oEmbed puede resolver ciertos enlaces de TikTok compartidos.
    // Si limita las peticiones, pedimos la URL expandida en lugar de guardar un video no reproducible.
    try {
        const respuesta = await fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(resultado.url));
        if (!respuesta.ok) throw new Error('sin acceso');
        const datos = await respuesta.json();
        const id = String(datos.embed_product_id || '');
        const autor = new URL(datos.author_url || 'https://www.tiktok.com');
        const nombre = autor.pathname.split('/').filter(Boolean)[0];
        if (autor.hostname.endsWith('tiktok.com') && /^@[A-Za-z0-9_.]+$/.test(nombre) && /^[0-9]{8,25}$/.test(id)) {
            return { plataforma: 'tiktok', idVideo: id, url: `https://www.tiktok.com/${nombre}/video/${id}` };
        }
    } catch (e) { /* La URL corta no puede resolverse desde el navegador */ }
    throw new Error('No se pudo expandir el TikTok corto. Ábrelo primero y copia la URL completa que termina en /video/número.');
}

function etiquetaPlataforma(plataforma) { return plataforma === 'youtube' ? 'YouTube Shorts' : 'TikTok'; }
function iconoPlataforma(plataforma) { return plataforma === 'youtube' ? 'bi-youtube' : 'bi-tiktok'; }
function esVideoValido(video) {
    if (!video || typeof video.titulo !== 'string') return false;
    try {
        const parsed = urlVideoEnlace(video.url);
        return !parsed.acortado && parsed.idVideo === video.idVideo && parsed.plataforma === video.plataforma;
    } catch (_) { return false; }
}

function mostrarBotonesOwner() {
    botonAgregar.hidden = !esOwner;
    dibujarVideos();
}

function vacio(mensaje, icono='bi-camera-video') {
    const div = document.createElement('div');
    div.className = 'cafe-minuto-empty';
    div.innerHTML = `<i class="bi ${icono}" aria-hidden="true"></i>`;
    const span = document.createElement('span');
    span.textContent = mensaje;
    div.append(span);
    lista.replaceChildren(div);
    flechas.hidden = true;
}

function actualizarFlechas() {
    const puedeMover = lista.scrollWidth > lista.clientWidth + 4;
    flechas.hidden = !puedeMover;
    anterior.disabled = lista.scrollLeft < 4;
    siguiente.disabled = lista.scrollLeft + lista.clientWidth >= lista.scrollWidth - 4;
}

async function miniaturaTikTok(video, img, fondo) {
    const clave = video.idVideo;
    if (cacheMiniaturas.get(clave) === null) return;
    let url = cacheMiniaturas.get(clave);
    if (!url) {
        try {
            const respuesta = await fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(video.url));
            if (!respuesta.ok) throw new Error('Sin miniatura');
            const datos = await respuesta.json();
            const imagen = new URL(datos.thumbnail_url);
            if (imagen.protocol !== 'https:') throw new Error('Miniatura inválida');
            url = imagen.href;
            cacheMiniaturas.set(clave, url);
        } catch (_) { cacheMiniaturas.set(clave, null); return; }
    }
    if (!img.isConnected) return;
    img.src = url;
    img.onload = () => { if (img.isConnected) { img.hidden = false; fondo.hidden = true; } };
    img.onerror = () => { img.hidden = true; fondo.hidden = false; cacheMiniaturas.set(clave, null); };
}

function dibujarVideos() {
    const hayVideos = videos.length > 0;
    // Sin videos, ocultar por completo la sección al público. Los owners
    // siguen viendo solo el botón «Agregar video» para publicar el primero.
    seccionMinuto.hidden = !hayVideos && !esOwner;
    seccionMinuto.classList.toggle('cafe-minuto-sin-videos', !hayVideos);
    if (!hayVideos) {
        lista.replaceChildren();
        lista.setAttribute('aria-busy', 'false');
        flechas.hidden = true;
        return;
    }

    const fragmento = document.createDocumentFragment();
    for (const video of videos) {
        if (!esVideoValido(video)) continue;
        const card = document.createElement('article');
        card.className = 'cafe-minuto-card';

        const abrir = document.createElement('button');
        abrir.type = 'button';
        abrir.className = 'cafe-minuto-open';
        abrir.setAttribute('aria-label', `Reproducir: ${video.titulo}`);
        abrir.addEventListener('click', () => abrirVideo(video));

        if (video.plataforma === 'youtube') {
            const imagen = document.createElement('img');
            imagen.className = 'cafe-minuto-card-image';
            imagen.src = `https://i.ytimg.com/vi/${video.idVideo}/hqdefault.jpg`;
            imagen.alt = '';
            imagen.loading = 'lazy';
            imagen.onerror = () => { imagen.remove(); abrir.prepend(crearFondo(video)); };
            abrir.append(imagen);
        } else {
            const fondo = crearFondo(video);
            const imagen = document.createElement('img');
            imagen.className = 'cafe-minuto-card-image';
            imagen.alt = '';
            imagen.loading = 'lazy';
            imagen.hidden = true;
            abrir.append(fondo, imagen);
            miniaturaTikTok(video, imagen, fondo);
        }

        const degradado = document.createElement('span');
        degradado.className = 'cafe-minuto-card-gradient';
        const plataforma = document.createElement('span');
        plataforma.className = 'cafe-minuto-platform';
        plataforma.innerHTML = `<i class="bi ${iconoPlataforma(video.plataforma)}" aria-hidden="true"></i>`;
        plataforma.append(document.createTextNode(etiquetaPlataforma(video.plataforma)));
        const play = document.createElement('span');
        play.className = 'cafe-minuto-play';
        play.innerHTML = '<i class="bi bi-play-fill" aria-hidden="true"></i>';
        const pie = document.createElement('span');
        pie.className = 'cafe-minuto-caption';
        pie.textContent = video.titulo;
        abrir.append(degradado, plataforma, play, pie);
        card.append(abrir);

        if (esOwner) {
            const borrar = document.createElement('button');
            borrar.type = 'button';
            borrar.className = 'cafe-minuto-delete';
            borrar.title = 'Eliminar video';
            borrar.setAttribute('aria-label', `Eliminar ${video.titulo}`);
            borrar.innerHTML = '<i class="bi bi-trash" aria-hidden="true"></i>';
            borrar.addEventListener('click', async () => {
                if (!esOwner || !authMinuto.currentUser) return;
                if (!confirm(`¿Eliminar el video “${video.titulo}”?`)) return;
                borrar.disabled = true;
                try { await deleteDoc(doc(dbMinuto, 'videos_minuto', video.id)); }
                catch (error) { alert('No se pudo eliminar el video: ' + error.message); borrar.disabled = false; }
            });
            card.append(borrar);
        }
        fragmento.append(card);
    }
    if (!fragmento.childNodes.length) {
        seccionMinuto.hidden = !esOwner;
        seccionMinuto.classList.add('cafe-minuto-sin-videos');
        lista.replaceChildren();
        lista.setAttribute('aria-busy', 'false');
        flechas.hidden = true;
        return;
    }
    lista.replaceChildren(fragmento);
    lista.setAttribute('aria-busy', 'false');
    requestAnimationFrame(actualizarFlechas);
}

function crearFondo(video) {
    const fondo = document.createElement('span');
    fondo.className = 'cafe-minuto-fallback';
    fondo.innerHTML = `<i class="bi ${iconoPlataforma(video.plataforma)}" aria-hidden="true"></i><strong>${etiquetaPlataforma(video.plataforma)}</strong>`;
    return fondo;
}

function abrirVideo(video) {
    if (!esVideoValido(video)) return;
    const iframe = document.createElement('iframe');
    const id = video.idVideo;
    iframe.src = video.plataforma === 'youtube'
        ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`
        : `https://www.tiktok.com/player/v1/${id}?autoplay=1&description=1`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.title = `Reproductor de ${etiquetaPlataforma(video.plataforma)}: ${video.titulo}`;
    playerTitulo.textContent = video.titulo;
    playerLink.href = video.url;
    playerContenedor.replaceChildren(iframe);
    bootstrap.Modal.getOrCreateInstance(playerModal).show();
}

playerModal.addEventListener('hidden.bs.modal', () => playerContenedor.replaceChildren());
editorModal.addEventListener('show.bs.modal', (event) => {
    if (!esOwner || !authMinuto.currentUser) event.preventDefault();
});
editorModal.addEventListener('hidden.bs.modal', () => { form.reset(); estado.textContent = ''; });

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    estado.textContent = '';
    if (!esOwner || !authMinuto.currentUser) { estado.textContent = 'Solo los owners pueden publicar videos.'; return; }
    const titulo = tituloInput.value.trim();
    if (titulo.length < 3 || titulo.length > 100) { estado.textContent = 'Escribe un título de 3 a 100 caracteres.'; return; }
    botonGuardar.disabled = true;
    try {
        const parsed = await normalizarVideo(enlaceInput.value);
        if (videos.some(v => v.plataforma === parsed.plataforma && v.idVideo === parsed.idVideo)) {
            throw new Error('Este video ya está publicado en la sección.');
        }
        await addDoc(collection(dbMinuto, 'videos_minuto'), {
            titulo, ...parsed, autorId: authMinuto.currentUser.uid, creadoEn: serverTimestamp()
        });
        bootstrap.Modal.getOrCreateInstance(editorModal).hide();
    } catch (error) {
        estado.textContent = error.message || 'No se pudo publicar el video. Revisa el enlace y los permisos.';
    } finally {
        botonGuardar.disabled = false;
    }
});

anterior.addEventListener('click', () => lista.scrollBy({ left: -(lista.querySelector('.cafe-minuto-card')?.getBoundingClientRect().width || 250) - 18, behavior: 'smooth' }));
siguiente.addEventListener('click', () => lista.scrollBy({ left: (lista.querySelector('.cafe-minuto-card')?.getBoundingClientRect().width || 250) + 18, behavior: 'smooth' }));
lista.addEventListener('scroll', actualizarFlechas, { passive:true });
window.addEventListener('resize', actualizarFlechas, { passive:true });

onAuthStateChanged(authMinuto, (user) => {
    if (desuscribirPerfil) { desuscribirPerfil(); desuscribirPerfil = null; }
    esOwner = false;
    mostrarBotonesOwner();
    if (!user) return;
    desuscribirPerfil = onSnapshot(doc(dbMinuto, 'usuarios', user.uid), (perfil) => {
        esOwner = perfil.exists() && perfil.data().owner === true;
        mostrarBotonesOwner();
    }, (error) => console.warn('No se pudo leer permiso owner:', error));
});

onSnapshot(collection(dbMinuto, 'videos_minuto'), (snapshot) => {
    videos = snapshot.docs.map(d => ({ id:d.id, ...d.data() })).filter(esVideoValido);
    videos.sort((a,b) => (b.creadoEn?.toMillis?.() || 0) - (a.creadoEn?.toMillis?.() || 0));
    dibujarVideos();
}, (error) => {
    console.error('No se pudieron cargar los videos de CAFÉ UNP:', error);
    vacio('No se pudieron cargar los videos. Comprueba las reglas de Firestore.', 'bi-exclamation-circle');
});

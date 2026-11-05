// Este es el fragmento de código que debes usar en tu admin.js
// Asegúrate de tener importado setDoc y doc de Firestore

import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-firestore.js";

// Suponiendo que ya inicializaste 'db'
// const db = getFirestore(app);

let cropper; // Variable global para el cropper

// 1. LÓGICA DE CROPPER (Para solucionar el error de la línea 489)
document.getElementById('input-imagen-destacado').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const imageElement = document.getElementById('imagen-preview');
            imageElement.src = event.target.result;
            imageElement.style.display = 'block';

            if (cropper) { cropper.destroy(); } // Destruir instancia anterior si existe
            
            // AQUÍ ESTÁ CROPPER (Ya no dará error porque está en el HTML)
            cropper = new Cropper(imageElement, {
                aspectRatio: 16 / 9,
                viewMode: 1,
            });
        };
        reader.readAsDataURL(file);
    }
});

// 2. LÓGICA PARA GUARDAR EN FIRESTORE (Soluciona el error de la línea 541 y crea BD automática)
document.getElementById('btn-guardar-destacado').addEventListener('click', async function() {
    if (!cropper) {
        alert("Por favor, selecciona y recorta una imagen primero.");
        return;
    }

    // Obtener la imagen en base64
    const imagenBase64 = cropper.getCroppedCanvas().toDataURL('image/jpeg');

    try {
        console.log("Guardando en Firebase...");
        
        // ESTO CREA AUTOMÁTICAMENTE LA COLECCIÓN 'destacados' Y EL DOCUMENTO 'principal'
        const destacadoRef = doc(db, "destacados", "principal");
        
        await setDoc(destacadoRef, {
            imagen: imagenBase64,
            fecha: new Date().toISOString(),
            // Puedes añadir título, enlace, etc.
        });

        alert("¡Destacado guardado con éxito! Se creó en la base de datos.");
    } catch (error) {
        console.error("Error al guardar destacado:", error);
        alert("Error de permisos: Asegúrate que tu UID tenga rol 'admin' en la colección 'usuarios'.");
    }
});

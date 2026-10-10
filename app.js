import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

// Tu configuración exacta
const firebaseConfig = {
  apiKey: "AIzaSyDvtzU8SGycfh99Cc_lLT7xabQ_uPBOpqE",
  authDomain: "economia-41d20.firebaseapp.com",
  databaseURL: "https://economia-41d20-default-rtdb.firebaseio.com",
  projectId: "economia-41d20",
  storageBucket: "economia-41d20.firebasestorage.app",
  messagingSenderId: "750639619847",
  appId: "1:750639619847:web:9a036501539ca6e3ceafa2",
  measurementId: "G-BWV82ZTSW1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Utilizamos Firestore
const provider = new GoogleAuthProvider();

const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');

// Iniciar sesión
btnLogin.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
    }
});

// Cerrar sesión
btnLogout.addEventListener('click', () => {
    signOut(auth);
});

// Observador de estado
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Interfaz de usuario logueado
        btnLogin.classList.add('d-none');
        btnLogout.classList.remove('d-none');
        
        // Imprime tu UID en la consola (F12) para que lo copies fácilmente
        console.log("Tu UID es:", user.uid);
        
        try {
            // Verificar en Firestore si eres dueño
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists() && userDoc.data().owner === true) {
                document.body.classList.add('is-owner');
                console.log("Modo Dueño activado.");
            } else {
                document.body.classList.remove('is-owner');
                console.log("Modo Espectador.");
            }
        } catch (error) {
            console.warn("No se pudo verificar el rol de Firestore. Revisa las reglas de seguridad.", error);
            document.body.classList.remove('is-owner');
        }
    } else {
        // Interfaz de usuario desconectado
        btnLogin.classList.remove('d-none');
        btnLogout.classList.add('d-none');
        document.body.classList.remove('is-owner');
    }
});
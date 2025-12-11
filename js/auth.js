// js/auth.js - SAFE MODE

// ILAGAY MO DITO YUNG TOTOONG KEYS MO GALING SUPABASE
const supabaseUrl = 'https://bkimpnxonrdmxprpokqw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW1wbnhvbnJkbXhwcnBva3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyOTY3NDAsImV4cCI6MjA4MDg3Mjc0MH0.5thPd54zYNiHNEsyGa317wThumsnxu7znpZafPQIsqg';

const sb = supabase.createClient(supabaseUrl, supabaseKey);

// State for Login/Signup Toggle
let isLoginMode = true; 

function toggleMode() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('form-title');
    const subtitle = document.getElementById('form-subtitle');
    const btn = document.getElementById('submit-btn');
    const toggleText = document.getElementById('toggle-text');
    const toggleLink = document.getElementById('toggle-link');
    const msg = document.getElementById('alert-msg');

    msg.innerText = "";

    if (isLoginMode) {
        title.innerText = "Log In";
        subtitle.innerText = "Welcome back! Please enter your details.";
        btn.innerText = "LOG IN";
        toggleText.innerText = "Don't have an account?";
        toggleLink.innerText = "Sign up";
    } else {
        title.innerText = "Create Account";
        subtitle.innerText = "Start your journey with us today.";
        btn.innerText = "SIGN UP";
        toggleText.innerText = "Already have an account?";
        toggleLink.innerText = "Log in";
    }
}

async function handleAuth(event) {
    event.preventDefault(); 

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msg = document.getElementById('alert-msg');
    const btn = document.getElementById('submit-btn');

    msg.innerText = "";
    btn.disabled = true;
    btn.innerText = "Processing...";

    try {
        if (isLoginMode) {
            // LOGIN
            const { data, error } = await sb.auth.signInWithPassword({ email, password });
            if (error) throw error;
            // DITO LANG TAYO MAG REDIRECT PAG CLICK NG BUTTON
            window.location.href = 'dashboard.html';
        } else {
            // SIGNUP
            const { data, error } = await sb.auth.signUp({ email, password });
            if (error) throw error;
            alert("Account created! Logging in...");
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.error(error);
        msg.innerText = error.message;
        btn.disabled = false;
        btn.innerText = isLoginMode ? "LOG IN" : "SIGN UP";
    }
}

// NOTE: Wala tayong inilagay na "window.onload" check dito para hindi mag-loop.

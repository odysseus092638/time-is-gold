// ILAGAY MO DITO YUNG TOTOONG KEYS MO GALING SUPABASE
const supabaseUrl = 'https://bkimpnxonrdmxprpokqw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW1wbnhvbnJkbXhwcnBva3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyOTY3NDAsImV4cCI6MjA4MDg3Mjc0MH0.5thPd54zYNiHNEsyGa317wThumsnxu7znpZafPQIsqg';

// FIX: Ginawa nating 'sb' ang pangalan para hindi mag-error
const sb = supabase.createClient(supabaseUrl, supabaseKey);

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msg = document.getElementById('message');

    if(!email || !password) {
        msg.innerText = "Please fill in all fields.";
        return;
    }

    msg.innerText = "Logging in...";
    console.log("Attempting login for:", email);

    // Palitan lahat ng 'supabase' to 'sb'
    const { data, error } = await sb.auth.signInWithPassword({ email, password });

    if (error) {
        console.error("Login Error:", error);
        msg.innerText = "Error: " + error.message;
    } else {
        console.log("Login Success:", data);
        window.location.href = 'dashboard.html';
    }
}

async function signup() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msg = document.getElementById('message');

    if(!email || !password) {
        msg.innerText = "Please fill in all fields.";
        return;
    }

    msg.innerText = "Creating account...";
    console.log("Attempting signup for:", email);

    // Palitan lahat ng 'supabase' to 'sb'
    const { data, error } = await sb.auth.signUp({ email, password });

    if (error) {
        console.error("Signup Error:", error);
        msg.innerText = "Error: " + error.message;
    } else {
        console.log("Signup Success:", data);
        alert("Account created! Logging you in...");
        window.location.href = 'dashboard.html';
    }
}
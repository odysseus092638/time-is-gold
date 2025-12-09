const supabaseUrl = 'https://bkimpnxonrdmxprpokqw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW1wbnhvbnJkbXhwcnBva3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyOTY3NDAsImV4cCI6MjA4MDg3Mjc0MH0.5thPd54zYNiHNEsyGa317wThumsnxu7znpZafPQIsqg';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msg = document.getElementById('message');

    msg.innerText = "Logging in...";
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        msg.innerText = "Error: " + error.message;
    } else {
        window.location.href = 'dashboard.html';
    }
}

async function signup() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msg = document.getElementById('message');

    msg.innerText = "Creating account...";
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
        msg.innerText = "Error: " + error.message;
    } else {
        alert("Account created! Logging you in...");
        window.location.href = 'dashboard.html';
    }
}
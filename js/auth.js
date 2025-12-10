// ILAGAY MO DITO YUNG TOTOONG KEYS MO GALING SUPABASE
const supabaseUrl = 'https://bkimpnxonrdmxprpokqw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW1wbnhvbnJkbXhwcnBva3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyOTY3NDAsImV4cCI6MjA4MDg3Mjc0MH0.5thPd54zYNiHNEsyGa317wThumsnxu7znpZafPQIsqg';

// Use 'sb' to avoid conflicts
const sb = supabase.createClient(supabaseUrl, supabaseKey);

// State to track if we are Logging In or Signing Up
let isLoginMode = true; 

// 1. Toggle between Login and Signup View
function toggleMode() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('form-title');
    const subtitle = document.getElementById('form-subtitle');
    const btn = document.getElementById('submit-btn');
    const toggleText = document.getElementById('toggle-text');
    const toggleLink = document.getElementById('toggle-link');
    const msg = document.getElementById('alert-msg');

    msg.innerText = ""; // Clear errors

    if (isLoginMode) {
        title.innerText = "Log In";
        subtitle.innerText = "Welcome back! Please enter your details.";
        btn.innerText = "Log In";
        toggleText.innerText = "Don't have an account?";
        toggleLink.innerText = "Sign up";
    } else {
        title.innerText = "Create Account";
        subtitle.innerText = "Start your journey with us today.";
        btn.innerText = "Sign Up";
        toggleText.innerText = "Already have an account?";
        toggleLink.innerText = "Log in";
    }
}

// 2. Handle Form Submission
async function handleAuth(event) {
    event.preventDefault(); // Stop page reload

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const msg = document.getElementById('alert-msg');
    const btn = document.getElementById('submit-btn');

    msg.innerText = "";
    btn.disabled = true;
    btn.innerText = "Processing...";

    try {
        if (isLoginMode) {
            // LOGIN LOGIC
            console.log("Logging in...");
            const { data, error } = await sb.auth.signInWithPassword({ email, password });
            if (error) throw error;
            window.location.href = 'dashboard.html';
        } else {
            // SIGNUP LOGIC
            console.log("Signing up...");
            const { data, error } = await sb.auth.signUp({ email, password });
            if (error) throw error;
            alert("Account created successfully! Welcome.");
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.error(error);
        msg.innerText = error.message;
        btn.disabled = false;
        btn.innerText = isLoginMode ? "Log In" : "Sign Up";
    }
}
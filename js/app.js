// ILAGAY MO DITO YUNG TOTOONG KEYS MO GALING SUPABASE
const supabaseUrl = 'https://bkimpnxonrdmxprpokqw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW1wbnhvbnJkbXhwcnBva3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyOTY3NDAsImV4cCI6MjA4MDg3Mjc0MH0.5thPd54zYNiHNEsyGa317wThumsnxu7znpZafPQIsqg';

const sb = supabase.createClient(supabaseUrl, supabaseKey);

let selectedScheduleId = null;
let selectedScheduleTitle = "";
let selectedCategory = "";
let addModal, optionsModal, profileModal;
let timerInterval;
let timeLeft = 25 * 60; // 25 minutes in seconds

document.addEventListener('DOMContentLoaded', () => {
    // Init Modals
    addModal = new bootstrap.Modal(document.getElementById('addModal'));
    optionsModal = new bootstrap.Modal(document.getElementById('optionsModal'));
    profileModal = new bootstrap.Modal(document.getElementById('profileModal'));
    
    checkUser();
});

async function checkUser() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) window.location.href = 'index.html';
    else {
        loadSidebar();
        loadUserProfile(); // Load name on startup
    }
}

function getLocalISODate(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// --- CREATION ---
async function createSchedule(type) {
    const { data: { user } } = await sb.auth.getUser();
    if(!user) return;

    let finalTitle = "";
    let targetDate = null; 
    const today = new Date();

    if (type === 'Everyday') {
        finalTitle = "Everyday Routine";
        targetDate = null; 
    } else if (type === 'Today') {
        const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        finalTitle = `Today - ${dateStr}`;
        targetDate = getLocalISODate(today);
    } else if (type === 'Tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        finalTitle = `Tomorrow - ${dateStr}`;
        targetDate = getLocalISODate(tomorrow);
    }

    const { error } = await sb.from('schedules').insert([{ 
        title: finalTitle, category: type, user_id: user.id, target_date: targetDate, food_plan: "" 
    }]);

    if (error) alert(error.message);
    else { addModal.hide(); loadSidebar(); }
}

// --- LOAD SIDEBAR ---
async function loadSidebar() {
    const { data: { session } } = await sb.auth.getSession();
    if(!session) return;

    const localTodayStr = getLocalISODate(new Date());

    const { data } = await sb
        .from('schedules')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

    const list = document.getElementById('schedule-list');
    list.innerHTML = '';

    if(!data || data.length === 0) {
        list.innerHTML = '<p class="text-center text-muted mt-3 small">No schedules found.</p>';
        return;
    }

    for (const sched of data) {
        if (sched.target_date && sched.target_date < localTodayStr) {
            await sb.from('schedules').delete().eq('id', sched.id);
            continue; 
        }
        const div = document.createElement('div');
        div.className = 'schedule-item';
        div.innerHTML = `<strong>${sched.title}</strong><br><small>${sched.category}</small>`;
        div.onclick = () => showOptions(sched.id, sched.title, sched.category);
        list.appendChild(div);
    }
}

function showOptions(id, title, category) {
    selectedScheduleId = id;
    selectedScheduleTitle = title;
    selectedCategory = category;
    document.getElementById('options-title').innerText = title;
    optionsModal.show();
}

async function enterEditMode() {
    optionsModal.hide(); 
    document.getElementById('empty-state').classList.add('d-none');
    
    const editor = document.getElementById('editor-area');
    editor.classList.remove('d-none');
    
    if (window.innerWidth < 768) editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    document.getElementById('current-title').innerText = selectedScheduleTitle;
    document.getElementById('display-title').innerText = selectedScheduleTitle;

    const convertArea = document.getElementById('convert-area');
    if (selectedCategory === 'Everyday') convertArea.classList.add('d-none');
    else convertArea.classList.remove('d-none');

    const { data: schedData } = await sb.from('schedules').select('food_plan').eq('id', selectedScheduleId).single();
    if(schedData) document.getElementById('food-plan-input').value = schedData.food_plan || "";

    const { data } = await sb.from('tasks').select('*').eq('schedule_id', selectedScheduleId).order('id');
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';
    if(data) data.forEach(t => addTaskRow(t.time_slot, t.activity));
}

async function renameSchedulePrompt() {
    const newName = prompt("Rename Schedule:", selectedScheduleTitle);
    if (newName && newName.trim() !== "") {
        await sb.from('schedules').update({ title: newName }).eq('id', selectedScheduleId);
        selectedScheduleTitle = newName;
        document.getElementById('current-title').innerText = newName;
        document.getElementById('display-title').innerText = newName;
        loadSidebar(); 
    }
}

async function convertToEveryday() {
    if(confirm("Make this your Everyday Routine? It will no longer expire.")) {
        const { error } = await sb.from('schedules').update({
            category: 'Everyday',
            target_date: null,
            title: selectedScheduleTitle + " (Everyday)"
        }).eq('id', selectedScheduleId);

        if(error) alert("Error: " + error.message);
        else {
            alert("Success! This is now an everyday plan.");
            selectedCategory = 'Everyday';
            selectedScheduleTitle += " (Everyday)";
            enterEditMode(); 
            loadSidebar();
        }
    }
}

async function deleteSchedule() {
    if(confirm("Permanently delete this schedule?")) {
        await sb.from('schedules').delete().eq('id', selectedScheduleId);
        optionsModal.hide();
        document.getElementById('editor-area').classList.add('d-none');
        document.getElementById('empty-state').classList.remove('d-none');
        loadSidebar();
    }
}

function addTaskRow(time = '', act = '') {
    const div = document.createElement('div');
    div.className = 'row mb-3 task-row'; 
    div.innerHTML = `
        <div class="col-4"><input type="time" class="form-control t-time" value="${time}" style="color-scheme: dark;"></div>
        <div class="col-7"><input type="text" class="form-control t-act" value="${act}" placeholder="Activity Details"></div>
        <div class="col-1 text-end"><button class="btn btn-sm text-danger mt-2" onclick="this.parentElement.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button></div>
    `;
    document.getElementById('task-list').appendChild(div);
}

async function saveTasks() {
    const foodPlanText = document.getElementById('food-plan-input').value;
    await sb.from('schedules').update({ food_plan: foodPlanText }).eq('id', selectedScheduleId);

    await sb.from('tasks').delete().eq('schedule_id', selectedScheduleId);
    const rows = document.querySelectorAll('.task-row');
    const inserts = [];
    rows.forEach(r => {
        inserts.push({
            schedule_id: selectedScheduleId,
            time_slot: r.querySelector('.t-time').value,
            activity: r.querySelector('.t-act').value
        });
    });

    if(inserts.length > 0) await sb.from('tasks').insert(inserts);

    const btn = document.querySelector('.btn-save');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Saved';
    setTimeout(() => { btn.innerHTML = originalText; }, 2000);
}

// --- DOWNLOAD LOGIC WITH LINE BREAK FIX ---
document.getElementById('downloadBtn').addEventListener('click', () => {
    const captureArea = document.getElementById('capture-area');
    const textarea = document.getElementById('food-plan-input');

    // 1. Gumawa ng temporary DIV na kamukha ng textarea
    const div = document.createElement('div');
    
    // Kopyahin ang styles ng textarea para parehas itsura
    div.className = 'food-plan-box'; 
    div.style.minHeight = '80px';
    div.style.border = '1px solid #333';
    div.style.color = '#ffffff'; 
    div.style.padding = '15px';
    div.style.background = 'transparent';
    div.style.fontFamily = "'Poppins', sans-serif";
    div.style.fontSize = "0.9rem";
    
    // IMPORTANT: Palitan ang "Enter" (\n) ng HTML Break (<br>)
    // Ito ang magpapa-baba sa text sa image
    div.innerHTML = textarea.value.replace(/\n/g, '<br>');

    // 2. Itago ang textarea, ilabas ang div
    textarea.style.display = 'none';
    textarea.parentNode.insertBefore(div, textarea);

    // 3. Capture Image
    html2canvas(captureArea, { 
        backgroundColor: "#121212",
        scale: 2 // Mas malinaw na quality
    }).then(c => {
        const a = document.createElement('a');
        a.download = 'TimeIsGold_Schedule.png';
        a.href = c.toDataURL();
        a.click();

        // 4. Ibalik sa dati (Remove div, Show textarea)
        div.remove();
        textarea.style.display = 'block';
    });
});

async function logout() {
    await sb.auth.signOut();
    window.location.href = 'index.html';
}

// --- POMODORO LOGIC ---
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timer-text').innerText = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
    if(timerInterval) return; // Prevent multiple clicks
    timerInterval = setInterval(() => {
        if(timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
            alert("Focus Time Finished! Take a break.");
            resetTimer();
        }
    }, 1000);
}

function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function resetTimer() {
    pauseTimer();
    timeLeft = 25 * 60;
    updateTimerDisplay();
}

// --- PROFILE & SETTINGS LOGIC ---
async function loadUserProfile() {
    const { data: { user } } = await sb.auth.getUser();
    if(user && user.user_metadata && user.user_metadata.display_name) {
        const name = user.user_metadata.display_name;
        document.getElementById('sidebar-username').innerText = name;
        document.getElementById('avatar-initial').innerText = name.charAt(0).toUpperCase();
        document.getElementById('profile-name').value = name;
    }
}

function openProfile() {
    // Clear password field everytime we open it
    document.getElementById('profile-password').value = "";
    profileModal.show();
}

async function saveProfile() {
    const newName = document.getElementById('profile-name').value;
    const newPassword = document.getElementById('profile-password').value;
    
    // Object to hold updates
    const updates = {};
    if (newName) updates.data = { display_name: newName };
    if (newPassword && newPassword.trim() !== "") updates.password = newPassword;

    // Check if empty
    if (Object.keys(updates).length === 0) {
        alert("Nothing to update.");
        return;
    }

    const { error } = await sb.auth.updateUser(updates);

    if(error) alert("Error: " + error.message);
    else {
        alert("Settings Updated Successfully!");
        if (newName) {
            document.getElementById('sidebar-username').innerText = newName;
            document.getElementById('avatar-initial').innerText = newName.charAt(0).toUpperCase();
        }
        profileModal.hide();
    }
}

async function destroyAccount() {
    // Double Confirmation (Nakakatakot dapat)
    const confirmText = prompt("WARNING: This will delete ALL your schedules and tasks permanently.\n\nType 'DELETE' to confirm.");
    
    if (confirmText === 'DELETE') {
        const { data: { user } } = await sb.auth.getUser();
        
        // Delete ALL Schedules for this user 
        // (Tasks are usually deleted automatically via cascading, but logic depends on DB setup. 
        // Deleting the parent schedule is usually enough).
        const { error } = await sb.from('schedules').delete().eq('user_id', user.id);

        if (error) {
            alert("Error destroying data: " + error.message);
        } else {
            alert("All data destroyed. Clean slate.");
            
            // Clear UI
            document.getElementById('schedule-list').innerHTML = '<p class="text-center text-muted mt-3 small">No schedules found.</p>';
            document.getElementById('editor-area').classList.add('d-none');
            document.getElementById('empty-state').classList.remove('d-none');
            
            profileModal.hide();
        }
    } else if (confirmText !== null) {
        alert("Action cancelled. You must type 'DELETE' exactly.");
    }
}
// --- DESKTOP SIDEBAR TOGGLE ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebarMenu');
    const main = document.getElementById('main-content');
    
    // Toggle Classes
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('expanded');
}
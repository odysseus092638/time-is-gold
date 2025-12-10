// ILAGAY MO DITO YUNG TOTOONG KEYS MO GALING SUPABASE
const supabaseUrl = 'https://bkimpnxonrdmxprpokqw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW1wbnhvbnJkbXhwcnBva3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyOTY3NDAsImV4cCI6MjA4MDg3Mjc0MH0.5thPd54zYNiHNEsyGa317wThumsnxu7znpZafPQIsqg';

const sb = supabase.createClient(supabaseUrl, supabaseKey);

let selectedScheduleId = null;
let selectedScheduleTitle = "";
let selectedCategory = ""; // Need this for conversion logic
let addModal, optionsModal;

document.addEventListener('DOMContentLoaded', () => {
    const addModalEl = document.getElementById('addModal');
    const optModalEl = document.getElementById('optionsModal');
    if (addModalEl) addModal = new bootstrap.Modal(addModalEl);
    if (optModalEl) optionsModal = new bootstrap.Modal(optModalEl);
    checkUser();
});

async function checkUser() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) window.location.href = 'index.html';
    else loadSidebar();
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
    selectedCategory = category; // Save category
    document.getElementById('options-title').innerText = title;
    optionsModal.show();
}

// --- EDITOR & FOOD PLAN LOGIC ---
async function enterEditMode() {
    optionsModal.hide(); 
    document.getElementById('empty-state').classList.add('d-none');
    
    const editor = document.getElementById('editor-area');
    editor.classList.remove('d-none');
    
    // Auto Scroll on Mobile
    if (window.innerWidth < 768) editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    document.getElementById('current-title').innerText = selectedScheduleTitle;
    document.getElementById('display-title').innerText = selectedScheduleTitle;

    // Show/Hide "Convert to Everyday" button
    const convertArea = document.getElementById('convert-area');
    if (selectedCategory === 'Everyday') convertArea.classList.add('d-none');
    else convertArea.classList.remove('d-none');

    // Load Food Plan & Tasks
    // We need to fetch the schedule details AGAIN to get the food_plan text
    const { data: schedData } = await sb.from('schedules').select('food_plan').eq('id', selectedScheduleId).single();
    if(schedData) document.getElementById('food-plan-input').value = schedData.food_plan || "";

    // Load Tasks
    const { data } = await sb.from('tasks').select('*').eq('schedule_id', selectedScheduleId).order('id');
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';
    if(data) data.forEach(t => addTaskRow(t.time_slot, t.activity));
}

// --- RENAME (Now inside Editor) ---
async function renameSchedulePrompt() {
    const newName = prompt("Rename Schedule:", selectedScheduleTitle);
    if (newName && newName.trim() !== "") {
        await sb.from('schedules').update({ title: newName }).eq('id', selectedScheduleId);
        selectedScheduleTitle = newName;
        // Update UI immediately
        document.getElementById('current-title').innerText = newName;
        document.getElementById('display-title').innerText = newName;
        loadSidebar(); // Refresh sidebar names
    }
}

// --- CONVERT TO EVERYDAY LOGIC ---
async function convertToEveryday() {
    if(confirm("Make this your Everyday Routine? It will no longer expire.")) {
        // Update DB: Category -> Everyday, Target Date -> NULL
        const { error } = await sb.from('schedules').update({
            category: 'Everyday',
            target_date: null,
            title: selectedScheduleTitle + " (Everyday)" // Optional rename
        }).eq('id', selectedScheduleId);

        if(error) alert("Error: " + error.message);
        else {
            alert("Success! This is now an everyday plan.");
            selectedCategory = 'Everyday';
            selectedScheduleTitle += " (Everyday)";
            enterEditMode(); // Refresh UI
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
    // 1. Save Food Plan
    const foodPlanText = document.getElementById('food-plan-input').value;
    await sb.from('schedules').update({ food_plan: foodPlanText }).eq('id', selectedScheduleId);

    // 2. Save Tasks
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

document.getElementById('downloadBtn').addEventListener('click', () => {
    html2canvas(document.getElementById('capture-area'), { backgroundColor: "#121212" }).then(c => {
        const a = document.createElement('a');
        a.download = 'TimeIsGold_Schedule.png';
        a.href = c.toDataURL();
        a.click();
    });
});

async function logout() {
    await sb.auth.signOut();
    window.location.href = 'index.html';
}
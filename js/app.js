// ILAGAY MO DITO YUNG TOTOONG KEYS MO GALING SUPABASE
const supabaseUrl = 'https://bkimpnxonrdmxprpokqw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW1wbnhvbnJkbXhwcnBva3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyOTY3NDAsImV4cCI6MjA4MDg3Mjc0MH0.5thPd54zYNiHNEsyGa317wThumsnxu7znpZafPQIsqg';

const sb = supabase.createClient(supabaseUrl, supabaseKey);

let selectedScheduleId = null;
let selectedScheduleTitle = "";
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

// --- LOGIC 1: CREATION WITH DATES ---
async function createSchedule(type) {
    const { data: { user } } = await sb.auth.getUser();
    if(!user) return;

    let finalTitle = "";
    let targetDate = null; // YYYY-MM-DD format
    const today = new Date();

    if (type === 'Everyday') {
        finalTitle = "Everyday Routine";
        targetDate = null; // Walang expiration
    } 
    else if (type === 'Today') {
        // Title: "Today - Dec 10"
        const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        finalTitle = `Today - ${dateStr}`;
        // Target Date: Today (YYYY-MM-DD)
        targetDate = today.toISOString().split('T')[0];
    } 
    else if (type === 'Tomorrow') {
        // Add 1 Day
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Title: "Tomorrow - Dec 11"
        const dateStr = tomorrow.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        finalTitle = `Tomorrow - ${dateStr}`;
        // Target Date: Tomorrow (YYYY-MM-DD)
        targetDate = tomorrow.toISOString().split('T')[0];
    }

    const { error } = await sb
        .from('schedules')
        .insert([{ 
            title: finalTitle, 
            category: type, 
            user_id: user.id,
            target_date: targetDate // Save expiration date
        }]);

    if (error) alert(error.message);
    else {
        addModal.hide(); 
        loadSidebar();   
    }
}

// --- LOGIC 2: LOAD & AUTO-DELETE EXPIRED ---
async function loadSidebar() {
    const { data: { session } } = await sb.auth.getSession();
    if(!session) return;

    // Get current date inside PH/local timezone logic
    // Trick: create a date, subtracting timezone offset to get local YYYY-MM-DD
    const now = new Date();
    const localToday = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    // Fetch all schedules
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

    // Filter & Cleanup Loop
    for (const sched of data) {
        // LOGIC: If may target_date AT mas luma na sa localToday, BURAHIN.
        // Everyday (null) is safe. Today (matches today) is safe. Tomorrow (future) is safe.
        // Old Today (yesterday < today) -> DELETE.
        
        if (sched.target_date && sched.target_date < localToday) {
            console.log(`Auto-deleting expired schedule: ${sched.title}`);
            await sb.from('schedules').delete().eq('id', sched.id);
            continue; // Skip rendering this item
        }

        const div = document.createElement('div');
        div.className = 'schedule-item';
        div.innerHTML = `<strong>${sched.title}</strong><br><small>${sched.category}</small>`;
        div.onclick = () => showOptions(sched.id, sched.title);
        list.appendChild(div);
    }
}

function showOptions(id, title) {
    selectedScheduleId = id;
    selectedScheduleTitle = title;
    document.getElementById('options-title').innerText = title;
    optionsModal.show();
}

// --- LOGIC 3: MOBILE SCROLL & TIME PICKER ---
async function enterEditMode() {
    optionsModal.hide(); 
    document.getElementById('empty-state').classList.add('d-none');
    
    const editor = document.getElementById('editor-area');
    editor.classList.remove('d-none');
    
    // AUTO SCROLL SA MOBILE
    // Pag maliit ang screen, scroll down papunta sa editor
    if (window.innerWidth < 768) {
        editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    document.getElementById('current-title').innerText = selectedScheduleTitle;
    document.getElementById('display-title').innerText = selectedScheduleTitle;

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
        loadSidebar();
        enterEditMode(); 
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

// --- LOGIC 4: TIME PICKER INPUT ---
function addTaskRow(time = '', act = '') {
    const div = document.createElement('div');
    div.className = 'row mb-3 task-row'; 
    div.innerHTML = `
        <div class="col-4">
            <!-- CHANGED TO TYPE="TIME" -->
            <input type="time" class="form-control t-time" value="${time}" style="color-scheme: dark;">
        </div>
        <div class="col-7">
            <input type="text" class="form-control t-act" value="${act}" placeholder="Activity Details">
        </div>
        <div class="col-1 text-end">
            <button class="btn btn-sm text-danger mt-2" onclick="this.parentElement.parentElement.remove()">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    `;
    document.getElementById('task-list').appendChild(div);
}

async function saveTasks() {
    await sb.from('tasks').delete().eq('schedule_id', selectedScheduleId);

    const rows = document.querySelectorAll('.task-row');
    const inserts = [];
    rows.forEach(r => {
        inserts.push({
            schedule_id: selectedScheduleId,
            time_slot: r.querySelector('.t-time').value, // Gets 14:30 format
            activity: r.querySelector('.t-act').value
        });
    });

    if(inserts.length > 0) {
        await sb.from('tasks').insert(inserts);
    }
    const btn = document.querySelector('.btn-save');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Saved';
    setTimeout(() => { btn.innerHTML = originalText; }, 2000);
}

document.getElementById('downloadBtn').addEventListener('click', () => {
    html2canvas(document.getElementById('capture-area'), {
        backgroundColor: "#121212" 
    }).then(c => {
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
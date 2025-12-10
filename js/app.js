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

// HELPER: Get Local YYYY-MM-DD (Para hindi malito sa Timezone)
function getLocalISODate(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// --- LOGIC 1: CREATION (FIXED TIMEZONE) ---
async function createSchedule(type) {
    const { data: { user } } = await sb.auth.getUser();
    if(!user) return;

    let finalTitle = "";
    let targetDate = null; 
    const today = new Date(); // Local Date

    if (type === 'Everyday') {
        finalTitle = "Everyday Routine";
        targetDate = null; 
    } 
    else if (type === 'Today') {
        const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        finalTitle = `Today - ${dateStr}`;
        // FIX: Use Local Date Helper
        targetDate = getLocalISODate(today);
    } 
    else if (type === 'Tomorrow') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1); // Add 1 day
        
        const dateStr = tomorrow.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        finalTitle = `Tomorrow - ${dateStr}`;
        // FIX: Use Local Date Helper
        targetDate = getLocalISODate(tomorrow);
    }

    const { error } = await sb
        .from('schedules')
        .insert([{ 
            title: finalTitle, 
            category: type, 
            user_id: user.id,
            target_date: targetDate 
        }]);

    if (error) alert("Error creating schedule: " + error.message);
    else {
        addModal.hide(); 
        loadSidebar();   
    }
}

// --- LOGIC 2: LOAD & AUTO-DELETE (FIXED TIMEZONE) ---
async function loadSidebar() {
    const { data: { session } } = await sb.auth.getSession();
    if(!session) return;

    // FIX: Get "Now" in Local YYYY-MM-DD
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
        // LOGIC: Delete ONLY if target_date exists AND is LESS THAN today
        // Ex: Target is "2023-12-10". Today is "2023-12-11". 10 < 11 is TRUE. Delete.
        if (sched.target_date && sched.target_date < localTodayStr) {
            console.log(`Auto-deleting expired schedule: ${sched.title}`);
            await sb.from('schedules').delete().eq('id', sched.id);
            continue; 
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

async function enterEditMode() {
    optionsModal.hide(); 
    document.getElementById('empty-state').classList.add('d-none');
    
    const editor = document.getElementById('editor-area');
    editor.classList.remove('d-none');
    
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

function addTaskRow(time = '', act = '') {
    const div = document.createElement('div');
    div.className = 'row mb-3 task-row'; 
    div.innerHTML = `
        <div class="col-4">
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
            time_slot: r.querySelector('.t-time').value,
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
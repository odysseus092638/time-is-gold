// js/app.js - STRICT CHECK

// ILAGAY MO DITO YUNG TOTOONG KEYS MO GALING SUPABASE
const supabaseUrl = 'https://bkimpnxonrdmxprpokqw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW1wbnhvbnJkbXhwcnBva3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyOTY3NDAsImV4cCI6MjA4MDg3Mjc0MH0.5thPd54zYNiHNEsyGa317wThumsnxu7znpZafPQIsqg';

const sb = supabase.createClient(supabaseUrl, supabaseKey);

let selectedScheduleId = null;
let selectedScheduleTitle = "";
let addModal, optionsModal;

document.addEventListener('DOMContentLoaded', () => {
    // Setup Modals
    const addModalEl = document.getElementById('addModal');
    const optModalEl = document.getElementById('optionsModal');
    if (addModalEl) addModal = new bootstrap.Modal(addModalEl);
    if (optModalEl) optionsModal = new bootstrap.Modal(optModalEl);
    
    // RUN SECURITY CHECK IMMEDIATELY
    checkUser();
});

async function checkUser() {
    // 1. Get Session from Local Storage (Fastest)
    const { data: { session } } = await sb.auth.getSession();

    if (!session) {
        // WALANG USER -> SIPAIN PABALIK SA LOGIN
        window.location.href = 'index.html';
    } else {
        // MAY USER -> LOAD DATA
        loadSidebar();
    }
}

async function createSchedule(type) {
    // Re-check user before action
    const { data: { user } } = await sb.auth.getUser();
    if(!user) return; // Stop if no user
    
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const defaultTitle = `${type} - ${dateStr}`;

    const { error } = await sb
        .from('schedules')
        .insert([{ title: defaultTitle, category: type, user_id: user.id }]);

    if (error) alert(error.message);
    else {
        addModal.hide(); 
        loadSidebar();   
    }
}

async function loadSidebar() {
    const { data: { session } } = await sb.auth.getSession();
    if(!session) return; // Safety check

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

    data.forEach(sched => {
        const div = document.createElement('div');
        div.className = 'schedule-item';
        div.innerHTML = `<strong>${sched.title}</strong><br><small>${sched.category}</small>`;
        div.onclick = () => showOptions(sched.id, sched.title);
        list.appendChild(div);
    });
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
    document.getElementById('editor-area').classList.remove('d-none');
    
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
        <div class="col-3"><input type="text" class="form-control t-time" value="${time}" placeholder="00:00"></div>
        <div class="col-8"><input type="text" class="form-control t-act" value="${act}" placeholder="Activity Details"></div>
        <div class="col-1 text-end"><button class="btn btn-sm text-danger mt-2" onclick="this.parentElement.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button></div>
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
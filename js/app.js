// ILAGAY MO DITO YUNG TOTOONG KEYS MO GALING SUPABASE
const supabaseUrl = 'https://bkimpnxonrdmxprpokqw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW1wbnhvbnJkbXhwcnBva3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyOTY3NDAsImV4cCI6MjA4MDg3Mjc0MH0.5thPd54zYNiHNEsyGa317wThumsnxu7znpZafPQIsqg';

// FIX: Change variable name to 'sb'
const sb = supabase.createClient(supabaseUrl, supabaseKey);

let selectedScheduleId = null;
let selectedScheduleTitle = "";
let addModal, optionsModal;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if element exists before creating modal to prevent errors
    const addModalEl = document.getElementById('addModal');
    const optModalEl = document.getElementById('optionsModal');
    
    if (addModalEl) addModal = new bootstrap.Modal(addModalEl);
    if (optModalEl) optionsModal = new bootstrap.Modal(optModalEl);
    
    checkUser();
});

async function checkUser() {
    // Change 'supabase' to 'sb'
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
        // If not logged in, redirect to login page
        window.location.href = 'index.html';
    } else {
        loadSidebar();
    }
}

async function createSchedule(type) {
    const { data: { user } } = await sb.auth.getUser();
    
    const dateStr = new Date().toLocaleDateString();
    const defaultTitle = `${type} (${dateStr})`;

    const { error } = await sb
        .from('schedules')
        .insert([{ title: defaultTitle, category: type, user_id: user.id }]);

    if (error) alert("Error creating: " + error.message);
    
    addModal.hide(); 
    loadSidebar();   
}

async function loadSidebar() {
    const { data: { user } } = await sb.auth.getUser();
    const { data } = await sb
        .from('schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    const list = document.getElementById('schedule-list');
    list.innerHTML = '';

    if(data.length === 0) list.innerHTML = '<p class="text-center text-muted mt-3">No schedules yet.</p>';

    data.forEach(sched => {
        const div = document.createElement('div');
        div.className = 'schedule-item';
        div.innerHTML = `<strong>${sched.title}</strong><br><small class="text-muted">${sched.category}</small>`;
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
    const newName = prompt("Enter new name:", selectedScheduleTitle);
    if (newName && newName.trim() !== "") {
        await sb.from('schedules').update({ title: newName }).eq('id', selectedScheduleId);
        selectedScheduleTitle = newName;
        loadSidebar();
        enterEditMode(); 
    }
}

async function deleteSchedule() {
    if(confirm("Are you sure you want to delete this?")) {
        await sb.from('schedules').delete().eq('id', selectedScheduleId);
        optionsModal.hide();
        document.getElementById('editor-area').classList.add('d-none');
        document.getElementById('empty-state').classList.remove('d-none');
        loadSidebar();
    }
}

function addTaskRow(time = '', act = '') {
    const div = document.createElement('div');
    div.className = 'row mb-2 task-row';
    div.innerHTML = `
        <div class="col-3"><input type="text" class="form-control t-time" value="${time}" placeholder="Time"></div>
        <div class="col-8"><input type="text" class="form-control t-act" value="${act}" placeholder="Activity"></div>
        <div class="col-1"><button class="btn btn-close mt-2" onclick="this.parentElement.parentElement.remove()"></button></div>
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
    alert("Saved!");
}

document.getElementById('downloadBtn').addEventListener('click', () => {
    html2canvas(document.getElementById('capture-area')).then(c => {
        const a = document.createElement('a');
        a.download = 'Schedule.png';
        a.href = c.toDataURL();
        a.click();
    });
});

async function logout() {
    await sb.auth.signOut();
    window.location.href = 'index.html';
}
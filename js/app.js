const supabaseUrl = 'https://bkimpnxonrdmxprpokqw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW1wbnhvbnJkbXhwcnBva3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyOTY3NDAsImV4cCI6MjA4MDg3Mjc0MH0.5thPd54zYNiHNEsyGa317wThumsnxu7znpZafPQIsqg';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

let selectedScheduleId = null;
let selectedScheduleTitle = "";
let addModal, optionsModal;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    addModal = new bootstrap.Modal(document.getElementById('addModal'));
    optionsModal = new bootstrap.Modal(document.getElementById('optionsModal'));
    checkUser();
});

async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) window.location.href = 'index.html';
    loadSidebar();
}

// 1. Create Schedule
async function createSchedule(type) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Create name like "Everyday - Dec 10"
    const dateStr = new Date().toLocaleDateString();
    const defaultTitle = `${type} (${dateStr})`;

    const { error } = await supabase
        .from('schedules')
        .insert([{ title: defaultTitle, category: type, user_id: user.id }]);

    if (error) alert("Error creating: " + error.message);
    
    addModal.hide(); // Hide modal
    loadSidebar();   // Refresh list
}

// 2. Load Sidebar
async function loadSidebar() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
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
        
        // Pag clinick, open options modal
        div.onclick = () => showOptions(sched.id, sched.title);
        list.appendChild(div);
    });
}

// 3. Show Options Modal
function showOptions(id, title) {
    selectedScheduleId = id;
    selectedScheduleTitle = title;
    document.getElementById('options-title').innerText = title;
    optionsModal.show();
}

// 4. Enter Edit Mode (Start making schedule)
async function enterEditMode() {
    optionsModal.hide(); // Hide options
    document.getElementById('empty-state').classList.add('d-none');
    document.getElementById('editor-area').classList.remove('d-none');
    
    document.getElementById('current-title').innerText = selectedScheduleTitle;
    document.getElementById('display-title').innerText = selectedScheduleTitle;

    // Fetch Tasks
    const { data } = await supabase.from('tasks').select('*').eq('schedule_id', selectedScheduleId).order('id');
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';
    
    if(data) data.forEach(t => addTaskRow(t.time_slot, t.activity));
}

// 5. Rename
async function renameSchedulePrompt() {
    const newName = prompt("Enter new name:", selectedScheduleTitle);
    if (newName && newName.trim() !== "") {
        await supabase.from('schedules').update({ title: newName }).eq('id', selectedScheduleId);
        selectedScheduleTitle = newName;
        loadSidebar();
        enterEditMode(); // Go straight to edit after rename
    }
}

// 6. Delete
async function deleteSchedule() {
    if(confirm("Are you sure you want to delete this?")) {
        await supabase.from('schedules').delete().eq('id', selectedScheduleId);
        optionsModal.hide();
        document.getElementById('editor-area').classList.add('d-none');
        document.getElementById('empty-state').classList.remove('d-none');
        loadSidebar();
    }
}

// 7. Add Task Row (UI)
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

// 8. Save Tasks
async function saveTasks() {
    // Delete old tasks first
    await supabase.from('tasks').delete().eq('schedule_id', selectedScheduleId);

    // Get new values
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
        await supabase.from('tasks').insert(inserts);
    }
    alert("Saved!");
}

// 9. Download
document.getElementById('downloadBtn').addEventListener('click', () => {
    html2canvas(document.getElementById('capture-area')).then(c => {
        const a = document.createElement('a');
        a.download = 'Schedule.png';
        a.href = c.toDataURL();
        a.click();
    });
});

async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}
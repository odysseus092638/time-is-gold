const supabaseUrl = 'YOUR_SUPABASE_URL_HERE';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY_HERE';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

let currentScheduleId = null;

// 1. Check if user is logged in
async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) window.location.href = 'index.html';
    loadSidebar();
}

// 2. Create Schedule (Sidebar)
async function createSchedule(type) {
    const { data, error } = await supabase
        .from('schedules')
        .insert([{ title: `${type} Routine`, category: type, user_id: (await supabase.auth.getUser()).data.user.id }])
        .select();

    if (!error) loadSidebar();
}

// 3. Load Sidebar List
async function loadSidebar() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    const list = document.getElementById('schedule-list');
    list.innerHTML = '';
    
    data.forEach(sched => {
        list.innerHTML += `
            <div class="p-2 schedule-card border-bottom" onclick="openSchedule(${sched.id}, '${sched.title}')">
                <strong>${sched.title}</strong><br>
                <small class="text-secondary">${sched.category}</small>
            </div>`;
    });
}

// 4. Open Schedule & Load Tasks
async function openSchedule(id, title) {
    currentScheduleId = id;
    document.getElementById('empty-state').classList.add('d-none');
    document.getElementById('editor-section').classList.remove('d-none');
    
    document.getElementById('schedule-title').value = title;
    document.getElementById('display-title').innerText = title;

    // Fetch tasks
    const { data, error } = await supabase.from('tasks').select('*').eq('schedule_id', id).order('id', {ascending: true});
    
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';
    data.forEach(task => addTaskRow(task.time_slot, task.activity, task.id));
}

// 5. Add Task Row (UI Only)
function addTaskRow(time = '', activity = '', id = null) {
    const div = document.createElement('div');
    div.className = 'row mb-2 task-row';
    div.dataset.id = id || ''; // Store ID if it exists
    div.innerHTML = `
        <div class="col-3"><input type="text" class="form-control time-input" value="${time}" placeholder="Time"></div>
        <div class="col-8"><input type="text" class="form-control activity-input" value="${activity}" placeholder="Activity"></div>
        <div class="col-1"><button class="btn btn-close mt-2" onclick="this.parentElement.parentElement.remove()"></button></div>
    `;
    document.getElementById('task-list').appendChild(div);
}

// 6. Save Tasks (Logic)
async function saveTasks() {
    // Save Title First
    const newTitle = document.getElementById('schedule-title').value;
    await supabase.from('schedules').update({ title: newTitle }).eq('id', currentScheduleId);
    document.getElementById('display-title').innerText = newTitle;

    // Delete old tasks for this schedule (Easiest way for simple CRUD)
    await supabase.from('tasks').delete().eq('schedule_id', currentScheduleId);

    // Insert new tasks
    const rows = document.querySelectorAll('.task-row');
    const tasksToInsert = [];
    rows.forEach(row => {
        tasksToInsert.push({
            schedule_id: currentScheduleId,
            time_slot: row.querySelector('.time-input').value,
            activity: row.querySelector('.activity-input').value
        });
    });

    await supabase.from('tasks').insert(tasksToInsert);
    alert('Schedule Saved!');
    loadSidebar(); // Refresh sidebar title
}

// 7. Download as Image
document.getElementById('downloadBtn').addEventListener('click', () => {
    const captureArea = document.getElementById('capture-area');
    html2canvas(captureArea).then(canvas => {
        const link = document.createElement('a');
        link.download = 'TimeIsGold-Schedule.png';
        link.href = canvas.toDataURL();
        link.click();
    });
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
});

// Init
checkUser();
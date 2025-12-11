// ILAGAY MO DITO YUNG TOTOONG KEYS MO GALING SUPABASE
const supabaseUrl = 'https://bkimpnxonrdmxprpokqw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJraW1wbnhvbnJkbXhwcnBva3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyOTY3NDAsImV4cCI6MjA4MDg3Mjc0MH0.5thPd54zYNiHNEsyGa317wThumsnxu7znpZafPQIsqg';

const sb = supabase.createClient(supabaseUrl, supabaseKey);

let selectedScheduleId = null;
let selectedScheduleTitle = "";
let selectedCategory = "";
let addModal, optionsModal, profileModal;
let timerInterval;
let timeLeft = 25 * 60;
let notesModal;

document.addEventListener('DOMContentLoaded', () => {
    addModal = new bootstrap.Modal(document.getElementById('addModal'));
    optionsModal = new bootstrap.Modal(document.getElementById('optionsModal'));
    profileModal = new bootstrap.Modal(document.getElementById('profileModal'));
    notesModal = new bootstrap.Modal(document.getElementById('notesModal'));
    checkUser();
});
// 1. Open Notes (Fetch data first)
async function openNotes() {
    const { data: { user } } = await sb.auth.getUser();
    
    // Check if user has a note entry
    const { data, error } = await sb.from('notes').select('content').eq('user_id', user.id).single();

    if (data) {
        // If notes exist, show them
        document.getElementById('my-sticky-note').value = data.content;
    } else {
        // If first time, create an empty row
        await sb.from('notes').insert([{ user_id: user.id, content: "" }]);
        document.getElementById('my-sticky-note').value = "";
    }

    notesModal.show();
}

// 2. Save Notes
async function saveNotes() {
    const { data: { user } } = await sb.auth.getUser();
    const content = document.getElementById('my-sticky-note').value;

    const btn = document.querySelector('#notesModal .btn-save');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Saving...';

    // Update the existing row
    const { error } = await sb.from('notes').update({ content: content }).eq('user_id', user.id);

    if (error) {
        alert("Error saving notes: " + error.message);
    } else {
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Saved';
        setTimeout(() => { btn.innerHTML = originalText; }, 1500);
    }
}

async function checkUser() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) window.location.href = 'index.html';
    else { loadSidebar(); loadUserProfile(); }
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

    const { data } = await sb.from('schedules').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
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

// --- EDITOR LOGIC (THE BIG CHANGE) ---
async function enterEditMode() {
    optionsModal.hide(); 
    document.getElementById('empty-state').classList.add('d-none');
    document.getElementById('editor-area').classList.remove('d-none');
    
    if (window.innerWidth < 768) document.getElementById('editor-area').scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    document.getElementById('current-title').innerText = selectedScheduleTitle;
    document.getElementById('display-title').innerText = selectedScheduleTitle;

    // Handle "Make Everyday" button visibility
    const convertArea = document.getElementById('convert-area');
    if (selectedCategory === 'Everyday') convertArea.classList.add('d-none');
    else convertArea.classList.remove('d-none');

    // Load Food Plan
    const { data: schedData } = await sb.from('schedules').select('food_plan').eq('id', selectedScheduleId).single();
    if(schedData) document.getElementById('food-plan-input').value = schedData.food_plan || "";

    // Change Main Button Text based on Category
    const mainAddBtn = document.querySelector('.btn-add-task');
    if (selectedCategory === 'Everyday') {
        mainAddBtn.innerHTML = '<i class="fa-solid fa-layer-group"></i> &nbsp; Add New Group';
        mainAddBtn.onclick = () => addSectionBlock(); // New Logic
    } else {
        mainAddBtn.innerHTML = '<i class="fa-solid fa-plus"></i> &nbsp; Add New Activity';
        mainAddBtn.onclick = () => addTaskRow(); // Old Logic
    }

    // Load Tasks (Grouped for Everyday, Flat for Today/Tomorrow)
    loadTasks();
}

async function loadTasks() {
    const { data } = await sb.from('tasks').select('*').eq('schedule_id', selectedScheduleId).order('id');
    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';

    if (selectedCategory === 'Everyday') {
        // GROUPING LOGIC FOR EVERYDAY
        // 1. Get unique sections
        const sections = [...new Set(data.map(item => item.section_title || "Uncategorized"))];
        
        sections.forEach(sectionTitle => {
            // Create Section UI
            const sectionDiv = addSectionBlock(sectionTitle);
            
            // Filter tasks for this section
            const sectionTasks = data.filter(t => (t.section_title || "Uncategorized") === sectionTitle);
            
            sectionTasks.forEach(t => {
                // Add row inside the section
                addSectionRow(sectionDiv.querySelector('.section-tasks-container'), t.day, t.time_slot, t.activity);
            });
        });

    } else {
        // NORMAL LOGIC FOR TODAY/TOMORROW
        if(data) data.forEach(t => addTaskRow(t.time_slot, t.activity));
    }
}

// --- NEW: EVERYDAY SECTION LOGIC ---

// 1. Add a Block/Box
function addSectionBlock(title = "New Group") {
    const wrapper = document.createElement('div');
    wrapper.className = 'schedule-section';
    wrapper.innerHTML = `
        <div class="d-flex justify-content-between">
            <input type="text" class="section-title-input" value="${title}" placeholder="Group Name (e.g. Morning)">
            <button class="btn btn-sm text-danger" onclick="this.closest('.schedule-section').remove()" title="Delete Group">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
        <div class="section-tasks-container"></div>
        <button class="btn btn-add-row-inside" onclick="addSectionRow(this.previousElementSibling)">
            <i class="fa-solid fa-plus"></i> Add Activity
        </button>
    `;
    document.getElementById('task-list').appendChild(wrapper);
    return wrapper;
}

// 2. Add a Row inside the Block
function addSectionRow(container, day = "Mon", time = "", act = "") {
    const div = document.createElement('div');
    div.className = 'row mb-2 task-row-everyday';
    div.innerHTML = `
        <div class="col-3 px-1">
            <select class="form-control t-day" style="font-size: 0.8rem; padding: 10px 5px; background: transparent; color: white; border-bottom: 1px solid #333; border-top:0; border-left:0; border-right:0;">
                <option value="Mon" ${day === 'Mon' ? 'selected' : ''}>Mon</option>
                <option value="Tue" ${day === 'Tue' ? 'selected' : ''}>Tue</option>
                <option value="Wed" ${day === 'Wed' ? 'selected' : ''}>Wed</option>
                <option value="Thu" ${day === 'Thu' ? 'selected' : ''}>Thu</option>
                <option value="Fri" ${day === 'Fri' ? 'selected' : ''}>Fri</option>
                <option value="Sat" ${day === 'Sat' ? 'selected' : ''}>Sat</option>
                <option value="Sun" ${day === 'Sun' ? 'selected' : ''}>Sun</option>
                <option value="All" ${day === 'All' ? 'selected' : ''}>Everyday</option>
            </select>
        </div>
        <div class="col-3 px-1">
            <input type="time" class="form-control t-time" value="${time}" style="color-scheme: dark;">
        </div>
        <div class="col-5 px-1">
            <input type="text" class="form-control t-act" value="${act}" placeholder="Activity">
        </div>
        <div class="col-1 px-0 text-center">
            <button class="btn btn-sm text-secondary mt-2" onclick="this.closest('.row').remove()"><i class="fa-solid fa-xmark"></i></button>
        </div>
    `;
    container.appendChild(div);
}

// --- OLD: NORMAL LOGIC (Today/Tomorrow) ---
function addTaskRow(time = '', act = '') {
    const div = document.createElement('div');
    div.className = 'row mb-3 task-row-simple'; 
    div.innerHTML = `
        <div class="col-4"><input type="time" class="form-control t-time" value="${time}" style="color-scheme: dark;"></div>
        <div class="col-7"><input type="text" class="form-control t-act" value="${act}" placeholder="Activity Details"></div>
        <div class="col-1 text-end"><button class="btn btn-sm text-danger mt-2" onclick="this.parentElement.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button></div>
    `;
    document.getElementById('task-list').appendChild(div);
}

// --- SAVE FUNCTION (UPDATED) ---
async function saveTasks() {
    const foodPlanText = document.getElementById('food-plan-input').value;
    await sb.from('schedules').update({ food_plan: foodPlanText }).eq('id', selectedScheduleId);

    // Delete existing tasks
    await sb.from('tasks').delete().eq('schedule_id', selectedScheduleId);

    const inserts = [];

    if (selectedCategory === 'Everyday') {
        // HARVEST EVERYDAY DATA (Sections)
        const sections = document.querySelectorAll('.schedule-section');
        sections.forEach(sec => {
            const title = sec.querySelector('.section-title-input').value;
            const rows = sec.querySelectorAll('.task-row-everyday');
            
            rows.forEach(r => {
                inserts.push({
                    schedule_id: selectedScheduleId,
                    section_title: title, // New Field
                    day: r.querySelector('.t-day').value, // New Field
                    time_slot: r.querySelector('.t-time').value,
                    activity: r.querySelector('.t-act').value
                });
            });
        });
    } else {
        // HARVEST NORMAL DATA (Simple)
        const rows = document.querySelectorAll('.task-row-simple');
        rows.forEach(r => {
            inserts.push({
                schedule_id: selectedScheduleId,
                section_title: null,
                day: null,
                time_slot: r.querySelector('.t-time').value,
                activity: r.querySelector('.t-act').value
            });
        });
    }

    if(inserts.length > 0) await sb.from('tasks').insert(inserts);

    const btn = document.querySelector('.btn-save');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Saved</span>';
    setTimeout(() => { btn.innerHTML = originalText; }, 2000);
}

// ... (Rename, Convert, Delete, Download, Logout functions same as before) ...
// Copy paste mo lang yung old helper functions dito sa baba kung nawala
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
        await sb.from('schedules').update({ category: 'Everyday', target_date: null, title: selectedScheduleTitle + " (Everyday)" }).eq('id', selectedScheduleId);
        selectedCategory = 'Everyday'; selectedScheduleTitle += " (Everyday)"; enterEditMode(); loadSidebar();
    }
}
async function deleteSchedule() {
    if(confirm("Permanently delete this schedule?")) { await sb.from('schedules').delete().eq('id', selectedScheduleId); optionsModal.hide(); document.getElementById('editor-area').classList.add('d-none'); document.getElementById('empty-state').classList.remove('d-none'); loadSidebar(); }
}
document.getElementById('downloadBtn').addEventListener('click', () => {
    const captureArea = document.getElementById('capture-area');
    const textarea = document.getElementById('food-plan-input');
    const div = document.createElement('div');
    div.className = 'food-plan-box'; div.style.minHeight = '80px'; div.style.border = '1px solid #333'; div.style.color = '#ffffff'; div.style.padding = '15px'; div.style.background = 'transparent'; div.style.fontFamily = "'Poppins', sans-serif"; div.style.fontSize = "0.9rem";
    div.innerHTML = textarea.value.replace(/\n/g, '<br>');
    textarea.style.display = 'none'; textarea.parentNode.insertBefore(div, textarea);
    html2canvas(captureArea, { backgroundColor: "#121212", scale: 2 }).then(c => {
        const a = document.createElement('a'); a.download = 'TimeIsGold_Schedule.png'; a.href = c.toDataURL(); a.click();
        div.remove(); textarea.style.display = 'block';
    });
});
async function logout() { await sb.auth.signOut(); window.location.href = 'index.html'; }
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
// --- SPOTIFY PLAYLIST SWITCHER ---
// --- SPOTIFY SWITCHER (UPDATED FOR MIXED LINKS) ---
function changeSpotifySource(btn, fullUrl) {
    // 1. Change Iframe Source directly
    const frame = document.getElementById('spotify-frame');
    frame.src = fullUrl;

    // 2. Update Active Button Visuals
    const allBtns = document.querySelectorAll('.btn-playlist');
    allBtns.forEach(b => b.classList.remove('active'));
    
    // Add 'active' class to clicked button
    btn.classList.add('active');
}

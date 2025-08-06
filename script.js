// --- CONFIGURATION (YOUR KEYS GO HERE) ---
const GOOGLE_SCRIPT_URL = 'သင်၏_WEB_APP_URL_ကိုထည့်ပါ'; 
const IMGBB_API_KEY = 'သင်၏_IMGBB_API_KEY_ကိုထည့်ပါ';

// --- DOM ELEMENTS & STATE ---
const formView = document.getElementById('formView');
const dashboardView = document.getElementById('dashboardView');
const formViewBtn = document.getElementById('formViewBtn');
const dashboardViewBtn = document.getElementById('dashboardViewBtn');
const mainForm = document.getElementById('repairForm');
const submitButton = mainForm.querySelector('#submitButton');
const mainCorrectionsContainer = document.getElementById('correctionsContainer');
const addCorrectionBtn = document.getElementById('addCorrectionBtn');
const recordList = document.getElementById('recordList');
const recordCountEl = document.getElementById('recordCount');
const monthFilterEl = document.getElementById('monthFilter');
const statusFilterContainer = document.querySelector('.filter-group-status');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const updateButton = document.getElementById('updateButton');
const addEditCorrectionBtn = document.getElementById('addEditCorrectionBtn');
const editCorrectionsContainer = document.getElementById('editCorrectionsContainer');

let cachedData = [];
let currentStatusFilter = 'all';
let currentMonthFilter = 'all';

// --- VIEW SWITCHING ---
function switchView(viewName) {
    formView.classList.toggle('active-view', viewName === 'form');
    dashboardView.classList.toggle('active-view', viewName === 'dashboard');
    formViewBtn.classList.toggle('active', viewName === 'form');
    dashboardViewBtn.classList.toggle('active', viewName === 'dashboard');
    if (viewName === 'dashboard') {
        loadAndDisplayRecords(true);
    }
}
formViewBtn.addEventListener('click', () => switchView('form'));
dashboardViewBtn.addEventListener('click', () => switchView('dashboard'));


// --- DYNAMIC CORRECTIONS LOGIC ---
function addCorrectionPair(isEdit = false, data = { mistake: '', correction: '' }) {
    const container = isEdit ? editCorrectionsContainer : mainCorrectionsContainer;
    const pairDiv = document.createElement('div');
    pairDiv.className = 'correction-pair';
    pairDiv.innerHTML = `<input type="text" placeholder="လွဲချက်" class="mistake-input" value="${data.mistake}"><input type="text" placeholder="အမှန်" class="correction-input" value="${data.correction}"><button type="button" class="remove-btn">&times;</button>`;
    container.appendChild(pairDiv);
    pairDiv.querySelector('.remove-btn').addEventListener('click', () => pairDiv.remove());
}
addCorrectionBtn.addEventListener('click', () => addCorrectionPair(false));
addEditCorrectionBtn.addEventListener('click', () => addCorrectionPair(true));


// --- FORM SUBMISSION (CREATE) ---
mainForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    submitButton.disabled = true;
    showToast('Uploading photo...', 'info');

    const corrections = Array.from(mainCorrectionsContainer.querySelectorAll('.correction-pair')).map(pair => ({ mistake: pair.querySelector('.mistake-input').value, correction: pair.querySelector('.correction-input').value })).filter(c => c.mistake || c.correction);
    const photoFile = mainForm.querySelector('[name="image"]').files[0];
    const imgbbFormData = new FormData();
    imgbbFormData.append('image', photoFile);

    try {
        const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: imgbbFormData });
        const imgbbResult = await imgbbResponse.json();
        if (!imgbbResult.success) throw new Error(imgbbResult.data?.error?.message || 'ImgBB upload failed');
        
        showToast('Saving data...', 'info');
        
        const sheetFormData = new URLSearchParams();
        sheetFormData.append('action', 'create');
        sheetFormData.append('nrc', mainForm.querySelector('[name="nrc"]').value);
        sheetFormData.append('name', mainForm.querySelector('[name="name"]').value);
        sheetFormData.append('phone', mainForm.querySelector('[name="phone"]').value);
        sheetFormData.append('submissiondate', mainForm.querySelector('[name="submissiondate"]').value);
        sheetFormData.append('status', "စီစစ်ဆဲ");
        sheetFormData.append('imageurl', imgbbResult.data.url);
        sheetFormData.append('correctionsdata', JSON.stringify(corrections));
        
        const sheetResponse = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: sheetFormData });
        const sheetResult = await sheetResponse.json();
        if (sheetResult.result !== 'success') throw new Error(sheetResult.message);

        showToast('Record created successfully!', 'success');
        mainForm.reset();
        mainCorrectionsContainer.innerHTML = ''; addCorrectionPair(false);
        mainForm.querySelector('[name="submissiondate"]').valueAsDate = new Date();
        loadAndDisplayRecords(true);

    } catch (error) { showToast(`Error: ${error.message}`, 'error'); } 
    finally { submitButton.disabled = false; }
});


// --- FORM SUBMISSION (UPDATE) ---
editForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    updateButton.disabled = true;
    showToast('Updating record...', 'info');

    const corrections = Array.from(editCorrectionsContainer.querySelectorAll('.correction-pair')).map(pair => ({ mistake: pair.querySelector('.mistake-input').value, correction: pair.querySelector('.correction-input').value })).filter(c => c.mistake || c.correction);
    const formData = new URLSearchParams(new FormData(editForm));
    formData.set('correctionsdata', JSON.stringify(corrections));

    try {
        const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: formData });
        const result = await res.json();
        if (result.result !== 'success') throw new Error(result.message);

        showToast('Record updated successfully!', 'success');
        editModal.style.display = 'none';
        loadAndDisplayRecords(true);
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        updateButton.disabled = false;
    }
});


// --- DASHBOARD & DATA RENDERING ---
async function loadAndDisplayRecords(forceRefresh = false) {
    const cachedRecords = localStorage.getItem('repairTrackerData');

    if (!forceRefresh && cachedRecords) {
        cachedData = JSON.parse(cachedRecords);
        populateFiltersAndRender();
        fetchFreshData(); // Silently fetch fresh data in the background
        return;
    }
    
    recordList.innerHTML = '<p style="text-align:center; padding: 2rem;">Loading records from network...</p>';
    await fetchFreshData();
}

async function fetchFreshData() {
    try {
        const res = await fetch(GOOGLE_SCRIPT_URL);
        if (!res.ok) throw new Error('Network response was not ok.');
        const data = await res.json();
        const freshData = data.filter(r => r.id).map(r => ({ ...r, imageurl: r.imageurl || r.imageUrl }));
        
        localStorage.setItem('repairTrackerData', JSON.stringify(freshData));
        cachedData = freshData;
        populateFiltersAndRender();
    } catch(err) {
        showToast(`Could not fetch fresh data: ${err.message}`, 'error');
        populateFiltersAndRender(); 
    }
}


function populateFiltersAndRender() {
    if (!cachedData || cachedData.length === 0) {
        recordList.innerHTML = '<p style="text-align: center; padding: 2rem;">No records available.</p>';
        recordCountEl.textContent = 0;
        return;
    }

    const previousMonth = monthFilterEl.value;
    const months = [...new Set(cachedData.map(r => new Date(r.submissiondate).toLocaleString('my-MM', { month: 'long', year: 'numeric' })))];
    monthFilterEl.innerHTML = '<option value="all">လအားလုံး</option>';
    months.forEach(m => monthFilterEl.innerHTML += `<option value="${m}">${m}</option>`);
    monthFilterEl.value = previousMonth;
    renderFilteredRecords();
}

function renderFilteredRecords() {
    const sortedData = cachedData.slice().sort((a, b) => b.id - a.id);
    const filteredData = sortedData.filter(record => {
        const statusMatch = currentStatusFilter === 'all' || record.status === currentStatusFilter;
        const recordMonth = new Date(record.submissiondate).toLocaleString('my-MM', { month: 'long', year: 'numeric' });
        const monthMatch = currentMonthFilter === 'all' || recordMonth === currentMonthFilter;
        return statusMatch && monthMatch;
    });

    recordList.innerHTML = '';
    recordCountEl.textContent = filteredData.length;
    if (filteredData.length === 0) { recordList.innerHTML = '<p style="text-align: center; padding: 2rem;">No matching records found.</p>'; } 
    else { filteredData.forEach(renderRecordCard); }
}

function renderRecordCard(record) {
    const card = document.createElement('div'); card.className = 'record-card';
    const statusClasses = { 'စီစစ်ဆဲ': 'status-pending', 'အတည်ပြုပြီး': 'status-approved', 'ပယ်ဖျက်သည်': 'status-rejected' };
    const statusClass = statusClasses[record.status] || '';

    const today = new Date(); today.setHours(0,0,0,0);
    const submissionDate = new Date(record.submissiondate); submissionDate.setHours(0,0,0,0);
    const dayDiff = Math.round((today - submissionDate) / (1000 * 3600 * 24));
    const daysSinceText = `(${dayDiff} ရက် ကြာပြီ)`;
    const overdueClass = (dayDiff > 3 && record.status === 'စီစစ်ဆဲ') ? 'overdue' : '';

    let correctionsHTML = '';
    if (record.correctionsdata && record.correctionsdata.length > 2) {
        try {
            const corrections = JSON.parse(record.correctionsdata);
            if (corrections.length > 0) { correctionsHTML = `<div class="corrections-section"><h4>ပြင်ဆင်ချက်များ</h4><ul class="corrections-list">${corrections.map(c => `<li><strong>လွဲချက်:</strong> ${c.mistake} &rarr; <strong>အမှန်:</strong> ${c.correction}</li>`).join('')}</ul></div>`; }
        } catch (e) { /* ignore parse error */ }
    }

    let actionsHTML = `<button class="action-btn" onclick="openEditModal('${record.id}')">ပြင်ဆင်ရန်</button><button class="action-btn delete-btn" onclick="deleteRecord('${record.id}')">ဖျက်ရန်</button>`;
    if (record.status === 'စီစစ်ဆဲ') {
        actionsHTML += `<button class="action-btn" onclick="changeStatus('${record.id}', 'အတည်ပြုပြီး')">အတည်ပြုရန်</button><button class="action-btn" onclick="changeStatus('${record.id}', 'ပယ်ဖျက်သည်')">ပယ်ဖျက်ရန်</button>`;
    }

    card.innerHTML = `
        <div class="record-card-content">
            <h2>${record.nrc}</h2>
            <div class="record-property"><strong>အမည်:</strong><span>${record.name}</span></div>
            <div class="record-property"><strong>ဖုန်း:</strong><span>${record.phone || 'N/A'}</span></div>
            <div class="record-property"><strong class="${overdueClass}">တင်သွင်းရက်:</strong><span>${submissionDate.toLocaleDateString('en-GB')} ${daysSinceText}</span></div>
            <div class="record-property"><strong>အခြေအနေ:</strong><span><span class="status-tag ${statusClass}">${record.status}</span></span></div>
            ${correctionsHTML}
            <div class="card-actions">${actionsHTML}</div>
        </div>
        ${record.imageurl ? `<img src="${record.imageurl}" alt="Record Photo" class="record-image" loading="lazy">` : ''}
    `;
    recordList.appendChild(card);
}

// --- FILTER & MODAL EVENT LISTENERS ---
statusFilterContainer.addEventListener('click', e => { if (e.target.matches('.status-filter-btn')) { document.querySelector('.status-filter-btn.active').classList.remove('active'); e.target.classList.add('active'); currentStatusFilter = e.target.dataset.filter; renderFilteredRecords(); }});
monthFilterEl.addEventListener('change', e => { currentMonthFilter = e.target.value; renderFilteredRecords(); });
editModal.querySelector('.close-button').addEventListener('click', () => editModal.style.display = 'none');
window.addEventListener('click', (event) => { if (event.target == editModal) { editModal.style.display = "none"; }});

// --- RECORD ACTIONS (OPEN MODAL, UPDATE STATUS, DELETE) ---
function openEditModal(id) {
    const record = cachedData.find(r => r.id.toString() === id);
    if (!record) { showToast('Record not found to edit.', 'error'); return; }
    
    editForm.id.value = record.id;
    editForm.nrc.value = record.nrc;
    editForm.name.value = record.name;
    editForm.phone.value = record.phone;
    
    editCorrectionsContainer.innerHTML = '';
    if (record.correctionsdata && record.correctionsdata.length > 2) {
        try { JSON.parse(record.correctionsdata).forEach(c => addCorrectionPair(true, c)); } catch(e) { /* ignore */ }
    }
    addCorrectionPair(true);
    editModal.style.display = 'block';
}

async function changeStatus(id, newStatus) {
    showToast('Updating status...', 'info');
    const formData = new URLSearchParams({ action: 'updateStatus', id, newStatus });
    try {
        const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: formData });
        const result = await res.json();
        if (result.result !== 'success') throw new Error(result.message);
        showToast('Status updated successfully!', 'success');
        loadAndDisplayRecords(true);
    } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

async function deleteRecord(id) {
    if (!confirm('ဤမှတ်တမ်းကို အမှန်တကယ် ဖျက်သိမ်းလိုပါသလား?')) return;
    showToast('Deleting record...', 'info');
    const formData = new URLSearchParams({ action: 'delete', id });
    try {
        const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: formData });
        const result = await res.json();
        if (result.result !== 'success') throw new Error(result.message);
        showToast('Record deleted successfully!', 'success');
        loadAndDisplayRecords(true);
    } catch (err) { showToast(`Error: ${err.message}`, 'error'); }
}

// --- TOAST NOTIFICATION ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 3000);
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    mainForm.querySelector('[name="submissiondate"]').valueAsDate = new Date();
    addCorrectionPair(false);
    switchView('form');
});

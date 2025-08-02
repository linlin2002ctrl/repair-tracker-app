// --- CONFIGURATION (UPDATED WITH YOUR NEW URL) ---
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzMplJ5ia4MNTcMls_mw7r2tkQu1nby3Rzrk82p-_QDS9O-tdc8YZQRBFXuCmcIxaYb/exec'; 
const IMGBB_API_KEY = '03a91e4e8c74467418a93ef6688bcf6d'; // Your existing key

// --- DOM ELEMENTS & STATE ---
const formView = document.getElementById('formView');
const dashboardView = document.getElementById('dashboardView');
const formViewBtn = document.getElementById('formViewBtn');
const dashboardViewBtn = document.getElementById('dashboardViewBtn');
const form = document.getElementById('repairForm');
const submitButton = document.getElementById('submitButton');
const correctionsContainer = document.getElementById('correctionsContainer');
const addCorrectionBtn = document.getElementById('addCorrectionBtn');
const recordList = document.getElementById('recordList');
const recordCountEl = document.getElementById('recordCount');
const monthFilterEl = document.getElementById('monthFilter');
const statusFilterContainer = document.querySelector('.filter-group-status');

let cachedData = [];
let currentStatusFilter = 'all';
let currentMonthFilter = 'all';

// --- VIEW SWITCHING ---
function switchView(viewName) {
    formView.classList.toggle('active-view', viewName === 'form');
    dashboardView.classList.toggle('active-view', viewName === 'dashboard');
    formViewBtn.classList.toggle('active', viewName === 'form');
    dashboardViewBtn.classList.toggle('active', viewName === 'dashboard');
    if (viewName === 'dashboard' && cachedData.length === 0) {
        loadAndDisplayRecords(true);
    }
}
formViewBtn.addEventListener('click', () => switchView('form'));
dashboardViewBtn.addEventListener('click', () => switchView('dashboard'));


// --- DYNAMIC CORRECTIONS LOGIC ---
function addCorrectionPair() {
    const pairDiv = document.createElement('div');
    pairDiv.className = 'correction-pair';
    pairDiv.innerHTML = `<input type="text" placeholder="လွဲချက်" class="mistake-input" required><input type="text" placeholder="အမှန်" class="correction-input" required><button type="button" class="remove-btn">×</button>`;
    correctionsContainer.appendChild(pairDiv);
    pairDiv.querySelector('.remove-btn').addEventListener('click', () => pairDiv.remove());
}
addCorrectionBtn.addEventListener('click', addCorrectionPair);


// --- FORM SUBMISSION ---
form.addEventListener('submit', async function(e) {
    e.preventDefault();
    submitButton.disabled = true;
    showToast('Uploading photo...', 'info');

    const corrections = Array.from(document.querySelectorAll('.correction-pair')).map(pair => ({
        mistake: pair.querySelector('.mistake-input').value,
        correction: pair.querySelector('.correction-input').value
    })).filter(c => c.mistake && c.correction);
    const correctionsJSON = JSON.stringify(corrections);

    const photoFile = form.photoInput.files[0];
    const imgbbFormData = new FormData();
    imgbbFormData.append('image', photoFile);

    try {
        const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: imgbbFormData });
        const imgbbResult = await imgbbResponse.json();
        if (!imgbbResult.success) throw new Error(imgbbResult.data.error.message || 'ImgBB upload failed');
        
        showToast('Saving data...', 'info');
        
        const sheetFormData = new URLSearchParams(); // Use URLSearchParams for reliability
        sheetFormData.append('nrc', form.nrc.value);
        sheetFormData.append('name', form.name.value);
        sheetFormData.append('submissiondate', form.submissionDate.value);
        sheetFormData.append('status', "စီစစ်ဆဲ"); // Default status
        sheetFormData.append('imageUrl', imgbbResult.data.url);
        sheetFormData.append('correctionsdata', correctionsJSON);
        
        const sheetResponse = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: sheetFormData });
        const sheetResult = await sheetResponse.json();
        if (sheetResult.result !== 'success') throw new Error(sheetResult.message || 'Failed to save to Google Sheet.');

        showToast('Record created successfully!', 'success');
        form.reset();
        correctionsContainer.innerHTML = '';
        addCorrectionPair();
        loadAndDisplayRecords(true); // Force refresh dashboard data

    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        submitButton.disabled = false;
    }
});


// --- DASHBOARD & DATA RENDERING ---
async function loadAndDisplayRecords(forceRefresh = false) {
    if (cachedData.length > 0 && !forceRefresh) {
        populateFiltersAndRender();
        return;
    }
    recordList.innerHTML = '<p>Loading records...</p>';
    try {
        const res = await fetch(GOOGLE_SCRIPT_URL);
        if (!res.ok) throw new Error('Network response was not ok.');
        const data = await res.json();
        cachedData = data.filter(r => r.id).map(r => ({ ...r, imageurl: r.imageurl || r.imageUrl })); // Normalize image URL key
        populateFiltersAndRender();
    } catch(err) {
        recordList.innerHTML = `<p>Error loading records: ${err.message}</p>`;
    }
}

function populateFiltersAndRender() {
    const months = new Set(cachedData.map(r => new Date(r.submissiondate).toLocaleString('en-US', { month: 'long', year: 'numeric' })));
    monthFilterEl.innerHTML = '<option value="all">All Months</option>';
    months.forEach(m => monthFilterEl.innerHTML += `<option value="${m}">${m}</option>`);
    monthFilterEl.value = currentMonthFilter;
    renderFilteredRecords();
}

function renderFilteredRecords() {
    const sortedData = cachedData.slice().sort((a, b) => b.id - a.id);
    const filteredData = sortedData.filter(record => {
        const statusMatch = currentStatusFilter === 'all' || record.status === currentStatusFilter;
        const recordMonth = new Date(record.submissiondate).toLocaleString('en-US', { month: 'long', year: 'numeric' });
        const monthMatch = currentMonthFilter === 'all' || recordMonth === currentMonthFilter;
        return statusMatch && monthMatch;
    });

    recordList.innerHTML = '';
    recordCountEl.textContent = filteredData.length;
    if (filteredData.length === 0) {
        recordList.innerHTML = '<p>No matching records found.</p>';
    } else {
        filteredData.forEach(renderRecordCard);
    }
}

function renderRecordCard(record) {
    const card = document.createElement('div');
    card.className = 'record-card';
    const statusClasses = { 'စီစစ်ဆဲ': 'status-pending', 'အတည်ပြုပြီး': 'status-approved' };
    const statusClass = statusClasses[record.status] || '';

    let correctionsHTML = '';
    if (record.correctionsdata) {
        try {
            const corrections = JSON.parse(record.correctionsdata);
            if (corrections.length > 0) {
                correctionsHTML = `<div class="corrections-section"><h4>ပြင်ဆင်ချက်များ</h4><ul class="corrections-list">${corrections.map(c => `<li><strong>လွဲချက်:</strong> ${c.mistake} → <strong>အမှန်:</strong> ${c.correction}</li>`).join('')}</ul></div>`;
            }
        } catch (e) { /* ignore parse error */ }
    }

    let actionsHTML = `<button class="action-btn delete-btn" onclick="deleteRecord('${record.id}')">ဖျက်ရန်</button>`;
    if (record.status === 'စီစစ်ဆဲ') {
        actionsHTML += `<button class="action-btn" onclick="changeStatus('${record.id}', 'အတည်ပြုပြီး')">အတည်ပြုရန်</button>`;
    }

    card.innerHTML = `
        <div class="record-card-content">
            <h2>${record.nrc}</h2>
            <div class="record-property"><strong>အမည်:</strong><span>${record.name}</span></div>
            <div class="record-property"><strong>တင်သွင်းရက်:</strong><span>${new Date(record.submissiondate).toLocaleDateString()}</span></div>
            <div class="record-property"><strong>အခြေအနေ:</strong><span><span class="status-tag ${statusClass}">${record.status}</span></span></div>
            ${correctionsHTML}
            <div class="card-actions">${actionsHTML}</div>
        </div>
        ${record.imageurl ? `<img src="${record.imageurl}" alt="Record Photo" class="record-image">` : ''}
    `;
    recordList.appendChild(card);
}

// --- FILTER EVENT LISTENERS ---
statusFilterContainer.addEventListener('click', e => {
    if (e.target.matches('.status-filter-btn')) {
        document.querySelector('.status-filter-btn.active').classList.remove('active');
        e.target.classList.add('active');
        currentStatusFilter = e.target.dataset.filter;
        renderFilteredRecords();
    }
});
monthFilterEl.addEventListener('change', e => {
    currentMonthFilter = e.target.value;
    renderFilteredRecords();
});

// --- RECORD ACTIONS (UPDATE/DELETE) ---
async function changeStatus(id, newStatus) {
    const formData = new URLSearchParams({ action: 'updateStatus', id, newStatus });
    try {
        const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: formData });
        const result = await res.json();
        if (result.result !== 'success') throw new Error(result.message);
        showToast('Status updated successfully!', 'success');
        const recordInCache = cachedData.find(r => r.id.toString() === id);
        if (recordInCache) recordInCache.status = newStatus;
        renderFilteredRecords();
    } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
    }
}

async function deleteRecord(id) {
    if (!confirm('ဤမှတ်တမ်းကို အမှန်တကယ် ဖျက်သိမ်းလိုပါသလား?')) return;
    const formData = new URLSearchParams({ action: 'delete', id });
    try {
        const res = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: formData });
        const result = await res.json();
        if (result.result !== 'success') throw new Error(result.message);
        showToast('Record deleted successfully!', 'success');
        cachedData = cachedData.filter(r => r.id.toString() !== id);
        renderFilteredRecords();
    } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
    }
}

// --- TOAST NOTIFICATION ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('submissionDate').valueAsDate = new Date();
    addCorrectionPair();
    switchView('form');
});

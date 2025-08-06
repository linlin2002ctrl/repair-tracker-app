// --- CONFIGURATION (YOUR KEYS GO HERE) ---
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzMplJ5ia4MNTcMls_mw7r2tkQu1nby3Rzrk82p-_QDS9O-tdc8YZQRBFXuCmcIxaYb/exec'; 
const IMGBB_API_KEY = '03a91e4e8c74467418a93ef6688bcf6d';

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
        
        const sheetFormData = new URLSearchParams(new FormData(mainForm));
        sheetFormData.append('action', 'create');
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
        fetchFreshData();
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
    const months = [...new Set(cachedData.map(r => new D

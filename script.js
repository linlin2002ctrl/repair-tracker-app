// This URL should remain unchanged from your last working version
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzMplJ5ia4MNTcMls_mw7r2tkQu1nby3Rzrk82p-_QDS9O-tdc8YZQRBFXuCmcIxaYb/exec';

// --- Global DOM Elements ---
const formView = document.getElementById('formView');
const dashboardView = document.getElementById('dashboardView');
const formViewBtn = document.getElementById('formViewBtn');
const dashboardViewBtn = document.getElementById('dashboardViewBtn');

const form = document.getElementById('repairForm');
const submitButton = document.getElementById('submitButton');
const recordList = document.getElementById('recordList');
const loadingDiv = document.getElementById('loading');

const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const closeModalButton = document.querySelector('.close-button');
const filterContainer = document.querySelector('.filter-container');

let cachedData = []; // Cache data to avoid repeated fetches
let currentFilter = 'all'; // Default filter

// --- EVENT LISTENERS ---

// Navigation
formViewBtn.addEventListener('click', () => switchView('form'));
dashboardViewBtn.addEventListener('click', () => switchView('dashboard'));

// Filtering
filterContainer.addEventListener('click', (e) => {
    if (e.target.matches('.filter-btn')) {
        currentFilter = e.target.dataset.filter;
        document.querySelector('.filter-btn.active').classList.remove('active');
        e.target.classList.add('active');
        renderData(cachedData);
    }
});

// Form Submissions
form.addEventListener('submit', handleCreate);
editForm.addEventListener('submit', handleUpdate);

// Record Card Actions (Edit/Delete)
recordList.addEventListener('click', (e) => {
    if (e.target.classList.contains('edit-btn')) openEditModal(e.target.dataset.id);
    if (e.target.classList.contains('delete-btn')) handleDelete(e.target.dataset.id);
});

// Modal Closing
closeModalButton.addEventListener('click', closeModal);
window.addEventListener('click', (e) => { if (e.target === editModal) closeModal(); });


// --- CORE FUNCTIONS ---

// CREATE
function handleCreate(e) {
    e.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = 'တင်နေသည်...';
    fetch(SCRIPT_URL, { method: 'POST', body: new FormData(form) })
        .then(res => res.json())
        .then(data => {
            if (data.result === 'success') {
                showToast('မှတ်တမ်းတင်ခြင်း အောင်မြင်ပါသည်။', 'success');
                form.reset();
                document.getElementById('submissionDate').valueAsDate = new Date();
                fetchData(true); // Force refresh
            } else { throw new Error(data.error); }
        })
        .catch(error => showToast(`Error: ${error.message}`, 'error'))
        .finally(() => {
            submitButton.disabled = false;
            submitButton.textContent = 'မှတ်တမ်းတင်မည်';
        });
}

// READ
async function fetchData(forceRefresh = false) {
    if (cachedData.length > 0 && !forceRefresh) {
        renderData(cachedData);
        return;
    }
    loadingDiv.style.display = 'block';
    recordList.innerHTML = '';
    try {
        const response = await fetch(SCRIPT_URL);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        cachedData = await response.json();
        renderData(cachedData);
    } catch (error) {
        loadingDiv.innerHTML = `<p>Data ရယူရာတွင် အမှားအယွင်း ဖြစ်ပေါ်နေပါသည်။ (${error.message})</p>`;
    } finally {
        loadingDiv.style.display = 'none';
    }
}

// UPDATE
function handleUpdate(e) {
    e.preventDefault();
    const updateButton = document.getElementById('updateButton');
    updateButton.disabled = true;
    updateButton.textContent = 'သိမ်းဆည်းနေသည်...';
    fetch(SCRIPT_URL, { method: 'POST', body: new FormData(editForm) })
        .then(res => res.json())
        .then(data => {
            if (data.result === 'success') {
                showToast('ပြင်ဆင်ခြင်း အောင်မြင်ပါသည်။', 'success');
                closeModal();
                fetchData(true); // Force refresh
            } else { throw new Error(data.message); }
        })
        .catch(error => showToast(`Error: ${error.message}`, 'error'))
        .finally(() => {
            updateButton.disabled = false;
            updateButton.textContent = 'သိမ်းဆည်းမည်';
        });
}

// DELETE
function handleDelete(id) {
    if (confirm('ဤမှတ်တမ်းကို အမှန်တကယ် ဖျက်သိမ်းလိုပါသလား?')) {
        const formData = new FormData();
        formData.append('action', 'delete');
        formData.append('id', id);
        fetch(SCRIPT_URL, { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.result === 'success') {
                    showToast('ဖျက်သိမ်းခြင်း အောင်မြင်ပါသည်။', 'success');
                    fetchData(true); // Force refresh
                } else { throw new Error(data.message); }
            })
            .catch(error => showToast(`Error: ${error.message}`, 'error'));
    }
}

// --- UI & HELPER FUNCTIONS ---

// Renders data to the list based on the current filter
function renderData(data) {
    recordList.innerHTML = '';
    const filteredData = data.filter(record => {
        if (currentFilter === 'all') return true;
        return record.status === currentFilter;
    });

    if (filteredData.length === 0) {
        recordList.innerHTML = `<p style="text-align:center;">"${currentFilter}" နှင့် ကိုက်ညီသော မှတ်တမ်းများ မရှိသေးပါ။</p>`;
        return;
    }
    
    filteredData.slice().reverse().forEach(renderRecordCard);
}

// Renders a single record card
function renderRecordCard(record) {
    const card = document.createElement('div');
    card.className = 'record-card';
    const statusClass = { 'စီစစ်ဆဲ': 'status-pending', 'အတည်ပြုပြီး': 'status-approved', 'ပယ်ဖျက်သည်': 'status-rejected' }[record.status] || '';
    card.classList.add(statusClass);

    const dayDiff = Math.round((new Date() - new Date(record.submissiondate)) / (1000 * 3600 * 24));
    const daysSinceText = dayDiff >= 0 ? `(တင်ထားသည်မှာ ${dayDiff} ရက် ရှိပြီ)` : '';
    let overdueAlert = (record.status === 'စီစစ်ဆဲ' && dayDiff > 3) ? `<div class="overdue-alert">ဖုန်းဆက်ရန်လိုအပ်ပါသည် (${dayDiff} ရက် ကျော်နေပါပြီ)</div>` : '';
    const displayDate = new Date(record.submissiondate).toLocaleDateString('en-GB');

    card.innerHTML = `
        <h3>${record.name}</h3>
        <p><strong>နိုင်ငံသားကတ်:</strong> ${record.nrc}</p>
        <p><strong>ဖုန်း:</strong> ${record.phone}</p>
        <p><strong>စက်:</strong> ${record.machineid}</p>
        <p><strong>တင်သွင်းသည့်ရက်:</strong> ${displayDate} <span class="days-since">${daysSinceText}</span></p>
        <p><span class="status">${record.status}</span></p>
        ${overdueAlert}
        <div class="card-actions">
            <button class="action-button edit-btn" data-id="${record.id}">ပြင်ဆင်ရန်</button>
            <button class="action-button delete-btn" data-id="${record.id}">ဖျက်သိမ်းရန်</button>
        </div>
    `;
    recordList.appendChild(card);
}

// View switching logic
function switchView(viewName) {
    if (viewName === 'form') {
        formView.classList.add('active-view');
        dashboardView.classList.remove('active-view');
        formViewBtn.classList.add('active');
        dashboardViewBtn.classList.remove('active');
    } else {
        dashboardView.classList.add('active-view');
        formView.classList.remove('active-view');
        dashboardViewBtn.classList.add('active');
        formViewBtn.classList.remove('active');
        fetchData(); // Fetch data when switching to dashboard
    }
}

// Modal control
function openEditModal(id) {
    const record = cachedData.find(r => r.id.toString() === id.toString());
    if (!record) {
        showToast('မှတ်တမ်း ရှာမတွေ့ပါ', 'error');
        return;
    }
    document.getElementById('editId').value = record.id;
    document.getElementById('editName').value = record.name;
    document.getElementById('editNrc').value = record.nrc;
    document.getElementById('editPhone').value = record.phone;
    document.getElementById('editMachineID').value = record.machineid;
    document.getElementById('editStatus').value = record.status;
    editModal.style.display = 'block';
}
function closeModal() {
    editModal.style.display = 'none';
}

// Toast notification
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}


// --- INITIALIZATION ---
function initialize() {
    document.getElementById('submissionDate').valueAsDate = new Date();
    // Default to form view on load
    switchView('form');
}

document.addEventListener('DOMContentLoaded', initialize);

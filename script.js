const SCRIPT_URL = 'သင်၏_WEB_APP_URL_ကို_အရင်အတိုင်းထားပါ';

const form = document.getElementById('repairForm');
const submitButton = document.getElementById('submitButton');
const recordList = document.getElementById('recordList');
const loadingDiv = document.getElementById('loading');

const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const closeModalButton = document.querySelector('.close-button');

// Set today's date as default for the new entry form
document.getElementById('submissionDate').valueAsDate = new Date();

// --- EVENT LISTENERS ---

// Handle NEW record submission
form.addEventListener('submit', function(e) {
    e.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = 'တင်နေသည်...';

    fetch(SCRIPT_URL, { method: 'POST', body: new FormData(form) })
        .then(res => res.json())
        .then(data => {
            if(data.result === 'success'){
                alert('မှတ်တမ်းတင်ခြင်း အောင်မြင်ပါသည်။');
                form.reset();
                document.getElementById('submissionDate').valueAsDate = new Date();
                fetchData(); // Refresh the list
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        })
        .catch(error => alert(`Error: မှတ်တမ်းတင်ရန် အခက်အခဲရှိနေပါသည်။\n${error.message}`))
        .finally(() => {
            submitButton.disabled = false;
            submitButton.textContent = 'မှတ်တမ်းတင်မည်';
        });
});

// Handle clicks on EDIT and DELETE buttons
recordList.addEventListener('click', function(e) {
    if (e.target.classList.contains('edit-btn')) {
        const recordId = e.target.dataset.id;
        openEditModal(recordId);
    }
    if (e.target.classList.contains('delete-btn')) {
        const recordId = e.target.dataset.id;
        handleDelete(recordId);
    }
});

// Handle UPDATE record submission from modal
editForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const updateButton = document.getElementById('updateButton');
    updateButton.disabled = true;
    updateButton.textContent = 'သိမ်းဆည်းနေသည်...';
    
    fetch(SCRIPT_URL, { method: 'POST', body: new FormData(editForm) })
        .then(res => res.json())
        .then(data => {
            if(data.result === 'success'){
                alert('ပြင်ဆင်ခြင်း အောင်မြင်ပါသည်။');
                closeModal();
                fetchData();
            } else {
                 throw new Error(data.message || 'Update failed');
            }
        })
        .catch(error => alert(`Error: ပြင်ဆင်ရန် အခက်အခဲရှိနေပါသည်။\n${error.message}`))
        .finally(() => {
            updateButton.disabled = false;
            updateButton.textContent = 'သိမ်းဆည်းမည်';
        });
});

// Close modal events
closeModalButton.addEventListener('click', closeModal);
window.addEventListener('click', function(e) {
    if (e.target === editModal) {
        closeModal();
    }
});


// --- FUNCTIONS ---

let cachedData = []; // To store data for editing

// Function to fetch and display ALL data
async function fetchData() {
    loadingDiv.style.display = 'block';
    recordList.innerHTML = '';

    try {
        const response = await fetch(SCRIPT_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        cachedData = await response.json();
        
        loadingDiv.style.display = 'none';
        if (cachedData.length === 0) {
            recordList.innerHTML = '<p style="text-align:center;">မှတ်တမ်းများ မရှိသေးပါ</p>';
            return;
        }

        // Reverse to show latest entry first
        cachedData.slice().reverse().forEach(renderRecordCard);

    } catch (error) {
        loadingDiv.innerHTML = `<p>Data ရယူရာတွင် အမှားအယွင်း ဖြစ်ပေါ်နေပါသည်။ (${error.message})</p>`;
    }
}

// Function to render a single record card
function renderRecordCard(record) {
    const card = document.createElement('div');
    card.className = 'record-card';
    card.dataset.id = record.id;

    const statusClass = { 'စီစစ်ဆဲ': 'status-pending', 'အတည်ပြုပြီး': 'status-approved', 'ပယ်ဖျက်သည်': 'status-rejected' }[record.status] || '';
    card.classList.add(statusClass);

    // Calculate days since submission
    const submissionDate = new Date(record.submissiondate);
    const today = new Date();
    today.setHours(0,0,0,0); // Normalize today's date
    submissionDate.setHours(0,0,0,0); // Normalize submission date
    const dayDiff = Math.round((today - submissionDate) / (1000 * 60 * 60 * 24));
    const daysSinceText = dayDiff >= 0 ? `(တင်ထားသည်မှာ ${dayDiff} ရက် ရှိပြီ)` : '';

    // Overdue Alert
    let overdueAlert = '';
    if (record.status === 'စီစစ်ဆဲ' && dayDiff > 3) {
        overdueAlert = `<div class="overdue-alert">ဖုန်းဆက်ရန်လိုအပ်ပါသည် (${dayDiff} ရက် ကျော်နေပါပြီ)</div>`;
    }

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

// Function to handle DELETE request
function handleDelete(id) {
    if (confirm('ဤမှတ်တမ်းကို အမှန်တကယ် ဖျက်သိမ်းလိုပါသလား?')) {
        const formData = new FormData();
        formData.append('action', 'delete');
        formData.append('id', id);

        fetch(SCRIPT_URL, { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.result === 'success') {
                    alert('ဖျက်သိမ်းခြင်း အောင်မြင်ပါသည်။');
                    fetchData(); // Refresh list
                } else {
                    throw new Error(data.message || 'Delete failed');
                }
            })
            .catch(error => alert(`Error: ဖျက်သိမ်းရန် အခက်အခဲရှိနေပါသည်။\n${error.message}`));
    }
}

// --- MODAL FUNCTIONS ---

function openEditModal(id) {
    const recordToEdit = cachedData.find(record => record.id.toString() === id.toString());
    if (!recordToEdit) {
        alert('ပြင်ဆင်ရန် မှတ်တမ်းကို ရှာမတွေ့ပါ။');
        return;
    }

    // Populate modal form with existing data
    document.getElementById('editId').value = recordToEdit.id;
    document.getElementById('editName').value = recordToEdit.name;
    document.getElementById('editNrc').value = recordToEdit.nrc;
    document.getElementById('editPhone').value = recordToEdit.phone;
    document.getElementById('editMachineID').value = recordToEdit.machineid;
    document.getElementById('editStatus').value = recordToEdit.status;
    
    editModal.style.display = 'block';
}

function closeModal() {
    editModal.style.display = 'none';
}

// --- INITIAL LOAD ---
document.addEventListener('DOMContentLoaded', fetchData);

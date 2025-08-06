// --- CONFIGURATION (UPDATE THIS WITH YOUR NEW URL) ---
const GOOGLE_SCRIPT_URL = 'သင်၏_WEB_APP_URL_အသစ်စက်စက်ကို_ဒီမှာထည့်ပါ'; 
const IMGBB_API_KEY = 'သင်၏_IMGBB_API_KEY_ကိုထည့်ပါ';

// --- DOM ELEMENTS & STATE ---
// ... (All existing variables remain the same) ...

// --- VIEW SWITCHING ---
// ... (This function remains the same) ...

// --- DYNAMIC CORRECTIONS LOGIC ---
// ... (This function remains the same) ...

// --- FORM SUBMISSION (CREATE) ---
mainForm.addEventListener('submit', async function(e) {
    // This function's existing logic is already correct because it uses `new FormData(mainForm)`
    // which automatically picks up the new 'machineid' field. No changes needed here.
    // ... (Your latest working CREATE function)
});

// --- FORM SUBMISSION (UPDATE) ---
editForm.addEventListener('submit', async function(e) {
    // This function's existing logic is also correct because it uses `new FormData(editForm)`
    // ... (Your latest working UPDATE function)
});

// --- DASHBOARD & DATA RENDERING ---
// ... (loadAndDisplayRecords, populateFiltersAndRender, renderFilteredRecords functions remain the same) ...

function renderRecordCard(record) {
    const card = document.createElement('div'); card.className = 'record-card';
    // ... (All existing status, overdue, and corrections logic remains the same) ...

    card.innerHTML = `
        <div class="record-card-content">
            <h2>${record.nrc}</h2>
            <div class="record-property"><strong>အမည်:</strong><span>${record.name}</span></div>
            <div class="record-property"><strong>ဖုန်း:</strong><span>${record.phone || 'N/A'}</span></div>
            <!-- Machine ID display added -->
            <div class="record-property"><strong>စက်နံပါတ်:</strong><span>${record.machineid || 'N/A'}</span></div>
            <div class="record-property"><strong class="${overdueClass}">တင်သွင်းရက်:</strong><span>${submissionDate.toLocaleDateString('en-GB')} ${daysSinceText}</span></div>
            <div class="record-property"><strong>အခြေအနေ:</strong><span><span class="status-tag ${statusClass}">${record.status}</span></span></div>
            ${correctionsHTML}
            <div class="card-actions">${actionsHTML}</div>
        </div>
        ${record.imageurl ? `<img src="${record.imageurl}" alt="Record Photo" class="record-image" loading="lazy">` : ''}
    `;
    recordList.appendChild(card);
}

// --- RECORD ACTIONS (OPEN MODAL, UPDATE STATUS, DELETE) ---
function openEditModal(id) {
    const record = cachedData.find(r => r.id.toString() === id);
    if (!record) { showToast('Record not found to edit.', 'error'); return; }
    
    // Populate form with existing data, including the new Machine ID
    editForm.id.value = record.id;
    editForm.nrc.value = record.nrc;
    editForm.name.value = record.name;
    editForm.phone.value = record.phone;
    editForm.machineid.value = record.machineid; // <<<< This line is added
    
    // ... (rest of the openEditModal function remains the same) ...
}

// ... (changeStatus, deleteRecord, showToast, and Initialization functions remain the same) ...

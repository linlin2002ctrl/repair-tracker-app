// --- CONFIGURATION ---
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzMplJ5ia4MNTcMls_mw7r2tkQu1nby3Rzrk82p-_QDS9O-tdc8YZQRBFXuCmcIxaYb/exec'; 
const IMGBB_API_KEY = '03a91e4e8c74467418a93ef6688bcf6d';

// --- DOM ELEMENTS & STATE ---
// ... (All existing variables) ...
const searchInput = document.getElementById('searchInput');
const recordDisplayArea = document.getElementById('recordDisplayArea');
const cardViewBtn = document.getElementById('cardViewBtn');
const tableViewBtn = document.getElementById('tableViewBtn');
let currentView = 'cards'; // 'cards' or 'table'

// --- EVENT LISTENERS (NEW & UPDATED) ---
// ... (View switching, form submission listeners) ...
searchInput.addEventListener('keyup', () => renderFilteredRecords());
cardViewBtn.addEventListener('click', () => switchRecordView('cards'));
tableViewBtn.addEventListener('click', () => switchRecordView('table'));

// --- VIEW SWITCHING ---
function switchRecordView(view) {
    currentView = view;
    cardViewBtn.classList.toggle('active', view === 'cards');
    tableViewBtn.classList.toggle('active', view === 'table');
    renderFilteredRecords(); // Re-render with the new view
}

// --- DASHBOARD & DATA RENDERING ---
// ... (loadAndDisplayRecords and fetchFreshData remain the same) ...

function populateFiltersAndRender() {
    updateKpis(); // <<<< NEW: Calculate and display KPIs
    // ... (rest of the populateFilters function) ...
}

// <<<< NEW: KPI Calculation Function >>>>
function updateKpis() {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let overdueCount = 0;
    let pendingCount = 0;
    let completedThisMonthCount = 0;

    cachedData.forEach(r => {
        const submissionDate = new Date(r.submissiondate);
        const dayDiff = (now - submissionDate) / (1000 * 3600 * 24);
        
        if (r.status === 'စီစစ်ဆဲ') {
            pendingCount++;
            if (dayDiff > 3) {
                overdueCount++;
            }
        }
        if (r.status === 'အတည်ပြုပြီး' && submissionDate >= firstDayOfMonth) {
            completedThisMonthCount++;
        }
    });

    document.getElementById('kpiOverdue').textContent = overdueCount;
    document.getElementById('kpiPending').textContent = pendingCount;
    document.getElementById('kpiCompleted').textContent = completedThisMonthCount;
    document.getElementById('kpiTotal').textContent = cachedData.length;
}


function renderFilteredRecords() {
    // 1. Filter by Search term
    const searchTerm = searchInput.value.toLowerCase();
    const searchedData = searchTerm
        ? cachedData.filter(r => 
            r.name.toLowerCase().includes(searchTerm) ||
            r.phone.toLowerCase().includes(searchTerm) ||
            r.nrc.toLowerCase().includes(searchTerm)
          )
        : cachedData;

    // 2. Filter by Status and Month
    const filteredData = searchedData.filter(record => {
        // ... (existing status and month filtering logic) ...
    });
    
    // 3. Sort
    const sortedData = filteredData.slice().sort((a, b) => b.id - a.id);
    
    // 4. Render based on current view
    recordDisplayArea.innerHTML = '';
    // document.getElementById('recordCount').textContent = sortedData.length;
    
    if (sortedData.length === 0) {
        recordDisplayArea.innerHTML = '<p style="text-align: center; padding: 2rem;">No matching records found.</p>';
    } else {
        if (currentView === 'cards') {
            sortedData.forEach(renderRecordCard);
        } else {
            renderTable(sortedData);
        }
    }
}

// <<<< NEW: Table Rendering Function >>>>
function renderTable(data) {
    const table = document.createElement('table');
    table.className = 'record-table';
    let tableHTML = `<thead><tr>
        <th>NRC</th><th>အမည်</th><th>Status</th><th>ရက်ကြာ</th><th>Actions</th>
    </tr></thead><tbody>`;

    data.forEach(record => {
        // ... (calculate daysSinceText, overdueClass, statusClass)
        // ... (build actionsHTML)
        
        tableHTML += `<tr>
            <td>${record.nrc}</td>
            <td>${record.name}</td>
            <td><span class="status-tag ${statusClass}">${record.status}</span></td>
            <td class="${overdueClass}">${daysSinceText}</td>
            <td><div class="table-actions">${actionsHTML}</div></td>
        </tr>`;
    });

    tableHTML += '</tbody>';
    table.innerHTML = tableHTML;
    recordDisplayArea.appendChild(table);
}


// Modify renderRecordCard to append to the new display area
function renderRecordCard(record) {
    // ... (Your existing renderRecordCard logic is perfect)
    // Just make sure it ends with:
    // recordDisplayArea.appendChild(card);
}

// --- (The rest of your script.js remains the same) ---

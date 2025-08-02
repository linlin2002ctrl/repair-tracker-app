// အရင်ကသုံးခဲ့တဲ့ သင်၏ Web App URL ကိုပဲ ဆက်သုံးပါ
const SCRIPT_URL = 'သင်၏_WEB_APP_URL_ကိုဖြည့်ပါ'; 

// Global variable to hold all records for filtering
let allRecords = [];

// This function runs when any page is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the FORM page (index.html)
    if (document.getElementById('repairForm')) {
        initializeFormPage();
    }

    // Check if we are on the DASHBOARD page (dashboard.html)
    if (document.getElementById('recordList')) {
        initializeDashboardPage();
    }
});


// --- FORM PAGE LOGIC (for index.html) ---
function initializeFormPage() {
    const form = document.getElementById('repairForm');
    const submitButton = document.getElementById('submitButton');
    
    // Set today's date as default for the date input
    document.getElementById('submissionDate').valueAsDate = new Date();

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = 'တင်နေသည်...';
        
        const formData = new FormData(form);
        
        fetch(SCRIPT_URL, { method: 'POST', body: formData })
            .then(res => res.json())
            .then(data => {
                if (data.result === 'success') {
                    alert('မှတ်တမ်းတင်ခြင်း အောင်မြင်ပါသည်။ Dashboard စာမျက်နှာတွင် သွားရောက်စစ်ဆေးနိုင်ပါသည်။');
                    form.reset();
                    document.getElementById('submissionDate').valueAsDate = new Date();
                } else {
                    console.error('Apps Script Error:', data.error);
                    alert('Error: မှတ်တမ်းတင်ရန် အခက်အခဲရှိနေပါသည်။ Apps Script Log ကို စစ်ဆေးပါ။');
                }
            })
            .catch(error => {
                console.error('Fetch Error:', error);
                alert('Error: မှတ်တမ်းတင်ရန် အခက်အခဲရှိနေပါသည်။ Network သို့မဟုတ် URL ကိုစစ်ဆေးပါ။');
            })
            .finally(() => {
                submitButton.disabled = false;
                submitButton.textContent = 'မှတ်တမ်းတင်မည်';
            });
    });
}


// --- DASHBOARD PAGE LOGIC (for dashboard.html) ---
function initializeDashboardPage() {
    fetchData();
    setupFilters();
}

function setupFilters() {
    const filterButtons = document.querySelector('.filter-buttons');
    filterButtons.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            // Update active button style
            document.querySelector('.filter-btn.active').classList.remove('active');
            e.target.classList.add('active');
            
            const filterValue = e.target.getAttribute('data-filter');
            filterData(filterValue);
        }
    });
}

function filterData(status) {
    if (status === 'All') {
        renderData(allRecords);
    } else {
        const filteredRecords = allRecords.filter(record => record.status === status);
        renderData(filteredRecords);
    }
}

function fetchData() {
    const loadingDiv = document.getElementById('loading');
    loadingDiv.style.display = 'block';

    fetch(`${SCRIPT_URL}?t=${new Date().getTime()}`)
        .then(res => res.json())
        .then(data => {
            loadingDiv.style.display = 'none';
            if (!Array.isArray(data)) {
                console.error("Data received is not an array:", data);
                document.getElementById('recordList').innerHTML = "<p>Data format မှားယွင်းနေပါသည်။</p>";
                return;
            }
            allRecords = data.reverse(); // Store all records and show latest first
            renderData(allRecords); // Initial render with all data
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            loadingDiv.textContent = 'Data ကို ရယူနိုင်ခြင်း မရှိပါ။ API ချိတ်ဆက်မှုကို စစ်ဆေးပါ။';
        });
}

function renderData(records) {
    const recordList = document.getElementById('recordList');
    recordList.innerHTML = ''; // Clear previous list

    if (records.length === 0) {
        recordList.innerHTML = '<p style="text-align:center;">ဤအခြေအနေအတွက် မှတ်တမ်းများ မရှိသေးပါ။</p>';
        return;
    }

    records.forEach(record => {
        const card = document.createElement('div');
        card.className = 'record-card';

        let statusClass = '';
        if (record.status === 'စီစစ်ဆဲ') statusClass = 'status-pending';
        else if (record.status === 'အတည်ပြုပြီး') statusClass = 'status-approved';
        else if (record.status === 'ပယ်ဖျက်သည်') statusClass = 'status-rejected';
        card.classList.add(statusClass);

        let overdueAlert = '';
        if (record.status === 'စီစစ်ဆဲ') {
            const submissionDate = new Date(record.submissiondate);
            const today = new Date();
            const timeDiff = today.getTime() - submissionDate.getTime();
            const dayDiff = timeDiff / (1000 * 3600 * 24);
            if (dayDiff > 3) {
                overdueAlert = `<div class="overdue-alert">ဖုန်းဆက်ရန်လိုအပ်ပါသည် (၃ ရက်ကျော်နေပါပြီ)</div>`;
            }
        }
        
        const displayDate = record.submissiondate ? new Date(record.submissiondate).toLocaleDateString('en-GB') : 'N/A';

        card.innerHTML = `
            <h3>NRC: ${record.nrc || 'N/A'}</h3>
            <p><strong>ပြင်ဆင်သည့်အရာ:</strong> ${record.correctiontype || 'N/A'}</p>
            <p><strong>ဖုန်း:</strong> ${record.phone || 'N/A'}</p>
            <p><strong>စက်:</strong> ${record.machineid || 'N/A'}</p>
            <p><strong>တင်သွင်းသည့်ရက်:</strong> ${displayDate}</p>
            <p><span class="status">${record.status || 'N/A'}</span></p>
            ${overdueAlert}
        `;
        recordList.appendChild(card);
    });
}
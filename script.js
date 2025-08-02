// အဆင့် ၁.၂ မှ ရရှိသော သင်၏ Web App URL ကို ဤနေရာတွင် အစားထိုးပါ
const SCRIPT_URL = 'သင်ရရှိလာသော_WEB_APP_URL_ကိုဖြည့်ပါ'; 

const form = document.getElementById('repairForm');
const submitButton = document.getElementById('submitButton');
const recordList = document.getElementById('recordList');
const loadingDiv = document.getElementById('loading');

// Set today's date as default for the date input
document.getElementById('submissionDate').valueAsDate = new Date();


// Handle form submission
form.addEventListener('submit', function(e) {
    e.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = 'တင်နေသည်...';
    
    const formData = new FormData(form);
    
    fetch(SCRIPT_URL, {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        console.log(data);
        alert('မှတ်တမ်းတင်ခြင်း အောင်မြင်ပါသည်။');
        form.reset();
        document.getElementById('submissionDate').valueAsDate = new Date(); // Reset date after submission
        fetchData(); // Refresh the list
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error: မှတ်တမ်းတင်ရန် အခက်အခဲရှိနေပါသည်။');
    })
    .finally(() => {
        submitButton.disabled = false;
        submitButton.textContent = 'မှတ်တမ်းတင်မည်';
    });
});

// Function to fetch and display data
function fetchData() {
    loadingDiv.style.display = 'block';
    recordList.innerHTML = ''; // Clear previous list

    fetch(SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
            loadingDiv.style.display = 'none';
            // Reverse the data to show latest entry first
            data.reverse().forEach(record => {
                const card = document.createElement('div');
                card.className = 'record-card';

                let statusClass = '';
                if (record.status === 'စီစစ်ဆဲ') {
                    statusClass = 'status-pending';
                } else if (record.status === 'အတည်ပြုပြီး') {
                    statusClass = 'status-approved';
                } else if (record.status === 'ပယ်ဖျက်သည်') {
                    statusClass = 'status-rejected';
                }
                card.classList.add(statusClass);

                let overdueAlert = '';
                // Check if the record is pending and older than 3 days
                if (record.status === 'စီစစ်ဆဲ') {
                    const submissionDate = new Date(record.submissiondate);
                    const today = new Date();
                    const timeDiff = today.getTime() - submissionDate.getTime();
                    const dayDiff = timeDiff / (1000 * 3600 * 24);

                    if (dayDiff > 3) {
                        overdueAlert = `<div class="overdue-alert">ဖုန်းဆက်ရန်လိုအပ်ပါသည် (၃ ရက်ကျော်နေပါပြီ)</div>`;
                    }
                }

                // Format date to DD-MM-YYYY
                const displayDate = new Date(record.submissiondate).toLocaleDateString('en-GB');

                card.innerHTML = `
                    <h3>${record.name}</h3>
                    <p><strong>နိုင်ငံသားကတ်:</strong> ${record.nrc}</p>
                    <p><strong>ဖုန်း:</strong> ${record.phone}</p>
                    <p><strong>စက်:</strong> ${record.machineid}</p>
                    <p><strong>တင်သွင်းသည့်ရက်:</strong> ${displayDate}</p>
                    <p><span class="status">${record.status}</span></p>
                    ${overdueAlert}
                `;
                recordList.appendChild(card);
            });
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            loadingDiv.textContent = 'Data ကို ရယူနိုင်ခြင်း မရှိပါ။';
        });
}

// Fetch data when the page loads
document.addEventListener('DOMContentLoaded', fetchData);
```4.  `'သင်ရရှိလာသော_WEB_APP_URL_ကိုဖြည့်ပါ'` ဆိုတဲ့နေရာမှာ သင့် URL ကို **single quote (' ')** အတွင်းမှာ မှန်ကန်စွာထည့်သွင်းပြီး **Commit new file** ကိုနှိပ်ပါ။

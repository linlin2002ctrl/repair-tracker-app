// --- CONFIGURATION (UPDATED WITH YOUR KEYS) ---
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzMplJ5ia4MNTcMls_mw7r2tkQu1nby3Rzrk82p-_QDS9O-tdc8YZQRBFXuCmcIxaYb/exec'; 
const IMGBB_API_KEY = '03a91e4e8c74467418a93ef6688bcf6d';

// --- DOM ELEMENTS ---
const form = document.getElementById('repairForm');
const submitButton = document.getElementById('submitButton');
const uploadStatus = document.getElementById('uploadStatus');
const recordList = document.getElementById('recordList');
const addCorrectionBtn = document.getElementById('addCorrectionBtn');
const correctionsContainer = document.getElementById('correctionsContainer');
const recordCountEl = document.getElementById('recordCount');

// --- DYNAMIC CORRECTIONS ---
addCorrectionBtn.addEventListener('click', addCorrectionPair);

function addCorrectionPair() {
    const pairDiv = document.createElement('div');
    pairDiv.className = 'correction-pair';
    pairDiv.innerHTML = `
        <input type="text" placeholder="လွဲချက်" class="mistake-input" required>
        <input type="text" placeholder="အမှန်" class="correction-input" required>
        <button type="button" class="remove-btn">×</button>
    `;
    correctionsContainer.appendChild(pairDiv);
    pairDiv.querySelector('.remove-btn').addEventListener('click', () => pairDiv.remove());
}

// --- FORM SUBMISSION ---
form.addEventListener('submit', async function(e) {
    e.preventDefault();
    submitButton.disabled = true;
    uploadStatus.textContent = 'ဓာတ်ပုံကို Upload တင်နေပါသည်...';

    // 1. Collect corrections data
    const corrections = [];
    document.querySelectorAll('.correction-pair').forEach(pair => {
        const mistake = pair.querySelector('.mistake-input').value;
        const correction = pair.querySelector('.correction-input').value;
        if (mistake && correction) {
            corrections.push({ mistake, correction });
        }
    });
    const correctionsJSON = JSON.stringify(corrections);

    // 2. Upload image to ImgBB
    const photoFile = form.photoInput.files[0];
    const imgbbFormData = new FormData();
    imgbbFormData.append('image', photoFile);

    try {
        const imgbbResponse = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: imgbbFormData });
        const imgbbResult = await imgbbResponse.json();
        if (!imgbbResult.success) throw new Error(imgbbResult.error.message);
        
        uploadStatus.textContent = 'အချက်အလက်များကို သိမ်းဆည်းနေပါသည်...';
        
        // 3. Prepare data for Google Sheet
        const sheetFormData = new FormData();
        sheetFormData.append('nrc', form.nrc.value);
        sheetFormData.append('name', form.name.value);
        sheetFormData.append('phone', form.phone.value);
        sheetFormData.append('submissiondate', form.submissiondate.value);
        sheetFormData.append('status', form.status.value);
        sheetFormData.append('imageUrl', imgbbResult.data.url);
        sheetFormData.append('correctionsdata', correctionsJSON); // Send JSON string
        
        // 4. Save to Google Sheet
        const sheetResponse = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: sheetFormData });
        const sheetResult = await sheetResponse.json();
        if (sheetResult.result !== 'success') throw new Error('Google Sheet တွင် သိမ်းဆည်းရန် အခက်အခဲရှိနေပါသည်။');

        alert('မှတ်တမ်းတင်ခြင်း အောင်မြင်ပါသည်။');
        form.reset();
        correctionsContainer.innerHTML = ''; // Clear dynamic fields
        addCorrectionPair(); // Add back one default pair
        loadRecords();

    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        submitButton.disabled = false;
        uploadStatus.textContent = '';
    }
});

// --- DISPLAY RECORDS ---
async function loadRecords() {
    recordList.innerHTML = '<p>Loading records...</p>';
    try {
        const res = await fetch(GOOGLE_SCRIPT_URL);
        const data = await res.json();
        
        recordList.innerHTML = '';
        const validRecords = data.filter(r => r.id); // Filter out empty rows
        recordCountEl.textContent = validRecords.length;

        validRecords.slice().reverse().forEach(renderRecordCard);

    } catch(err) {
        recordList.innerHTML = '<p>Error loading records.</p>';
    }
}

function renderRecordCard(record) {
    const card = document.createElement('div');
    card.className = 'record-card';

    const statusClasses = { 'စီစစ်ဆဲ': 'status-pending', 'အတည်ပြုပြီး': 'status-approved', 'ပယ်ဖျက်သည်': 'status-rejected' };
    const statusClass = statusClasses[record.status] || '';

    // Parse corrections data
    let correctionsHTML = '';
    if (record.correctionsdata) {
        try {
            const corrections = JSON.parse(record.correctionsdata);
            if (corrections.length > 0) {
                correctionsHTML = `
                    <div class="corrections-section">
                        <h4>ပြင်ဆင်ချက်များ</h4>
                        <ul class="corrections-list">
                            ${corrections.map(c => `<li><strong>လွဲချက်:</strong> ${c.mistake} → <strong>အမှန်:</strong> ${c.correction}</li>`).join('')}
                        </ul>
                    </div>`;
            }
        } catch(e) { console.error("Could not parse corrections data:", record.correctionsdata); }
    }

    card.innerHTML = `
        <div class="record-card-content">
            <h2>${record.nrc}</h2>
            <div class="record-property"><strong>အမည်:</strong><span>${record.name}</span></div>
            <div class="record-property"><strong>ဖုန်း:</strong><span>${record.phone || 'N/A'}</span></div>
            <div class="record-property"><strong>တင်သွင်းရက်:</strong><span>${new Date(record.submissiondate).toLocaleDateString()}</span></div>
            <div class="record-property"><strong>အခြေအနေ:</strong><span><span class="status-tag ${statusClass}">${record.status}</span></span></div>
            ${correctionsHTML}
        </div>
        ${record.imageurl ? `<div class="record-image-wrapper"><img src="${record.imageurl}" alt="Record Photo" class="record-image"></div>` : ''}
    `;
    recordList.appendChild(card);
}

// --- INITIAL LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('submissionDate').valueAsDate = new Date();
    addCorrectionPair(); // Add one pair by default
    loadRecords();
});

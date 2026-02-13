// Backend URL - Configure this for your deployment
const BACKEND_URL = window.APP_CONFIG?.backendUrl || 'https://dla-tax.onrender.com';
const today = new Date().toISOString().split('T')[0];
document.getElementById('form_date').value = today;
// Set default for sig_date but user can change it
document.getElementById('sig_date').value = today;

// Toggle Dependents Section
function toggleDeps() {
    const has = document.querySelector('input[name="has_deps"]:checked')?.value === 'Yes';
    document.getElementById('deps_section').classList.toggle('hidden', !has);
    if (has && document.getElementById('deps_container').children.length === 0) addDep();
}

// Add Dependent
function addDep() {
    const container = document.getElementById('deps_container');
    const depCount = container.children.length + 1;
    const div = document.createElement('div');
    div.className = "grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-blue-200 shadow-sm relative";
    div.innerHTML = `
        <div><label class="label-title text-xs">Name / Nombre</label><input type="text" class="dep-name text-sm"></div>
        <div><label class="label-title text-xs">Age / Edad</label><input type="number" class="dep-age text-sm"></div>
        <div><label class="label-title text-xs">Months w/ you</label><input type="number" class="dep-months text-sm" max="12" value="12"></div>
        <button type="button" onclick="this.parentElement.remove(); updateDepLabels();" class="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-full text-xs shadow-lg font-bold flex items-center justify-center">×</button>
    `;
    container.appendChild(div);
}

function updateDepLabels() {
    const container = document.getElementById('deps_container');
    Array.from(container.children).forEach((child, index) => {
        child.querySelector('.label-title').textContent = `Dependent #${index + 1}`;
    });
}

// Toggle Business Location
function toggleBusinessLocation() {
    const inHouse = document.querySelector('input[name="biz_in_house"]:checked')?.value === 'Yes';
    document.getElementById('biz_home').classList.toggle('hidden', !inHouse);
    document.getElementById('biz_external').classList.toggle('hidden', inHouse);
}

// Toggle Expenses
function toggleExpenses() {
    const has = document.getElementById('has_expenses').checked;
    document.getElementById('expense_amount_div').classList.toggle('hidden', !has);
    document.getElementById('expense_freq_div').classList.toggle('hidden', !has);
    document.getElementById('expense_proof_div').classList.toggle('hidden', !has);
}

// Signature Canvas
function initSig(id) {
    const canvas = document.getElementById(id);
    if (!canvas || canvas.dataset.initialized === '1') return;
    canvas.dataset.initialized = '1';
    const ctx = canvas.getContext('2d');
    let drawing = false;
    const resize = () => {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(ratio, ratio);
    };
    window.addEventListener('resize', resize);
    resize();
    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };
    const start = (e) => { drawing = true; ctx.beginPath(); const p = getPos(e); ctx.moveTo(p.x, p.y); e.preventDefault(); };
    const move = (e) => { if(!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.lineWidth = 2; ctx.strokeStyle = "#0f172a"; ctx.stroke(); e.preventDefault(); };
    const end = () => drawing = false;
    canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move); window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, {passive: false}); canvas.addEventListener('touchmove', move, {passive: false}); canvas.addEventListener('touchend', end);
}

function clearSig(id) {
    const c = document.getElementById(id);
    c.getContext('2d').clearRect(0,0,c.width,c.height);
}

function hasRealSignature(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return false;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let nonTransparentPixels = 0;
    const totalPixels = data.length / 4;
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 50) nonTransparentPixels++;
    }
    return (nonTransparentPixels / totalPixels) > 0.01;
}

initSig('sig_tp');

// Form Submit
document.getElementById('selfEmployedForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const loader = document.getElementById('loader');
    const loaderMessage = document.getElementById('loader-message');
    loader.classList.remove('hidden');

    try {
        // Validate signature
        if (!hasRealSignature('sig_tp')) {
            throw new Error('Taxpayer signature is REQUIRED. Please sign before submitting.');
        }

        loaderMessage.textContent = 'Collecting form data...';
        
        // Collect form data
        const getSelectedValues = (id) => {
            const el = document.getElementById(id);
            return Array.from(el.selectedOptions).map(opt => opt.value);
        };

        const formData = {
            form_date: document.getElementById('form_date').value,
            tp_name: document.getElementById('tp_name').value,
            tp_lastname: document.getElementById('tp_lastname').value,
            tp_ssn: document.getElementById('tp_ssn').value,
            tp_phone: document.getElementById('tp_phone').value,
            addr_main: document.getElementById('addr_main').value,
            addr_city: document.getElementById('addr_city').value,
            addr_state: document.getElementById('addr_state').value,
            addr_zip: document.getElementById('addr_zip').value,
            has_deps: document.querySelector('input[name="has_deps"]:checked')?.value || '',
            dependents: Array.from(document.getElementById('deps_container').children).map(child => ({
                name: child.querySelector('.dep-name').value,
                age: child.querySelector('.dep-age').value,
                months: child.querySelector('.dep-months').value
            })),
            business_type: document.getElementById('business_type').value,
            biz_in_house: document.querySelector('input[name="biz_in_house"]:checked')?.value || '',
            biz_location_explain: document.getElementById('biz_location_explain').value,
            biz_name: document.getElementById('biz_name').value,
            biz_addr: document.getElementById('biz_addr').value,
            biz_city: document.getElementById('biz_city').value,
            biz_state: document.getElementById('biz_state').value,
            biz_zip: document.getElementById('biz_zip').value,
            biz_phone: document.getElementById('biz_phone').value,
            biz_contact: document.getElementById('biz_contact').value,
            biz_income_calc: document.getElementById('biz_income_calc').value,
            income_amount: document.getElementById('income_amount').value,
            income_months: document.getElementById('income_months').value,
            income_proof: getSelectedValues('income_proof'),
            has_expenses: document.getElementById('has_expenses').checked,
            expense_amount: document.getElementById('expense_amount').value,
            expense_freq: document.getElementById('expense_freq').value,
            expense_proof: getSelectedValues('expense_proof'),
            public_assist: document.querySelector('input[name="public_assist"]:checked')?.value || '',
            sig_date: document.getElementById('sig_date').value || today,
            signature: document.getElementById('sig_tp').toDataURL('image/png')
        };

        console.log('Form data collected:', formData);
        
        loaderMessage.textContent = 'Generating PDF...';
        
        // Generate PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
        let y = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        const col1 = margin;
        const col2 = margin + 50;

        // Header
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 64, 124);
        doc.text('DLA TAX SERVICES', pageWidth / 2, y, { align: 'center' });
        y += 8;
        doc.setFontSize(14);
        doc.setTextColor(30, 64, 124);
        doc.text('SELF EMPLOYED QUESTIONNAIRE', pageWidth / 2, y, { align: 'center' });
        y += 10;

        // Personal Info
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        y += 5;
        doc.text('PERSONAL INFORMATION', margin, y);
        y += 8;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        
        const addField = (label, value, y) => {
            doc.setFont(undefined, 'bold');
            doc.text(label + ':', col1, y);
            doc.setFont(undefined, 'normal');
            doc.text(String(value || ''), col2, y);
            return y + 6;
        };

        y = addField('Date', formData.form_date, y);
        y = addField('Name', formData.tp_name + ' ' + formData.tp_lastname, y);
        y = addField('SSN', formData.tp_ssn, y);
        y = addField('Phone', formData.tp_phone, y);
        y = addField('Address', formData.addr_main, y);
        y = addField('City', formData.addr_city, y);
        y = addField('State', formData.addr_state, y);
        y = addField('Zip', formData.addr_zip, y);

        // Dependents
        y += 5;
        doc.setFont(undefined, 'bold');
        doc.text('DEPENDENTS', margin, y);
        y += 6;
        doc.setFont(undefined, 'normal');
        if (formData.has_deps === 'Yes' && formData.dependents.length > 0) {
            formData.dependents.forEach((dep, i) => {
                y = addField(`#${i+1}`, `${dep.name} - Age: ${dep.age} - Months: ${dep.months}`, y);
            });
        } else {
            y = addField('Status', 'No dependents', y);
        }

        // Business
        y += 5;
        doc.setFont(undefined, 'bold');
        doc.text('BUSINESS INFORMATION', margin, y);
        y += 8;
        doc.setFont(undefined, 'normal');
        y = addField('Business Type', formData.business_type, y);
        y = addField('In Your House', formData.biz_in_house, y);
        
        if (formData.biz_in_house === 'No') {
            y = addField('Location Explain', formData.biz_location_explain, y);
            y = addField('Business Name', formData.biz_name, y);
            y = addField('Address', formData.biz_addr, y);
            y = addField('City', formData.biz_city, y);
            y = addField('State', formData.biz_state, y);
            y = addField('Zip', formData.biz_zip, y);
            y = addField('Phone', formData.biz_phone, y);
            y = addField('Contact', formData.biz_contact, y);
        } else {
            y = addField('Income Calculation', formData.biz_income_calc, y);
        }

        // Financial
        y += 5;
        doc.setFont(undefined, 'bold');
        doc.text('FINANCIAL DATA', margin, y);
        y += 8;
        doc.setFont(undefined, 'normal');
        y = addField('Income Amount', formData.income_amount, y);
        y = addField('Duration (Months)', formData.income_months, y);
        y = addField('Income Proof', formData.income_proof.join(', '), y);
        y = addField('Has Expenses', formData.has_expenses ? 'Yes' : 'No', y);
        if (formData.has_expenses) {
            y = addField('Expense Amount', formData.expense_amount, y);
            y = addField('Expense Frequency', formData.expense_freq, y);
            y = addField('Expense Proof', formData.expense_proof.join(', '), y);
        }
        y = addField('Public Assistance', formData.public_assist, y);

        // Legal Declaration
        y += 10;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('LEGAL DECLARATION', margin, y);
        y += 6;
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        const declaration = 'I hereby certify that all information provided is accurate and complete. I declare under penalty of perjurio that this information is correct.';
        const splitDeclaration = doc.splitTextToSize(declaration, pageWidth - 30);
        doc.text(splitDeclaration, margin, y);
        y += splitDeclaration.length * 4 + 5;

        // Signature
        if (formData.signature) {
            doc.addImage(formData.signature, 'PNG', margin, y, 60, 25);
        }
        y += 30;
        doc.line(margin, y, margin + 60, y);
        doc.setFontSize(8);
        doc.text('Taxpayer Signature', margin, y + 5);
        doc.text('Date: ' + formData.sig_date, margin + 70, y);

        // Save PDF
        const pdfBlob = doc.output('blob');
        const pdfBase64 = doc.output('datauristring');

        // Send to backend
        loaderMessage.textContent = 'Sending to server...';
        const response = await fetch(`${BACKEND_URL}/api/forms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pdf: pdfBase64,
                data: {
                    taxpayer_name: formData.tp_name + ' ' + formData.tp_lastname,
                    form_type: 'self-employed',
                    submission_date: formData.form_date
                }
            })
        });

        const result = await response.json();
        console.log('Backend response:', result);

        loader.classList.add('hidden');

        await Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Form submitted successfully. Check your email for the PDF.',
            confirmButtonColor: '#16a34a'
        });

        // Download PDF
        const link = document.createElement('a');
        link.href = pdfBase64;
        link.download = `SelfEmployed_${formData.tp_name}_${formData.tp_lastname}_2026.pdf`;
        link.click();

    } catch (error) {
        loader.classList.add('hidden');
        console.error('Error:', error);
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'An error occurred',
            confirmButtonColor: '#dc2626'
        });
    }
});

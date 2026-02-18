// Backend URL - Configure this for your deployment
const BACKEND_URL = window.APP_CONFIG?.backendUrl || 'https://dla-tax.onrender.com';

// Set dates when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date().toISOString().split('T')[0];
    
    // Set form date
    const formDateEl = document.getElementById('form_date');
    if (formDateEl) formDateEl.value = today;
    
    // Set signature date but user can change it
    const sigDateEl = document.getElementById('sig_date');
    if (sigDateEl) sigDateEl.value = today;
    
    // Initialize signature canvas
    initSig('sig_tp');
});

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
    
    // Reset the "use personal address" checkbox when toggling
    if (!inHouse) {
        document.getElementById('use_personal_address').checked = false;
        document.getElementById('biz_address_fields').classList.remove('hidden');
    }
}

// Toggle Use Personal Address
function toggleUsePersonalAddress() {
    const usePersonal = document.getElementById('use_personal_address').checked;
    const bizAddressFields = document.getElementById('biz_address_fields');
    
    bizAddressFields.classList.toggle('hidden', usePersonal);
    
    // If using personal address, clear business address fields
    if (usePersonal) {
        document.getElementById('biz_name').value = '';
        document.getElementById('biz_addr').value = '';
        document.getElementById('biz_city').value = '';
        document.getElementById('biz_state').value = '';
        document.getElementById('biz_zip').value = '';
        document.getElementById('biz_phone').value = '';
        document.getElementById('biz_contact').value = '';
    }
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
            use_personal_address: document.getElementById('use_personal_address')?.checked || false,
            biz_location_explain: document.getElementById('biz_location_explain').value,
            biz_name: document.getElementById('use_personal_address')?.checked ? '' : document.getElementById('biz_name').value,
            biz_addr: document.getElementById('use_personal_address')?.checked ? document.getElementById('addr_main').value : document.getElementById('biz_addr').value,
            biz_city: document.getElementById('use_personal_address')?.checked ? document.getElementById('addr_city').value : document.getElementById('biz_city').value,
            biz_state: document.getElementById('use_personal_address')?.checked ? document.getElementById('addr_state').value : document.getElementById('biz_state').value,
            biz_zip: document.getElementById('use_personal_address')?.checked ? document.getElementById('addr_zip').value : document.getElementById('biz_zip').value,
            biz_phone: document.getElementById('use_personal_address')?.checked ? document.getElementById('tp_phone').value : document.getElementById('biz_phone').value,
            biz_contact: document.getElementById('use_personal_address')?.checked ? document.getElementById('tp_name').value + ' ' + document.getElementById('tp_lastname').value : document.getElementById('biz_contact').value,
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
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const col1 = margin;
        const col2 = margin + 50;

        // ═══════════════════════════════════════════════════════════════
        // HEADER WITH DECORATIVE ELEMENTS
        // ═══════════════════════════════════════════════════════════════
        
        // Header background
        doc.setFillColor(30, 64, 124);
        doc.rect(0, 0, pageWidth, 35, 'F');
        
        // Company name
        doc.setFontSize(22);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('DLA TAX SERVICES', pageWidth / 2, y + 5, { align: 'center' });
        
        // Document title
        doc.setFontSize(14);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(147, 197, 253);
        doc.text('SELF EMPLOYED QUESTIONNAIRE', pageWidth / 2, y + 12, { align: 'center' });
        
        // Decorative line
        doc.setDrawColor(147, 197, 253);
        doc.setLineWidth(0.5);
        doc.line(margin, y + 16, pageWidth - margin, y + 16);
        
        // Prepared by
        doc.setFontSize(10);
        doc.setTextColor(191, 219, 254);
        doc.text('Prepared by Sergio De Los Angeles', pageWidth / 2, y + 22, { align: 'center' });
        
        // Date on the right
        doc.setFontSize(9);
        doc.text('Date: ' + formData.form_date, pageWidth - margin, y + 22, { align: 'right' });
        
        y = 42;

        // Define columns for two-column layout
        const leftCol = margin;
        const rightCol = 108;
        const labelOffset = 35;
        const startY = y;

        // Helper function to draw section box
        const drawSectionBox = (x, boxY, title, height) => {
            // Section background
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(x, boxY, 85, height, 2, 2, 'F');
            
            // Section header background
            doc.setFillColor(30, 64, 124);
            doc.roundedRect(x, boxY, 85, 7, 2, 2, 'F');
            // Cover bottom corners of header
            doc.setFillColor(30, 64, 124);
            doc.rect(x, boxY + 5, 85, 2, 'F');
            
            // Section title
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(title, x + 42.5, boxY + 5, { align: 'center' });
            
            // Border
            doc.setDrawColor(30, 64, 124);
            doc.setLineWidth(0.3);
            doc.roundedRect(x, boxY, 85, height, 2, 2, 'S');
        };

        // Helper function for fields with better spacing
        const addField = (label, value, yPos, xPos = leftCol) => {
            doc.setFont(undefined, 'bold');
            doc.setFontSize(9);
            doc.setTextColor(30, 64, 124);
            doc.text(label + ':', xPos + 3, yPos);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(String(value || '-'), xPos + labelOffset, yPos);
            return yPos + 6;
        };

        // ═══════════════════════════════════════════════════════════════
        // LEFT COLUMN: Personal Info + Dependents
        // ═══════════════════════════════════════════════════════════════
        
        // PERSONAL INFORMATION Section
        let boxHeight = 50;
        drawSectionBox(leftCol, startY, 'PERSONAL INFORMATION', boxHeight);
        
        let yLeft = startY + 12;
        yLeft = addField('Date', formData.form_date, yLeft, leftCol);
        yLeft = addField('Full Name', formData.tp_name + ' ' + formData.tp_lastname, yLeft, leftCol);
        yLeft = addField('SSN', formData.tp_ssn, yLeft, leftCol);
        yLeft = addField('Phone', formData.tp_phone, yLeft, leftCol);
        yLeft = addField('Address', formData.addr_main, yLeft, leftCol);
        yLeft = addField('City/State/Zip', `${formData.addr_city}, ${formData.addr_state} ${formData.addr_zip}`, yLeft, leftCol);

        // DEPENDENTS Section
        let depBoxY = startY + boxHeight + 5;
        let depBoxHeight = formData.has_deps === 'Yes' && formData.dependents.length > 0 
            ? 15 + (formData.dependents.length * 6) 
            : 20;
        drawSectionBox(leftCol, depBoxY, 'DEPENDENTS', depBoxHeight);
        
        yLeft = depBoxY + 12;
        if (formData.has_deps === 'Yes' && formData.dependents.length > 0) {
            formData.dependents.forEach((dep, i) => {
                yLeft = addField(`Dependent #${i+1}`, `${dep.name} - Age: ${dep.age} - Months: ${dep.months}`, yLeft, leftCol);
            });
        } else {
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text('No dependents reported', leftCol + 3, yLeft);
        }

        // ═══════════════════════════════════════════════════════════════
        // RIGHT COLUMN: Financial Data + Business Info
        // ═══════════════════════════════════════════════════════════════
        
        // FINANCIAL DATA Section
        let finBoxHeight = formData.has_expenses ? 62 : 44;
        drawSectionBox(rightCol, startY, 'FINANCIAL DATA', finBoxHeight);
        
        let yRight = startY + 12;
        yRight = addField('Income Amount', formData.income_amount, yRight, rightCol);
        yRight = addField('Duration', formData.income_months + ' months', yRight, rightCol);
        yRight = addField('Income Proof', formData.income_proof.join(', '), yRight, rightCol);
        yRight = addField('Has Expenses', formData.has_expenses ? 'Yes' : 'No', yRight, rightCol);
        if (formData.has_expenses) {
            yRight = addField('Expense Amount', formData.expense_amount, yRight, rightCol);
            yRight = addField('Expense Freq', formData.expense_freq, yRight, rightCol);
            yRight = addField('Expense Proof', formData.expense_proof.join(', '), yRight, rightCol);
        }
        yRight = addField('Public Assist', formData.public_assist, yRight, rightCol);

        // BUSINESS INFORMATION Section
        let bizBoxY = startY + finBoxHeight + 5;
        let bizBoxHeight = 45;
        if (formData.biz_in_house === 'No' && !formData.use_personal_address) {
            bizBoxHeight = 62;
        }
        drawSectionBox(rightCol, bizBoxY, 'BUSINESS INFORMATION', bizBoxHeight);
        
        yRight = bizBoxY + 12;
        yRight = addField('Business Type', formData.business_type, yRight, rightCol);
        yRight = addField('In Your House', formData.biz_in_house, yRight, rightCol);
        
        if (formData.biz_in_house === 'No') {
            if (formData.use_personal_address) {
                yRight = addField('Address', 'Same as Personal', yRight, rightCol);
            } else {
                yRight = addField('Business Name', formData.biz_name, yRight, rightCol);
                yRight = addField('Address', formData.biz_addr, yRight, rightCol);
                yRight = addField('City/State/Zip', `${formData.biz_city}, ${formData.biz_state} ${formData.biz_zip}`, yRight, rightCol);
                yRight = addField('Phone', formData.biz_phone, yRight, rightCol);
                yRight = addField('Contact', formData.biz_contact, yRight, rightCol);
            }
        } else {
            yRight = addField('Income Calc', formData.biz_income_calc, yRight, rightCol);
        }

        // ═══════════════════════════════════════════════════════════════
        // LEGAL DECLARATION SECTION
        // ═══════════════════════════════════════════════════════════════
        
        y = Math.max(depBoxY + depBoxHeight, bizBoxY + bizBoxHeight) + 10;
        
        // Declaration box
        doc.setFillColor(15, 23, 42);
        doc.roundedRect(margin, y, pageWidth - (margin * 2), 35, 3, 3, 'F');
        
        // Declaration title
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(74, 222, 128);
        doc.text('LEGAL DECLARATION', margin + 5, y + 8);
        
        // Declaration text
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(203, 213, 225);
        const declaration = 'I hereby certify that all information provided is accurate and complete. I declare under penalty of perjury that this information is correct. I understand that I am responsible for the accuracy of all information submitted.';
        const splitDeclaration = doc.splitTextToSize(declaration, pageWidth - (margin * 2) - 10);
        doc.text(splitDeclaration, margin + 5, y + 15);
        
        y += 40;

        // ═══════════════════════════════════════════════════════════════
        // SIGNATURE SECTION
        // ═══════════════════════════════════════════════════════════════
        
        // Signature box
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(30, 64, 124);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin, y, pageWidth - (margin * 2), 45, 3, 3, 'FD');
        
        // Signature label
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 64, 124);
        doc.text('TAXPAYER SIGNATURE', margin + 5, y + 8);
        
        // Signature image
        if (formData.signature) {
            doc.addImage(formData.signature, 'PNG', margin + 5, y + 12, 60, 22);
        }
        
        // Signature line
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.3);
        doc.line(margin + 5, y + 36, margin + 65, y + 36);
        
        // Signature label under line
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Taxpayer Signature', margin + 35, y + 41, { align: 'center' });
        
        // Date field
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(30, 64, 124);
        doc.text('Date:', margin + 75, y + 25);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(formData.sig_date, margin + 85, y + 25);
        
        // Date line
        doc.setDrawColor(100, 100, 100);
        doc.line(margin + 75, y + 28, margin + 130, y + 28);

        // ═══════════════════════════════════════════════════════════════
        // FOOTER
        // ═══════════════════════════════════════════════════════════════
        
        // Footer line
        doc.setDrawColor(30, 64, 124);
        doc.setLineWidth(0.5);
        doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
        
        // Footer text
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('DLA Tax Services | Prepared by Sergio De Los Angeles', margin, pageHeight - 15);
        doc.text('Page 1 of 1', pageWidth - margin, pageHeight - 15, { align: 'right' });
        
        // Confidential notice
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text('CONFIDENTIAL - This document contains sensitive tax information', pageWidth / 2, pageHeight - 10, { align: 'center' });

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
            text: 'Form submitted successfully...',
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

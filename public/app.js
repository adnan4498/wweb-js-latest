document.addEventListener('DOMContentLoaded', function() {
    // Socket.io connection
    const socket = io();
    
    // DOM Elements
    const qrDisplay = document.getElementById('qrDisplay');
    const connectionStatus = document.getElementById('connectionStatus');
    const connectedSection = document.getElementById('connectedSection');
    const qrSection = document.getElementById('qrSection');
    const sendBulkBtn = document.getElementById('sendBulkBtn');
    const stopBulkBtn = document.getElementById('stopBulkBtn');
    const totalContacts = document.getElementById('totalContacts'); 
    const messagesSent = document.getElementById('messagesSent');
    const messagesPending = document.getElementById('messagesPending');
    const contactList = document.getElementById('contactList');
    const historyList = document.getElementById('historyList');
    const progressBar = document.getElementById('progressBar');
    const currentContact = document.getElementById('currentContact');
    const currentStatus = document.getElementById('currentStatus');
    const progressModal = new bootstrap.Modal(document.getElementById('progressModal'));
    
    // Contacts state
    let contacts = [];
    let sendingInProgress = false;
    
    // Socket event handlers
    socket.on('qr', (qr) => {
        qrDisplay.innerHTML = `<img src="${qr}" alt="QR Code" style="max-width: 200px;">`;
        connectionStatus.innerHTML = '<span class="badge bg-warning text-dark">Scan the QR code above</span>';
    });
    
    socket.on('ready', () => {
        qrSection.classList.add('d-none');
        connectedSection.classList.remove('d-none');
        connectionStatus.innerHTML = '<span class="badge bg-success">Connected successfully!</span>';
        sendBulkBtn.disabled = false;
        
        // Store connection status in localStorage
        localStorage.setItem('whatsappConnected', 'true');
    });
    
    // Check connection status on page load
    // Note: We don't auto-connect anymore since we cleared the cache
    // Users will need to scan QR code again
    
    socket.on('messageStatus', (data) => {
        updateHistory(data);
        updateStats();
    });
    
    socket.on('sendProgress', (data) => {
        const progress = (data.sent / data.total) * 100;
        progressBar.style.width = `${progress}%`;
        progressBar.textContent = `${Math.round(progress)}%`;
        
        currentContact.textContent = `${data.currentName || data.currentNumber} (${data.sent}/${data.total})`;
        currentStatus.textContent = data.status;
        
        if (data.sent === data.total) {
            sendingInProgress = false;
            sendBulkBtn.disabled = false;
            stopBulkBtn.classList.add('d-none');
            progressModal.hide();
        }
    });
    
    socket.on('contactsUpdated', (data) => {
        contacts = data.contacts;
        renderContactList();
        updateStats();
    });
    
    // Update statistics
    function updateStats() {
        totalContacts.textContent = contacts.length;
        const sent = contacts.filter(c => c.status === 'sent').length;
        const pending = contacts.filter(c => c.status === 'pending').length;
        messagesSent.textContent = sent;
        messagesPending.textContent = pending;
    }
    
    // Render contact list
    function renderContactList() {
        contactList.innerHTML = '';
        contacts.forEach((contact, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${contact.number}</td>
                <td>${contact.name || '-'}</td>
                <td>
                    <span class="status-badge bg-${getStatusClass(contact.status)}">${contact.status || 'pending'}</span>
                </td>
                <td>
                    <button class="btn btn-sm btn-danger delete-contact" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            contactList.appendChild(row);
        });
        
        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-contact').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                contacts.splice(index, 1);
                socket.emit('updateContacts', { contacts });
                // Re-render the list to update indices
                renderContactList();
            });
        });
    }
    
    function getStatusClass(status) {
        switch(status) {
            case 'sent': return 'success';
            case 'failed': return 'danger';
            case 'pending': return 'secondary';
            case 'sending': return 'info';
            default: return 'secondary';
        }
    }
    
    // Update history
    function updateHistory(data) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(data.timestamp).toLocaleString()}</td>
            <td>${data.number}</td>
            <td>${data.message.substring(0, 30)}${data.message.length > 30 ? '...' : ''}</td>
            <td><span class="status-badge bg-${getStatusClass(data.status)}">${data.status}</span></td>
        `;
        historyList.prepend(row);
    }
    
    // Event listeners
    sendBulkBtn.addEventListener('click', () => {
        const message = document.getElementById('messageContent').value;
        const delay = parseInt(document.getElementById('delayTime').value) || 15;
        
        if (!message.trim()) {
            alert('Please enter a message');
            return;
        }
        
        if (contacts.length === 0) {
            alert('Please add contacts first');
            return;
        }
        
        sendingInProgress = true;
        sendBulkBtn.disabled = true;
        stopBulkBtn.classList.remove('d-none');
        progressModal.show();
        
        socket.emit('startSending', { message, delay });
    });
    
    stopBulkBtn.addEventListener('click', () => {
        socket.emit('stopSending');
        sendingInProgress = false;
        sendBulkBtn.disabled = false;
        stopBulkBtn.classList.add('d-none');
        progressModal.hide();
    });
    
    document.getElementById('uploadContactsBtn').addEventListener('click', () => {
        const fileInput = document.getElementById('contactFile');
        if (!fileInput.files || fileInput.files.length === 0) {
            alert('Please select a file first');
            return;
        }

        const file = fileInput.files[0];
        if (!file.name.toLowerCase().endsWith('.csv')) {
            alert('Please select a CSV file');
            return;
        }
        const reader = new FileReader();

        reader.onload = function(e) {
            const content = e.target.result;
            const lines = content.split('\n').map(line => line.trim()).filter(line => line);
            const newContacts = [];

            if (lines.length === 0) return;

            // Check if first line is header
            const firstLine = lines[0].toLowerCase();
            const hasHeader = firstLine.includes('phone') || firstLine.includes('number') || firstLine.includes('mobile');

            let dataLines = lines;
            let phoneIndex = 0;
            let nameIndex = 1;

            if (hasHeader) {
                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                phoneIndex = headers.findIndex(h => h.includes('phone') || h.includes('number') || h.includes('mobile'));
                nameIndex = headers.findIndex(h => h.includes('name'));
                dataLines = lines.slice(1);
            }

            for (const line of dataLines) {
                const parts = line.split(',');
                if (parts.length > phoneIndex) {
                    const number = parts[phoneIndex] ? parts[phoneIndex].trim() : '';
                    const name = (nameIndex !== -1 && parts[nameIndex]) ? parts[nameIndex].trim() : '';
                    if (number) {
                        newContacts.push({
                            number: number,
                            name: name
                        });
                    }
                }
            }

            contacts = [...contacts, ...newContacts];
            socket.emit('updateContacts', { contacts });
            alert(`Added ${newContacts.length} contacts`);
        };

        reader.readAsText(file);
    });
    
    document.getElementById('addManualContactBtn').addEventListener('click', () => {
        const phone = document.getElementById('manualPhone').value.trim();
        const name = document.getElementById('manualName').value.trim();

        if (!phone) {
            alert('Please enter a phone number');
            return;
        }

        contacts.push({ number: phone, name: name || '' });
        socket.emit('updateContacts', { contacts });

        document.getElementById('manualPhone').value = '';
        document.getElementById('manualName').value = '';
    });

    document.getElementById('deleteAllContactsBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all contacts?')) {
            contacts = [];
            socket.emit('updateContacts', { contacts });
        }
    });
    
    // Initialize
    updateStats();
});
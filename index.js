const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Contacts storage
let contacts = [];
let sendingInProgress = false;
let sendInterval = null;

// WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--single-process'
        ],
        ignoreHTTPSErrors: true,
        timeout: 0
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Socket.io connection
io.on('connection', (socket) => {
    console.log('Client connected');
    
    // Send current contacts to new client
    socket.emit('contactsUpdated', { contacts });
    
    // Handle start sending
    socket.on('startSending', (data) => {
        if (sendingInProgress) return;
        
        sendingInProgress = true;
        const message = data.message;
        const delay = data.delay * 1000; // Convert to milliseconds
        let sentCount = 0;
        
        // Send messages with delay
        const sendNextMessage = async () => {
            if (!sendingInProgress || sentCount >= contacts.length) {
                sendingInProgress = false;
                io.emit('sendProgress', {
                    sent: sentCount,
                    total: contacts.length,
                    status: 'Completed'
                });
                return;
            }
            
            const contact = contacts[sentCount];
            
            io.emit('sendProgress', {
                sent: sentCount,
                total: contacts.length,
                currentNumber: contact.number,
                currentName: contact.name,
                status: `Sending to ${contact.name || contact.number}...`
            });
            
            try {
                contact.status = 'sending';
                io.emit('contactsUpdated', { contacts });

                // Format phone number correctly for WhatsApp
                let formattedNumber = contact.number.trim();

                // Remove any leading + if present
                if (formattedNumber.startsWith('+')) {
                    formattedNumber = formattedNumber.substring(1);
                }

                // Remove any leading 0
                if (formattedNumber.startsWith('0')) {
                    formattedNumber = formattedNumber.substring(1);
                }

                // Add country code if missing (Pakistan = 92)
                if (!formattedNumber.startsWith('92')) {
                    formattedNumber = '92' + formattedNumber;
                }

                const chatId = `${formattedNumber}@c.us`;
                console.log('Sending to:', chatId);

                // Check if user is registered on WhatsApp
                const isRegistered = await client.isRegisteredUser(chatId);
                if (!isRegistered) {
                    console.log('Number not registered on WhatsApp:', chatId);
                    contact.status = 'failed';
                    io.emit('messageStatus', {
                        number: contact.number,
                        name: contact.name,
                        message: message,
                        status: 'failed',
                        timestamp: new Date().toISOString()
                    });
                    sentCount++;
                    io.emit('contactsUpdated', { contacts });
                    setTimeout(sendNextMessage, delay);
                    return;
                }

                await client.sendMessage(chatId, message);
                
                contact.status = 'sent';
                const timestamp = new Date().toISOString();
                
                io.emit('messageStatus', {
                    number: contact.number,
                    name: contact.name,
                    message: message,
                    status: 'sent',
                    timestamp: timestamp
                });
                
                sentCount++;
            } catch (error) {
                console.error('Error sending message:', error);
                contact.status = 'failed';
                
                io.emit('messageStatus', {
                    number: contact.number,
                    name: contact.name,
                    message: message,
                    status: 'failed',
                    timestamp: new Date().toISOString()
                });
                
                sentCount++;
            }
            
            io.emit('contactsUpdated', { contacts });
            setTimeout(sendNextMessage, delay);
        };
        
        // Start sending
        sendNextMessage();
    });
    
    // Handle stop sending
    socket.on('stopSending', () => {
        sendingInProgress = false;
        io.emit('sendProgress', {
            sent: 0,
            total: contacts.length,
            status: 'Stopped'
        });
    });
    
    // Handle contacts update
    socket.on('updateContacts', (data) => {
        contacts = data.contacts;
        io.emit('contactsUpdated', { contacts });
    });
});

// WhatsApp Client Events
client.on('qr', (qr) => {
    console.log('QR Code generated');
    qrcode.toDataURL(qr, (err, url) => {
        io.emit('qr', url);
    });
});

client.on('ready', () => {
    console.log('WhatsApp Connected!');
    io.emit('ready', 'Connected');
    
    // Store connection status in memory
    global.whatsappConnected = true;
});


client.on('message', msg => {
    console.log('Message received:', msg.body);
});

// Initialize WhatsApp client first
client.initialize();

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
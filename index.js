require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const connectDB = require("./config/database");
const jwt = require("jsonwebtoken");
const User = require("./models/User");

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const authRoutes = require("./routes/auth");

// Mount routers
app.use("/api/auth", authRoutes);

// Contacts storage
let contacts = [];
let sendingInProgress = false;
let currentQR = null;

// Spintax message generation
function generateSpintaxMessage(text) {
  let result = text;

  // Process spintax patterns - replace with random option
  const spintaxPattern = /\{([^}]+)\}/g;
  let match;

  while ((match = spintaxPattern.exec(text)) !== null) {
    const options = match[1].split("|");
    const randomOption = options[Math.floor(Math.random() * options.length)];
    result = result.replace(match[0], randomOption);
  }

  return result;
}

// WhatsApp Client
let client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--single-process",
    ],
    ignoreHTTPSErrors: true,
    timeout: 0,
  },
});

// QR code endpoint
app.get("/qr", (req, res) => {
  if (currentQR) {
    res.json({ qr: currentQR });
  } else {
    res.json({ qr: null });
  }
});

// Status endpoint
app.get("/status", (req, res) => {
  res.json({
    connected: global.whatsappConnected || false,
    qrAvailable: !!currentQR,
    progress: {
      current: contacts.filter((c) => c.status === "sent").length,
      total: contacts.length,
      sending: sendingInProgress,
    },
  });
});

// Upload contacts endpoint
app.post("/upload-contacts", express.json(), (req, res) => {
    try {
        const { contacts: newContacts } = req.body;

        if (!Array.isArray(newContacts)) {
            return res.json({ success: false, error: "Invalid contacts data" });
        }

        // If sending empty array, clear all contacts
        if (newContacts.length === 0) {
            contacts = [];
        } else {
            // Filter out duplicates based on phone number
            const uniqueNewContacts = newContacts.filter(newContact =>
              !contacts.some(existingContact => existingContact.number === newContact.number)
            );

            // Add unique contacts to existing contacts
            contacts = [...contacts, ...uniqueNewContacts];
        }

        // Emit update to all clients
        io.emit("contactsUpdated", { contacts });

        res.json({
            success: true,
            message: newContacts.length === 0 ? 'Contacts cleared successfully' : `Added ${newContacts.length} unique contacts successfully`,
            phoneNumbers: newContacts.map((c) => c.number),
        });
    } catch (error) {
        console.error("Upload contacts error:", error);
        res.json({ success: false, error: error.message });
    }
});

// Get contacts endpoint
app.get("/contacts", (req, res) => {
  res.json({ contacts });
});

// Send bulk messages endpoint
app.post("/send-bulk", express.json(), (req, res) => {
    try {
        const { message, delay, useSpintax, resumeFrom } = req.body;

        if (sendingInProgress) {
            return res.json({ success: false, error: "Sending already in progress" });
        }

        if (contacts.length === 0) {
            return res.json({ success: false, error: "No contacts loaded" });
        }

        // Start sending process
        sendingInProgress = true;
        let sentCount = resumeFrom || 0;

    const sendNextMessage = async () => {
      if (!sendingInProgress || sentCount >= contacts.length) {
        sendingInProgress = false;
        io.emit("sendProgress", {
          sent: sentCount,
          total: contacts.length,
          status: "Completed",
        });
        return;
      }

      const contact = contacts[sentCount];

      // Generate unique message for this contact if spintax is enabled
      const finalMessage = useSpintax
        ? generateSpintaxMessage(message)
        : message;

      io.emit("sendProgress", {
        sent: sentCount,
        total: contacts.length,
        currentNumber: contact.number,
        currentName: contact.name,
        status: `Sending to ${contact.name || contact.number}...`,
      });

      try {
        contact.status = "sending";
        io.emit("contactsUpdated", { contacts });

        // Format phone number correctly for WhatsApp
        let formattedNumber = contact.number.trim();

        // Remove any leading + if present
        if (formattedNumber.startsWith("+")) {
          formattedNumber = formattedNumber.substring(1);
        }

        // Remove any leading 0
        if (formattedNumber.startsWith("0")) {
          formattedNumber = formattedNumber.substring(1);
        }

        // Add country code if missing (Pakistan = 92)
        if (!formattedNumber.startsWith("92")) {
          formattedNumber = "92" + formattedNumber;
        }

        const chatId = `${formattedNumber}@c.us`;
        console.log("Sending to:", chatId);

        // Check if user is registered on WhatsApp
        const isRegistered = await client.isRegisteredUser(chatId);
        if (!isRegistered) {
          console.log("Number not registered on WhatsApp:", chatId);
          contact.status = "failed";
          io.emit("messageStatus", {
            number: contact.number,
            name: contact.name,
            message: finalMessage,
            status: "failed",
            timestamp: new Date().toISOString(),
          });
          sentCount++;
          io.emit("contactsUpdated", { contacts });
          setTimeout(sendNextMessage, delay * 1000);
          return;
        }

        await client.sendMessage(chatId, finalMessage);

        contact.status = "sent";
        io.emit("messageStatus", {
          number: contact.number,
          name: contact.name,
          message: finalMessage,
          status: "sent",
          timestamp: new Date().toISOString(),
        });

        sentCount++;
      } catch (error) {
        console.error("Error sending message:", error);
        contact.status = "failed";

        io.emit("messageStatus", {
          number: contact.number,
          name: contact.name,
          message: finalMessage,
          status: "failed",
          timestamp: new Date().toISOString(),
        });

        sentCount++;
      }

      io.emit("contactsUpdated", { contacts });
      // Wait for the delay before sending next message
      setTimeout(sendNextMessage, delay * 1000);
    };

    // Start sending with initial delay
    setTimeout(sendNextMessage, delay * 1000);

    res.json({
      success: true,
      message: `Started sending to ${contacts.length} contacts`,
    });
  } catch (error) {
    console.error("Send bulk error:", error);
    res.json({ success: false, error: error.message });
  }
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("Client connected");

  // Send current contacts to new client
  socket.emit("contactsUpdated", { contacts });

  // Handle start sending
  socket.on("startSending", (data) => {
      if (sendingInProgress) return;

      sendingInProgress = true;
      const baseMessage = data.message;
      const delay = data.delay * 1000; // Convert to milliseconds
      const useSpintax = data.useSpintax || false;
      let sentCount = data.resumeFrom || 0;

    // Send messages with delay
    const sendNextMessage = async () => {
      if (!sendingInProgress || sentCount >= contacts.length) {
        sendingInProgress = false;
        io.emit("sendProgress", {
          sent: sentCount,
          total: contacts.length,
          status: "Completed",
        });
        return;
      }

      const contact = contacts[sentCount];

      // Generate unique message for this contact if spintax is enabled
      const message = useSpintax
        ? generateSpintaxMessage(baseMessage)
        : baseMessage;

      io.emit("sendProgress", {
        sent: sentCount,
        total: contacts.length,
        currentNumber: contact.number,
        currentName: contact.name,
        status: `Sending to ${contact.name || contact.number}...`,
      });

      try {
        contact.status = "sending";
        io.emit("contactsUpdated", { contacts });

        // Format phone number correctly for WhatsApp
        let formattedNumber = contact.number.trim();

        // Remove any leading + if present
        if (formattedNumber.startsWith("+")) {
          formattedNumber = formattedNumber.substring(1);
        }

        // Remove any leading 0
        if (formattedNumber.startsWith("0")) {
          formattedNumber = formattedNumber.substring(1);
        }

        // Add country code if missing (Pakistan = 92)
        if (!formattedNumber.startsWith("92")) {
          formattedNumber = "92" + formattedNumber;
        }

        const chatId = `${formattedNumber}@c.us`;
        console.log("Sending to:", chatId);

        // Check if user is registered on WhatsApp
        const isRegistered = await client.isRegisteredUser(chatId);
        if (!isRegistered) {
          console.log("Number not registered on WhatsApp:", chatId);
          contact.status = "failed";
          io.emit("messageStatus", {
            number: contact.number,
            name: contact.name,
            message: message,
            status: "failed",
            timestamp: new Date().toISOString(),
          });
          sentCount++;
          io.emit("contactsUpdated", { contacts });
          setTimeout(sendNextMessage, delay);
          return;
        }

        await client.sendMessage(chatId, message);

        contact.status = "sent";
        const timestamp = new Date().toISOString();

        io.emit("messageStatus", {
          number: contact.number,
          name: contact.name,
          message: message,
          status: "sent",
          timestamp: timestamp,
        });

        sentCount++;
      } catch (error) {
        console.error("Error sending message:", error);
        contact.status = "failed";

        io.emit("messageStatus", {
          number: contact.number,
          name: contact.name,
          message: message,
          status: "failed",
          timestamp: new Date().toISOString(),
        });

        sentCount++;
      }

      io.emit("contactsUpdated", { contacts });
      setTimeout(sendNextMessage, delay);
    };

    // Start sending with initial delay
    setTimeout(sendNextMessage, delay);
  });

  // Handle stop sending
  socket.on("stopSending", () => {
    sendingInProgress = false;
    io.emit("sendProgress", {
      sent: 0,
      total: contacts.length,
      status: "Stopped",
    });
  });

  // Handle contacts update
  socket.on("updateContacts", (data) => {
    contacts = data.contacts;
    io.emit("contactsUpdated", { contacts });
  });
});

// WhatsApp Client Events
client.on("qr", (qr) => {
  console.log("QR Code generated");
  currentQR = qr;
  io.emit("qr", qr);
});

client.on("authenticated", () => {
  console.log("Client authenticated");
  io.emit("authenticated");
});

client.on("ready", () => {
  console.log("WhatsApp Connected!");
  io.emit("ready", "Connected");

  // Store connection status in memory
  global.whatsappConnected = true;

  // Clear any existing QR code
  currentQR = null;
});

client.on("message", (msg) => {
  console.log("Message received:", msg.body);
});

// WhatsApp Logout Helper Function - SIMPLE VERSION
// WhatsApp Logout Helper Function - FIXED
async function logoutWhatsAppSession(mainClient) {
    try {
        console.log('WhatsApp logout requested');
        
        sendingInProgress = false;
        contacts = [];
        
        // Store client config before destroying
        const clientConfig = {
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
        };
        
        // Logout and destroy
        try {
            if (mainClient) {
                await mainClient.logout();
                console.log('WhatsApp logged out from server');
                await mainClient.destroy();
                console.log('Client destroyed');
            }
        } catch (e) {
            console.log('Logout/destroy failed:', e.message);
        }
        
        // IMPORTANT: Reinitialize the client for next login
        setTimeout(() => {
            console.log('Reinitializing WhatsApp client for next session...');
            
            // Recreate the client
            global.client = new Client(clientConfig);
            
            // Reattach event listeners
            global.client.on('qr', (qr) => {
                console.log('QR Code generated');
                currentQR = qr;
                io.emit('qr', qr);
            });

            global.client.on('authenticated', () => {
                console.log('Client authenticated');
                io.emit('authenticated');
            });

            global.client.on('ready', () => {
                console.log('WhatsApp Connected!');
                io.emit('ready', 'Connected');
                global.whatsappConnected = true;
                currentQR = null;
            });
            
            global.client.on('message', msg => {
                console.log('Message received:', msg.body);
            });
            
            // Reinitialize
            global.client.initialize();
            
            // Update the global client reference
            client = global.client;
            
        }, 2000); // Wait 2 seconds
        
        io.emit('whatsappLogout', { message: 'WhatsApp disconnected' });
        
        return {
            success: true,
            message: 'WhatsApp logged out successfully. You can connect again.'
        };
        
    } catch (error) {
        console.error('Logout error:', error);
        return {
            success: false,
            message: 'Error during logout',
            error: error.message
        };
    }
}

// Initialize WhatsApp client
client.initialize();

// Auth middleware for logout
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Access token required",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User not found",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: "Invalid token",
    });
  }
};

// WhatsApp Logout API Endpoint
app.post("/api/whatsapp/logout", authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    console.log(`WhatsApp logout request received from user ${user._id}`);

    // Check if sending is in progress
    if (sendingInProgress) {
      console.log(`Cannot logout: sending in progress for user ${user._id}`);
      return res.status(400).json({
        success: false,
        error: "Cannot logout while messages are being sent",
      });
    }

    // Perform logout - pass the main client
    const result = await logoutWhatsAppSession(client);

    if (result.success) {
      // Notify all connected clients
      io.emit("whatsappLogout", {
        message: "WhatsApp session has been logged out",
        timestamp: new Date().toISOString(),
      });

      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error(`Error in /api/whatsapp/logout:`, error);
    res.status(500).json({
      success: false,
      error: "Internal server error during logout",
      details: error.message,
    });
  }
});

// API info route
app.get("/api", (req, res) => {
  res.json({
    message: "WhatsApp Bulk Sender API",
    version: "1.0.0",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        getProfile: "GET /api/auth/me",
        updateProfile: "PUT /api/auth/updatedetails",
      },
      whatsapp: {
        logout: "POST /api/whatsapp/logout",
        status: "GET /status",
        qr: "GET /qr",
      },
    },
  });
});

// Handle 404
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

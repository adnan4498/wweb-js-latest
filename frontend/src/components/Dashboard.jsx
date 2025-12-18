import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import QRCode from 'qrcode';

const Dashboard = () => {
  const { logout, user, token } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [socket, setSocket] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [sendingProgress, setSendingProgress] = useState({
    sent: 0,
    total: 0,
    current: '',
    status: 'Not sending'
  });

  // Socket connection
  useEffect(() => {
    if (token) {
      const newSocket = io('/', {
        auth: {
          token: `Bearer ${token}`
        }
      });

      // Socket event handlers
      newSocket.on('qr', (qr) => {
        console.log('QR received');
        setQrCode(qr);
      });

      newSocket.on('authenticated', () => {
        console.log('QR scanned, authenticated');
      });

      newSocket.on('ready', () => {
        console.log('WhatsApp connected');
        setIsConnected(true);
        setQrCode(null);
      });

      newSocket.on('sendProgress', (data) => {
        setSendingProgress({
          sent: data.sent,
          total: data.total,
          current: data.currentName || data.currentNumber || '',
          status: data.status || 'Sending...'
        });
      });

      newSocket.on('contactsUpdated', (data) => {
        setContacts(data.contacts || []);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [token]);

  // Generate QR code URL when qrCode changes
  useEffect(() => {
    if (qrCode) {
      QRCode.toDataURL(qrCode, {
        width: 256,
        height: 256,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
        .then(url => {
          setQrCodeUrl(url);
        })
        .catch(err => {
          console.error('QR Code generation error:', err);
        });
    } else {
      setQrCodeUrl(null);
    }
  }, [qrCode]);

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout? This will also disconnect your WhatsApp session.')) {
      await logout();
      navigate('/login');
    }
  };

  const menuItems = [
    { id: 'dashboard', icon: '📊', title: 'Dashboard' },
    { id: 'send-message', icon: '📤', title: 'Send Message' },
    { id: 'contacts', icon: '👥', title: 'Contacts' }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-3xl font-bold text-gray-800">Dashboard Overview</h2>
              <p className="text-gray-600 mt-2">Monitor your WhatsApp Bulk Sender application</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md border">
                <div className="flex items-center mb-4">
                  <div className="text-3xl mr-4">📱</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Connection Status</h3>
                  </div>
                </div>
                <p className={`text-lg ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {isConnected ? 'Connected' : 'Not Connected'}
                </p>
                <button className="mt-4 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition duration-300">
                  {isConnected ? 'WhatsApp Connected' : 'Connect'}
                </button>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md border">
                <div className="flex items-center mb-4">
                  <div className="text-3xl mr-4">📤</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Messages Sent</h3>
                  </div>
                </div>
                <p className="text-lg text-gray-700">{sendingProgress.sent} messages sent</p>
                <p className="text-sm text-gray-500">Total: {sendingProgress.total}</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md border">
                <div className="flex items-center mb-4">
                  <div className="text-3xl mr-4">👥</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Contact List</h3>
                  </div>
                </div>
                <p className="text-lg text-gray-700">{contacts.length} contacts loaded</p>
                <p className="text-sm text-gray-500">Active contacts: {contacts.length}</p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md border">
                <div className="flex items-center mb-4">
                  <div className="text-3xl mr-4">⚡</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Server Status</h3>
                  </div>
                </div>
                <p className="text-lg text-gray-700">Server running on port 3000</p>
                <p className="text-sm text-gray-500">Uptime: --</p>
              </div>
            </div>

            {qrCodeUrl && !isConnected && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <h3 className="text-xl font-semibold mb-4">📱 QR Code for WhatsApp Connection</h3>
                <div className="inline-block bg-white p-4 rounded-lg shadow-md">
                  <img src={qrCodeUrl} alt="WhatsApp QR Code" className="max-w-full h-auto" />
                </div>
                <p className="mt-4 text-gray-600">Scan this QR code with your WhatsApp mobile app</p>
              </div>
            )}
          </div>
        );

      case 'send-message':
        return (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-3xl font-bold text-gray-800">Send Message</h2>
              <p className="text-gray-600 mt-2">Upload contacts and send bulk messages</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border">
              <div className="flex items-center mb-4">
                <div className="text-2xl mr-4">📄</div>
                <h3 className="text-xl font-semibold text-gray-800">Upload Contact List</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Upload File:</label>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <small className="text-gray-600 mt-1 block">
                    CSV, Excel (.xlsx, .xls) files with columns like "phone", "number", "mobile" for phone numbers
                  </small>
                </div>

                <div className="flex gap-4">
                  <button className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition duration-300">
                    📤 Upload Contacts
                  </button>
                  <button className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition duration-300">
                    🗑️ Clear Contacts
                  </button>
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <p className="text-gray-700"><strong>Contacts Loaded:</strong> <span>{contacts.length}</span></p>
                    <button className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition duration-300">
                      🗑️ Delete All
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border">
              <div className="flex items-center mb-4">
                <div className="text-2xl mr-4">📝</div>
                <h3 className="text-xl font-semibold text-gray-800">Message Configuration</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Message Text:</label>
                  <textarea
                    rows="4"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter your message here..."
                  />
                  <small className="text-gray-600 mt-1 block">
                    💡 <strong>Tip:</strong> Use spintax like {`{Hi|Hello}`} {`{there|boss}`} for natural variations!
                  </small>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Delay between messages (seconds):</label>
                  <input
                    type="number"
                    defaultValue="30"
                    min="5"
                    max="60"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="flex gap-4">
                  <button className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition duration-300">
                    📤 Send Bulk Messages
                  </button>
                  <button className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition duration-300" disabled>
                    ⏹️ Stop Sending
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'contacts':
        return (
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-3xl font-bold text-gray-800">Contacts</h2>
              <p className="text-gray-600 mt-2">Manage your contact list</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border">
              <div className="flex items-center mb-4">
                <div className="text-2xl mr-4">➕</div>
                <h3 className="text-xl font-semibold text-gray-800">Add Manual Contact</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Phone Number:</label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter phone number (e.g., 923422187767)"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2 font-medium">Name (Optional):</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Enter name"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition duration-300">
                  ➕ Add Contact
                </button>
                <button className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition duration-300">
                  🗑️ Clear All
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border">
              <div className="flex items-center mb-4">
                <div className="text-2xl mr-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-800">Contact List</h3>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {contacts.length === 0 ? (
                  <p className="text-gray-600">No contacts loaded yet. Upload a file or add manually.</p>
                ) : (
                  <div>
                    <p className="mb-4"><strong>Total Contacts: {contacts.length}</strong></p>
                    {contacts.slice(0, 100).map((contact, index) => (
                      <div key={index} className="flex justify-between items-center p-2 border-b border-gray-200">
                        <div>
                          <strong>{index + 1}.</strong> {contact.number}{contact.name ? ` (${contact.name})` : ''}
                        </div>
                        <button className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600">
                          ❌
                        </button>
                      </div>
                    ))}
                    {contacts.length > 100 && (
                      <p className="mt-4 text-gray-600"><em>...and {contacts.length - 100} more</em></p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return <div>Select a section</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-green-500 to-green-700 text-white p-4 flex justify-between items-center shadow-lg z-10">
        <h1 className="text-xl font-bold">📱 WhatsApp Bulk Sender Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className={isConnected ? 'text-green-300' : 'text-red-300'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} ${!isConnected ? 'animate-pulse' : ''}`}></div>
          <button
            onClick={handleLogout}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition duration-300"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className="fixed left-0 top-20 bottom-0 w-64 bg-white border-r border-gray-200 shadow-lg pt-6">
        <nav className="px-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center px-4 py-3 rounded-lg transition duration-300 ${
                    activeSection === item.id
                      ? 'bg-green-100 text-green-700 border-l-4 border-green-500'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xl mr-3">{item.icon}</span>
                  <span className="font-medium">{item.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 mt-20 p-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default Dashboard;
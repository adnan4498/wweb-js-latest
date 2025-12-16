# WhatsApp Bulk Sender

A web-based WhatsApp bulk messaging application built with Node.js, Express, Socket.io, and whatsapp-web.js.

## Features

- **Web Dashboard**: Responsive UI with Bootstrap 5
- **Contact Management**: Upload CSV files or add contacts manually
- **Bulk Messaging**: Send messages to multiple contacts with configurable delay
- **Real-time Status**: Track sending progress and message status
- **Session Persistence**: QR code authentication with local storage

## Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Start the application with `npm start`
4. Open `http://localhost:3000` in your browser

## Usage

1. **Connect WhatsApp**: Scan the QR code with your WhatsApp mobile app
2. **Add Contacts**: Upload a CSV file or add contacts manually
3. **Compose Message**: Write your message in the dashboard
4. **Configure Delay**: Set delay between messages (default: 15 seconds)
5. **Start Sending**: Click "Start Sending" to begin bulk messaging

## CSV Format

The CSV file should contain phone numbers and optional names:

```
phone_number, name
1234567890, John Doe
9876543210, Jane Smith
```

## Requirements

- Node.js 14+
- npm or yarn
- WhatsApp account
- Modern web browser

## Screenshots

![Dashboard](screenshot1.png)
![Contacts](screenshot2.png)
![Messages](screenshot3.png)

## License

MIT License

## Support

For issues and feature requests, please open an issue on GitHub.

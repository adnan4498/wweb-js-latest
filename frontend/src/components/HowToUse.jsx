import React from 'react';

const HowToUse = () => {
  const steps = [
    {
      number: 1,
      title: "Enter Phone Numbers Correctly",
      content: "For Pakistan numbers, use one of these formats:",
      code: "923422187767\n03422187767\n3422187767",
      warning: "Important: Do NOT include + sign or spaces. Just use digits only."
    },
    {
      number: 2,
      title: "Add Contacts",
      content: "You can add contacts in two ways:",
      list: [
        "Manual Entry: Go to \"Contacts\" tab → \"Add Contacts Manually\" → Enter phone number and name (optional)",
        "CSV Upload: Create a CSV file with format: \"phone_number,name\" → Upload in \"Upload Contacts\" section"
      ],
      code: "923422187767,John Doe\n923331234567,Jane Smith"
    },
    {
      number: 3,
      title: "Write Your Message",
      content: "Go to the \"Dashboard\" tab and:",
      list: [
        "Enter your message in the text area",
        "Set delay between messages (15 seconds recommended to avoid blocking)"
      ],
      warning: "Tip: Keep messages concise. WhatsApp may block you for sending too many messages too quickly."
    },
    {
      number: 4,
      title: "Start Sending",
      content: "Click the \"Start Sending\" button. A progress modal will appear showing:",
      list: [
        "Progress bar with percentage",
        "Current contact being messaged",
        "Status of sending process"
      ],
      note: "You can click \"Stop Sending\" at any time to pause the process."
    },
    {
      number: 5,
      title: "Check Results",
      content: "After sending, you can view:",
      list: [
        "Dashboard: Statistics on total contacts, messages sent, and pending",
        "Contacts Tab: Status of each contact (sent, failed, pending)",
        "History Tab: Complete sending history with timestamps"
      ]
    }
  ];

  const troubleshooting = [
    "Check phone number format (digits only, no + or spaces)",
    "Ensure WhatsApp is connected (check QR code section)",
    "Try adding country code manually (92 for Pakistan)",
    "Check if you have the contact saved in your WhatsApp",
    "Wait a few minutes and try again (WhatsApp may temporarily block)"
  ];

  const bestPractices = [
    "Use delay of at least 15 seconds between messages",
    "Don't send to too many contacts at once (start with 10-20)",
    "Personalize messages when possible",
    "Avoid sending spam or promotional content",
    "Monitor the sending process and stop if you see errors"
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-blue-600 text-white p-6">
            <h1 className="text-3xl font-bold text-center">
              <i className="fab fa-whatsapp mr-3"></i>How to Use WhatsApp Bulk Sender
            </h1>
          </div>

          <div className="p-8">
            <p className="text-xl text-gray-600 mb-8 text-center">
              Follow these steps to successfully send bulk messages
            </p>

            <div className="space-y-8">
              {steps.map((step) => (
                <div key={step.number} className="border-l-4 border-blue-500 pl-6 pb-6">
                  <div className="flex items-center mb-4">
                    <div className="bg-blue-500 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mr-4">
                      {step.number}
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-800">{step.title}</h2>
                  </div>

                  <p className="text-gray-700 mb-4">{step.content}</p>

                  {step.list && (
                    <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                      {step.list.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  )}

                  {step.code && (
                    <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm mb-4">
                      {step.code.split('\n').map((line, index) => (
                        <div key={index}>{line}</div>
                      ))}
                    </div>
                  )}

                  {step.warning && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                      <div className="flex">
                        <i className="fas fa-exclamation-triangle text-yellow-400 mr-2 mt-1"></i>
                        <div>
                          <strong className="text-yellow-800">Important:</strong> {step.warning}
                        </div>
                      </div>
                    </div>
                  )}

                  {step.note && (
                    <p className="text-gray-600 italic">{step.note}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Troubleshooting */}
            <div className="mt-12 bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-red-800 mb-4">
                <i className="fas fa-exclamation-triangle mr-2"></i>Troubleshooting
              </h3>
              <h4 className="font-semibold text-red-700 mb-3">Messages failing to send?</h4>
              <ul className="list-disc list-inside text-red-700 space-y-1">
                {troubleshooting.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Best Practices */}
            <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-green-800 mb-4">
                <i className="fas fa-lightbulb mr-2"></i>Best Practices
              </h3>
              <ul className="list-disc list-inside text-green-700 space-y-1">
                {bestPractices.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowToUse;
# 🛡️ Zendesk SOC Hunter

**The ultimate browser extension for SOC Analysts and Helpdesk support using Zendesk.**

Hunter automatically scans open tickets and web pages to identify monitored organizations, VIP clients, and specific indicators of compromise (IOCs) like IPs or malicious strings. It alerts the analyst immediately with a non-intrusive, draggable overlay.

![Version](https://img.shields.io/badge/version-23.1-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Browser](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Firefox-orange)

## 📥 Download & Install

| Browser | Store Link | Status |
| :--- | :--- | :--- |
| **Google Chrome / Edge** | [Download from Chrome Web Store](#) | *Pending* |
| **Mozilla Firefox** | [Download from Firefox Add-ons](#) | *Pending* |

*(If the store links are not active yet, please check the "Manual Installation" section below)*

---

## ✨ Key Features

* **Real-time Detection**: Automatically scans the page DOM for configured Organization names.
* **IOC Matching**: Detects specific IP addresses (IPv4), CIDR ranges, and text strings defined in your rules.
* **Shadow DOM UI**: The alert interface is built inside a Shadow DOM, ensuring no CSS conflicts with the host website (Zendesk, Google, etc.).
* **Tower Stacking Logic**: Multiple alerts stack neatly from the bottom-right corner upwards.
* **Draggable Interface**: Move alerts anywhere on the screen; the position is remembered for the session.
* **JSON Rule Management**: Easily export and import your monitoring rules to share configuration across the team.
* **Cross-Browser Support**: Fully compatible with Chrome, Edge, Brave, and Firefox.

---

## 🚀 How It Works

1.  **Install the extension**.
2.  **Add Rules**: Open the extension popup. You can add a rule manually or import a JSON list.
    * *Organization Name*: The string to search in the page text (e.g., "Acme Corp").
    * *Reason*: A note for the analyst (e.g., "VIP Client", "Active Pentest").
    * *Indicators*: Optional specific matches (e.g., "192.168.1.1", "malware.exe").
3.  **Browse**: Navigate to a Zendesk ticket or any webpage.
4.  **Get Alerted**: If a match is found, a popup will appear in the bottom-right corner.
    * **Green Badge**: Exact IOC (IP/String) match found.
    * **Red Badge**: Organization name match found (General Warning).

---

## ⚙️ JSON Configuration Format

To import rules in bulk, use a `.json` file with the following structure:

```json
[
  {
    "name": "Acme Corp",
    "reason": "VIP Client - Handle with care",
    "ips": ["10.0.0.1", "192.168.0.0/24"]
  },
  {
    "name": "Malicious Actor",
    "reason": "Threat Intelligence match",
    "ips": ["bad-domain.com", "1.1.1.1"]
  }
]
```
## 🛠️ Manual Installation (Developer Mode)

If you want to test the latest version from this repository:

Chrome / Edge:

    Clone this repository or download the ZIP.

    Go to chrome://extensions.

    Enable Developer mode (top right).

    Click Load unpacked.

    Select the folder containing manifest.json.

Firefox:

    Go to about:debugging#/runtime/this-firefox.

    Click Load Temporary Add-on....

    Select the manifest.json file.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

    Fork the project.

    Create your Feature Branch (git checkout -b feature/AmazingFeature).

    Commit your changes (git commit -m 'Add some AmazingFeature').

    Push to the Branch (git push origin feature/AmazingFeature).

    Open a Pull Request.

## 📄 License

Distributed under the MIT License. See LICENSE for more information.

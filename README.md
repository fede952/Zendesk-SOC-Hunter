🛡️ Zendesk SOC Hunter

Version: 1.0

Compatibility: Google Chrome, Microsoft Edge, Mozilla Firefox

Tech Stack: JavaScript (ES6+), HTML5, CSS3, WebExtensions API (Manifest V3)

Zendesk SOC Hunter is a browser extension designed for SOC (Security Operations Center) analysts and Support Engineers. It acts as a passive radar that enriches the operational context by automatically detecting critical clients and Indicators of Compromise (IoC) on any webpage.

While optimized for Zendesk (recognizing specific UI elements), it utilizes a "Hybrid Search" engine that works across standard web pages.

🔍 1. Hybrid Threat Detection

The extension scans the DOM in real-time to identify:

    Organization Names: Detects if a ticket belongs to a critical VIP client.

    Technical Indicators: Automatically extracts IPs, subnets (CIDR), Hostnames, and malicious strings from the page text.

    Reverse Lookup: If a monitored IP (e.g., 1.1.1.1) appears on a generic log page, the extension identifies the associated Client/Organization.

🧠 2. Smart String Normalization

Includes a fuzzy matching logic to handle data inconsistency.

    Configuration: Test Test

    Matches: Test-Test, testtest, Test_Test_SPA, Test.Test.

    Mechanism: Removes punctuation, spaces, and casing before comparison.

🌐 3. Advanced Networking Logic

    CIDR Support: Native calculation of IPv4 subnets. If you monitor 192.168.0.0/24, it detects 192.168.0.55.

    IPv4 Extraction: Regex-based extraction of valid IP patterns from the page body.

🎨 4. "Magnetic Stack" UI

    Master/Slave System: Multiple alerts stack automatically.

    Draggable: The bottom-most alert (Master) can be dragged, and all stacked alerts follow.

    Resizable: Supports resizing to view long lists of IPs.

    Persistent: Remembers the window position across page reloads.

🌍 5. Internationalization & Safety

    Bilingual: Full English/Italian support (hot-swappable).

    Security: Built with DOM Safe Mode (no innerHTML usage) to prevent XSS and pass Mozilla Firefox validation.

    Privacy: All data is stored in chrome.storage.local. No external API calls.

🚀 Installation
Google Chrome / Microsoft Edge

    Download the project source code (or unzip the release).

    Go to chrome://extensions (or edge://extensions).

    Enable Developer Mode (top right switch).

    Click Load Unpacked.

    Select the project folder.

Mozilla Firefox

    Go to about:debugging.

    Click This Firefox.

    Click Load Temporary Add-on.

    Select the manifest.json file.

⚙️ Configuration

Click the extension icon in the browser toolbar to open the configuration panel.
Adding a Rule

    Organization Name: The name of the client to monitor (e.g., "Ferrari").

    Monitoring Reason: Context for the analyst (e.g., "Penetration Test in progress").

    Indicators: A comma-separated list of technical data.

        IPs: 10.0.0.1

        Subnets: 192.168.0.0/24

        Strings/Hosts: malware.exe, evil-site.com

Controls

    Pause/Resume: Toggle the switch in the header to globally disable/enable the scanner.

    Language (IT/EN): Switch UI language.

    Reset Position: If the alert box disappears off-screen, click this to reset it to the bottom-right corner.

🛠️ Technical Architecture
manifest.json

Defines the extension capabilities using Manifest V3.

    Permissions: storage (for rules/settings).

    Host Permissions: <all_urls> (to scan Zendesk, SIEMs, and logs).

    Browser Specific: Includes Gecko ID for Firefox compatibility.

content.js (The Engine)

Injected into every page, it performs the following loop (every ~1-2 seconds):

    Clean: Clones the <body> and removes scripts, styles, and the extension's own UI to prevent self-matching loops.

    Extract: Finds all IPv4 addresses using Regex.

    Normalize: Converts page text to a lowercase, punctuation-free string.

    Match: Compares extracted data against the clientConfig in local storage using bitwise operators for CIDR and string inclusion for names.

    Render: Draws the "Magnetic Stack" UI using document.createElement (Safe DOM).

popup.js (The Interface)

Handles the configuration UI.

    Manages the CRUD operations for rules.

    Handles Internationalization (i18n).

    Communicates with chrome.storage.local.

styles.css

Contains the styling for the Alert Box (.zh-alert-container).

    Uses z-index: 2147483647 to ensure visibility.

    Implements resize: both and cursor: move for UX.

    Defines color coding:

        🟢 Green Border: Strong Match (Specific IP/Indicator found).

        🔴 Red Border: Weak Match (Client name found, but no technical indicators present).

🔒 Privacy & Security

    Zero Exfiltration: This extension does not send data to the cloud. All rules and logs remain in the user's browser Local Storage.

    DOM Safety: The code is strictly typed to avoid innerHTML assignments, protecting against Cross-Site Scripting (XSS) attacks.

    Performance: Uses MutationObserver with debouncing to minimize CPU usage on heavy Single Page Applications (SPAs) like Zendesk.

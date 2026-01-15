console.log("🛡️ Hunter International");

const tContent = {
    it: {
        found: "TROVATO",
        none: "NESSUN INDICATORE",
        other: "+ altri",
        source: "Fonte",
        monitor_list: "Elementi Monitorati",
        detected_list: "Elementi Rilevati"
    },
    en: {
        found: "FOUND",
        none: "NO MATCH FOUND",
        other: "+ others",
        source: "Source",
        monitor_list: "Monitored Items",
        detected_list: "Detected Items"
    }
};

// ==========================================
// 1. UTILITY
// ==========================================
function normalizeString(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getCleanVisibleText() {
    const clone = document.body.cloneNode(true);
    const myAlerts = clone.querySelectorAll('.zh-alert-container');
    myAlerts.forEach(el => el.remove());
    const scripts = clone.querySelectorAll('script, style, noscript, svg, link, meta');
    scripts.forEach(el => el.remove());
    return clone.innerText; 
}

function isValidIp(str) { return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(str); }
function isValidCidr(str) { return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}\/[0-9]{1,2}$/.test(str); }
function ipToLong(ip) { return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0; }
function isIpInCidr(ip, cidr) {
  try {
    const [range, bits = 32] = cidr.split('/');
    const mask = ~(2 ** (32 - bits) - 1);
    return (ipToLong(ip) & mask) === (ipToLong(range) & mask);
  } catch (e) { return false; }
}
function extractIpsFromText(text) {
  const ipv4Regex = /\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
  return [...new Set(text.match(ipv4Regex) || [])];
}

// ==========================================
// 2. CORE LOGIC
// ==========================================

function scanPage() {
  if (!chrome.runtime?.id) return; 

  chrome.storage.local.get(['clientConfig', 'isPaused', 'lang'], (result) => {
    if (chrome.runtime.lastError) return;

    if (result.isPaused === true) {
        removeAllAlerts();
        return;
    }

    const clients = result.clientConfig || [];
    const currentLang = result.lang || 'it'; // Default IT
    
    if (clients.length === 0) return;

    const pageTextOriginal = getCleanVisibleText();
    const pageTextLower = pageTextOriginal.toLowerCase();
    const pageTextNormalized = normalizeString(pageTextOriginal);
    const foundIpsOnPage = extractIpsFromText(pageTextOriginal);
    const pageUrl = window.location.hostname;

    let detectedClients = new Map(); 

    clients.forEach(client => {
        let matches = [];
        let nameFound = false;
        const configNameNormalized = normalizeString(client.name);

        // Check Indicators
        if (client.ips && client.ips.length > 0) {
            client.ips.forEach(indicator => {
                const cleanIndicator = indicator.trim();
                if(!cleanIndicator) return;

                if (isValidCidr(cleanIndicator)) {
                    foundIpsOnPage.forEach(pageIp => {
                        if (isIpInCidr(pageIp, cleanIndicator)) matches.push(`${pageIp} (CIDR)`);
                    });
                } else if (isValidIp(cleanIndicator)) {
                    if (foundIpsOnPage.includes(cleanIndicator)) matches.push(cleanIndicator);
                } else {
                    if (pageTextLower.includes(cleanIndicator.toLowerCase())) matches.push(cleanIndicator);
                    else {
                        const indicatorNorm = normalizeString(cleanIndicator);
                        if (indicatorNorm.length > 3 && pageTextNormalized.includes(indicatorNorm)) {
                            matches.push(`${cleanIndicator} (Smart)`);
                        }
                    }
                }
            });
        }

        // Check Name
        if (pageUrl.includes('zendesk.com')) {
            const zendeskSelectors = ['[data-test-id="generic-table-row"]', '[data-test-id="ticket-system-field-organization-value"]', '[data-test-id="customer-context-organization"]', '.ticket-fields', '[data-test-id="requester-field"]'];
            for (let sel of zendeskSelectors) {
                const els = document.querySelectorAll(sel);
                els.forEach(el => {
                    if (normalizeString(el.innerText).includes(configNameNormalized)) nameFound = true;
                });
            }
        } else {
            if (pageTextNormalized.includes(configNameNormalized)) nameFound = true;
        }

        if (nameFound || matches.length > 0) {
            const uniqueMatches = [...new Set(matches)];
            detectedClients.set(client.name, { clientData: client, matches: uniqueMatches, foundByName: nameFound });
        }
    });

    // Clean old
    document.querySelectorAll('.zh-alert-container').forEach(box => {
        if (!detectedClients.has(box.dataset.client)) box.remove();
    });

    // Rendering Stack
    let stackIndex = 0;
    Array.from(detectedClients.values()).reverse().forEach((data) => {
        updateAlertForClient(data.clientData, data.matches, data.foundByName, pageUrl, stackIndex, currentLang);
        stackIndex++;
    });
    
    alignSlaves();
  });
}

function removeAllAlerts() {
    document.querySelectorAll('.zh-alert-container').forEach(el => el.remove());
}

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.isPaused) {
        if (changes.isPaused.newValue === true) removeAllAlerts();
        else scanPage();
    }
    // Reload on lang change
    if (namespace === 'local' && changes.lang) {
        scanPage();
    }
});

// ==========================================
// 3. UI ENGINE
// ==========================================

function updateAlertForClient(client, matches, foundByName, sourcePage, stackIndex, lang) {
    const safeId = 'zh-alert-' + client.name.replace(/[^a-zA-Z0-9]/g, '');
    let box = document.getElementById(safeId);
    
    const isMaster = (stackIndex === 0); 
    const isMatch = matches.length > 0;
    const labels = tContent[lang]; 

    if (!box) {
        box = document.createElement('div');
        box.id = safeId;
        box.className = 'zh-alert-container';
        box.dataset.client = client.name;
        document.body.appendChild(box);
        
        box.addEventListener('click', (e) => {
            if(e.target.classList.contains('zh-close')) {
                box.remove();
                setTimeout(scanPage, 500); 
            }
        });

        if (isMaster) {
            box.classList.add('zh-master');
            makeDraggable(box);
            new ResizeObserver(() => {
                if (box.offsetWidth > 0) { savePosition(box); alignSlaves(); }
            }).observe(box);

            chrome.storage.local.get(['uiPos'], (res) => {
                if (res.uiPos) {
                    box.style.top = res.uiPos.top;
                    box.style.left = res.uiPos.left;
                    box.style.width = res.uiPos.width;
                    box.style.height = res.uiPos.height;
                    box.style.bottom = "auto";
                    box.style.right = "auto";
                } else {
                    box.style.bottom = "20px";
                    box.style.right = "20px";
                    box.style.top = "auto";
                    box.style.left = "auto";
                }
                alignSlaves(); 
            });

        } else {
            box.classList.add('zh-slave');
            box.style.resize = 'none'; 
        }
    } else {
        if (isMaster && !box.classList.contains('zh-master')) {
             box.classList.remove('zh-slave');
             box.classList.add('zh-master');
             box.style.resize = 'both';
             makeDraggable(box);
             chrome.storage.local.get(['uiPos'], (res) => {
                 if(res.uiPos) {
                     box.style.top = res.uiPos.top;
                     box.style.left = res.uiPos.left;
                     box.style.bottom = "auto";
                     box.style.right = "auto";
                 }
             });
        }
    }

    box.classList.remove('match-success', 'match-fail');
    box.classList.add(isMatch ? 'match-success' : 'match-fail');

    // Building HTML with translations
    let statusHTML = '';
    
    if (isMatch) {
        statusHTML = `<div class="zh-badge badge-ok">✅ ${labels.found}: ${matches[0]}</div>`;
        if (matches.length > 1) statusHTML += `<div style="font-size:10px; margin-top:2px">${labels.other} ${matches.length - 1}</div>`;
    } else {
        statusHTML = `<div class="zh-badge badge-ko">⚠️ ${labels.none}</div>`;
    }

    const dragIcon = isMaster ? '<span style="float:left; cursor:move; margin-right:5px">✥</span>' : '';

    box.innerHTML = `
        <div class="zh-header">
            <span class="zh-title">${dragIcon} 🚨 ${client.name}</span>
            <span class="zh-close">✕</span>
        </div>
        <div class="zh-body">
            <span class="zh-reason">${client.reason}</span>
            <div class="zh-source">${labels.source}: ${sourcePage}</div>
            ${statusHTML}
            <div class="zh-ips-list">
                <strong>${isMatch ? labels.detected_list : labels.monitor_list}:</strong><br>
                ${isMatch ? matches.join('<br>') : client.ips.join(', ')}
            </div>
        </div>
    `;
}

function alignSlaves() {
    const master = document.querySelector('.zh-alert-container.zh-master');
    if (!master) return;
    const slaves = document.querySelectorAll('.zh-alert-container.zh-slave');
    const masterRect = master.getBoundingClientRect();
    let currentBottomY = master.offsetTop; 
    if (master.style.bottom !== "auto" && master.style.top === "auto") currentBottomY = masterRect.top;

    slaves.forEach(slave => {
        slave.style.width = master.style.width;
        slave.style.left = masterRect.left + "px";
        slave.style.right = "auto"; 
        const slaveHeight = slave.offsetHeight || 100; 
        const newTop = currentBottomY - slaveHeight - 10;
        slave.style.top = newTop + "px";
        slave.style.bottom = "auto";
        currentBottomY = newTop;
    });
}

// ==========================================
// 4. DRAG & DROP
// ==========================================

function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    element.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        if (e.target.classList.contains('zh-close') || e.target.closest('.zh-ips-list')) return;
        if (!e.target.closest('.zh-header')) return;
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
        element.style.bottom = "auto"; 
        element.style.right = "auto";
        alignSlaves();
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        savePosition(element);
    }
}

function savePosition(element) {
    const uiPos = {
        top: element.style.top,
        left: element.style.left,
        width: element.style.width,
        height: element.style.height
    };
    chrome.storage.local.set({ uiPos: uiPos });
}

// ==========================================
// 5. OBSERVER
// ==========================================

let timeout = null;
const observer = new MutationObserver(() => {
    clearTimeout(timeout);
    timeout = setTimeout(scanPage, 1000); 
});

observer.observe(document.body, { childList: true, subtree: true });
setInterval(scanPage, 2500);
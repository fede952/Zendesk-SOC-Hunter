console.log("🛡️ Hunter");

const sys = (typeof chrome !== 'undefined') ? chrome : browser;

const tContent = {
    it: { found: "TROVATO", none: "NESSUN INDICATORE", other: "+ altri", source: "Fonte", monitor_list: "Elementi Monitorati", detected_list: "Elementi Rilevati" },
    en: { found: "FOUND", none: "NO MATCH FOUND", other: "+ others", source: "Source", monitor_list: "Monitored", detected_list: "Detected" }
};

// ==========================================
// 1. UTILITY
// ==========================================
function normalizeString(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getCleanVisibleText() {
    try {
        return (document.title || "") + " " + (document.body ? document.body.innerText : "");
    } catch (e) { return ""; }
}

function extractIpsFromText(text) {
    return [...new Set(text.match(/\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g) || [])];
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

// ==========================================
// 2. SHADOW DOM MANAGER
// ==========================================
const HOST_ID = "zh-hunter-shadow-host";

function getShadowRoot() {
    let host = document.getElementById(HOST_ID);
    if (!host) {
        host = document.createElement('div');
        host.id = HOST_ID;
        host.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2147483647; pointer-events: none; overflow: hidden;";
        document.body.appendChild(host);
        
        const shadow = host.attachShadow({ mode: 'open' });
        
        const style = document.createElement('style');
        style.textContent = `
            .zh-alert-container {
                position: absolute; 
                background: #fff;
                border-left: 6px solid #888;
                padding: 12px;
                box-shadow: 0 5px 20px rgba(0,0,0,0.3);
                font-family: 'Segoe UI', sans-serif;
                border-radius: 4px;
                font-size: 13px;
                color: #333;
                line-height: 1.3;
                min-width: 250px;
                min-height: 100px;
                resize: both; 
                overflow: hidden;
                pointer-events: auto; 
                box-sizing: border-box;
                transition: top 0.2s ease-out, left 0.2s ease-out;
            }
            .zh-alert-container.zh-dragging {
                transition: none !important;
                z-index: 999999 !important;
                box-shadow: 0 15px 40px rgba(0,0,0,0.4);
                cursor: grabbing;
                opacity: 0.95;
            }
            .zh-header { display: flex; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px solid #eee; padding-bottom: 5px; cursor: grab; user-select: none; }
            .zh-alert-container.zh-dragging .zh-header { cursor: grabbing; }
            .zh-title { font-weight: 800; font-size: 14px; text-transform: uppercase; }
            .zh-close { cursor: pointer; font-weight: bold; padding: 0 5px; color: #999; }
            .zh-close:hover { color: #333; }
            .zh-reason { font-style: italic; color: #555; margin-bottom: 5px; display: block; }
            .zh-source { font-size: 10px; color: #999; margin-bottom: 5px; text-align: right; }
            .zh-badge { padding: 4px; text-align: center; font-weight: bold; border-radius: 3px; font-size: 11px; margin-bottom: 5px; border: 1px solid transparent; }
            .badge-ok { background: #28a745; color: white; }
            .badge-ko { background: #dc3545; color: white; }
            .zh-ips-list { font-family: monospace; font-size: 11px; background: #f8f9fa; border: 1px solid #ddd; padding: 5px; margin-top: 5px; word-break: break-all; }
            .zh-warning-banner {
                position: absolute; top: 0; left: 0; width: 100%; background: #ffc107; color: #333; 
                text-align: center; padding: 5px; font-weight: bold; font-size: 12px; z-index: 9999;
                cursor: pointer; pointer-events: auto;
            }
        `;
        shadow.appendChild(style);
        return shadow;
    }
    return host.shadowRoot;
}

// ==========================================
// 3. SCAN ENGINE
// ==========================================

let isScanning = false;

function scanPage() {
  if (isScanning) return;
  isScanning = true;

  if (!sys || !sys.runtime?.id) { isScanning = false; return; }

  sys.storage.local.get(['clientConfig', 'isPaused', 'lang'], (result) => {
    setTimeout(() => { isScanning = false; }, 500);

    if (sys.runtime.lastError || result.isPaused === true) {
        if (result.isPaused) removeAllAlerts();
        return;
    }

    const clients = result.clientConfig || [];
    const lang = result.lang || 'it';
    
    if (clients.length === 0) {
        showNoRulesWarning();
        return;
    } else {
        removeNoRulesWarning();
    }

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

        if (pageUrl.includes('zendesk.com')) {
            const zendeskSelectors = ['[data-test-id="generic-table-row"]', '[data-test-id="ticket-system-field-organization-value"]', '[data-test-id="customer-context-organization"]', '.ticket-fields', '[data-test-id="requester-field"]'];
            for (let sel of zendeskSelectors) {
                const els = document.querySelectorAll(sel);
                els.forEach(el => {
                    if (normalizeString(el.innerText).includes(configNameNormalized)) nameFound = true;
                });
            }
        } 
        
        if (!nameFound) {
            if (pageTextNormalized.includes(configNameNormalized)) nameFound = true;
        }

        if (nameFound || matches.length > 0) {
            const uniqueMatches = [...new Set(matches)];
            detectedClients.set(client.name, { clientData: client, matches: uniqueMatches, foundByName: nameFound });
        }
    });

    const shadow = getShadowRoot();
    shadow.querySelectorAll('.zh-alert-container').forEach(box => {
        if (!detectedClients.has(box.dataset.client)) box.remove();
    });

    const detectedArray = Array.from(detectedClients.values());
    let stackIndex = 0;
    
    detectedArray.forEach((data) => {
        updateAlertForClient(data.clientData, data.matches, data.foundByName, pageUrl, stackIndex, lang);
        stackIndex++;
    });
    
    if(detectedArray.length > 0) {
        requestAnimationFrame(alignSlaves);
    }
  });
}

// ==========================================
// 4. UI RENDERER
// ==========================================

function showNoRulesWarning() {
    const shadow = getShadowRoot();
    if(shadow.getElementById('zh-no-rules')) return;
    const banner = document.createElement('div');
    banner.id = 'zh-no-rules';
    banner.className = 'zh-warning-banner';
    banner.textContent = "⚠️ Hunter: Nessuna regola! Importa il file JSON.";
    banner.onclick = () => banner.remove();
    shadow.appendChild(banner);
}

function removeNoRulesWarning() {
    const shadow = getShadowRoot();
    const banner = shadow.getElementById('zh-no-rules');
    if(banner) banner.remove();
}

function removeAllAlerts() {
    const shadow = getShadowRoot();
    shadow.querySelectorAll('.zh-alert-container').forEach(el => el.remove());
}

function updateAlertForClient(client, matches, foundByName, sourcePage, stackIndex, lang) {
    const safeId = 'zh-alert-' + client.name.replace(/[^a-zA-Z0-9]/g, '');
    const shadow = getShadowRoot();
    let box = shadow.getElementById(safeId);
    
    const isMaster = (stackIndex === 0); 
    const isMatch = matches.length > 0;
    const labels = tContent[lang] || tContent['it']; 

    if (!box) {
        box = document.createElement('div');
        box.id = safeId;
        box.className = 'zh-alert-container';
        box.dataset.client = client.name;
        
        box.style.left = (window.innerWidth - 270) + "px";
        box.style.top = (window.innerHeight - 150) + "px";
        
        shadow.appendChild(box);
        
        box.addEventListener('click', (e) => {
            const target = e.target;
            if(target.classList.contains('zh-close')) {
                box.remove();
                setTimeout(scanPage, 500); 
            }
        });

        makeDraggable(box);

        if (isMaster) {
            box.classList.add('zh-master');
            sys.storage.local.get(['uiPos'], (res) => {
                if (res.uiPos && res.uiPos.top && res.uiPos.top !== "auto") {
                    box.style.top = res.uiPos.top;
                    box.style.left = res.uiPos.left;
                    box.style.width = res.uiPos.width;
                    box.style.height = res.uiPos.height;
                }
                alignSlaves(); 
            });
        } else {
            box.classList.add('zh-slave');
        }
    } else {
        if (isMaster) {
            box.classList.add('zh-master');
            box.classList.remove('zh-slave');
            sys.storage.local.get(['uiPos'], (res) => {
                 if(res.uiPos && res.uiPos.top && res.uiPos.top !== "auto") {
                     box.style.top = res.uiPos.top;
                     box.style.left = res.uiPos.left;
                 }
                 alignSlaves();
             });
        } else {
            box.classList.remove('zh-master');
            box.classList.add('zh-slave');
        }
    }

    const borderColor = isMatch ? '#28a745' : '#dc3545';
    const bgColor = isMatch ? '#f0fff4' : '#fff5f5';
    box.style.borderLeft = `6px solid ${borderColor}`;
    box.style.backgroundColor = bgColor;

    let statusHTML = isMatch 
        ? `<div class="zh-badge badge-ok">✅ ${labels.found}: ${matches[0]}</div>` 
        : `<div class="zh-badge badge-ko">⚠️ ${labels.none}</div>`;
        
    if (isMatch && matches.length > 1) statusHTML += `<div style="font-size:10px; margin-top:2px">${labels.other} ${matches.length - 1}</div>`;

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

// ==========================================
// 5. STACK LOGIC
// ==========================================

function alignSlaves() {
    const shadow = getShadowRoot();
    const master = shadow.querySelector('.zh-alert-container.zh-master');
    if (!master) return;

    const allBoxes = Array.from(shadow.querySelectorAll('.zh-alert-container'));
    
    // Master Rect
    const mTop = master.offsetTop;
    const mLeft = master.offsetLeft;
    const mW = master.offsetWidth || 250;
    
    const GAP = 10;
    
    let currentTop = mTop;

    allBoxes.forEach((box) => {
        if (box === master) {
            currentTop = mTop - GAP; 
            return;
        }

        box.style.width = mW + "px";
        box.style.left = mLeft + "px";
        
        const h = box.offsetHeight || 100;
        const newTop = currentTop - h;
        
        box.style.top = newTop + "px";
        
        currentTop = newTop - GAP;
    });
}

// ==========================================
// 6. DRAG LOGIC
// ==========================================

function makeDraggable(element) {
    let startX, startY, initialLeft, initialTop;

    element.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        const path = e.composedPath();
        if (path.some(el => el.classList && (el.classList.contains('zh-close') || el.classList.contains('zh-ips-list')))) return;
        if (!path.some(el => el.classList && el.classList.contains('zh-header'))) return;

        e.preventDefault();
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = element.offsetLeft;
        initialTop = element.offsetTop;
        
        element.classList.add('zh-dragging');
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        element.style.top = (initialTop + dy) + "px";
        element.style.left = (initialLeft + dx) + "px";
        
        requestAnimationFrame(alignSlaves); 
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        element.classList.remove('zh-dragging');
        savePosition(element);
        alignSlaves(); 
    }
}

function savePosition(el) {
    if (!sys) return;
    sys.storage.local.set({ 
        uiPos: { top: el.style.top, left: el.style.left, width: el.style.width, height: el.style.height } 
    });
}

// Observer
let timeout = null;
const observer = new MutationObserver(() => {
    if(timeout) clearTimeout(timeout);
    timeout = setTimeout(scanPage, 1000); 
});

observer.observe(document.body, { childList: true, subtree: true });
if (sys && sys.storage) sys.storage.onChanged.addListener((c, n) => { if (n === 'local') scanPage(); });
setInterval(scanPage, 3000);
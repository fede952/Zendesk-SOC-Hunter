// DOM Elements Reference Cache
const nameInput = document.getElementById('inputName');
const reasonInput = document.getElementById('inputReason');
const ipsInput = document.getElementById('inputIps');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const editIndexInput = document.getElementById('editIndex');
const rulesList = document.getElementById('rulesList');
const activeToggle = document.getElementById('activeToggle');
const statusLabel = document.getElementById('statusLabel');

document.addEventListener('DOMContentLoaded', () => {
    loadRules();
    loadStatus();
});

activeToggle.addEventListener('change', () => {
    const isActive = activeToggle.checked;
    chrome.storage.local.set({ isPaused: !isActive }, () => {
        updateStatusUI(isActive);
    });
});

function loadStatus() {
    chrome.storage.local.get(['isPaused'], (res) => {
        const isPaused = res.isPaused === true;
        activeToggle.checked = !isPaused;
        updateStatusUI(!isPaused);
    });
}

function updateStatusUI(isActive) {
    if (isActive) {
        statusLabel.textContent = "ATTIVO";
        statusLabel.style.color = "#28a745";
        document.body.classList.remove('is-paused');
    } else {
        statusLabel.textContent = "IN PAUSA";
        statusLabel.style.color = "#dc3545";
        document.body.classList.add('is-paused');
    }
}

cancelBtn.addEventListener('click', resetForm);

document.getElementById('resetPosBtn').addEventListener('click', () => {
    chrome.storage.local.remove(['uiPos'], () => alert("Posizione resettata!"));
});

saveBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  const reason = reasonInput.value.trim();
  const ipsRaw = ipsInput.value.trim();
  const indexToEdit = parseInt(editIndexInput.value);

  if (!name) { alert("Nome obbligatorio"); return; }

  const ips = ipsRaw ? ipsRaw.split(',').map(ip => ip.trim()).filter(ip => ip !== "") : [];
  const newRule = { name, reason, ips };

  chrome.storage.local.get(['clientConfig'], (result) => {
    let rules = result.clientConfig || [];
    if (indexToEdit >= 0) rules[indexToEdit] = newRule;
    else rules.push(newRule);
    
    chrome.storage.local.set({ clientConfig: rules }, () => {
      resetForm();
      loadRules();
    });
  });
});

function loadRules() {
  chrome.storage.local.get(['clientConfig'], (result) => {
    const rules = result.clientConfig || [];
    rulesList.innerHTML = '';
    if (rules.length === 0) {
        rulesList.innerHTML = '<div style="text-align:center;color:#999;font-size:11px">Nessuna regola</div>';
        return;
    }
    rules.forEach((rule, index) => {
      const div = document.createElement('div');
      div.className = 'rule-item';
      div.innerHTML = `
        <div class="rule-header">
            <span class="rule-name">${rule.name}</span>
            <div class="rule-actions">
                <button class="action-btn edit-btn" data-index="${index}">✏️</button>
                <button class="action-btn del-btn" data-index="${index}">🗑️</button>
            </div>
        </div>
        <div class="rule-reason">${rule.reason}</div>
        <div class="rule-ips">${rule.ips.join(', ')}</div>
      `;
      rulesList.appendChild(div);
    });

    document.querySelectorAll('.del-btn').forEach(btn => btn.addEventListener('click', (e) => deleteRule(e.target.dataset.index)));
    document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => startEdit(e.target.dataset.index)));
  });
}

function startEdit(index) {
  chrome.storage.local.get(['clientConfig'], (result) => {
    const rule = result.clientConfig[index];
    nameInput.value = rule.name;
    reasonInput.value = rule.reason;
    ipsInput.value = rule.ips.join(', ');
    editIndexInput.value = index;
    saveBtn.textContent = "Aggiorna";
    saveBtn.style.background = "#28a745"; 
    cancelBtn.style.display = "block";
    nameInput.focus();
  });
}

function deleteRule(index) {
  if(!confirm("Eliminare?")) return;
  chrome.storage.local.get(['clientConfig'], (result) => {
    const rules = result.clientConfig || [];
    rules.splice(index, 1);
    chrome.storage.local.set({ clientConfig: rules }, loadRules);
  });
}

function resetForm() {
  nameInput.value = ''; reasonInput.value = ''; ipsInput.value = '';
  editIndexInput.value = '-1';
  saveBtn.textContent = "Aggiungi Regola";
  saveBtn.style.background = "#1f73b7";
  cancelBtn.style.display = "none";
}

// === INTERNATIONALIZATION (i18n) DICTIONARY ===
// Stores text strings for Italian (it) and English (en)
const i18n = {
    it: {
        active: "ATTIVO",
        paused: "IN PAUSA",
        lbl_org: "Nome Organizzazione",
        ph_org: "Nome",
        lbl_reason: "Ragione monitoraggio",
        ph_reason: "es. PT in corso",
        lbl_indicators: "Indicatori (IP, Stringhe)",
        ph_indicators: "1.1.1.1, malware.exe",
        btn_cancel: "Annulla",
        btn_add: "Aggiungi Regola",
        btn_update: "Aggiorna Regola",
        btn_reset: "Reset Posizione Finestre",
        msg_reset: "Posizione resettata!",
        msg_no_rules: "Nessuna regola",
        msg_req_name: "Nome obbligatorio",
        msg_confirm_del: "Eliminare?",
        lang_label: "EN" 
    },
    en: {
        active: "ACTIVE",
        paused: "PAUSED",
        lbl_org: "Organization Name",
        ph_org: "Name",
        lbl_reason: "Monitoring Reason",
        ph_reason: "e.g. PT in progress",
        lbl_indicators: "Indicators (IP, Strings)",
        ph_indicators: "1.1.1.1, malware.exe",
        btn_cancel: "Cancel",
        btn_add: "Add Rule",
        btn_update: "Update Rule",
        btn_reset: "Reset Windows Position",
        msg_reset: "Position reset!",
        msg_no_rules: "No rules configured",
        msg_req_name: "Name required",
        msg_confirm_del: "Delete rule?",
        lang_label: "IT" 
    }
};

let currentLang = 'it'; // Default language

const domElements = {
    nameInput: document.getElementById('inputName'),
    reasonInput: document.getElementById('inputReason'),
    ipsInput: document.getElementById('inputIps'),
    saveBtn: document.getElementById('saveBtn'),
    cancelBtn: document.getElementById('cancelBtn'),
    editIndexInput: document.getElementById('editIndex'),
    rulesList: document.getElementById('rulesList'),
    activeToggle: document.getElementById('activeToggle'),
    statusLabel: document.getElementById('statusLabel'),
    langBtn: document.getElementById('langBtn'),
    resetPosBtn: document.getElementById('resetPosBtn'),
    lbl_org: document.getElementById('lbl_org'),
    lbl_reason: document.getElementById('lbl_reason'),
    lbl_indicators: document.getElementById('lbl_indicators')
};

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['lang'], (res) => {
        currentLang = res.lang || 'it';
        applyLanguage(currentLang);
        loadRules();
        loadStatus();
    });
});

domElements.langBtn.addEventListener('click', () => {
    currentLang = currentLang === 'it' ? 'en' : 'it';
    chrome.storage.local.set({ lang: currentLang }, () => {
        applyLanguage(currentLang);
        loadStatus(); 
        loadRules();  
    });
});

function applyLanguage(lang) {
    const t = i18n[lang];
    
    domElements.lbl_org.textContent = t.lbl_org;
    domElements.lbl_reason.textContent = t.lbl_reason;
    domElements.lbl_indicators.textContent = t.lbl_indicators;
    
    domElements.nameInput.placeholder = t.ph_org;
    domElements.reasonInput.placeholder = t.ph_reason;
    domElements.ipsInput.placeholder = t.ph_indicators;
    
    domElements.cancelBtn.textContent = t.btn_cancel;
    if (domElements.editIndexInput.value === '-1') {
        domElements.saveBtn.textContent = t.btn_add;
    } else {
        domElements.saveBtn.textContent = t.btn_update;
    }
    domElements.resetPosBtn.textContent = t.btn_reset;
    
    domElements.langBtn.textContent = t.lang_label;
}

domElements.activeToggle.addEventListener('change', () => {
    const isActive = domElements.activeToggle.checked;
    chrome.storage.local.set({ isPaused: !isActive }, () => {
        updateStatusUI(isActive);
    });
});

function loadStatus() {
    chrome.storage.local.get(['isPaused'], (res) => {
        const isPaused = res.isPaused === true;
        domElements.activeToggle.checked = !isPaused;
        updateStatusUI(!isPaused);
    });
}

function updateStatusUI(isActive) {
    const t = i18n[currentLang];
    if (isActive) {
        domElements.statusLabel.textContent = t.active;
        domElements.statusLabel.style.color = "#28a745";
        document.body.classList.remove('is-paused');
    } else {
        domElements.statusLabel.textContent = t.paused;
        domElements.statusLabel.style.color = "#dc3545";
        document.body.classList.add('is-paused');
    }
}

domElements.cancelBtn.addEventListener('click', resetForm);

domElements.resetPosBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['uiPos'], () => alert(i18n[currentLang].msg_reset));
});

domElements.saveBtn.addEventListener('click', () => {
  const name = domElements.nameInput.value.trim();
  const reason = domElements.reasonInput.value.trim();
  const ipsRaw = domElements.ipsInput.value.trim();
  const indexToEdit = parseInt(domElements.editIndexInput.value);

  if (!name) { alert(i18n[currentLang].msg_req_name); return; }

  const ips = ipsRaw ? ipsRaw.split(',').map(ip => ip.trim()).filter(ip => ip !== "") : [];
  const newRule = { name, reason, ips };

  chrome.storage.local.get(['clientConfig'], (result) => {
    let rules = result.clientConfig || [];
    if (indexToEdit >= 0) rules[indexToEdit] = newRule;
    else rules.push(newRule);
    
    chrome.storage.local.set({ clientConfig: rules }, () => {
      resetForm();
      loadRules();
    });
  });
});

function loadRules() {
  chrome.storage.local.get(['clientConfig'], (result) => {
    const rules = result.clientConfig || [];
    domElements.rulesList.innerHTML = '';
    if (rules.length === 0) {
        domElements.rulesList.innerHTML = `<div style="text-align:center;color:#999;font-size:11px">${i18n[currentLang].msg_no_rules}</div>`;
        return;
    }
    rules.forEach((rule, index) => {
      const div = document.createElement('div');
      div.className = 'rule-item';
      div.innerHTML = `
        <div class="rule-header">
            <span class="rule-name">${rule.name}</span>
            <div class="rule-actions">
                <button class="action-btn edit-btn" data-index="${index}">✏️</button>
                <button class="action-btn del-btn" data-index="${index}">🗑️</button>
            </div>
        </div>
        <div class="rule-reason">${rule.reason}</div>
        <div class="rule-ips">${rule.ips.join(', ')}</div>
      `;
      domElements.rulesList.appendChild(div);
    });

    document.querySelectorAll('.del-btn').forEach(btn => btn.addEventListener('click', (e) => deleteRule(e.target.dataset.index)));
    document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => startEdit(e.target.dataset.index)));
  });
}

function startEdit(index) {
  chrome.storage.local.get(['clientConfig'], (result) => {
    const rule = result.clientConfig[index];
    domElements.nameInput.value = rule.name;
    domElements.reasonInput.value = rule.reason;
    domElements.ipsInput.value = rule.ips.join(', ');
    domElements.editIndexInput.value = index;
    domElements.saveBtn.textContent = i18n[currentLang].btn_update;
    domElements.saveBtn.style.background = "#28a745"; 
    domElements.cancelBtn.style.display = "block";
    domElements.nameInput.focus();
  });
}

function deleteRule(index) {
  if(!confirm(i18n[currentLang].msg_confirm_del)) return;
  chrome.storage.local.get(['clientConfig'], (result) => {
    const rules = result.clientConfig || [];
    rules.splice(index, 1);
    chrome.storage.local.set({ clientConfig: rules }, loadRules);
  });
}

function resetForm() {
  domElements.nameInput.value = ''; domElements.reasonInput.value = ''; domElements.ipsInput.value = '';
  domElements.editIndexInput.value = '-1';
  domElements.saveBtn.textContent = i18n[currentLang].btn_add;
  domElements.saveBtn.style.background = "#1f73b7";
  domElements.cancelBtn.style.display = "none";
}
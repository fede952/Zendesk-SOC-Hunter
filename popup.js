const sys = (typeof chrome !== 'undefined') ? chrome : browser;

const dom = {
    name: document.getElementById('inputName'),
    reason: document.getElementById('inputReason'),
    ips: document.getElementById('inputIps'),
    save: document.getElementById('saveBtn'),
    cancel: document.getElementById('cancelBtn'),
    editIdx: document.getElementById('editIndex'),
    list: document.getElementById('rulesList'),
    toggle: document.getElementById('activeToggle'),
    status: document.getElementById('statusLabel'),
    lang: document.getElementById('langBtn'),
    reset: document.getElementById('resetPosBtn'),
    export: document.getElementById('exportBtn'),
    import: document.getElementById('importBtn'),
    deleteAll: document.getElementById('deleteAllBtn'),
    fileInput: document.getElementById('fileInput'),
    l_org: document.getElementById('lbl_org'),
    l_reas: document.getElementById('lbl_reason'),
    l_ind: document.getElementById('lbl_indicators')
};

const i18n = {
    it: { 
        active: "ATTIVO", paused: "IN PAUSA", 
        lbl_org: "Nome Organizzazione", ph_org: "Nome", 
        lbl_reason: "Ragione monitoraggio", ph_reason: "es. PT in corso", 
        lbl_indicators: "Indicatori (IP, CIDR, Stringhe)", ph_indicators: "1.1.1.1, malware.exe", 
        btn_cancel: "Annulla", btn_add: "Aggiungi Regola", btn_update: "Aggiorna Regola", 
        btn_reset: "Reset Posizione Finestre", btn_export: "💾 Export Regole", btn_import: "📂 Import Regole",
        btn_delete_all: "🗑️ All",
        msg_reset: "Posizione resettata!", msg_no_rules: "Nessuna regola configurata", 
        msg_req_name: "Nome obbligatorio", msg_confirm_del: "Eliminare?", 
        msg_confirm_del_all: "⚠️ SEI SICURO?\nQuesto cancellerà TUTTE le regole.\nL'azione è irreversibile.",
        msg_deleted_all: "Tutte le regole sono state cancellate.",
        msg_imported: "Regole importate con successo!", msg_err_import: "File non valido",
        lang_label: "EN" 
    },
    en: { 
        active: "ACTIVE", paused: "PAUSED", 
        lbl_org: "Organization Name", ph_org: "Name", 
        lbl_reason: "Monitoring Reason", ph_reason: "e.g. PT in progress", 
        lbl_indicators: "Indicators (IP, CIDR, Strings)", ph_indicators: "1.1.1.1, malware.exe", 
        btn_cancel: "Cancel", btn_add: "Add Rule", btn_update: "Update Rule", 
        btn_reset: "Reset Windows Position", btn_export: "💾 Export Rules", btn_import: "📂 Import Rules",
        btn_delete_all: "🗑️ All",
        msg_reset: "Position reset!", msg_no_rules: "No rules configured", 
        msg_req_name: "Name required", msg_confirm_del: "Delete rule?", 
        msg_confirm_del_all: "⚠️ ARE YOU SURE?\nThis will delete ALL rules.\nAction cannot be undone.",
        msg_deleted_all: "All rules have been deleted.",
        msg_imported: "Rules imported successfully!", msg_err_import: "Invalid file",
        lang_label: "IT" 
    }
};

let currentLang = 'it';

document.addEventListener('DOMContentLoaded', () => {
    sys.storage.local.get(['lang', 'isPaused'], (res) => {
        currentLang = res.lang || 'it';
        applyLang(currentLang);
        loadRules();
        const isPaused = res.isPaused === true;
        dom.toggle.checked = !isPaused;
        updateStatus(!isPaused);
    });
});

// === EVENT LISTENERS ===

dom.toggle.addEventListener('change', () => {
    const isActive = dom.toggle.checked;
    sys.storage.local.set({ isPaused: !isActive }, () => updateStatus(isActive));
});

dom.save.addEventListener('click', () => {
    const name = dom.name.value.trim();
    if (!name) { alert(i18n[currentLang].msg_req_name); return; }
    
    const ips = dom.ips.value.trim().split(',').map(i => i.trim()).filter(i => i);
    const rule = { name, reason: dom.reason.value.trim(), ips };
    const idx = parseInt(dom.editIdx.value);

    sys.storage.local.get(['clientConfig'], (res) => {
        let rules = res.clientConfig || [];
        if (idx >= 0) rules[idx] = rule; else rules.push(rule);
        sys.storage.local.set({ clientConfig: rules }, () => { resetForm(); loadRules(); });
    });
});

if (dom.deleteAll) {
    dom.deleteAll.onclick = () => {
        if (confirm(i18n[currentLang].msg_confirm_del_all)) {
            sys.storage.local.set({ clientConfig: [] }, () => {
                dom.list.innerHTML = ''; 
                loadRules(); 
                alert(i18n[currentLang].msg_deleted_all);
            });
        }
    };
}

dom.reset.onclick = () => {
    sys.storage.local.remove(['uiPos'], () => alert(i18n[currentLang].msg_reset));
};

dom.lang.onclick = () => {
    currentLang = currentLang === 'it' ? 'en' : 'it';
    sys.storage.local.set({ lang: currentLang }, () => {
        applyLang(currentLang);
        loadRules();
        updateStatus(dom.toggle.checked);
    });
};

dom.cancel.onclick = resetForm;

// Export
dom.export.onclick = () => {
    sys.storage.local.get(['clientConfig'], (res) => {
        const rules = res.clientConfig || [];
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rules, null, 2));
        const dl = document.createElement('a');
        dl.setAttribute("href", dataStr);
        dl.setAttribute("download", "hunter_rules.json");
        document.body.appendChild(dl); dl.click(); dl.remove();
    });
};

// Import
dom.import.onclick = () => {
    if (window.innerWidth < 500) {
        if (sys.tabs && sys.tabs.create) {
            sys.tabs.create({ url: sys.runtime.getURL("popup.html") });
            window.close();
        } else {
            dom.fileInput.click();
        }
    } else {
        dom.fileInput.value = ''; 
        dom.fileInput.click();
    }
};

dom.fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const newRules = JSON.parse(ev.target.result);
            if (!Array.isArray(newRules)) throw new Error();
            
            sys.storage.local.get(['clientConfig'], (res) => {
                let existing = res.clientConfig || [];
                const map = new Map();
                existing.forEach(r => map.set(r.name.toLowerCase(), r));
                newRules.forEach(r => { if(r.name) map.set(r.name.toLowerCase(), r); });
                
                sys.storage.local.set({ clientConfig: Array.from(map.values()) }, () => {
                    alert(i18n[currentLang].msg_imported);
                    loadRules();
                });
            });
        } catch (err) { alert(i18n[currentLang].msg_err_import); }
    };
    reader.readAsText(file);
};

// === HELPER FUNCTIONS ===

function updateStatus(active) {
    const t = i18n[currentLang];
    dom.status.textContent = active ? t.active : t.paused;
    dom.status.style.color = active ? "#28a745" : "#dc3545";
    document.body.classList.toggle('is-paused', !active);
}

function loadRules() {
    sys.storage.local.get(['clientConfig'], (res) => {
        const rules = res.clientConfig || [];
        dom.list.innerHTML = '';
        if (rules.length === 0) {
            dom.list.innerHTML = `<div style="text-align:center;color:#999;font-size:11px;margin-top:20px">${i18n[currentLang].msg_no_rules}</div>`;
            return;
        }
        rules.forEach((rule, i) => {
            const div = document.createElement('div');
            div.className = 'rule-item';
            div.innerHTML = `
                <div class="rule-header">
                    <span class="rule-name">${rule.name}</span>
                    <div class="rule-actions">
                        <button class="action-btn edit-btn" data-idx="${i}">✏️</button>
                        <button class="action-btn del-btn" data-idx="${i}">🗑️</button>
                    </div>
                </div>
                <div class="rule-reason">${rule.reason}</div>
                <div class="rule-ips">${rule.ips.join(', ')}</div>
            `;
            dom.list.appendChild(div);
        });
        
        document.querySelectorAll('.edit-btn').forEach(b => b.onclick = () => startEdit(b.dataset.idx));
        document.querySelectorAll('.del-btn').forEach(b => b.onclick = () => deleteRule(b.dataset.idx));
    });
}

function startEdit(i) {
    sys.storage.local.get(['clientConfig'], (res) => {
        const r = res.clientConfig[i];
        dom.name.value = r.name; dom.reason.value = r.reason; dom.ips.value = r.ips.join(', ');
        dom.editIdx.value = i;
        dom.save.textContent = i18n[currentLang].btn_update;
        dom.save.style.background = "#28a745";
        dom.cancel.style.display = "block";
        dom.name.focus();
    });
}

function deleteRule(i) {
    if (confirm(i18n[currentLang].msg_confirm_del)) {
        sys.storage.local.get(['clientConfig'], (res) => {
            const rules = res.clientConfig || [];
            rules.splice(i, 1);
            sys.storage.local.set({ clientConfig: rules }, loadRules);
        });
    }
}

function resetForm() {
    dom.name.value = ''; dom.reason.value = ''; dom.ips.value = '';
    dom.editIdx.value = '-1';
    dom.save.textContent = i18n[currentLang].btn_add;
    dom.save.style.background = "#1f73b7";
    dom.cancel.style.display = "none";
}

function applyLang(l) {
    const t = i18n[l];
    dom.l_org.textContent = t.lbl_org; dom.l_reas.textContent = t.lbl_reason; dom.l_ind.textContent = t.lbl_indicators;
    dom.name.placeholder = t.ph_org; dom.reason.placeholder = t.ph_reason; dom.ips.placeholder = t.ph_indicators;
    dom.cancel.textContent = t.btn_cancel; dom.reset.textContent = t.btn_reset; dom.lang.textContent = t.lang_label;
    dom.save.textContent = dom.editIdx.value === '-1' ? t.btn_add : t.btn_update;
    dom.export.textContent = t.btn_export; dom.import.textContent = t.btn_import;
    if(dom.deleteAll) dom.deleteAll.textContent = t.btn_delete_all;
}
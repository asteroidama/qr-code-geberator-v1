// ===== VARIABILI GLOBALI =====
let currentQR = null;
let logoImage = null;
let animationId = null;
let savedTemplates = [];
let isAnimating = false;
let operationCancelled = false;

// ===== INIZIALIZZAZIONE =====
document.addEventListener('DOMContentLoaded', function() {
    initializeSavedTemplates();
    initializeEventListeners();
    updateContentFields();
    updateQR();
    loadSavedTemplates();
    updateRangeValues();
    checkContrast();
});

// Inizializza templates in modo sicuro
function initializeSavedTemplates() {
    try {
        const stored = localStorage.getItem('qrTemplates');
        savedTemplates = stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.warn('Errore caricamento template:', error);
        savedTemplates = [];
    }
}

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    // Colori
    document.getElementById('foregroundColor').addEventListener('input', () => {
        syncColor('foregroundColor');
        checkContrast();
    });
    
    document.getElementById('backgroundColor').addEventListener('input', () => {
        syncColor('backgroundColor');
        checkContrast();
    });
    
    // Export size
    document.getElementById('exportSize').addEventListener('change', updateExportInfo);
    
    // Custom size controls
    document.getElementById('customWidth').addEventListener('input', updateExportInfo);
    document.getElementById('customHeight').addEventListener('input', updateExportInfo);
    
    // Prevenzione perdita dati
    window.addEventListener('beforeunload', function(e) {
        const hasCustomContent = document.getElementById('qrText') && 
            document.getElementById('qrText').value !== 'https://esempio.com';
        const hasLogo = logoImage !== null;
        const hasCustomSettings = document.getElementById('useGradient').checked || 
            document.querySelector('.shape-option.active').dataset.shape !== 'square';
        
        if (hasCustomContent || hasLogo || hasCustomSettings) {
            e.preventDefault();
            e.returnValue = 'Hai modifiche non salvate. Vuoi davvero uscire?';
        }
    });
}

// ===== GESTIONE SEZIONI =====
function toggleSection(header) {
    const content = header.nextElementSibling;
    const icon = header.querySelector('span');
    
    if (content.classList.contains('active')) {
        content.classList.remove('active');
        header.classList.remove('active');
        icon.textContent = '▼';
    } else {
        content.classList.add('active');
        header.classList.add('active');
        icon.textContent = '▲';
    }
}

// ===== GESTIONE FORME =====
function selectShape(shapeElement) {
    document.querySelectorAll('.shape-option').forEach(s => s.classList.remove('active'));
    shapeElement.classList.add('active');
    updateQR();
}

// ===== GESTIONE CONTENUTI =====
function updateContentFields() {
    const contentType = document.getElementById('contentType').value;
    const contentFields = document.getElementById('contentFields');
    
    let fieldsHTML = '';
    
    switch(contentType) {
        case 'text':
            fieldsHTML = `
                <div class="form-group">
                    <label>Testo Libero</label>
                    <textarea id="qrText" rows="3" placeholder="Inserisci il tuo testo..." onchange="updateQR()">Ciao mondo!</textarea>
                </div>`;
            break;
            
        case 'url':
            fieldsHTML = `
                <div class="form-group">
                    <label>URL</label>
                    <input type="url" id="qrText" placeholder="https://esempio.com" onchange="updateQR()" value="https://esempio.com">
                </div>`;
            break;
            
        case 'wifi':
            fieldsHTML = `
                <div class="two-column">
                    <div class="form-group">
                        <label>Nome Rete (SSID)</label>
                        <input type="text" id="wifiSSID" placeholder="NomeWiFi" onchange="generateWiFiQR()">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="wifiPassword" placeholder="password123" onchange="generateWiFiQR()">
                    </div>
                </div>
                <div class="form-group">
                    <label>Tipo Sicurezza</label>
                    <select id="wifiSecurity" onchange="generateWiFiQR()">
                        <option value="WPA">WPA/WPA2</option>
                        <option value="WEP">WEP (Legacy)</option>
                        <option value="">Rete Aperta</option>
                    </select>
                </div>
                <div class="checkbox-group">
                    <input type="checkbox" id="wifiHidden" onchange="generateWiFiQR()">
                    <label for="wifiHidden">Rete Nascosta</label>
                </div>`;
            break;
            
        case 'email':
            fieldsHTML = `
                <div class="form-group">
                    <label>Email Destinatario</label>
                    <input type="email" id="emailTo" placeholder="nome@email.com" onchange="generateEmailQR()">
                </div>
                <div class="form-group">
                    <label>Oggetto Email</label>
                    <input type="text" id="emailSubject" placeholder="Oggetto del messaggio" onchange="generateEmailQR()">
                </div>
                <div class="form-group">
                    <label>Corpo del Messaggio</label>
                    <textarea id="emailBody" rows="4" placeholder="Scrivi il tuo messaggio qui..." onchange="generateEmailQR()"></textarea>
                </div>`;
            break;
            
        case 'sms':
            fieldsHTML = `
                <div class="form-group">
                    <label>Numero Telefono</label>
                    <input type="tel" id="smsNumber" placeholder="+39 123 456 7890" onchange="generateSMSQR()">
                </div>
                <div class="form-group">
                    <label>Messaggio SMS</label>
                    <textarea id="smsMessage" rows="3" placeholder="Testo del messaggio..." onchange="generateSMSQR()"></textarea>
                </div>`;
            break;
            
        case 'phone':
            fieldsHTML = `
                <div class="form-group">
                    <label>Numero Telefono</label>
                    <input type="tel" id="phoneNumber" placeholder="+39 123 456 7890" onchange="generatePhoneQR()">
                </div>
                <div class="form-group">
                    <label>Nome Contatto (opzionale)</label>
                    <input type="text" id="phoneName" placeholder="Nome del contatto" onchange="generatePhoneQR()">
                </div>`;
            break;
            
        case 'vcard':
            fieldsHTML = `
                <div class="two-column">
                    <div class="form-group">
                        <label>Nome</label>
                        <input type="text" id="vcardFirstName" placeholder="Mario" onchange="generateVCardQR()">
                    </div>
                    <div class="form-group">
                        <label>Cognome</label>
                        <input type="text" id="vcardLastName" placeholder="Rossi" onchange="generateVCardQR()">
                    </div>
                </div>
                <div class="form-group">
                    <label>Azienda</label>
                    <input type="text" id="vcardOrg" placeholder="Azienda S.r.l." onchange="generateVCardQR()">
                </div>
                <div class="form-group">
                    <label>Ruolo/Posizione</label>
                    <input type="text" id="vcardTitle" placeholder="Direttore Marketing" onchange="generateVCardQR()">
                </div>
                <div class="two-column">
                    <div class="form-group">
                        <label>Telefono Lavoro</label>
                        <input type="tel" id="vcardPhone" placeholder="+39 123 456 7890" onchange="generateVCardQR()">
                    </div>
                    <div class="form-group">
                        <label>Cellulare</label>
                        <input type="tel" id="vcardMobile" placeholder="+39 987 654 3210" onchange="generateVCardQR()">
                    </div>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="vcardEmail" placeholder="mario@azienda.com" onchange="generateVCardQR()">
                </div>
                <div class="form-group">
                    <label>Sito Web</label>
                    <input type="url" id="vcardUrl" placeholder="https://www.azienda.com" onchange="generateVCardQR()">
                </div>
                <div class="form-group">
                    <label>Indirizzo</label>
                    <textarea id="vcardAddress" rows="2" placeholder="Via Roma 123, 00100 Roma RM, Italia" onchange="generateVCardQR()"></textarea>
                </div>`;
            break;
            
        case 'whatsapp':
            fieldsHTML = `
                <div class="form-group">
                    <label>Numero WhatsApp (con prefisso internazionale)</label>
                    <input type="tel" id="whatsappNumber" placeholder="393123456789" onchange="generateWhatsAppQR()">
                    <small>Esempio: 393123456789 per numero italiano</small>
                </div>
                <div class="form-group">
                    <label>Messaggio Predefinito</label>
                    <textarea id="whatsappMessage" rows="3" placeholder="Ciao! Ti ho contattato tramite QR Code..." onchange="generateWhatsAppQR()"></textarea>
                </div>`;
            break;
            
        case 'location':
            fieldsHTML = `
                <div class="two-column">
                    <div class="form-group">
                        <label>Latitudine</label>
                        <input type="number" id="locationLat" step="any" placeholder="41.9028" onchange="generateLocationQR()">
                    </div>
                    <div class="form-group">
                        <label>Longitudine</label>
                        <input type="number" id="locationLng" step="any" placeholder="12.4964" onchange="generateLocationQR()">
                    </div>
                </div>
                <div class="form-group">
                    <label>Nome del Luogo (opzionale)</label>
                    <input type="text" id="locationName" placeholder="Colosseo, Roma" onchange="generateLocationQR()">
                </div>
                <button type="button" class="btn secondary" onclick="getCurrentLocation()" style="margin-top: 10px;">
                    📍 Usa Posizione Corrente
                </button>`;
            break;
            
        case 'crypto':
            fieldsHTML = `
                <div class="form-group">
                    <label>Tipo Criptovaluta</label>
                    <select id="cryptoType" onchange="generateCryptoQR()">
                        <option value="bitcoin">Bitcoin (BTC)</option>
                        <option value="ethereum">Ethereum (ETH)</option>
                        <option value="litecoin">Litecoin (LTC)</option>
                        <option value="dogecoin">Dogecoin (DOGE)</option>
                        <option value="bitcoincash">Bitcoin Cash (BCH)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Indirizzo Wallet</label>
                    <input type="text" id="cryptoAddress" placeholder="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa" onchange="generateCryptoQR()">
                </div>
                <div class="form-group">
                    <label>Importo (opzionale)</label>
                    <input type="number" id="cryptoAmount" step="any" placeholder="0.001" onchange="generateCryptoQR()">
                </div>
                <div class="form-group">
                    <label>Messaggio/Label (opzionale)</label>
                    <input type="text" id="cryptoLabel" placeholder="Pagamento per..." onchange="generateCryptoQR()">
                </div>`;
            break;
    }
    
    contentFields.innerHTML = fieldsHTML;
    setTimeout(() => {
        updateQR();
    }, 100);
}

// ===== FUNZIONI GENERAZIONE CONTENUTI SPECIFICI =====

function generateWiFiQR() {
    const ssid = document.getElementById('wifiSSID').value.trim();
    const password = document.getElementById('wifiPassword').value;
    const security = document.getElementById('wifiSecurity').value;
    const hidden = document.getElementById('wifiHidden').checked;
    
    if (!ssid) {
        showNotification('Inserisci il nome della rete WiFi', 'error');
        return;
    }
    
    const wifiString = `WIFI:T:${security};S:${ssid};P:${password};H:${hidden ? 'true' : 'false'};;`;
    generateQRFromContent(wifiString);
}

function generateEmailQR() {
    const to = document.getElementById('emailTo').value.trim();
    const subject = document.getElementById('emailSubject').value.trim();
    const body = document.getElementById('emailBody').value.trim();
    
    if (!to) {
        showNotification('Inserisci un indirizzo email', 'error');
        return;
    }
    
    const emailString = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    generateQRFromContent(emailString);
}

function generateSMSQR() {
    const number = document.getElementById('smsNumber').value.trim();
    const message = document.getElementById('smsMessage').value.trim();
    
    if (!number) {
        showNotification('Inserisci un numero di telefono', 'error');
        return;
    }
    
    const smsString = `sms:${number}?body=${encodeURIComponent(message)}`;
    generateQRFromContent(smsString);
}

function generatePhoneQR() {
    const number = document.getElementById('phoneNumber').value.trim();
    
    if (!number) {
        showNotification('Inserisci un numero di telefono', 'error');
        return;
    }
    
    generateQRFromContent(`tel:${number}`);
}

function generateVCardQR() {
    const firstName = document.getElementById('vcardFirstName').value.trim();
    const lastName = document.getElementById('vcardLastName').value.trim();
    const org = document.getElementById('vcardOrg').value.trim();
    const title = document.getElementById('vcardTitle').value.trim();
    const phone = document.getElementById('vcardPhone').value.trim();
    const mobile = document.getElementById('vcardMobile').value.trim();
    const email = document.getElementById('vcardEmail').value.trim();
    const url = document.getElementById('vcardUrl').value.trim();
    const address = document.getElementById('vcardAddress').value.trim();
    
    if (!firstName && !lastName) {
        showNotification('Inserisci almeno nome o cognome', 'error');
        return;
    }
    
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${firstName} ${lastName}
N:${lastName};${firstName};;;
ORG:${org}
TITLE:${title}
TEL;TYPE=WORK:${phone}
TEL;TYPE=CELL:${mobile}
EMAIL:${email}
URL:${url}
ADR:;;${address};;;;
END:VCARD`;
    
    generateQRFromContent(vcard);
}

function generateWhatsAppQR() {
    const number = document.getElementById('whatsappNumber').value.trim();
    const message = document.getElementById('whatsappMessage').value.trim();
    
    if (!number) {
        showNotification('Inserisci un numero WhatsApp', 'error');
        return;
    }
    
    const whatsappString = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    generateQRFromContent(whatsappString);
}

function generateLocationQR() {
    const lat = document.getElementById('locationLat').value.trim();
    const lng = document.getElementById('locationLng').value.trim();
    const name = document.getElementById('locationName').value.trim();
    
    if (!lat || !lng) {
        showNotification('Inserisci latitudine e longitudine', 'error');
        return;
    }
    
    let locationString;
    if (name) {
        locationString = `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(name)})`;
    } else {
        locationString = `geo:${lat},${lng}`;
    }
    
    generateQRFromContent(locationString);
}

function generateCryptoQR() {
    const type = document.getElementById('cryptoType').value;
    const address = document.getElementById('cryptoAddress').value.trim();
    const amount = document.getElementById('cryptoAmount').value.trim();
    const label = document.getElementById('cryptoLabel').value.trim();
    
    if (!address) {
        showNotification('Inserisci un indirizzo wallet', 'error');
        return;
    }
    
    let cryptoString = `${type}:${address}`;
    const params = [];
    
    if (amount) params.push(`amount=${amount}`);
    if (label) params.push(`label=${encodeURIComponent(label)}`);
    
    if (params.length > 0) {
        cryptoString += `?${params.join('&')}`;
    }
    
    generateQRFromContent(cryptoString);
}

function getCurrentLocation() {
    if (!navigator.geolocation) {
        showNotification('Geolocalizzazione non supportata dal browser', 'error');
        return;
    }
    
    showNotification('Rilevamento posizione in corso...', 'success');
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            document.getElementById('locationLat').value = position.coords.latitude.toFixed(6);
            document.getElementById('locationLng').value = position.coords.longitude.toFixed(6);
            generateLocationQR();
            showNotification('Posizione rilevata con successo!', 'success');
        },
        function(error) {
            let message = 'Errore nel rilevamento della posizione';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    message = 'Accesso alla posizione negato dall\'utente';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message = 'Informazioni sulla posizione non disponibili';
                    break;
                case error.TIMEOUT:
                    message = 'Timeout nel rilevamento della posizione';
                    break;
            }
            showNotification(message, 'error');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

// ===== FUNZIONE PRINCIPALE GENERAZIONE QR =====
function updateQR() {
    const contentType = document.getElementById('contentType').value;
    
    // Chiama la funzione specifica per il tipo di contenuto
    switch(contentType) {
        case 'wifi':
            if (document.getElementById('wifiSSID')) generateWiFiQR();
            break;
        case 'email':
            if (document.getElementById('emailTo')) generateEmailQR();
            break;
        case 'sms':
            if (document.getElementById('smsNumber')) generateSMSQR();
            break;
        case 'phone':
            if (document.getElementById('phoneNumber')) generatePhoneQR();
            break;
        case 'vcard':
            if (document.getElementById('vcardFirstName')) generateVCardQR();
            break;
        case 'whatsapp':
            if (document.getElementById('whatsappNumber')) generateWhatsAppQR();
            break;
        case 'location':
            if (document.getElementById('locationLat')) generateLocationQR();
            break;
        case 'crypto':
            if (document.getElementById('cryptoAddress')) generateCryptoQR();
            break;
        default:
            // text o url
            const textElement = document.getElementById('qrText');
            if (textElement && textElement.value.trim()) {
                generateQRFromContent(textElement.value.trim());
            }
    }
}

function generateQRFromContent(content) {
    if (!content) return;
    
    try {
        const canvas = document.getElementById('qrCanvas');
        const errorLevel = document.getElementById('errorLevel').value;
        const margin = parseInt(document.getElementById('qrMargin').value) || 0;
        
        // Crea o aggiorna il QR
        if (currentQR) {
            currentQR.value = content;
            currentQR.level = errorLevel;
        } else {
            currentQR = new QRious({
                element: canvas,
                value: content,
                size: 300,
                level: errorLevel,
                background: 'transparent',
                foreground: '#000000'
            });
        }
        
        // Applica personalizzazioni
        setTimeout(() => {
            applyCustomizations();
            updateQRInfo();
        }, 50);
        
    } catch (error) {
        console.error('Errore generazione QR:', error);
        showNotification('Errore nella generazione del QR Code: ' + error.message, 'error');
    }
}

// ===== APPLICAZIONE PERSONALIZZAZIONI =====
function applyCustomizations() {
    const canvas = document.getElementById('qrCanvas');
    const ctx = canvas.getContext('2d');
    
    // Salva i dati originali del QR
    const originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Applica sfondo
    applyBackground(ctx, canvas);
    
    // Applica colori/gradienti
    if (document.getElementById('useGradient').checked) {
        applyGradient(ctx, canvas, originalImageData);
    } else {
        applyColors(ctx, canvas, originalImageData);
    }
    
    // Applica forme personalizzate
    applyCustomShape(ctx, canvas, originalImageData);
    
    // Applica effetti
    applyEffects(ctx, canvas);
    
    // Aggiungi logo
    if (logoImage) {
        addLogo(ctx, canvas);
    }
}

function applyBackground(ctx, canvas) {
    const transparentBg = document.getElementById('transparentBg').checked;
    const bgColor = document.getElementById('backgroundColor').value;
    
    if (!transparentBg) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function applyColors(ctx, canvas, originalImageData) {
    const fgColor = document.getElementById('foregroundColor').value;
    const data = originalImageData.data.slice();
    const newImageData = ctx.createImageData(originalImageData.width, originalImageData.height);
    const newData = newImageData.data;
    
    const fgRgb = hexToRgb(fgColor);
    
    for (let i = 0; i < data.length; i += 4) {
        if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) {
            // Pixel nero del QR - applica colore principale
            newData[i] = fgRgb.r;
            newData[i + 1] = fgRgb.g;
            newData[i + 2] = fgRgb.b;
            newData[i + 3] = 255;
        } else {
            // Pixel trasparente
            newData[i] = 0;
            newData[i + 1] = 0;
            newData[i + 2] = 0;
            newData[i + 3] = 0;
        }
    }
    
    ctx.putImageData(newImageData, 0, 0);
}

function applyGradient(ctx, canvas, originalImageData) {
    const gradientType = document.getElementById('gradientType').value;
    const color1 = document.getElementById('gradientColor1').value;
    const color2 = document.getElementById('gradientColor2').value;
    const angle = parseInt(document.getElementById('gradientAngle').value);
    
    let gradient;
    
    if (gradientType === 'linear') {
        const rad = (angle * Math.PI) / 180;
        const x1 = canvas.width / 2 - Math.cos(rad) * canvas.width / 2;
        const y1 = canvas.height / 2 - Math.sin(rad) * canvas.height / 2;
        const x2 = canvas.width / 2 + Math.cos(rad) * canvas.width / 2;
        const y2 = canvas.height / 2 + Math.sin(rad) * canvas.height / 2;
        gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    } else if (gradientType === 'radial') {
        gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width / 2
        );
    } else if (gradientType === 'conic') {
        gradient = ctx.createConicGradient((angle * Math.PI) / 180, canvas.width / 2, canvas.height / 2);
    }
    
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    
    // Crea maschera con i dati originali del QR
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext('2d');
    
    const data = originalImageData.data;
    const maskImageData = maskCtx.createImageData(canvas.width, canvas.height);
    const maskData = maskImageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) {
            maskData[i] = 255;
            maskData[i + 1] = 255;
            maskData[i + 2] = 255;
            maskData[i + 3] = 255;
        } else {
            maskData[i] = 0;
            maskData[i + 1] = 0;
            maskData[i + 2] = 0;
            maskData[i + 3] = 0;
        }
    }
    
    maskCtx.putImageData(maskImageData, 0, 0);
    
    // Applica il gradiente
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Usa la maschera per mostrare solo le parti del QR
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
}

function applyCustomShape(ctx, canvas, originalImageData) {
    const activeShape = document.querySelector('.shape-option.active');
    if (!activeShape) return;
    
    const shape = activeShape.dataset.shape;
    const style = document.getElementById('shapeStyle').value;
    
    if (shape === 'square' && style === 'normal') return;
    
    const data = originalImageData.data;
    const moduleSize = estimateModuleSize(canvas.width);
    
    // Crea nuovo canvas per la forma personalizzata
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Applica sfondo se necessario
    if (!document.getElementById('transparentBg').checked) {
        tempCtx.fillStyle = document.getElementById('backgroundColor').value;
        tempCtx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Disegna moduli personalizzati
    drawCustomModules(tempCtx, data, canvas.width, canvas.height, moduleSize, shape, style);
    
    // Sostituisci il contenuto del canvas originale
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
}

function estimateModuleSize(canvasWidth) {
    // Stima approssimativa basata su QR Code standard
    return Math.max(1, Math.floor(canvasWidth / 25));
}

function drawCustomModules(ctx, data, width, height, moduleSize, shape, style) {
    const fgColor = document.getElementById('useGradient').checked ? '#000000' : document.getElementById('foregroundColor').value;
    ctx.fillStyle = fgColor;
    
    for (let y = 0; y < height; y += moduleSize) {
        for (let x = 0; x < width; x += moduleSize) {
            const index = (y * width + x) * 4;
            
            if (data[index] === 0 && data[index + 1] === 0 && data[index + 2] === 0) {
                drawSingleModule(ctx, x, y, moduleSize, shape, style);
            }
        }
    }
}

function drawSingleModule(ctx, x, y, size, shape, style) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    
    ctx.save();
    ctx.beginPath();
    
    // Modifica dimensione in base allo stile
    let actual


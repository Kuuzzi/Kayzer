let isAdmin = false;
let timerInterval = null;

window.onload = function() {
    if (sessionStorage.getItem('site_unlocked') === 'true') {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        
        if (sessionStorage.getItem('is_admin') === 'true') {
            isAdmin = true;
            document.getElementById('admin-nav').style.display = 'block';
        }
        loadDailyLimit();
        loadStock();
        startTimer();
    }
};

window.checkPassword = function() {
    const input = document.getElementById('pass-input').value;
    if (input === SITE_PASSWORD) {
        sessionStorage.setItem('site_unlocked', 'true');
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        loadDailyLimit();
        loadStock();
        startTimer();
    } else if (input === ADMIN_PASSWORD) {
        sessionStorage.setItem('site_unlocked', 'true');
        sessionStorage.setItem('is_admin', 'true');
        isAdmin = true;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'flex';
        document.getElementById('admin-nav').style.display = 'block';
        loadDailyLimit();
        loadStock();
        startTimer();
    } else {
        document.getElementById('error-msg').innerText = "Incorrect password.";
    }
};

window.lockSite = function() {
    sessionStorage.clear();
    window.location.reload();
};

window.switchTab = function(tabId, el) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if(el) el.classList.add('active');
};

// --- DAILY LIMIT & TIMER LOGIC ---
function getTodayDate() { return new Date().toISOString().split('T')[0]; }

function loadDailyLimit() {
    if (isAdmin) {
        document.getElementById('gen-display').innerText = "∞";
        document.getElementById('timer-display').style.display = 'none';
        document.getElementById('shortlink-btn').style.display = 'none';
        document.querySelectorAll('.gen-card[id^="btn-"]').forEach(c => c.style.display = 'block');
        return;
    }
    
    const today = getTodayDate();
    let gensToday = parseInt(localStorage.getItem('gens_date') === today ? localStorage.getItem('gens_count') : 0);
    
    if (localStorage.getItem('gens_date') !== today) {
        localStorage.setItem('gens_date', today);
        localStorage.setItem('gens_count', 0);
        gensToday = 0;
    }
    
    const remaining = Math.max(0, 2 - gensToday);
    document.getElementById('gen-display').innerText = remaining + "/2";
    
    if (remaining >= 2) {
        document.getElementById('shortlink-btn').style.display = 'none';
        document.getElementById('timer-display').style.display = 'none';
        document.querySelectorAll('.gen-card[id^="btn-"]').forEach(c => c.style.display = 'block');
    } else if (remaining === 0) {
        document.getElementById('shortlink-btn').style.display = 'block';
        document.getElementById('timer-display').style.display = 'block';
        document.querySelectorAll('.gen-card[id^="btn-"]').forEach(c => c.style.display = 'none');
    } else {
        document.getElementById('shortlink-btn').style.display = 'block';
        document.getElementById('timer-display').style.display = 'none';
        document.querySelectorAll('.gen-card[id^="btn-"]').forEach(c => c.style.display = 'block');
    }
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        if (isAdmin) return;
        
        const now = new Date();
        const nextReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
        const diff = nextReset - now;
        
        if (diff <= 0) {
            loadDailyLimit();
            return;
        }
        
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        
        document.getElementById('timer-display').innerText = `(Resets in ${hours}h ${mins}m ${secs}s)`;
    }, 1000);
}

function incrementGen() {
    if (isAdmin) return;
    let gensToday = parseInt(localStorage.getItem('gens_count') || 0) + 1;
    localStorage.setItem('gens_count', gensToday);
    loadDailyLimit();
}

// --- SHORTLINK / GET MORE GENERATES ---
window.startShortlinkTask = function() {
    if (isAdmin) return alert("Admins already have unlimited generations.");
    
    const shortlinkUrl = "https://your-shortlink-here.com"; 
    window.open(shortlinkUrl, "_blank");
    
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "Verifying...";
    btn.disabled = true;
    
    setTimeout(() => {
        let gensToday = parseInt(localStorage.getItem('gens_count') || 0);
        if (gensToday > 0) {
            localStorage.setItem('gens_count', gensToday - 1);
        }
        loadDailyLimit();
        alert("Task complete! +1 Generation added.");
        btn.innerText = originalText;
        btn.disabled = false;
    }, 5000); 
};

// --- STOCK MANAGEMENT ---
function loadStock() {
    const localStock = localStorage.getItem('stock');
    if (localStock) {
        STOCKS = JSON.parse(localStock);
    }
    updateStockViewer();
}

function updateStockViewer() {
    if(document.getElementById('stock-viewer')) {
        document.getElementById('stock-viewer').innerText = JSON.stringify(STOCKS, null, 2);
    }
}

window.addStock = function() {
    const service = document.getElementById('stock-service').value;
    const data = document.getElementById('stock-data').value;
    if (!data) return alert("Paste data first");
    
    if (!STOCKS[service]) STOCKS[service] = [];
    STOCKS[service].push(data);
    
    localStorage.setItem('stock', JSON.stringify(STOCKS));
    updateStockViewer();
    document.getElementById('stock-data').value = "";
    alert("Stock added locally! Don't forget to Export Config.");
};

window.exportConfig = function() {
    const configString = `const SITE_PASSWORD = "${SITE_PASSWORD}";\nconst ADMIN_PASSWORD = "${ADMIN_PASSWORD}";\nlet STOCKS = ${JSON.stringify(STOCKS, null, 4)};`;
    navigator.clipboard.writeText(configString);
    alert("Config copied to clipboard! Paste it into config.js.");
};

// --- GENERATE LOGIC ---
function generate(service) {
    let currentGens = parseInt(localStorage.getItem('gens_count') || 0);
    
    if (!isAdmin && currentGens >= 2) {
        return alert(`❌ You have 0 generations left. Wait for the timer on the dashboard to reset.`);
    }

    const stockList = STOCKS[service];
    if (!stockList || stockList.length === 0) {
        return alert("❌ Out of stock for this service.");
    }

    const randomItem = stockList[Math.floor(Math.random() * stockList.length)];
    incrementGen();

    const dashboardCard = document.getElementById('generated-content-card');
    const dashboardResult = document.getElementById('dashboard-result');
    
    dashboardCard.style.display = "block";
    dashboardResult.innerHTML = `
        <div class="result-box">
            <b style="color:var(--gold);">Your ${service.replace('_', ' ').toUpperCase()}:</b><br><br>
            <span id="cookie-text-${service}">${randomItem}</span>
            <br><br>
            <button class="copy-btn" data-text="${randomItem.replace(/"/g, '&quot;')}" onclick="copyText(this)">📋 Copy Cookie</button>
        </div>
    `;
    
    switchTab('dashboard', document.querySelector('.nav-item'));
}

window.copyText = function(btn) {
    const text = btn.getAttribute('data-text');
    navigator.clipboard.writeText(text);
    const original = btn.innerText;
    btn.innerText = "✅ Copied!";
    setTimeout(() => btn.innerText = original, 2000);
};

window.copyLink = function(btn) {
    const text = btn.getAttribute('data-link');
    navigator.clipboard.writeText(text);
    const original = btn.innerText;
    btn.innerText = "Copied!";
    setTimeout(() => btn.innerText = original, 2000);
};

// --- NETFLIX COOKIE CHECKER LOGIC ---
function checkNetflixCookie() {
    const cookie = document.getElementById('nf-cookie').value;
    
    if (!cookie || !cookie.includes("NetflixId")) {
        return alert("❌ Invalid cookie format. Must contain NetflixId.");
    }

    try {
        const cookiePairs = cookie.split(';').map(c => c.trim());
        let nfid = cookiePairs.find(c => c.startsWith("NetflixId="))?.split("=")[1] || null;
        let snfid = cookiePairs.find(c => c.startsWith("SecureNetflixId="))?.split("=")[1] || null;

        if (!nfid) {
            return alert("❌ Could not find NetflixId in the string.");
        }

        nfid = nfid.replace(/['"]+/g, '');
        if (snfid) snfid = snfid.replace(/['"]+/g, '');

        const tvLink = `https://www.netflix.com/activate?nftoken=${nfid}`;
        const pcLink = `https://www.netflix.com/Login?nftoken=${nfid}`;
        const mobileLink = `https://www.netflix.com/account?nftoken=${nfid}`;

        const dashboardCard = document.getElementById('generated-content-card');
        const dashboardResult = document.getElementById('dashboard-result');
        
        dashboardCard.style.display = "block";
        
        // CHANGED: Removed the <a> tags, left only the copy buttons full width
        dashboardResult.innerHTML = `
            <div class="result-box" style="border-color: var(--gold);">
                <div style="color: var(--gold); font-weight: bold; margin-bottom: 15px;">✅ Netflix Links Generated</div>
                
                <div class="link-group">
                    <h4>📺 TV Login</h4>
                    <div class="link-actions">
                        <button data-link="${tvLink.replace(/"/g, '&quot;')}" onclick="copyLink(this)">📋 Copy TV Link</button>
                    </div>
                </div>

                <div class="link-group">
                    <h4>💻 PC Login</h4>
                    <div class="link-actions">
                        <button data-link="${pcLink.replace(/"/g, '&quot;')}" onclick="copyLink(this)">📋 Copy PC Link</button>
                    </div>
                </div>

                <div class="link-group">
                    <h4>📱 Mobile Login</h4>
                    <div class="link-actions">
                        <button data-link="${mobileLink.replace(/"/g, '&quot;')}" onclick="copyLink(this)">📋 Copy Mobile Link</button>
                    </div>
                </div>
            </div>
        `;
        
        switchTab('dashboard', document.querySelector('.nav-item'));
        
    } catch (e) {
        alert("❌ Error parsing cookie: " + e.message);
    }
                                  }

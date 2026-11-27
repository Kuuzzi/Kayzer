let isAdmin = false;

function $(id) { return document.getElementById(id); }

// --- GUARD: no session, no entry ---
(function guard() {
    if (sessionStorage.getItem('site_unlocked') !== 'true') {
        window.location.replace('login.html');
    }
})();

function bootUI() {
    const app = $('main-app');
    if (app) app.style.display = 'flex';

    if (isAdmin) {
        const nav = $('admin-nav');
        if (nav) nav.style.display = 'block';
    }
    loadStock();
}

window.lockSite = function() {
    sessionStorage.clear();
    isAdmin = false;
    window.location.replace('login.html');
};

window.switchTab = function(tabId, el) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const tab = $(tabId);
    if (tab) tab.classList.add('active');
    if (el) el.classList.add('active');
};

// --- STOCK MANAGEMENT ---
function loadStock() {
    const localStock = localStorage.getItem('stock');
    if (localStock) {
        try { STOCKS = JSON.parse(localStock); } catch (e) {}
    }
    updateStockViewer();
}

function updateStockViewer() {
    const viewer = $('stock-viewer');
    if (viewer) viewer.innerText = JSON.stringify(STOCKS, null, 2);
}

window.addStock = function() {
    const service = $('stock-service').value;
    const data = $('stock-data').value;
    if (!data) return alert("Paste data first");

    if (!STOCKS[service]) STOCKS[service] = [];
    STOCKS[service].push(data);

    localStorage.setItem('stock', JSON.stringify(STOCKS));
    updateStockViewer();
    $('stock-data').value = "";
    alert("Stock added locally! Don't forget to Export Config.");
};

window.exportConfig = function() {
    const configString = `const SITE_PASSWORD = "${SITE_PASSWORD}";\nconst ADMIN_PASSWORD = "${ADMIN_PASSWORD}";\nlet STOCKS = ${JSON.stringify(STOCKS, null, 4)};`;
    navigator.clipboard.writeText(configString);
    alert("Config copied to clipboard! Paste it into config.js.");
};

// --- GENERATE LOGIC (no daily limit) ---
function generate(service) {
    const stockList = STOCKS[service];
    if (!stockList || stockList.length === 0) {
        return alert("❌ Out of stock for this service.");
    }

    const randomItem = stockList[Math.floor(Math.random() * stockList.length)];

    const dashboardCard = $('generated-content-card');
    const dashboardResult = $('dashboard-result');

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
    const cookie = $('nf-cookie').value;

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

        const dashboardCard = $('generated-content-card');
        const dashboardResult = $('dashboard-result');

        dashboardCard.style.display = "block";

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

// --- WIRE UP ON LOAD ---
document.addEventListener('DOMContentLoaded', function () {
    if (sessionStorage.getItem('is_admin') === 'true') {
        isAdmin = true;
    }
    bootUI();
});

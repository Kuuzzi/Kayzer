// Correct owner and repo from your screenshot
const OWNER = "Kuuzzi";
const REPO  = "KayzerPrems";
const RAW   = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/results`;

const btn = document.getElementById('btnCheck');
const err = document.getElementById('err');
const result = document.getElementById('result');
const dot = document.getElementById('dot');
const statusText = document.getElementById('statusText');
const info = document.getElementById('info');
const links = document.getElementById('links');

btn.addEventListener('click', async () => {
  const raw = document.getElementById('cookie').value.trim();
  err.style.display = 'none';
  if (!raw) return showErr('Paste a cookie first.');

  result.style.display = 'block';
  links.style.display = 'none';
  info.innerHTML = '';
  dot.className = 'dot checking';
  statusText.textContent = 'Checking…';
  btn.disabled = true;

  const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // Open GitHub issue (triggers Actions)
  const title = encodeURIComponent(`check ${jobId}`);
  const body  = encodeURIComponent(`job: ${jobId}\n\n<!-- cookie below -->\n\`\`\`\n${raw}\n\`\`\`\n`);
  window.open(`https://github.com/${OWNER}/${REPO}/issues/new?title=${title}&body=${body}`, '_blank');

  statusText.textContent = 'Waiting for GitHub…';

  // Poll for result
  const url = `${RAW}/job_${jobId}.json`;
  let data = null;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    try {
      const r = await fetch(url + '?t=' + Date.now(), { cache: 'no-store' });
      if (r.ok) { data = await r.json(); break; }
    } catch (_) {}
  }
  
  if (!data) {
    dot.className = 'dot dead';
    statusText.textContent = 'Waiting — submit the issue tab, then check again';
    btn.disabled = false;
    return;
  }

  // Show status
  dot.className = 'dot ' + data.status;
  statusText.textContent =
    data.status === 'alive'   ? 'ALIVE — cookie is valid' :
    data.status === 'expired' ? 'EXPIRED — session ended' :
                                'DEAD — invalid cookie';

  const rows = [];
  if (data.plan)        rows.push(`<b>Plan:</b> ${esc(data.plan)}`);
  if (data.country)     rows.push(`<b>Country:</b> ${esc(data.country)}`);
  if (data.nextBilling) rows.push(`<b>Next billing:</b> ${esc(data.nextBilling)}`);
  if (data.profiles)    rows.push(`<b>Profiles:</b> ${esc(data.profiles)}`);
  info.innerHTML = rows.length ? rows.join('<br>') : '<span style="color:var(--dim)">No account metadata returned.</span>';

  // Show buttons if alive
  if (data.status === 'alive' && data.links) {
    links.style.display = 'block';
    bindBtn('openPc', data.links.pc);
    bindBtn('openMobile', data.links.mobile);
    bindBtn('openTv', data.links.tv);
  }

  btn.disabled = false;
});

function bindBtn(id, url) {
  const el = document.getElementById(id);
  if (url) { el.href = url; el.style.display = 'inline-block'; }
  else     { el.style.display = 'none'; }
}
function showErr(msg){ err.textContent = msg; err.style.display = 'block'; }
function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

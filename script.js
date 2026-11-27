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

  try {
    // Calls the Vercel backend function at /api/check
    const res = await fetch('/api/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookie: raw })
    });
    
    const data = await res.json();
    
    if (!res.ok) throw new Error(data.error || 'Check failed');

    // Status indicator
    dot.className = 'dot ' + data.status;
    statusText.textContent =
      data.status === 'alive'   ? 'ALIVE — cookie is valid' :
      data.status === 'expired' ? 'EXPIRED — session ended' :
                                  'DEAD — invalid cookie';

    // Metadata
    const rows = [];
    if (data.plan)        rows.push(`<b>Plan:</b> ${esc(data.plan)}`);
    if (data.country)     rows.push(`<b>Country:</b> ${esc(data.country)}`);
    if (data.nextBilling) rows.push(`<b>Next billing:</b> ${esc(data.nextBilling)}`);
    if (data.profiles)    rows.push(`<b>Profiles:</b> ${esc(data.profiles)}`);
    info.innerHTML = rows.length ? rows.join('<br>') : '<span style="color:var(--dim)">No account metadata returned.</span>';

    // Three separate buttons for links
    if (data.status === 'alive' && data.links) {
      links.style.display = 'block';
      bindBtn('openPc', data.links.pc);
      bindBtn('openMobile', data.links.mobile);
      bindBtn('openTv', data.links.tv);
    }
  } catch (e) {
    dot.className = 'dot dead';
    statusText.textContent = 'Check failed';
    showErr(e.message);
  } finally {
    btn.disabled = false;
  }
});

function bindBtn(id, url) {
  const el = document.getElementById(id);
  if (url) { el.href = url; el.style.display = 'inline-block'; }
  else     { el.style.display = 'none'; }
}
function showErr(msg){ err.textContent = msg; err.style.display = 'block'; }
function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function api(path, method='GET', body) {
  const opts = { method, headers: {} };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch('/api' + path, opts);
  return res.json();
}
const IdToggle = document.getElementById('IdToggle');
const sqlToggle = document.getElementById('sqlToggle');
const authToggle = document.getElementById('authToggle');
const attackBtn = document.getElementById('attackBtn');
const password = document.getElementById('password');
const username = document.getElementById('username');


sqlToggle.addEventListener('change', async () => {
  await api('/toggle', 'POST', { vuln: 'sql_injection', enabled: sqlToggle.checked });
  if(sqlToggle.checked) authToggle.checked = false;

});
authToggle.addEventListener('change', async () => {
  await api('/toggle', 'POST', { vuln: 'broken_auth', enabled: authToggle.checked });
  if(authToggle.checked) sqlToggle.checked = false;
});


attackBtn.addEventListener('click', async () => {
  const inputName = document.getElementById('username').value;
  const inputPass = document.getElementById('password').value;
  console.log(IdToggle.checked)
  if(IdToggle.checked){
    try {
      const res = await api('/attack', 'POST', { inputName, inputPass });
      
        if (res && res.success) {
          alert('Attack simulation: SUCCESS\n\n' + res.message, res.rows);
        } else {
          alert('Attack simulation: FAILED\n\n' + (res && res.message ? res.message : 'no details'));
        }
      
    } catch (err) {
      console.error('Fetch error', err);
      alert('Request error: ' + (err.message || err));
    }
  } else {
    try {
      const res = await api('/login', 'POST', { inputName, inputPass });

      if (res && res.success) {
        alert('Attack simulation: SUCCESS\n\n' + res.message, res.rows);
      } else {
        alert('Attack simulation: FAILED\n\n' + (res && res.message ? res.message : 'no details'));
      }
    } catch (err) {
      console.error('Fetch error', err);
      alert('Request error: ' + (err.message || err));
    }
  }
});


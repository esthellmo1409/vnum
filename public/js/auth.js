function mostrarMsg(texto, tipo) {
  const el = document.getElementById('msg');
  el.textContent = texto;
  el.className = 'form-msg ' + tipo;
}

const formLogin = document.getElementById('form-login');
if (formLogin) {
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      });
      const data = await res.json();
      if (!res.ok) return mostrarMsg(data.erro || 'Não foi possível entrar.', 'erro');
      if (window.simsmsTrack) window.simsmsTrack('page_view');
      const next = new URLSearchParams(window.location.search).get('next');
      window.location.href = data.usuario.isAdmin ? '/admin.html' : (next || '/dashboard.html');
    } catch (e) {
      mostrarMsg('Erro de conexão. Tente novamente.', 'erro');
    }
  });
}

const formCadastro = document.getElementById('form-cadastro');
if (formCadastro) {
  formCadastro.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;
    const refQ = new URLSearchParams(window.location.search).get('ref') || '';
    const o = window.simsmsOrigem ? window.simsmsOrigem() : {};
    const ref = refQ || o.ref || '';
    try {
      const res = await fetch('/api/auth/registro', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome, email, senha, ref,
          utmSource: o.utmSource || '',
          utmCampaign: o.utmCampaign || '',
          origemTrafego: o.origemTrafego || ''
        })
      });
      const data = await res.json();
      if (!res.ok) return mostrarMsg(data.erro || 'Não foi possível criar a conta.', 'erro');
      if (window.simsmsTrack) window.simsmsTrack('signup');
      const q = new URLSearchParams(window.location.search);
      const next = q.get('next');
      const servico = q.get('servico');
      window.location.href = next || (servico ? ('/dashboard.html?comprar=' + encodeURIComponent(servico)) : '/dashboard.html');
    } catch (e) {
      mostrarMsg('Erro de conexão. Tente novamente.', 'erro');
    }
  });
}

// ----- Esqueci minha senha -----
const linkEsqueci = document.getElementById('link-esqueci-senha');
if (linkEsqueci) {
  linkEsqueci.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('modal-esqueci').classList.add('show');
  });
}
document.querySelectorAll('[data-close]').forEach(el => {
  el.addEventListener('click', () => document.getElementById(el.dataset.close).classList.remove('show'));
});

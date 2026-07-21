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
      window.location.href = data.usuario.isAdmin ? '/admin.html' : '/dashboard.html';
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
    const ref = new URLSearchParams(window.location.search).get('ref') || '';
    try {
      const res = await fetch('/api/auth/registro', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha, ref })
      });
      const data = await res.json();
      if (!res.ok) return mostrarMsg(data.erro || 'Não foi possível criar a conta.', 'erro');
      window.location.href = '/dashboard.html';
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

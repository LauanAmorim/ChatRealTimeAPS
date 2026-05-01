const ACCESS_CODE = '123';

const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const confirmPasswordInput = document.getElementById('confirmPasswordInput');
const accessCodeInput = document.getElementById('accessCodeInput');
const registerButton = document.getElementById('registerButton');
const feedbackMsg = document.getElementById('feedbackMsg');

function showFeedback(message, type) {
  feedbackMsg.textContent = message;
  feedbackMsg.className = 'feedback-msg ' + type;
}

function clearFeedback() {
  feedbackMsg.textContent = '';
  feedbackMsg.className = 'feedback-msg';
}

async function register() {
  clearFeedback();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  const accessCode = accessCodeInput.value;

  if (!username) {
    showFeedback('Informe um nome de usuário.', 'error');
    usernameInput.focus();
    return;
  }

  if (!password) {
    showFeedback('Informe uma senha.', 'error');
    passwordInput.focus();
    return;
  }

  if (password !== confirmPassword) {
    showFeedback('As senhas não coincidem.', 'error');
    confirmPasswordInput.focus();
    return;
  }

  if (accessCode !== ACCESS_CODE) {
    showFeedback('Código de acesso inválido.', 'error');
    accessCodeInput.focus();
    return;
  }

  registerButton.disabled = true;
  registerButton.textContent = 'Criando conta...';

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      showFeedback('Conta criada com sucesso! Redirecionando...', 'success');
      setTimeout(() => { window.location.href = '/index.html'; }, 1500);
    } else if (response.status === 409) {
      showFeedback('Este nome de usuário já está em uso.', 'error');
      registerButton.disabled = false;
      registerButton.textContent = 'Criar conta';
    } else {
      showFeedback(data.error || 'Erro ao criar conta. Tente novamente.', 'error');
      registerButton.disabled = false;
      registerButton.textContent = 'Criar conta';
    }
  } catch {
    showFeedback('Erro de conexão. Tente novamente.', 'error');
    registerButton.disabled = false;
    registerButton.textContent = 'Criar conta';
  }
}

registerButton.addEventListener('click', register);

[usernameInput, passwordInput, confirmPasswordInput, accessCodeInput].forEach(input => {
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') register();
  });
});

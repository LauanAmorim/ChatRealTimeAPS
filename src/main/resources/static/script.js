// Adiciona persistência com localStorage (username + messages)

const STORAGE_KEYS = {
  USERNAME: 'chat_username',
  MESSAGES: 'chat_messages'
};

const state = {
  username: "",
  socket: null,
  messages: []
};

const elements = {
  welcomePanel: document.getElementById("welcomePanel"),
  chatRoom: document.getElementById("chatRoom"),
  usernameInput: document.getElementById("usernameInput"),
  passwordInput: document.getElementById("passwordInput"),
  enterButton: document.getElementById("enterButton"),
  currentUsername: document.getElementById("currentUsername"),
  connectionStatus: document.getElementById("connectionStatus"),
  connectionLabel: document.getElementById("connectionLabel"),
  messagesContainer: document.getElementById("messagesContainer"),
  emptyState: document.getElementById("emptyState"),
  messageInput: document.getElementById("messageInput"),
  sendButton: document.getElementById("sendButton"),
  recordButton: document.getElementById("recordButton"),
  audioFileInput: document.getElementById("audioFileInput"),
  messageCount: document.getElementById("messageCount")
};

const protocol = window.location.protocol === "https:" ? "wss" : "ws";
const wsUrl = `${protocol}://${window.location.host}/chat`;

function setConnectionState(label, isOnline) {
  elements.connectionStatus.hidden = false;
  elements.connectionLabel.textContent = label;
  elements.connectionStatus.classList.toggle("online", isOnline);
}

function renderMessages() {
  const existingMessages = elements.messagesContainer.querySelectorAll(".message-card");
  existingMessages.forEach((node) => node.remove());

  elements.messageCount.textContent = String(state.messages.length);
  elements.emptyState.hidden = state.messages.length > 0;

  state.messages.forEach((message) => {
    const article = document.createElement("article");
    article.className = "message-card";

    if (message.username === state.username) {
      article.classList.add("own-message");
    }

    const username = document.createElement("span");
    username.className = "message-username";
    username.textContent = message.username;

    article.append(username);

    if (message.type === "audio") {
      const audioWrapper = document.createElement('div');
      audioWrapper.className = 'message-audio';
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = message.message; // data URL
      audioWrapper.appendChild(audio);
      article.appendChild(audioWrapper);
    } else {
      const text = document.createElement("p");
      text.className = "message-text";
      text.textContent = message.message;
      article.appendChild(text);
    }

    elements.messagesContainer.appendChild(article);
  });

  elements.messagesContainer.scrollTo({
    top: elements.messagesContainer.scrollHeight,
    behavior: "smooth"
  });
}

function saveUsernameToStorage(username) {
  try {
    if (username) localStorage.setItem(STORAGE_KEYS.USERNAME, username);
  } catch (e) {
    console.warn('Não foi possível salvar username no localStorage', e);
  }
}

function saveMessagesToStorage(messages) {
  try {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages || []));
  } catch (e) {
    console.warn('Não foi possível salvar mensagens no localStorage', e);
  }
}

function loadStateFromStorage() {
  let username = '';
  let messages = [];
  try {
    const rawUser = localStorage.getItem(STORAGE_KEYS.USERNAME);
    if (rawUser) username = rawUser;
  } catch (e) {
    console.warn('Falha ao ler username do localStorage', e);
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) messages = parsed;
    }
  } catch (e) {
    console.warn('Falha ao ler mensagens do localStorage', e);
  }

  return { username, messages };
}

function appendMessage(message) {
  state.messages.push(message);
  // salva no localStorage sempre que for adicionada uma nova mensagem
  saveMessagesToStorage(state.messages);
  renderMessages();
}

function connectWebSocket() {
  if (state.socket) {
    state.socket.close();
  }

  setConnectionState("Conectando...", false);
  state.socket = new WebSocket(wsUrl);

  state.socket.addEventListener("open", () => {
    setConnectionState("Conectado", true);
    elements.messageInput.focus();
  });

  state.socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(event.data);

      if (!message || typeof message.username !== "string" || typeof message.message !== "string") {
        return;
      }

      const normalizedMessage = {
        username: message.username.trim(),
        message: message.message.trim(),
        type: typeof message.type === 'string' ? message.type : 'text'
      };

      if (!normalizedMessage.username || !normalizedMessage.message) {
        return;
      }

      appendMessage(normalizedMessage);
    } catch (error) {
      console.error("Falha ao processar mensagem recebida:", error);
    }
  });

  state.socket.addEventListener("close", () => {
    setConnectionState("Desconectado", false);
  });

  state.socket.addEventListener("error", (error) => {
    console.error("Erro WebSocket:", error);
    setConnectionState("Erro na conexao", false);
  });
}

function enterChat() {
  const username = elements.usernameInput.value.trim();
  const password = elements.passwordInput ? elements.passwordInput.value : '';

  if (!username) {
    elements.usernameInput.focus();
    return;
  }

  // call backend to validate credentials
  fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert('Falha no login: ' + (err && err.error ? err.error : res.statusText));
      return;
    }

    const data = await res.json();
    // success
    state.username = data.username;
    elements.currentUsername.textContent = data.username;
    elements.welcomePanel.hidden = true;
    elements.chatRoom.hidden = false;

    // salva username e conecta websocket
    saveUsernameToStorage(data.username);
    connectWebSocket();
  }).catch((e) => {
    console.error('Erro ao chamar /api/login', e);
  });
}

function sendMessage() {
  const message = elements.messageInput.value.trim();

  if (!message || !state.username || !state.socket || state.socket.readyState !== WebSocket.OPEN) {
    return;
  }

  state.socket.send(JSON.stringify({
    username: state.username,
    message
  }));

  elements.messageInput.value = "";
  elements.messageInput.focus();
}

// Audio recording/upload support
let mediaRecorder = null;
let recordedChunks = [];

async function startOrSendAudio() {
  // If MediaRecorder is available, toggle recording
  if (navigator.mediaDevices && window.MediaRecorder) {
    if (!mediaRecorder) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        recordedChunks = [];

        mediaRecorder.addEventListener('dataavailable', (e) => {
          if (e.data && e.data.size > 0) recordedChunks.push(e.data);
        });

        mediaRecorder.addEventListener('stop', async () => {
          const blob = new Blob(recordedChunks, { type: recordedChunks[0].type || 'audio/webm' });
          await uploadAudioBlob(blob);
          mediaRecorder = null;
          recordedChunks = [];
        });

        mediaRecorder.start();
        elements.recordButton.textContent = 'Parar e Enviar';
      } catch (err) {
        console.error('Erro ao acessar microfone:', err);
        // fallback to file input
        elements.audioFileInput.click();
      }
    } else {
      // stop and send
      mediaRecorder.stop();
      elements.recordButton.textContent = 'Gravar/Enviar Áudio';
    }
  } else {
    // fallback: open file selector
    elements.audioFileInput.click();
  }
}

async function uploadAudioBlob(blob) {
  if (!state.username) {
    alert('Defina um nome de usuario antes de enviar audio');
    return;
  }

  const form = new FormData();
  form.append('username', state.username);
  form.append('file', blob, 'audio.webm');

  try {
    await fetch('/upload-audio', {
      method: 'POST',
      body: form
    });
  } catch (err) {
    console.error('Falha ao enviar audio:', err);
  }
}

elements.recordButton.addEventListener('click', startOrSendAudio);
elements.audioFileInput.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) {
    await uploadAudioBlob(file);
  }
  // reset input
  e.target.value = '';
});


// eventos
elements.enterButton.addEventListener("click", enterChat);
elements.sendButton.addEventListener("click", sendMessage);

// keep keyboard shortcuts
if (elements.passwordInput) {
  elements.passwordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') enterChat();
  });
}

elements.usernameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    // if password input exists, focus it first
    if (elements.passwordInput && !elements.passwordInput.value) {
      elements.passwordInput.focus();
      return;
    }
    enterChat();
  }
});

elements.messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});

window.addEventListener("beforeunload", () => {
  if (state.socket) {
    state.socket.close();
  }
});

// Inicializacao: carrega estado do localStorage e restaura UI
window.addEventListener('DOMContentLoaded', () => {
  const stored = loadStateFromStorage();

  if (stored.username) {
    state.username = stored.username;
    elements.usernameInput.value = stored.username;
    elements.currentUsername.textContent = stored.username;
    elements.welcomePanel.hidden = true;
    elements.chatRoom.hidden = false;
    // conecta automaticamente se já havia username salvo
    connectWebSocket();
  }

  if (Array.isArray(stored.messages) && stored.messages.length > 0) {
    state.messages = stored.messages;
  }

  renderMessages();
});

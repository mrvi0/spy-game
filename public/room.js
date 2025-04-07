const socket = io();
const roomId = window.location.pathname.split('/')[2];
document.getElementById('roomId').textContent = roomId;

let playerId = localStorage.getItem('playerId');
let isCreator = false;
let isReady = false;
let gameStarted = false;
let voting = false;
let gameTimerInterval = null;

if (!playerId) {
  playerId = `guest-${Math.random().toString(36).substr(2, 6)}`;
  localStorage.setItem('playerId', playerId);
}
socket.emit('setPlayerId', playerId);
socket.emit('joinRoom', { roomId, playerId });

const gameControls = document.getElementById('gameControls');
function updateControls() {
  gameControls.innerHTML = '';
  if (isCreator) {
    gameControls.innerHTML = `
      <button id="startGame" class="button">Начать игру</button>
      <button id="resetGame" class="button" style="display: none;">Сбросить игру</button>
      <button id="closeRoom" class="button button-danger">Закрыть комнату</button>
    `;
    if (gameStarted) {
      document.getElementById('startGame').style.display = 'none';
      document.getElementById('resetGame').style.display = 'block';
      gameControls.insertAdjacentHTML('afterbegin', `<button id="startVote" class="button">Начать голосование</button>`);
    }
    document.getElementById('startGame')?.addEventListener('click', () => socket.emit('startGame', roomId));
    document.getElementById('resetGame')?.addEventListener('click', () => socket.emit('resetGame', roomId));
    document.getElementById('closeRoom')?.addEventListener('click', () => {
      if (confirm('Вы уверены, что хотите закрыть комнату?')) socket.emit('closeRoom', roomId);
    });
    document.getElementById('startVote')?.addEventListener('click', () => socket.emit('startVoting', roomId));
  } else {
    gameControls.innerHTML = `
      <button id="readyToggle" class="button button-secondary" style="${gameStarted ? 'display: none;' : ''}">Не готов</button>
      <button id="leaveRoom" class="button button-danger">Покинуть комнату</button>
    `;
    if (gameStarted) {
      gameControls.insertAdjacentHTML('afterbegin', `<button id="startVote" class="button">Начать голосование</button>`);
      document.getElementById('startVote')?.addEventListener('click', () => socket.emit('startVoting', roomId));
    }
    document.getElementById('readyToggle')?.addEventListener('click', () => {
      isReady = !isReady;
      socket.emit('setReady', { roomId, playerId, isReady });
      updateReadyButton();
    });
    document.getElementById('leaveRoom')?.addEventListener('click', () => socket.emit('leaveRoom', { roomId, playerId }));
  }
  updateReadyButton();
}

function updateReadyButton() {
  const readyButton = document.getElementById('readyToggle');
  if (readyButton) {
    readyButton.textContent = isReady ? 'Готов' : 'Не готов';
    readyButton.className = isReady ? 'button button-ready' : 'button button-secondary';
  }
}

socket.on('playerList', (players, spiesKnown) => {
  const playerList = document.getElementById('players');
  const activePlayers = players.filter(p => !p.isOut).length;
  playerList.innerHTML = '';
  players.forEach(player => {
    const li = document.createElement('li');
    if (player.isOut) li.classList.add('out');
    const avatar = document.createElement('span');
    avatar.className = 'avatar';
    // Проверяем, есть ли avatarUrl у игрока
    if (player.avatarUrl) {
      console.log(`[DEBUG] Avatar URL for player ${player.name}: ${player.avatarUrl}`); // Отладочный вывод
      avatar.style.backgroundImage = `url(${player.avatarUrl})`;
      avatar.style.backgroundSize = 'cover';
      avatar.textContent = '';
    } else {
      avatar.textContent = spiesKnown && player.isSpy ? '🕶️' : '👤';
    }
    const nameSpan = document.createElement('span');
    nameSpan.textContent = spiesKnown && player.isSpy ? `${player.name} (Шпион)` : player.name;
    nameSpan.dataset.playerId = player.playerId;
    const status = document.createElement('span');
    status.className = `ready-status ${player.isReady ? 'ready' : 'not-ready'}`;
    const voteContainer = document.createElement('span');
    voteContainer.className = 'vote-container';
    const voteCount = document.createElement('span');
    voteCount.className = 'vote-count';
    voteCount.textContent = `${player.votes || 0}/${activePlayers}`;
    const voteButton = document.createElement('button');
    voteButton.className = 'vote-button';
    voteButton.textContent = '✔';
    voteButton.style.display = voting && !player.isOut ? 'inline-block' : 'none';
    voteButton.onclick = () => {
      if (!player.isOut) socket.emit('vote', { roomId, targetId: player.playerId, voterId: playerId });
    };
    const input = document.createElement('input');
    input.className = 'name-input';
    input.style.display = 'none';
    input.value = player.name;
    const okButton = document.createElement('button');
    okButton.className = 'button button-secondary';
    okButton.style.display = 'none';
    okButton.textContent = 'OK';
    okButton.onclick = () => {
      if (player.playerId === playerId) {
        socket.emit('changeName', { roomId, playerId, newName: input.value });
        nameSpan.style.display = 'inline';
        input.style.display = 'none';
        okButton.style.display = 'none';
      }
    };
    nameSpan.onclick = () => {
      if (player.playerId === playerId) {
        nameSpan.style.display = 'none';
        input.style.display = 'inline';
        okButton.style.display = 'inline';
        input.focus();
      }
    };
    li.appendChild(avatar);
    li.appendChild(nameSpan);
    if (!player.isCreator && !gameStarted) li.appendChild(status);
    if (voting && !player.isOut) {
      voteContainer.appendChild(voteCount);
      voteContainer.appendChild(voteButton);
      li.appendChild(voteContainer);
    }
    li.appendChild(input);
    li.appendChild(okButton);
    playerList.appendChild(li);
  });
});

socket.on('roomFull', (reason) => {
  alert(reason || 'Комната заполнена!');
});

socket.on('isCreator', (creator) => {
  isCreator = creator;
  updateControls();
  if (isCreator) document.getElementById('sidebarToggle').style.display = 'block';
});

socket.on('settingsUpdated', (settings) => {
  document.getElementById('roomName').value = settings.roomName;
  document.getElementById('maxPlayers').value = settings.maxPlayers;
  document.getElementById('spiesCount').value = settings.spiesCount;
  document.getElementById('locationTheme').value = settings.locationTheme;
  document.getElementById('gameTimer').value = settings.gameTimer;
  document.getElementById('spiesKnown').checked = settings.spiesKnown;
  document.getElementById('roomTitle').textContent = `${settings.roomName} (${roomId})`;
  document.getElementById('pageTitle').textContent = settings.roomName;
  document.getElementById('roomInfo').textContent = `Игроков: ${settings.maxPlayers}, Шпионов: ${settings.spiesCount}`;
});

document.getElementById('saveSettings')?.addEventListener('click', () => {
  const maxPlayersInput = document.getElementById('maxPlayers');
  const maxPlayers = parseInt(maxPlayersInput.value);
  if (maxPlayers > 15) {
    maxPlayersInput.classList.add('invalid');
    return;
  }
  maxPlayersInput.classList.remove('invalid');
  const settings = {
    roomName: document.getElementById('roomName').value,
    maxPlayers: maxPlayers,
    spiesCount: parseInt(document.getElementById('spiesCount').value),
    locationTheme: document.getElementById('locationTheme').value,
    gameTimer: parseInt(document.getElementById('gameTimer').value),
    spiesKnown: document.getElementById('spiesKnown').checked
  };
  socket.emit('updateSettings', { roomId, settings });
});

document.getElementById('sidebarToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.add('open');
});

document.getElementById('sidebarClose')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
});

socket.on('role', ({ isSpy, location }) => {
  const cards = document.getElementById('gameCards');
  cards.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `<strong>${isSpy ? 'Шпион' : location}</strong>`;
  cards.appendChild(card);
  console.log('[DEBUG] My role:', { isSpy, location });
});

socket.on('gameStarted', ({ gameTimer }) => {
  gameStarted = true;
  updateControls();
  document.querySelectorAll('#sidebar input, #sidebar select').forEach(el => el.disabled = true);
  let timeLeft = gameTimer;
  const timerDisplay = document.getElementById('gameTimerDisplay');
  if (gameTimerInterval) clearInterval(gameTimerInterval);
  gameTimerInterval = setInterval(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `Осталось: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    if (timeLeft <= gameTimer * 0.1) timerDisplay.classList.add('warning');
    timeLeft--;
    if (timeLeft < 0) clearInterval(gameTimerInterval);
  }, 1000);
});

socket.on('gameReset', () => {
  gameStarted = false;
  voting = false;
  if (gameTimerInterval) clearInterval(gameTimerInterval);
  document.getElementById('gameCards').innerHTML = '';
  document.getElementById('gameResult').classList.remove('visible');
  document.getElementById('gameTimerDisplay').textContent = '';
  document.getElementById('gameTimerDisplay').classList.remove('warning');
  document.querySelector('.overlay').classList.remove('visible');
  updateControls();
  document.querySelectorAll('#sidebar input, #sidebar select').forEach(el => el.disabled = false);
});

socket.on('votingStarted', () => {
  voting = true;
  socket.emit('requestPlayerList', roomId);
  const startVoteButton = document.getElementById('startVote');
  let timeLeft = 30;
  startVoteButton.classList.add('timer');
  startVoteButton.disabled = true;
  const timer = setInterval(() => {
    timeLeft--;
    startVoteButton.textContent = `Голосование: ${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(timer);
      socket.emit('endVoting', roomId);
    }
  }, 1000);
});

socket.on('voteUpdated', ({ targetId, votes }) => {
  const voteCount = document.querySelector(`span[data-player-id="${targetId}"]`)?.parentElement.querySelector('.vote-count');
  const voteButton = document.querySelector(`span[data-player-id="${targetId}"]`)?.parentElement.querySelector('.vote-button');
  if (voteCount) voteCount.textContent = `${votes}/${document.querySelectorAll('li:not(.out)').length}`;
  if (voteButton) voteButton.classList.add('voted');
});

socket.on('votingEnded', () => {
  voting = false;
  const startVoteButton = document.getElementById('startVote');
  startVoteButton.classList.remove('timer');
  startVoteButton.textContent = 'Начать голосование';
  startVoteButton.disabled = false;
  socket.emit('requestPlayerList', roomId);
  updateControls();
});

socket.on('gameEnded', ({ spies, location }) => {
  if (gameTimerInterval) clearInterval(gameTimerInterval);
  document.getElementById('gameTimerDisplay').textContent = '';
  document.getElementById('gameTimerDisplay').classList.remove('warning');
  const result = document.getElementById('gameResult');
  result.innerHTML = `
    <h3>Победили шпионы!</h3>
    <p>Список шпионов: ${spies.join(', ')}</p>
    <p>Локация: ${location}</p>
    <button id="closeResult" class="button">Закрыть</button>
  `;
  result.classList.add('visible');
  document.querySelector('.overlay').classList.add('visible');
  document.getElementById('closeResult').addEventListener('click', () => {
    result.classList.remove('visible');
    document.querySelector('.overlay').classList.remove('visible');
  });
});

socket.on('spiesLost', ({ location, spies }) => {
  if (gameTimerInterval) clearInterval(gameTimerInterval);
  document.getElementById('gameTimerDisplay').textContent = '';
  document.getElementById('gameTimerDisplay').classList.remove('warning');
  const result = document.getElementById('gameResult');
  result.innerHTML = `
    <h3>Шпионы проиграли!</h3>
    <p>Локация: ${location}</p>
    <p>Шпионы: ${spies.join(', ')}</p>
    <button id="closeResult" class="button">Закрыть</button>
  `;
  result.classList.add('visible');
  document.querySelector('.overlay').classList.add('visible');
  document.getElementById('closeResult').addEventListener('click', () => {
    result.classList.remove('visible');
    document.querySelector('.overlay').classList.remove('visible');
  });
});

socket.on('roomClosed', (reason) => {
  alert(`Комната закрыта: ${reason}`);
  window.location.href = '/';
});

socket.on('playerLeft', () => {
  socket.emit('joinRoom', { roomId, playerId });
});

socket.on('nameChanged', ({ playerId: changedPlayerId, newName }) => {
  const nameSpan = document.querySelector(`span[data-player-id="${changedPlayerId}"]`);
  if (nameSpan) nameSpan.textContent = newName;
});

socket.on('readyUpdated', ({ playerId: updatedPlayerId, isReady }) => {
  const status = document.querySelector(`span[data-player-id="${updatedPlayerId}"]`)?.parentElement.querySelector('.ready-status');
  if (status) status.className = `ready-status ${isReady ? 'ready' : 'not-ready'}`;
  if (updatedPlayerId === playerId) {
    isReady = isReady;
    updateReadyButton();
  }
});

const themeToggle = document.getElementById('themeToggle');
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark-theme');
}
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
});

// Устанавливаем ID комнаты как текст
const roomIdText = document.getElementById('roomIdText');
roomIdText.textContent = roomId;

// Копирование URL комнаты
const copyUrlButton2 = document.getElementById('copyUrlButton2');
const copyUrlMessage2 = document.getElementById('copyUrlMessage2');
copyUrlButton2.addEventListener('click', () => {
  const roomUrl = `${window.location.origin}/room/${roomId}`;
  navigator.clipboard.writeText(roomUrl).then(() => {
    copyUrlMessage2.style.display = 'block';
    setTimeout(() => {
      copyUrlMessage2.style.display = 'none';
    }, 2000);
  });
});
// Параллакс-эффект
const parallax = document.querySelector('.parallax');
if (parallax) {
  // Генерация звёзд для layer-1
  const layer1 = document.querySelector('.layer-1');
  for (let i = 0; i < 100; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    let x = Math.random() * 150;
    let y = Math.random() * 150;
    x += (Math.random() - 0.5) * 30;
    y += (Math.random() - 0.5) * 30;
    star.style.left = `${x}%`;
    star.style.top = `${y}%`;
    layer1.appendChild(star);
  }

  // Генерация частиц для layer-3 с кластеризацией
  const layer3 = document.querySelector('.layer-3');
  const clusters = 3; // Количество кластеров
  const starsPerCluster = 22; // Звёзд в каждом кластере
  const clusterCenters = [];

  // Генерируем центры кластеров
  for (let i = 0; i < clusters; i++) {
    clusterCenters.push({
      x: Math.random() * 150,
      y: Math.random() * 150
    });
  }

  // Размещаем звёзды вокруг центров кластеров
  for (let i = 0; i < clusters; i++) {
    const center = clusterCenters[i];
    for (let j = 0; j < starsPerCluster; j++) {
      const star = document.createElement('div');
      star.className = 'star';
      // Смещение относительно центра кластера
      const offsetX = (Math.random() - 0.5) * 20; // Смещение по X от -10% до +10%
      const offsetY = (Math.random() - 0.5) * 20; // Смещение по Y от -10% до +10%
      const x = center.x + offsetX;
      const y = center.y + offsetY;
      star.style.left = `${x}%`;
      star.style.top = `${y}%`;
      layer3.appendChild(star);
    }
  }

  document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;

    document.querySelector('.layer-1').style.transform = `translate(${x * 10}px, ${y * 10}px)`;
    document.querySelector('.layer-2').style.transform = `translate(${x * 20}px, ${y * 20}px)`;
    document.querySelector('.layer-3').style.transform = `translate(${x * 30}px, ${y * 30}px)`;
    document.querySelector('.layer-4').style.transform = `translate(${x * 40}px, ${y * 40}px)`;
    document.querySelector('.layer-5').style.transform = `translate(${x * 50}px, ${y * 50}px)`;
  });
}
// Динамическая корректировка размера шрифта для кнопок
const buttons = document.querySelectorAll('.button');
buttons.forEach(button => {
  const adjustFontSize = () => {
    let fontSize = 16; // Начальный размер шрифта
    button.style.fontSize = `${fontSize}px`;

    // Уменьшаем шрифт, пока текст не поместится
    while (button.scrollWidth > button.clientWidth && fontSize > 12) {
      fontSize -= 0.5;
      button.style.fontSize = `${fontSize}px`;
    }
  };

  // Вызываем при загрузке и при изменении размера окна
  adjustFontSize();
  window.addEventListener('resize', adjustFontSize);
});
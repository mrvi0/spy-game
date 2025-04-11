const socket = io();
const roomId = window.location.pathname.split('/')[2];
document.getElementById('roomId').textContent = roomId;

let playerId = localStorage.getItem('playerId');
let isCreator = false;
let isReady = false;
let gameStarted = false;
let voting = false;
let gameTimerInterval = null;
let players = [];

if (!playerId) {
  playerId = `guest-${Math.random().toString(36).substr(2, 6)}`;
  localStorage.setItem('playerId', playerId);
}
socket.emit('setPlayerId', playerId);

const selectedAvatar = localStorage.getItem('selectedAvatar') || 'https://dummyimage.com/100x100?text=Default';
socket.emit('joinRoom', { roomId, playerId, avatar: selectedAvatar });
console.log('[DEBUG] Joining room:', { roomId, playerId, avatar: selectedAvatar });

const gameControls = document.getElementById('gameControls');
function updateControls() {
  gameControls.innerHTML = '';
  if (isCreator) {
    let buttonsHtml = '';
    if (!gameStarted || voting) {
      buttonsHtml += `<button id="startGame" class="button">Начать игру</button>`;
    } else {
      buttonsHtml += `<button id="resetGame" class="button">Сбросить игру</button>`;
      if (!voting) {
        buttonsHtml = `<button id="startVote" class="button">Начать голосование</button>` + buttonsHtml;
      }
    }
    buttonsHtml += `<button id="closeRoom" class="button button-danger">Закрыть комнату</button>`;
    gameControls.innerHTML = buttonsHtml;

    document.getElementById('startGame')?.addEventListener('click', () => {
      socket.emit('startGame', roomId);
    });
    document.getElementById('resetGame')?.addEventListener('click', () => {
      socket.emit('resetGame', roomId);
    });
    document.getElementById('startVote')?.addEventListener('click', () => {
      voting = true;
      socket.emit('startVoting', roomId);
      addVoteControls(players);
    });
    document.getElementById('closeRoom')?.addEventListener('click', () => {
      const closeRoomPopup = document.getElementById('closeRoomPopup');
      const closeRoomPopupOverlay = document.getElementById('closeRoomPopupOverlay');
      closeRoomPopup.classList.add('visible');
      closeRoomPopupOverlay.classList.add('visible');
    });
  } else {
    let buttonsHtml = '';
    if (!gameStarted) {
      buttonsHtml += `<button id="readyToggle" class="button button-secondary">${isReady ? 'Готов' : 'Не готов'}</button>`;
    }
    if (gameStarted && !voting) {
      buttonsHtml += `<button id="startVote" class="button">Начать голосование</button>`;
    }
    buttonsHtml += `<button id="leaveRoom" class="button button-danger">Покинуть комнату</button>`;
    gameControls.innerHTML = buttonsHtml;

    document.getElementById('startVote')?.addEventListener('click', () => {
      voting = true;
      socket.emit('startVoting', roomId);
      addVoteControls(players);
    });
    document.getElementById('readyToggle')?.addEventListener('click', () => {
      isReady = !isReady;
      socket.emit('setReady', { roomId, playerId, isReady });
      updateReadyButton();
    });

    document.getElementById('leaveRoom')?.addEventListener('click', () => {
      const leaveRoomPopup = document.getElementById('leaveRoomPopup');
      const leaveRoomPopupOverlay = document.getElementById('leaveRoomPopupOverlay');
      leaveRoomPopup.classList.add('visible');
      leaveRoomPopupOverlay.classList.add('visible');
    });
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

function addVoteControls(players) {
  socket.emit('requestPlayerList', roomId);
}

socket.on('playerList', (playersList, spiesKnown) => {
  players = playersList;
  const playerList = document.getElementById('players');
  playerList.innerHTML = '';
  players.forEach(player => {
    const playerDiv = document.createElement('div');
    playerDiv.className = 'player-item';
    if (player.isOut) playerDiv.classList.add('out');

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    if (player.avatarUrl) {
      avatar.style.backgroundImage = `url(${player.avatarUrl})`;
    }

    const playerInfo = document.createElement('div');
    playerInfo.className = 'player-info';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'player-name';
    nameSpan.textContent = spiesKnown && player.isSpy ? `${player.name} (Шпион)` : player.name;
    nameSpan.dataset.playerId = player.playerId;

    const status = document.createElement('span');
    status.className = 'player-status';
    if (gameStarted) {
      status.textContent = player.isOut ? 'Исключён' : 'В игре';
      status.className += player.isOut ? ' status-excluded' : ' status-in-game';
    } else {
      status.textContent = player.isReady ? 'Готов' : 'Не готов';
      status.className += player.isReady ? ' status-ready' : ' status-not-ready';
    }

    playerInfo.appendChild(nameSpan);
    playerInfo.appendChild(status);
    playerDiv.appendChild(avatar);
    playerDiv.appendChild(playerInfo);

    playerDiv.addEventListener('click', (e) => {
      if (e.target.classList.contains('kick-button')) return;

      const popup = document.getElementById('playerPopup');
      const popupAvatar = document.getElementById('popupAvatar');
      const popupName = document.getElementById('popupName');
      const popupStatus = document.getElementById('popupStatus');
      const popupOverlay = document.getElementById('popupOverlay');

      popupAvatar.src = player.avatarUrl || 'https://dummyimage.com/100x100?text=Default';
      popupName.textContent = player.name;
      popupStatus.textContent = player.isOut ? 'Исключён' : 'В игре';

      popup.classList.add('visible');
      popupOverlay.classList.add('visible');
    });

    playerList.appendChild(playerDiv);

    if (voting && !player.isOut) {
      const voteContainer = document.createElement('div');
      voteContainer.className = 'vote-container';

      const kickButton = document.createElement('button');
      kickButton.className = 'button alert kick-button';
      kickButton.textContent = 'Выгнать';
      kickButton.addEventListener('click', () => {
        socket.emit('vote', { 
          roomId: roomId, 
          targetId: player.playerId, 
          voterId: playerId 
        });
      });

      const voteCounter = document.createElement('span');
      voteCounter.className = 'vote-counter';
      voteCounter.dataset.playerId = player.playerId;
      const activePlayers = players.filter(p => !p.isOut).length;
      voteCounter.textContent = `Голосов: ${player.votes}/${activePlayers}`;

      voteContainer.appendChild(kickButton);
      voteContainer.appendChild(voteCounter);
      playerList.appendChild(voteContainer);
    }

    if (players.indexOf(player) !== players.length - 1) {
      const hr = document.createElement('hr');
      playerList.appendChild(hr);
    }
  });
});

document.getElementById('closePopup')?.addEventListener('click', () => {
  const popup = document.getElementById('playerPopup');
  const popupOverlay = document.getElementById('popupOverlay');
  popup.classList.remove('visible');
  popupOverlay.classList.remove('visible');
});

document.getElementById('popupOverlay')?.addEventListener('click', () => {
  const popup = document.getElementById('playerPopup');
  const popupOverlay = document.getElementById('popupOverlay');
  popup.classList.remove('visible');
  popupOverlay.classList.remove('visible');
});

document.querySelector('.overlay')?.addEventListener('click', () => {
  const overlay = document.querySelector('.overlay');
  const gameResult = document.getElementById('gameResult');
  overlay.classList.remove('visible');
  gameResult.classList.remove('visible');
});

socket.on('roomFull', (reason) => {
  const roomFullPopup = document.getElementById('roomFullPopup');
  const roomFullPopupOverlay = document.getElementById('roomFullPopupOverlay');
  const roomFullMessage = document.getElementById('roomFullMessage');

  roomFullMessage.textContent = reason || 'Комната заполнена!';
  roomFullPopup.classList.add('visible');
  roomFullPopupOverlay.classList.add('visible');
  console.log('[DEBUG] Room full popup opened:', reason);
});

socket.on('isCreator', (creator) => {
  console.log('[DEBUG] Received isCreator event:', { creator, playerId });
  isCreator = creator;
  updateControls();
  if (isCreator) {
    document.getElementById('sidebarToggle').style.display = 'block';
    console.log('[DEBUG] Player is creator, showing sidebar toggle');
  } else {
    document.getElementById('sidebarToggle').style.display = 'none';
    console.log('[DEBUG] Player is not creator, hiding sidebar toggle');
  }
});

socket.on('settingsUpdated', (settings) => {
  document.getElementById('roomName').value = settings.roomName;
  document.getElementById('maxPlayers').value = settings.maxPlayers;
  document.getElementById('spiesCount').value = settings.spiesCount;
  document.getElementById('locationTheme').value = settings.locationTheme;
  document.getElementById('gameTimer').value = settings.gameTimer || 120;
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
    gameTimer: parseInt(document.getElementById('gameTimer').value) || 120,
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
  const card = cards.querySelector('.card');
  card.classList.remove('waiting');
  card.innerHTML = `<strong>${isSpy ? 'Шпион' : location}</strong>`;
});

socket.on('gameStarted', ({ gameTimer }) => {
  gameStarted = true;
  updateControls();
  document.querySelectorAll('#sidebar input, #sidebar select').forEach(el => el.disabled = true);
  let timeLeft = gameTimer || 120;
  const timerDisplay = document.getElementById('gameTimerDisplay');
  if (gameTimerInterval) clearInterval(gameTimerInterval);
  gameTimerInterval = setInterval(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `Осталось: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    if (timeLeft <= timeLeft * 0.1) timerDisplay.classList.add('warning');
    timeLeft--;
    if (timeLeft < 0) clearInterval(gameTimerInterval);
  }, 1000);
  socket.emit('requestPlayerList', roomId);
});

socket.on('gameReset', () => {
  gameStarted = false;
  voting = false;
  if (gameTimerInterval) clearInterval(gameTimerInterval);
  const cards = document.getElementById('gameCards');
  cards.innerHTML = `
    <div class="card waiting">
      <div class="loader"></div>
      <span>Ожидание начала</span>
    </div>
  `;
  document.getElementById('gameResult').classList.remove('visible');
  document.getElementById('gameTimerDisplay').textContent = '';
  document.getElementById('gameTimerDisplay').classList.remove('warning');
  document.querySelector('.overlay').classList.remove('visible');
  updateControls();
  document.querySelectorAll('#sidebar input, #sidebar select').forEach(el => el.disabled = false);
  socket.emit('requestPlayerList', roomId);
});

socket.on('votingStarted', () => {
  voting = true;
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
  socket.emit('requestPlayerList', roomId);
});

socket.on('voteUpdated', ({ targetId, votes, voterId }) => {
  const activePlayers = players.filter(p => !p.isOut).length;
  const voteCounter = document.querySelector(`.vote-counter[data-player-id="${targetId}"]`);
  if (voteCounter) {
    voteCounter.textContent = `Голосов: ${votes}/${activePlayers}`;
  }
  if (voterId === playerId) {
    document.querySelectorAll('.kick-button').forEach(button => {
      button.classList.add('voted');
      button.disabled = true;
    });
  }
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

socket.on('gameEnded', ({ spiesWin, spies, location, players }) => {
  const result = document.getElementById('gameResult');
  let playersListHTML = '<h3>Игроки:</h3><ul>';
  players.forEach(player => {
    const isSpy = player.isSpy ? '<span class="spy-label"> (Шпион)</span>' : '';
    const excludedClass = player.isOut ? ' class="status-excluded"' : '';
    playersListHTML += `<li${excludedClass}>${player.name}${isSpy}</li>`;
  });
  playersListHTML += '</ul>';

  result.innerHTML = `
    <h2>Игра окончена!</h2>
    <p>${spiesWin ? 'Шпионы победили!' : 'Мирные жители победили!'}</p>
    <p>Локация: ${location}</p>
    <p>Шпионы: ${spies.join(', ')}</p>
    ${playersListHTML}
  `;
  result.classList.add('visible');
  document.querySelector('.overlay').classList.add('visible');

  setTimeout(() => {
    socket.emit('resetGame', roomId);
  }, 10000);
});

socket.on('spiesLost', ({ location, spies, players }) => {
  if (gameTimerInterval) clearInterval(gameTimerInterval);
  document.getElementById('gameTimerDisplay').textContent = '';
  document.getElementById('gameTimerDisplay').classList.remove('warning');
  const result = document.getElementById('gameResult');

  let playersListHTML = '<h3>Игроки:</h3><ul>';
  players.forEach(player => {
    const isSpy = player.isSpy ? '<span class="spy-label"> (Шпион)</span>' : '';
    const excludedClass = player.isOut ? ' class="status-excluded"' : '';
    playersListHTML += `<li${excludedClass}>${player.name}${isSpy}</li>`;
  });
  playersListHTML += '</ul>';

  result.innerHTML = `
    <h3>Шпионы проиграли!</h3>
    <p>Локация: ${location}</p>
    <p>Шпионы: ${spies.join(', ')}</p>
    ${playersListHTML}
    <button id="closeResult" class="button">Закрыть</button>
  `;
  result.classList.add('visible');
  document.querySelector('.overlay').classList.add('visible');
  document.getElementById('closeResult').addEventListener('click', () => {
    result.classList.remove('visible');
    document.querySelector('.overlay').classList.remove('visible');
  });

  setTimeout(() => {
    socket.emit('resetGame', roomId);
  }, 10000);
});

socket.on('roomClosed', (reason) => {
  const roomClosedPopup = document.getElementById('roomClosedPopup');
  const roomClosedPopupOverlay = document.getElementById('roomClosedPopupOverlay');
  roomClosedPopup.classList.add('visible');
  roomClosedPopupOverlay.classList.add('visible');
});

socket.on('nameChanged', ({ playerId: changedPlayerId, newName }) => {
  const nameSpan = document.querySelector(`span[data-player-id="${changedPlayerId}"]`);
  if (nameSpan) nameSpan.textContent = newName;
});

socket.on('readyUpdated', ({ playerId: updatedPlayerId, isReady: updatedIsReady }) => {
  const status = document.querySelector(`span[data-player-id="${updatedPlayerId}"]`)?.parentElement.querySelector('.player-status');
  if (status && !gameStarted) {
    status.textContent = updatedIsReady ? 'Готов' : 'Не готов';
    status.className = `player-status ${updatedIsReady ? 'status-ready' : 'status-not-ready'}`;
  }
  if (updatedPlayerId === playerId) {
    isReady = updatedIsReady;
    updateReadyButton();
  }
});

// Обработчики для попапа "Покинуть комнату"
document.getElementById('confirmLeave')?.addEventListener('click', () => {
  const leaveRoomPopup = document.getElementById('leaveRoomPopup');
  const leaveRoomPopupOverlay = document.getElementById('leaveRoomPopupOverlay');
  leaveRoomPopup.classList.remove('visible');
  leaveRoomPopupOverlay.classList.remove('visible');
  socket.emit('leaveRoom', { roomId, playerId });
  window.location.href = window.BASE_PATH;
});

document.getElementById('cancelLeave')?.addEventListener('click', () => {
  const leaveRoomPopup = document.getElementById('leaveRoomPopup');
  const leaveRoomPopupOverlay = document.getElementById('leaveRoomPopupOverlay');
  leaveRoomPopup.classList.remove('visible');
  leaveRoomPopupOverlay.classList.remove('visible');
});

document.getElementById('leaveRoomPopupOverlay')?.addEventListener('click', () => {
  const leaveRoomPopup = document.getElementById('leaveRoomPopup');
  const leaveRoomPopupOverlay = document.getElementById('leaveRoomPopupOverlay');
  leaveRoomPopup.classList.remove('visible');
  leaveRoomPopupOverlay.classList.remove('visible');
});

// Обработчики для попапа закрытия комнаты
document.getElementById('confirmCloseRoom')?.addEventListener('click', () => {
  const closeRoomPopup = document.getElementById('closeRoomPopup');
  const closeRoomPopupOverlay = document.getElementById('closeRoomPopupOverlay');
  closeRoomPopup.classList.remove('visible');
  closeRoomPopupOverlay.classList.remove('visible');
  socket.emit('closeRoom', roomId);
});

document.getElementById('cancelCloseRoom')?.addEventListener('click', () => {
  const closeRoomPopup = document.getElementById('closeRoomPopup');
  const closeRoomPopupOverlay = document.getElementById('closeRoomPopupOverlay');
  closeRoomPopup.classList.remove('visible');
  closeRoomPopupOverlay.classList.remove('visible');
});

document.getElementById('closeRoomPopupOverlay')?.addEventListener('click', () => {
  const closeRoomPopup = document.getElementById('closeRoomPopup');
  const closeRoomPopupOverlay = document.getElementById('closeRoomPopupOverlay');
  closeRoomPopup.classList.remove('visible');
  closeRoomPopupOverlay.classList.remove('visible');
});

// Обработчик для попапа "Комната расформирована"
document.getElementById('closeRoomClosedPopup')?.addEventListener('click', () => {
  const roomClosedPopup = document.getElementById('roomClosedPopup');
  const roomClosedPopupOverlay = document.getElementById('roomClosedPopupOverlay');
  roomClosedPopup.classList.remove('visible');
  roomClosedPopupOverlay.classList.remove('visible');
  window.location.href = window.BASE_PATH;
});

const themeToggle = document.getElementById('themeToggle');
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark-theme');
}
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
});

const roomIdText = document.getElementById('roomIdText');
roomIdText.textContent = roomId;

const copyUrlButton2 = document.getElementById('copyUrlButton2');
const copyUrlMessage2 = document.getElementById('copyUrlMessage2');
copyUrlButton2.addEventListener('click', () => {
  const roomUrl = `${window.location.origin}${window.BASE_PATH}/room/${roomId}`;
  navigator.clipboard.writeText(roomUrl).then(() => {
    copyUrlMessage2.style.display = 'block';
    setTimeout(() => {
      copyUrlMessage2.style.display = 'none';
    }, 2000);
  });
});

const buttons = document.querySelectorAll('.button:not(#saveSettings)');
buttons.forEach(button => {
  const adjustFontSize = () => {
    let fontSize = 16;
    button.style.fontSize = `${fontSize}px`;

    while (button.scrollWidth > button.clientWidth && fontSize > 12) {
      fontSize -= 0.5;
      button.style.fontSize = `${fontSize}px`;
    }

    const minFontSize = Math.min(...Array.from(buttons).map(b => parseFloat(b.style.fontSize) || 16));
    buttons.forEach(b => b.style.fontSize = `${minFontSize}px`);
  };

  adjustFontSize();
  window.addEventListener('resize', adjustFontSize);
});

document.getElementById('closeRoomFullPopup')?.addEventListener('click', () => {
  const roomFullPopup = document.getElementById('roomFullPopup');
  const roomFullPopupOverlay = document.getElementById('roomFullPopupOverlay');
  roomFullPopup.classList.remove('visible');
  roomFullPopupOverlay.classList.remove('visible');
  window.location.href = window.BASE_PATH;
});
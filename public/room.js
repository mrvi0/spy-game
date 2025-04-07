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
console.log('[DEBUG] Selected avatar from localStorage:', selectedAvatar);
socket.emit('joinRoom', { roomId, playerId, avatar: selectedAvatar });
console.log('[DEBUG] Joining room:', roomId, 'with playerId:', playerId, 'avatar:', selectedAvatar);

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
      console.log('[DEBUG] Start game clicked for room:', roomId);
    });
    document.getElementById('resetGame')?.addEventListener('click', () => {
      socket.emit('resetGame', roomId);
      console.log('[DEBUG] Reset game clicked for room:', roomId);
    });
    document.getElementById('startVote')?.addEventListener('click', () => {
      voting = true;
      socket.emit('startVoting', roomId);
      addVoteControls(players);
      console.log('[DEBUG] Start voting clicked for room:', roomId);
    });
    document.getElementById('closeRoom')?.addEventListener('click', () => {
      const closeRoomPopup = document.getElementById('closeRoomPopup');
      const closeRoomPopupOverlay = document.getElementById('closeRoomPopupOverlay');
      
      closeRoomPopup.classList.add('visible');
      closeRoomPopupOverlay.classList.add('visible');
      console.log('[DEBUG] Close room popup opened');
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
      console.log('[DEBUG] Start voting clicked for room:', roomId);
    });
    document.getElementById('readyToggle')?.addEventListener('click', () => {
      isReady = !isReady;
      socket.emit('setReady', { roomId, playerId, isReady });
      console.log('[DEBUG] Ready toggle clicked:', { roomId, playerId, isReady });
      updateReadyButton();
    });

    document.getElementById('leaveRoom')?.addEventListener('click', () => {
      const leaveRoomPopup = document.getElementById('leaveRoomPopup');
      const leaveRoomPopupOverlay = document.getElementById('leaveRoomPopupOverlay');
      
      leaveRoomPopup.classList.add('visible');
      leaveRoomPopupOverlay.classList.add('visible');
      console.log('[DEBUG] Leave room popup opened');
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
    console.log(`[DEBUG] Player ${player.name} avatarUrl: ${player.avatarUrl}`);
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
      console.log('[DEBUG] Player popup opened:', { name: player.name, status: player.isOut ? 'Исключён' : 'В игре' });
    });

    playerList.appendChild(playerDiv);

    if (voting && !player.isOut) {
      console.log(`[DEBUG] Adding vote controls for player ${player.name} (playerId: ${player.playerId})`);
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
        console.log('[DEBUG] Voted to kick player:', { roomId, targetId: player.playerId, voterId: playerId });
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
  console.log('[DEBUG] Player list updated:', players);
});

document.getElementById('closePopup')?.addEventListener('click', () => {
  const popup = document.getElementById('playerPopup');
  const popupOverlay = document.getElementById('popupOverlay');
  popup.classList.remove('visible');
  popupOverlay.classList.remove('visible');
  console.log('[DEBUG] Player popup closed');
});

document.getElementById('popupOverlay')?.addEventListener('click', () => {
  const popup = document.getElementById('playerPopup');
  const popupOverlay = document.getElementById('popupOverlay');
  popup.classList.remove('visible');
  popupOverlay.classList.remove('visible');
  console.log('[DEBUG] Player popup closed by clicking overlay');
});

document.querySelector('.overlay')?.addEventListener('click', () => {
  const overlay = document.querySelector('.overlay');
  const gameResult = document.getElementById('gameResult');
  overlay.classList.remove('visible');
  gameResult.classList.remove('visible');
  console.log('[DEBUG] Overlay clicked, hiding overlay and gameResult');
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
  console.log('[DEBUG] Received isCreator event:', creator);
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
  console.log('[DEBUG] Settings updated:', settings);
});

document.getElementById('saveSettings')?.addEventListener('click', () => {
  const maxPlayersInput = document.getElementById('maxPlayers');
  const maxPlayers = parseInt(maxPlayersInput.value);
  if (maxPlayers > 15) {
    maxPlayersInput.classList.add('invalid');
    console.log('[DEBUG] Invalid max players:', maxPlayers);
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
  console.log('[DEBUG] Settings saved:', settings);
});

document.getElementById('sidebarToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.add('open');
  console.log('[DEBUG] Sidebar opened');
});

document.getElementById('sidebarClose')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
  console.log('[DEBUG] Sidebar closed');
});

socket.on('role', ({ isSpy, location }) => {
  const cards = document.getElementById('gameCards');
  const card = cards.querySelector('.card');
  card.classList.remove('waiting');
  card.innerHTML = `<strong>${isSpy ? 'Шпион' : location}</strong>`;
  console.log('[DEBUG] My role:', { isSpy, location });
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
  console.log('[DEBUG] Game started with timer:', gameTimer || 120);
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
  console.log('[DEBUG] Game reset');
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
  console.log('[DEBUG] Voting started');
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
  console.log('[DEBUG] Vote updated:', { targetId, votes, voterId });
});

socket.on('votingEnded', () => {
  voting = false;
  const startVoteButton = document.getElementById('startVote');
  startVoteButton.classList.remove('timer');
  startVoteButton.textContent = 'Начать голосование';
  startVoteButton.disabled = false;
  socket.emit('requestPlayerList', roomId);
  updateControls();
  console.log('[DEBUG] Voting ended');
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
  console.log('[DEBUG] Game ended:', { spiesWin, spies, location, players });

  setTimeout(() => {
    socket.emit('resetGame', roomId);
    console.log('[DEBUG] Auto-reset game after 10 seconds');
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
    console.log('[DEBUG] Spies lost result closed');
  });
  console.log('[DEBUG] Spies lost:', { location, spies, players });

  setTimeout(() => {
    socket.emit('resetGame', roomId);
    console.log('[DEBUG] Auto-reset game after 10 seconds');
  }, 10000);
});

socket.on('roomClosed', (reason) => {
  const roomClosedPopup = document.getElementById('roomClosedPopup');
  const roomClosedPopupOverlay = document.getElementById('roomClosedPopupOverlay');
  
  roomClosedPopup.classList.add('visible');
  roomClosedPopupOverlay.classList.add('visible');
  console.log('[DEBUG] Room closed popup opened:', reason);
});

socket.on('nameChanged', ({ playerId: changedPlayerId, newName }) => {
  const nameSpan = document.querySelector(`span[data-player-id="${changedPlayerId}"]`);
  if (nameSpan) nameSpan.textContent = newName;
  console.log('[DEBUG] Name changed:', { playerId: changedPlayerId, newName });
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
  console.log('[DEBUG] Ready status updated:', { playerId: updatedPlayerId, isReady: updatedIsReady });
});

// Обработчики для попапа "Покинуть комнату"
document.getElementById('confirmLeave')?.addEventListener('click', () => {
  const leaveRoomPopup = document.getElementById('leaveRoomPopup');
  const leaveRoomPopupOverlay = document.getElementById('leaveRoomPopupOverlay');
  
  leaveRoomPopup.classList.remove('visible');
  leaveRoomPopupOverlay.classList.remove('visible');
  
  socket.emit('leaveRoom', { roomId, playerId });
  console.log('[DEBUG] Confirmed leaving room:', { roomId, playerId });
  window.location.href = '/';
});

document.getElementById('cancelLeave')?.addEventListener('click', () => {
  const leaveRoomPopup = document.getElementById('leaveRoomPopup');
  const leaveRoomPopupOverlay = document.getElementById('leaveRoomPopupOverlay');
  
  leaveRoomPopup.classList.remove('visible');
  leaveRoomPopupOverlay.classList.remove('visible');
  console.log('[DEBUG] Canceled leaving room');
});

document.getElementById('leaveRoomPopupOverlay')?.addEventListener('click', () => {
  const leaveRoomPopup = document.getElementById('leaveRoomPopup');
  const leaveRoomPopupOverlay = document.getElementById('leaveRoomPopupOverlay');
  
  leaveRoomPopup.classList.remove('visible');
  leaveRoomPopupOverlay.classList.remove('visible');
  console.log('[DEBUG] Leave room popup closed by clicking overlay');
});

// Обработчики для попапа закрытия комнаты
document.getElementById('confirmCloseRoom')?.addEventListener('click', () => {
  const closeRoomPopup = document.getElementById('closeRoomPopup');
  const closeRoomPopupOverlay = document.getElementById('closeRoomPopupOverlay');
  
  closeRoomPopup.classList.remove('visible');
  closeRoomPopupOverlay.classList.remove('visible');
  
  socket.emit('closeRoom', roomId);
  console.log('[DEBUG] Confirmed closing room:', roomId);
});

document.getElementById('cancelCloseRoom')?.addEventListener('click', () => {
  const closeRoomPopup = document.getElementById('closeRoomPopup');
  const closeRoomPopupOverlay = document.getElementById('closeRoomPopupOverlay');
  
  closeRoomPopup.classList.remove('visible');
  closeRoomPopupOverlay.classList.remove('visible');
  console.log('[DEBUG] Canceled closing room');
});

document.getElementById('closeRoomPopupOverlay')?.addEventListener('click', () => {
  const closeRoomPopup = document.getElementById('closeRoomPopup');
  const closeRoomPopupOverlay = document.getElementById('closeRoomPopupOverlay');
  
  closeRoomPopup.classList.remove('visible');
  closeRoomPopupOverlay.classList.remove('visible');
  console.log('[DEBUG] Close room popup closed by clicking overlay');
});

// Обработчик для попапа "Комната расформирована"
document.getElementById('closeRoomClosedPopup')?.addEventListener('click', () => {
  const roomClosedPopup = document.getElementById('roomClosedPopup');
  const roomClosedPopupOverlay = document.getElementById('roomClosedPopupOverlay');
  
  roomClosedPopup.classList.remove('visible');
  roomClosedPopupOverlay.classList.remove('visible');
  console.log('[DEBUG] Room closed popup closed');
  
  window.location.href = '/';
});

const themeToggle = document.getElementById('themeToggle');
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark-theme');
}
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
  localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
  console.log('[DEBUG] Theme toggled:', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
});

const roomIdText = document.getElementById('roomIdText');
roomIdText.textContent = roomId;

const copyUrlButton2 = document.getElementById('copyUrlButton2');
const copyUrlMessage2 = document.getElementById('copyUrlMessage2');
copyUrlButton2.addEventListener('click', () => {
  const roomUrl = `${window.location.origin}/room/${roomId}`;
  navigator.clipboard.writeText(roomUrl).then(() => {
    copyUrlMessage2.style.display = 'block';
    setTimeout(() => {
      copyUrlMessage2.style.display = 'none';
    }, 2000);
    console.log('[DEBUG] Room URL copied:', roomUrl);
  });
});

const parallax = document.querySelector('.parallax');
if (parallax) {
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

  const layer3 = document.querySelector('.layer-3');
  const clusters = 3;
  const starsPerCluster = 22;
  const clusterCenters = [];

  for (let i = 0; i < clusters; i++) {
    clusterCenters.push({
      x: Math.random() * 150,
      y: Math.random() * 150
    });
  }

  for (let i = 0; i < clusters; i++) {
    const center = clusterCenters[i];
    for (let j = 0; j < starsPerCluster; j++) {
      const star = document.createElement('div');
      star.className = 'star';
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 20;
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
  console.log('[DEBUG] Room full popup closed');
  
  window.location.href = '/';
});
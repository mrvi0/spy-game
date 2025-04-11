const socket = io();

socket.on('connect', () => {
  console.log('[CLIENT] Connected to server with socket ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('[CLIENT] Connection error:', error.message);
});

socket.on('disconnect', () => {
  console.log('[CLIENT] Disconnected from server');
});

const connectButton = document.getElementById('connectButton');
const createRoomButton = document.getElementById('createRoom');
const nicknameInput = document.getElementById('nickname');
const avatarImage = document.querySelector('.avatar-image');

fetch('/user')
  .then(response => response.json())
  .then(user => {
    if (user) {
      console.log('[DEBUG] User fetched:', user);
      displayUser(user);
    }
  })
  .catch(err => {
    console.error('[ERROR] Failed to fetch user:', err);
  });

function displayUser(user) {
  let nickname = user.displayName || user.username || 'User';
  if (user.provider === 'google') {
    nickname = user.displayName;
    if (user.photos && user.photos.length > 0) {
      avatarImage.src = user.photos[0].value;
    }
  } else if (user.provider === 'yandex') {
    const firstName = user._json.first_name || 'Неизвестно';
    const lastName = user._json.last_name || '';
    nickname = `${firstName} ${lastName}`.trim();
    if (user._json.default_avatar_id) {
      avatarImage.src = `https://avatars.yandex.net/get-yapic/${user._json.default_avatar_id}/islands-200`;
    }
  }
  nicknameInput.value = nickname;
  const logoutButton = document.createElement('button');
  logoutButton.textContent = 'Log Out';
  logoutButton.className = 'button button-danger';
  logoutButton.addEventListener('click', () => {
    window.location.href = '/logout';
  });
  document.querySelector('.login-section').appendChild(logoutButton);
  document.querySelector('.login-button-container').innerHTML = '';
}

document.querySelectorAll('.social-button.google').forEach(button => {
  button.addEventListener('click', () => {
    window.location.href = '/auth/google';
  });
});
document.querySelectorAll('.social-button.vk').forEach(button => {
  button.addEventListener('click', () => {
    window.location.href = '/auth/vk';
  });
});
document.querySelectorAll('.social-button.yandex').forEach(button => {
  button.addEventListener('click', () => {
    window.location.href = '/auth/yandex';
  });
});

createRoomButton.addEventListener('click', () => {
  const nickname = nicknameInput.value.trim();
  const selectedAvatar = localStorage.getItem('selectedAvatar') || 'https://dummyimage.com/100x100?text=Default';
  let playerId = localStorage.getItem('playerId');
  if (!playerId) {
    playerId = `player-${Math.random().toString(36).substr(2, 6)}`;
    localStorage.setItem('playerId', playerId);
  }
  if (nickname) {
    console.log('[DEBUG] Create Room clicked with:', { nickname, playerId, avatar: selectedAvatar });
    socket.emit('createRoom', { maxPlayers: 10, spiesCount: 2, nickname, avatar: selectedAvatar, playerId }, (response) => {
      const { roomId } = response;
      window.location.href = `/room/${roomId}`;
    });
  } else {
    alert('Please enter a nickname');
  }
});

  // Обработчик кнопки "Create Room"
  createRoomButton.addEventListener('click', () => {
    const nickname = nicknameInput.value.trim();
    const selectedAvatar = localStorage.getItem('selectedAvatar') || 'https://dummyimage.com/100x100?text=Default';
    let playerId = localStorage.getItem('playerId');
    if (!playerId) {
      playerId = `player-${Math.random().toString(36).substr(2, 6)}`;
      localStorage.setItem('playerId', playerId);
    }
    if (nickname) {
      console.log('[DEBUG] Emitting createRoom with:', { maxPlayers: 10, spiesCount: 2, nickname, avatar: selectedAvatar, playerId });
      socket.emit('createRoom', { maxPlayers: 10, spiesCount: 2, nickname, avatar: selectedAvatar, playerId }, (response) => {
        console.log('[DEBUG] createRoom response:', response);
        const { roomId } = response;
        window.location.href = `/room/${roomId}`;
      });
    } else {
      alert('Please enter a nickname');
    }
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
    const clusters = 7; // Количество кластеров
    const starsPerCluster = 15; // Звёзд в каждом кластере
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

      // Убедимся, что шрифт одинаков для всех кнопок с классом .button
      const minFontSize = Math.min(...Array.from(buttons).map(b => parseFloat(b.style.fontSize) || 16));
      buttons.forEach(b => b.style.fontSize = `${minFontSize}px`);
    };

    adjustFontSize();
    window.addEventListener('resize', adjustFontSize);
  });

  // Код для выбора аватара
  const avatarWrapper = document.querySelector('.avatar-wrapper');
  const avatarModal = document.querySelector('#avatarModal');
  const avatarList = document.querySelector('#avatarList');
  const closeAvatarModal = document.querySelector('#closeAvatarModal');

  if (avatarWrapper && avatarModal && avatarList && closeAvatarModal && avatarImage) {
    // Скрываем модальное окно при загрузке
    avatarModal.classList.remove('active');

    // Определяем массив аватаров
    const avatars = [
      'https://dummyimage.com/100x100?text=Avatar1',
      'https://dummyimage.com/100x100?text=Avatar2',
      'https://dummyimage.com/100x100?text=Avatar3',
      'https://dummyimage.com/100x100?text=Avatar4',
      'https://dummyimage.com/100x100?text=Avatar5',
      'https://dummyimage.com/100x100?text=Avatar6',
      'https://dummyimage.com/100x100?text=Avatar7',
      'https://dummyimage.com/100x100?text=Avatar8',
      'https://dummyimage.com/100x100?text=Avatar9',
      'https://dummyimage.com/100x100?text=Avatar10',
      'https://dummyimage.com/100x100?text=Avatar11',
      'https://dummyimage.com/100x100?text=Avatar12',
      'https://dummyimage.com/100x100?text=Avatar13',
      'https://dummyimage.com/100x100?text=Avatar14',
      'https://dummyimage.com/100x100?text=Avatar15',
      'https://dummyimage.com/100x100?text=Avatar16',
      'https://dummyimage.com/100x100?text=Avatar17',
      'https://dummyimage.com/100x100?text=Avatar18',
      'https://dummyimage.com/100x100?text=Avatar1',
      'https://dummyimage.com/100x100?text=Avatar2',
      'https://dummyimage.com/100x100?text=Avatar3',
      'https://dummyimage.com/100x100?text=Avatar4',
      'https://dummyimage.com/100x100?text=Avatar5',
      'https://dummyimage.com/100x100?text=Avatar6',
      'https://dummyimage.com/100x100?text=Avatar7',
      'https://dummyimage.com/100x100?text=Avatar8',
      'https://dummyimage.com/100x100?text=Avatar9',
      'https://dummyimage.com/100x100?text=Avatar10',
      'https://dummyimage.com/100x100?text=Avatar11',
      'https://dummyimage.com/100x100?text=Avatar12',
      'https://dummyimage.com/100x100?text=Avatar13',
      'https://dummyimage.com/100x100?text=Avatar14',
      'https://dummyimage.com/100x100?text=Avatar15',
      'https://dummyimage.com/100x100?text=Avatar16',
      'https://dummyimage.com/100x100?text=Avatar17',
      'https://dummyimage.com/100x100?text=Avatar18',
    ];

    // Внутри обработчика выбора аватара
    avatarList.innerHTML = '';
    avatars.forEach(avatar => {
      const img = document.createElement('img');
      img.src = avatar;
      img.alt = 'Avatar';
      img.addEventListener('click', () => {
        avatarImage.src = avatar;
        localStorage.setItem('selectedAvatar', avatar); // Сохраняем аватар
        avatarModal.classList.remove('active');
        console.log('[DEBUG] Avatar selected and saved to localStorage:', avatar);
      });
      avatarList.appendChild(img);
    });
    
    // При создании комнаты
    createRoomButton.addEventListener('click', () => {
      const nickname = nicknameInput.value.trim();
      const language = languageSelect ? languageSelect.value : 'en';
      const selectedAvatar = localStorage.getItem('selectedAvatar') || 'https://dummyimage.com/100x100?text=Default';
      console.log('[DEBUG] Selected avatar from localStorage:', selectedAvatar); // Проверяем, что аватар берётся из localStorage
      if (nickname) {
        console.log('[DEBUG] Create Room clicked with nickname:', nickname, 'language:', language, 'avatar:', selectedAvatar);
        socket.emit('createRoom', { maxPlayers: 10, spiesCount: 2, nickname, avatar: selectedAvatar }, (response) => {
          const { roomId, creatorPlayerId } = response;
          console.log('[DEBUG] Room created:', roomId, 'Creator Player ID:', creatorPlayerId);
          localStorage.setItem('playerId', creatorPlayerId);
          window.location.href = `/room/${roomId}`; // Используем BASE_PATH для редиректа
        });
      } else {
        alert('Please enter a nickname');
        console.log('[DEBUG] Create Room failed: No nickname provided');
      }
    });

    // При подключении к комнате
    connectButton.addEventListener('click', () => {
      const nickname = nicknameInput.value.trim();
      const language = languageSelect ? languageSelect.value : 'en';
      const selectedAvatar = localStorage.getItem('selectedAvatar') || 'https://dummyimage.com/100x100?text=Default';
      console.log('[DEBUG] Selected avatar from localStorage:', selectedAvatar); // Проверяем, что аватар берётся из localStorage
      if (nickname) {
        console.log('[DEBUG] Connect clicked with nickname:', nickname, 'language:', language, 'avatar:', selectedAvatar);
        socket.emit('joinRoom', { roomId: 'defaultRoom', playerId: localStorage.getItem('playerId'), avatar: selectedAvatar });
      } else {
        alert('Please enter a nickname');
        console.log('[DEBUG] Connect failed: No nickname provided');
      }
    });

    // Открываем модальное окно
    avatarWrapper.addEventListener('click', () => {
      avatarModal.classList.add('active');
      console.log('[DEBUG] Avatar modal opened');
    });

    // Закрываем модальное окно
    closeAvatarModal.addEventListener('click', () => {
      avatarModal.classList.remove('active');
      console.log('[DEBUG] Avatar modal closed');
    });

    // Закрытие при клике вне окна
    avatarModal.addEventListener('click', (e) => {
      if (e.target === avatarModal) {
        avatarModal.classList.remove('active');
        console.log('[DEBUG] Avatar modal closed by clicking outside');
      }
    });
  } else {
    console.warn('[WARN] Some avatar selection elements are missing');
  }

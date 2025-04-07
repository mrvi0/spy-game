document.addEventListener('DOMContentLoaded', () => {
  const socket = io();

  const connectButton = document.getElementById('connectButton');
  const createRoomButton = document.getElementById('createRoom');
  const nicknameInput = document.getElementById('nickname');
  const languageSelect = document.getElementById('language');
  // Исправляем селектор: вместо .avatar-icon используем .avatar-image
  const avatarImage = document.querySelector('.avatar-image');

  // Кнопки авторизации
  const googleButtons = document.querySelectorAll('.social-button.google');
  const vkButtons = document.querySelectorAll('.social-button.vk');
  const yandexButtons = document.querySelectorAll('.social-button.yandex');

  // Проверка авторизации при загрузке страницы
  fetch('/user')
    .then(response => response.json())
    .then(user => {
      if (user) {
        console.log('[DEBUG] User fetched:', user); // Дебаг: данные пользователя
        displayUser(user);
      } else {
        console.log('[DEBUG] No user logged in');
      }
    })
    .catch(err => {
      console.error('[ERROR] Failed to fetch user:', err);
    });

  // Обработчики для кнопок авторизации
  googleButtons.forEach(button => {
    button.addEventListener('click', () => {
      console.log('[DEBUG] Google login clicked');
      window.location.href = '/auth/google';
    });
  });

  vkButtons.forEach(button => {
    button.addEventListener('click', () => {
      console.log('[DEBUG] VK login clicked');
      window.location.href = '/auth/vk';
    });
  });

  yandexButtons.forEach(button => {
    button.addEventListener('click', () => {
      console.log('[DEBUG] Yandex login clicked');
      window.location.href = '/auth/yandex';
    });
  });

  // Функция отображения данных пользователя
  function displayUser(user) {
    let nickname = user.displayName || user.username || 'User';
    if (user.provider === 'google') {
      nickname = user.displayName; // Google уже возвращает полное имя
      if (user.photos && user.photos.length > 0) {
        if (avatarImage) {
          avatarImage.src = user.photos[0].value;
          console.log('[DEBUG] Google avatar set:', user.photos[0].value);
        } else {
          console.warn('[WARN] Avatar image element not found');
        }
      }
    } else if (user.provider === 'yandex') {
      // Yandex возвращает first_name и last_name в _json
      const firstName = user._json.first_name || 'Неизвестно';
      const lastName = user._json.last_name || '';
      nickname = `${firstName} ${lastName}`.trim();
      if (user._json.default_avatar_id) {
        if (avatarImage) {
          avatarImage.src = `https://avatars.yandex.net/get-yapic/${user._json.default_avatar_id}/islands-200`;
          console.log('[DEBUG] Yandex avatar set:', `https://avatars.yandex.net/get-yapic/${user._json.default_avatar_id}/islands-200`);
        } else {
          console.warn('[WARN] Avatar image element not found');
        }
      }
    }
    if (nicknameInput) {
      nicknameInput.value = nickname;
      console.log('[DEBUG] Nickname set:', nickname);
    } else {
      console.warn('[WARN] Nickname input not found');
    }

    // Добавим кнопку выхода
    const logoutButton = document.createElement('button');
    logoutButton.textContent = 'Log Out';
    logoutButton.className = 'button button-danger';
    logoutButton.addEventListener('click', () => {
      console.log('[DEBUG] Logout clicked');
      window.location.href = '/logout';
    });
    const loginSection = document.querySelector('.login-section');
    if (loginSection) {
      loginSection.appendChild(logoutButton);
    } else {
      console.warn('[WARN] Login section not found');
    }
    const loginButtonContainer = document.querySelector('.login-button-container');
    if (loginButtonContainer) {
      loginButtonContainer.innerHTML = '';
    } else {
      console.warn('[WARN] Login button container not found');
    }
  }

  // Обработчик кнопки "Connect"
  connectButton.addEventListener('click', () => {
    const nickname = nicknameInput.value.trim();
    const language = languageSelect ? languageSelect.value : 'en'; // Проверка на наличие languageSelect
    if (nickname) {
      console.log('[DEBUG] Connect clicked with nickname:', nickname, 'language:', language);
      socket.emit('joinRoom', 'defaultRoom', nickname);
    } else {
      alert('Please enter a nickname');
      console.log('[DEBUG] Connect failed: No nickname provided');
    }
  });

  // Обработчик кнопки "Create Room"
  createRoomButton.addEventListener('click', () => {
    const nickname = nicknameInput.value.trim();
    const language = languageSelect ? languageSelect.value : 'en'; // Проверка на наличие languageSelect
    if (nickname) {
      console.log('[DEBUG] Create Room clicked with nickname:', nickname, 'language:', language);
      socket.emit('createRoom', { maxPlayers: 10, spiesCount: 2, nickname }, (response) => {
        const { roomId, creatorPlayerId } = response;
        console.log('[DEBUG] Room created:', roomId, 'Creator Player ID:', creatorPlayerId);
        localStorage.setItem('playerId', creatorPlayerId);
        window.location.href = `/room/${roomId}`; // Редирект в комнату
      });
    } else {
      alert('Please enter a nickname');
      console.log('[DEBUG] Create Room failed: No nickname provided');
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

    // Добавляем аватары в список
    avatarList.innerHTML = '';
    avatars.forEach(avatar => {
      const img = document.createElement('img');
      img.src = avatar;
      img.alt = 'Avatar';
      img.addEventListener('click', () => {
        avatarImage.src = avatar;
        avatarModal.classList.remove('active');
        console.log('[DEBUG] Avatar selected:', avatar);
      });
      avatarList.appendChild(img);
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
});
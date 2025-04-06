document.addEventListener('DOMContentLoaded', () => {
  const socket = io();

  const connectButton = document.getElementById('connectButton');
  const createRoomButton = document.getElementById('createRoom');
  const nicknameInput = document.getElementById('nickname');
  const languageSelect = document.getElementById('language');
  const avatarIcon = document.querySelector('.avatar-icon');

  // Кнопки авторизации
  const googleButtons = document.querySelectorAll('.social-button.google');
  const vkButtons = document.querySelectorAll('.social-button.vk');
  const yandexButtons = document.querySelectorAll('.social-button.yandex');

  // Проверка авторизации при загрузке страницы
  fetch('/user')
    .then(response => response.json())
    .then(user => {
      if (user) {
        displayUser(user);
      }
    });

  // Обработчики для кнопок авторизации
  googleButtons.forEach(button => {
    button.addEventListener('click', () => {
      window.location.href = '/auth/google';
    });
  });

  vkButtons.forEach(button => {
    button.addEventListener('click', () => {
      window.location.href = '/auth/vk';
    });
  });

  yandexButtons.forEach(button => {
    button.addEventListener('click', () => {
      window.location.href = '/auth/yandex';
    });
  });

  // Функция отображения данных пользователя
  function displayUser(user) {
    let nickname = user.displayName || user.username || 'User';
    if (user.provider === 'google') {
      nickname = user.displayName; // Google уже возвращает полное имя
      if (user.photos && user.photos.length > 0) {
        avatarIcon.style.backgroundImage = `url(${user.photos[0].value})`;
        avatarIcon.style.backgroundSize = 'cover';
        avatarIcon.textContent = '';
      }
    } else if (user.provider === 'yandex') {
      // Yandex возвращает first_name и last_name в _json
      const firstName = user._json.first_name || 'Неизвестно';
      const lastName = user._json.last_name || '';
      nickname = `${firstName} ${lastName}`.trim();
      if (user._json.default_avatar_id) {
        avatarIcon.style.backgroundImage = `url(https://avatars.yandex.net/get-yapic/${user._json.default_avatar_id}/islands-200)`;
        avatarIcon.style.backgroundSize = 'cover';
        avatarIcon.textContent = '';
      }
    }
    nicknameInput.value = nickname;
    // Добавим кнопку выхода
    const logoutButton = document.createElement('button');
    logoutButton.textContent = 'Log Out';
    logoutButton.className = 'button button-danger';
    logoutButton.addEventListener('click', () => {
      window.location.href = '/logout';
    });
    document.querySelector('.login-section').appendChild(logoutButton);
    document.querySelector('.login-button-container').innerHTML = '';
  }

  connectButton.addEventListener('click', () => {
    const nickname = nicknameInput.value.trim();
    const language = languageSelect.value;
    if (nickname) {
      socket.emit('joinRoom', 'defaultRoom', nickname);
    } else {
      alert('Please enter a nickname');
    }
  });

  createRoomButton.addEventListener('click', () => {
    const nickname = nicknameInput.value.trim();
    const language = languageSelect.value;
    if (nickname) {
      socket.emit('createRoom', { maxPlayers: 10, spiesCount: 2, nickname }, (response) => {
        const { roomId, creatorPlayerId } = response;
        localStorage.setItem('playerId', creatorPlayerId);
        window.location.href = `/room/${roomId}`; // Редирект в комнату
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
});
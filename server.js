const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const VKontakteStrategy = require('passport-vkontakte').Strategy;
const YandexStrategy = require('passport-yandex').Strategy;
const session = require('express-session');
const sharedsession = require('express-socket.io-session');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Определяем базовый URL и путь в зависимости от окружения
const isProduction = process.env.NODE_ENV === 'production';
const BASE_URL = isProduction ? 'https://b4dcat.ru' : 'http://localhost:3000';
const BASE_PATH = process.env.BASE_PATH || '/spy'; // Читаем BASE_PATH из .env
console.log(`Running in ${isProduction ? 'production' : 'development'} mode. BASE_URL: ${BASE_URL}, BASE_PATH: ${BASE_PATH}`);

// Логирование запросов для отладки
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Настройка сессий
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
});

app.use(sessionMiddleware);

// Делаем сессию доступной для Socket.IO
io.use(sharedsession(sessionMiddleware, {
  autoSave: true,
}));

// Инициализация Passport
app.use(passport.initialize());
app.use(passport.session());

// Сериализация и десериализация пользователя
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Настройка Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${BASE_URL}/auth/google/callback`,
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

// Настройка VK Strategy
passport.use(new VKontakteStrategy({
  clientID: process.env.VK_CLIENT_ID,
  clientSecret: process.env.VK_CLIENT_SECRET,
  callbackURL: `${BASE_URL}/auth/vk/callback`,
}, (accessToken, refreshToken, params, profile, done) => {
  return done(null, profile);
}));

// Настройка Yandex Strategy
passport.use(new YandexStrategy({
  clientID: process.env.YANDEX_CLIENT_ID,
  clientSecret: process.env.YANDEX_CLIENT_SECRET,
  callbackURL: `${BASE_URL}/auth/yandex/callback`,
}, (accessToken, refreshToken, profile, done) => {
  console.log('Yandex profile:', profile);
  return done(null, profile);
}));

// Маршруты для авторизации (оставляем в корне)
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: `${BASE_PATH}/` }), (req, res) => {
  res.redirect(`${BASE_PATH}/`);
});

app.get('/auth/vk', passport.authenticate('vkontakte'));
app.get('/auth/vk/callback', passport.authenticate('vkontakte', { failureRedirect: `${BASE_PATH}/` }), (req, res) => {
  res.redirect(`${BASE_PATH}/`);
});

app.get('/auth/yandex', passport.authenticate('yandex'));
app.get('/auth/yandex/callback', passport.authenticate('yandex', { failureRedirect: `${BASE_PATH}/` }), (req, res) => {
  res.redirect(`${BASE_PATH}/`);
});

// Маршрут для получения данных пользователя
app.get('/user', (req, res) => {
  if (req.user) {
    res.json(req.user);
  } else {
    res.json(null);
  }
});

// Маршрут для выхода
app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect(`${BASE_PATH}/`);
  });
});

// Маршрут для предоставления BASE_PATH фронтенду
app.get('/config.js', (req, res) => {
  res.set('Content-Type', 'application/javascript');
  res.send(`window.BASE_PATH = "${BASE_PATH}";`);
});

// Настройка статических файлов для пути BASE_PATH
app.use(BASE_PATH, express.static(path.join(__dirname, 'public')));

// Перенаправление BASE_PATH на BASE_PATH/ (добавляем слэш)
app.get(BASE_PATH, (req, res) => {
  res.redirect(301, `${BASE_PATH}/`);
});

// Обработка маршрута BASE_PATH/
app.get(`${BASE_PATH}/`, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обработка маршрута для комнат
app.get(`${BASE_PATH}/room/:id`, (req, res) => {
  const roomId = req.params.id;
  if (!rooms[roomId]) {
    return res.sendFile(path.join(__dirname, 'public', 'roomNotFound.html'));
  }
  res.sendFile(path.join(__dirname, 'public', 'room.html'));
});

// Хранилище комнат
const rooms = {};

// Локации
const locations = {
  default: ['Офис', 'Ресторан', 'Пляж', 'Кинотеатр', 'Парк'],
  fantasy: ['Замок', 'Лес эльфов', 'Пещера дракона', 'Деревня гномов', 'Башня мага'],
  'sci-fi': ['Космический корабль', 'База на Марсе', 'Лаборатория', 'Колония', 'Орбитальная станция'],
};

// Периодическая проверка активности создателя комнаты
setInterval(() => {
  for (const roomId in rooms) {
    const room = rooms[roomId];
    const creatorSocket = io.sockets.sockets.get(room.players.find(p => p.playerId === room.creator)?.id);
    const creatorInRoom = creatorSocket && creatorSocket.rooms.has(roomId);
    if (!creatorInRoom) {
      room.lastCreatorCheck = room.lastCreatorCheck || Date.now();
      if (Date.now() - room.lastCreatorCheck >= 5 * 60 * 1000) {
        io.to(roomId).emit('roomClosed', 'Создатель покинул комнату более 5 минут назад');
        delete rooms[roomId];
        console.log(`Комната ${roomId} закрыта из-за отсутствия создателя`);
      }
    } else {
      room.lastCreatorCheck = Date.now();
    }
  }
}, 60 * 1000);

// Обработка событий Socket.IO
io.on('connection', (socket) => {
  console.log('Игрок подключился:', socket.id);
  socket.on('createRoom', ({ maxPlayers, spiesCount, nickname, avatar, playerId }, callback) => {
    const roomId = Math.random().toString(36).substr(2, 9);
    console.log(`[DEBUG] Created room ${roomId}, creator playerId: ${playerId}`);
    rooms[roomId] = {
      players: [{ id: socket.id, playerId, name: nickname, isReady: false, isCreator: true, isOut: false, votes: 0, isSpy: false, avatarUrl: avatar }],
      roomName: 'Безымянная',
      maxPlayers,
      spiesCount,
      locationTheme: 'default',
      gameTimer: 600,
      spiesKnown: false,
      creator: playerId,
      started: false,
      location: null,
    };
    socket.join(roomId);
    socket.playerId = playerId;
    callback({ roomId });
    console.log('[DEBUG] Rooms after creation:', Object.keys(rooms)); // Добавь этот лог
    io.to(roomId).emit('settingsUpdated', {
      roomName: rooms[roomId].roomName,
      maxPlayers: rooms[roomId].maxPlayers,
      spiesCount: rooms[roomId].spiesCount,
      locationTheme: rooms[roomId].locationTheme,
      gameTimer: rooms[roomId].gameTimer,
      spiesKnown: rooms[roomId].spiesKnown,
    });
  });

  socket.on('joinRoom', ({ roomId, playerId, avatar }) => {
    console.log('[DEBUG] Attempting to join room:', roomId, 'playerId:', playerId, 'Available rooms:', Object.keys(rooms));
    if (rooms[roomId]) {
      console.log('[DEBUG] Room exists. Creator:', rooms[roomId].creator, 'Is creator?', rooms[roomId].creator === playerId);
      const existingPlayer = rooms[roomId].players.find(p => p.playerId === playerId);
      if (existingPlayer) {
        existingPlayer.id = socket.id;
        const user = socket.handshake.session.passport ? socket.handshake.session.passport.user : null;
        let avatarUrl = avatar || 'https://dummyimage.com/100x100?text=Default';
        let name = existingPlayer.name;
        if (user && !avatar) {
          if (user.provider === 'google') {
            name = user.displayName;
            if (user.photos && user.photos.length > 0) {
              avatarUrl = user.photos[0].value;
            }
          } else if (user.provider === 'yandex') {
            const firstName = user._json.first_name || 'Неизвестно';
            const lastName = user._json.last_name || '';
            name = `${firstName} ${lastName}`.trim();
            if (user._json.default_avatar_id) {
              avatarUrl = `https://avatars.yandex.net/get-yapic/${user._json.default_avatar_id}/islands-200`;
            }
          }
        }
        existingPlayer.name = name;
        existingPlayer.avatarUrl = avatarUrl;
        console.log(`[DEBUG] Existing player updated in room ${roomId}, name: ${name}, avatarUrl: ${avatarUrl}`);
        socket.join(roomId);
        socket.playerId = playerId;
        io.to(roomId).emit('playerList', rooms[roomId].players, rooms[roomId].spiesKnown);
        socket.emit('isCreator', rooms[roomId].creator === playerId);
        socket.emit('settingsUpdated', {
          roomName: rooms[roomId].roomName,
          maxPlayers: rooms[roomId].maxPlayers,
          spiesCount: rooms[roomId].spiesCount,
          locationTheme: rooms[roomId].locationTheme,
          gameTimer: rooms[roomId].gameTimer,
          spiesKnown: rooms[roomId].spiesKnown,
        });
        if (rooms[roomId].started) {
          const isSpy = existingPlayer.isSpy;
          socket.emit('role', { isSpy, location: isSpy ? null : rooms[roomId].location });
          socket.emit('gameStarted', { gameTimer: rooms[roomId].gameTimer });
        }
      } else {
        if (rooms[roomId].started) {
          socket.emit('roomFull', 'Игра уже началась');
          return;
        }
        if (rooms[roomId].players.length >= rooms[roomId].maxPlayers) {
          socket.emit('roomFull', 'Комната заполнена');
          return;
        }
        socket.join(roomId);
        const user = socket.handshake.session.passport ? socket.handshake.session.passport.user : null;
        let name = `Guest${Math.floor(Math.random() * 10000)}`;
        let avatarUrl = avatar || 'https://dummyimage.com/100x100?text=Default';
        if (user && !avatar) {
          if (user.provider === 'google') {
            name = user.displayName;
            if (user.photos && user.photos.length > 0) {
              avatarUrl = user.photos[0].value;
            }
          } else if (user.provider === 'yandex') {
            const firstName = user._json.first_name || 'Неизвестно';
            const lastName = user._json.last_name || '';
            name = `${firstName} ${lastName}`.trim();
            if (user._json.default_avatar_id) {
              avatarUrl = `https://avatars.yandex.net/get-yapic/${user._json.default_avatar_id}/islands-200`;
            }
          }
        }
        const player = { id: socket.id, playerId: playerId, name, isReady: false, isCreator: false, isOut: false, votes: 0, isSpy: false, avatarUrl };
        console.log(`[DEBUG] New player joined room ${roomId}, name: ${name}, avatarUrl: ${avatarUrl}`);
        rooms[roomId].players.push(player);
        socket.playerId = playerId;
        io.to(roomId).emit('playerList', rooms[roomId].players, rooms[roomId].spiesKnown);
        socket.emit('isCreator', rooms[roomId].creator === playerId);
        socket.emit('settingsUpdated', {
          roomName: rooms[roomId].roomName,
          maxPlayers: rooms[roomId].maxPlayers,
          spiesCount: rooms[roomId].spiesCount,
          locationTheme: rooms[roomId].locationTheme,
          gameTimer: rooms[roomId].gameTimer,
          spiesKnown: rooms[roomId].spiesKnown,
        });
      }
    } else {
      socket.emit('roomFull', 'Комната не существует');
    }
  });

  socket.on('requestPlayerList', (roomId) => {
    if (rooms[roomId]) {
      io.to(roomId).emit('playerList', rooms[roomId].players, rooms[roomId].spiesKnown);
    }
  });

  socket.on('updateSettings', ({ roomId, settings }) => {
    if (rooms[roomId] && rooms[roomId].creator === socket.playerId && !rooms[roomId].started) {
      console.log(`[DEBUG] Updating settings for room ${roomId}:`, settings);
      rooms[roomId].roomName = settings.roomName;
      rooms[roomId].maxPlayers = Math.min(settings.maxPlayers, 15);
      rooms[roomId].spiesCount = Math.min(settings.spiesCount, rooms[roomId].maxPlayers - 1);
      rooms[roomId].locationTheme = settings.locationTheme;
      rooms[roomId].gameTimer = settings.gameTimer;
      rooms[roomId].spiesKnown = settings.spiesKnown;
      console.log(`[DEBUG] Updated settings for room ${roomId}:`, {
        maxPlayers: rooms[roomId].maxPlayers,
        spiesCount: rooms[roomId].spiesCount,
        locationTheme: rooms[roomId].locationTheme,
        gameTimer: rooms[roomId].gameTimer,
        spiesKnown: rooms[roomId].spiesKnown,
      });
      io.to(roomId).emit('settingsUpdated', settings);
    }
  });

  socket.on('startGame', (roomId) => {
    if (rooms[roomId] && rooms[roomId].creator === socket.playerId && !rooms[roomId].started) {
      rooms[roomId].started = true;
      const players = rooms[roomId].players;
      const spiesCount = Math.min(rooms[roomId].spiesCount, players.length - 1);
      const theme = rooms[roomId].locationTheme;
      const location = locations[theme][Math.floor(Math.random() * locations[theme].length)];
      const shuffledPlayers = players.sort(() => 0.5 - Math.random());
      const spies = shuffledPlayers.slice(0, spiesCount);
      const spyNames = spies.map(player => player.name);
      rooms[roomId].spies = spies.map(player => player.playerId);
      rooms[roomId].location = location;

      console.log(`[DEBUG] Room: ${roomId}`);
      console.log(`[DEBUG] Settings:`, {
        maxPlayers: rooms[roomId].maxPlayers,
        spiesCount: rooms[roomId].spiesCount,
        locationTheme: rooms[roomId].locationTheme,
        gameTimer: rooms[roomId].gameTimer,
        spiesKnown: rooms[roomId].spiesKnown,
      });
      console.log(`[DEBUG] Total players: ${players.length}`);
      console.log(`[DEBUG] Requested spies: ${rooms[roomId].spiesCount}`);
      console.log(`[DEBUG] Actual spies count: ${spies.length}`);
      console.log(`[DEBUG] Spies: ${JSON.stringify(spies.map(p => ({ playerId: p.playerId, name: p.name })))}`);
      console.log(`[DEBUG] Location: ${location}`);

      players.forEach(player => {
        player.isSpy = rooms[roomId].spies.includes(player.playerId);
        const isSpy = player.isSpy;
        io.to(player.id).emit('role', { isSpy, location: isSpy ? null : location });
      });
      io.to(roomId).emit('playerList', rooms[roomId].players, rooms[roomId].spiesKnown);
      io.to(roomId).emit('gameStarted', { gameTimer: rooms[roomId].gameTimer });

      setTimeout(() => {
        if (rooms[roomId] && rooms[roomId].started) {
          io.to(roomId).emit('gameEnded', {
            spiesWin: true,
            spies: spyNames,
            location: rooms[roomId].location,
            players: rooms[roomId].players,
          });
          rooms[roomId].started = false;
        }
      }, rooms[roomId].gameTimer * 1000);
    }
  });

  socket.on('resetGame', (roomId) => {
    if (rooms[roomId] && rooms[roomId].creator === socket.playerId) {
      rooms[roomId].started = false;
      rooms[roomId].votingInProgress = false;
      rooms[roomId].players.forEach(player => {
        player.isOut = false;
        player.votes = 0;
      });
      rooms[roomId].votes = {};
      rooms[roomId].votedPlayers = [];
      io.to(roomId).emit('gameReset');
    }
  });

  socket.on('startVoting', (roomId) => {
    if (rooms[roomId] && rooms[roomId].started && !rooms[roomId].votingInProgress) {
      rooms[roomId].votingInProgress = true;
      rooms[roomId].votes = {};
      rooms[roomId].votedPlayers = [];
      rooms[roomId].players.forEach(player => player.votes = 0);
      io.to(roomId).emit('votingStarted');
      setTimeout(() => endVoting(roomId), 30 * 1000);
    }
  });

  socket.on('vote', ({ roomId, targetId, voterId }) => {
    if (
      rooms[roomId] &&
      rooms[roomId].started &&
      !rooms[roomId].players.find(p => p.playerId === voterId).isOut &&
      !rooms[roomId].votedPlayers.includes(voterId)
    ) {
      rooms[roomId].votes[targetId] = (rooms[roomId].votes[targetId] || 0) + 1;
      rooms[roomId].votedPlayers.push(voterId);
      const targetPlayer = rooms[roomId].players.find(p => p.playerId === targetId);
      if (targetPlayer) targetPlayer.votes = rooms[roomId].votes[targetId];
      io.to(roomId).emit('voteUpdated', { targetId, votes: targetPlayer.votes, voterId });
      const activePlayers = rooms[roomId].players.filter(p => !p.isOut).length;
      const majority = Math.floor(activePlayers / 2) + 1;
      if (targetPlayer.votes >= majority) {
        endVoting(roomId);
      }
      if (rooms[roomId].votedPlayers.length === activePlayers) {
        endVoting(roomId);
      }
    }
  });

  function endVoting(roomId) {
    if (rooms[roomId] && rooms[roomId].started) {
      const votes = rooms[roomId].votes;
      const activePlayers = rooms[roomId].players.filter(p => !p.isOut);
      const activeCount = activePlayers.length;
      const majority = Math.floor(activeCount / 2) + 1;
      let maxVotes = 0;
      let targetId = null;
      for (const id in votes) {
        if (votes[id] > maxVotes) {
          maxVotes = votes[id];
          targetId = id;
        }
      }
      if (maxVotes >= majority) {
        const player = rooms[roomId].players.find(p => p.playerId === targetId);
        if (player) {
          player.isOut = true;
          io.to(roomId).emit('playerList', rooms[roomId].players, rooms[roomId].spiesKnown);
          const spiesLeft = rooms[roomId].spies.filter(spyId => !rooms[roomId].players.find(p => p.playerId === spyId)?.isOut).length;
          const nonSpiesLeft = activePlayers.filter(p => !p.isSpy && !p.isOut).length;

          if (spiesLeft === 0) {
            io.to(roomId).emit('spiesLost', {
              location: rooms[roomId].location,
              spies: rooms[roomId].spies.map(id => rooms[roomId].players.find(p => p.playerId === id).name),
              players: rooms[roomId].players,
            });
            rooms[roomId].started = false;
          } else if (nonSpiesLeft === 0 || spiesLeft >= nonSpiesLeft) {
            io.to(roomId).emit('gameEnded', {
              spiesWin: true,
              spies: rooms[roomId].spies.map(id => rooms[roomId].players.find(p => p.playerId === id).name),
              location: rooms[roomId].location,
              players: rooms[roomId].players,
            });
            rooms[roomId].started = false;
          }
        }
      }
      rooms[roomId].votingInProgress = false;
      rooms[roomId].votes = {};
      rooms[roomId].votedPlayers = [];
      rooms[roomId].players.forEach(player => player.votes = 0);
      io.to(roomId).emit('votingEnded');
    }
  }

  socket.on('endVoting', (roomId) => {
    endVoting(roomId);
  });

  socket.on('closeRoom', (roomId) => {
    if (rooms[roomId] && rooms[roomId].creator === socket.playerId) {
      io.to(roomId).emit('roomClosed', 'Комната закрыта создателем');
      delete rooms[roomId];
      console.log(`Комната ${roomId} закрыта создателем`);
    }
  });

  socket.on('changeName', ({ roomId, playerId, newName }) => {
    if (rooms[roomId]) {
      const player = rooms[roomId].players.find(p => p.playerId === playerId);
      if (player) {
        player.name = newName || `Guest${Math.floor(Math.random() * 10000)}`;
        io.to(roomId).emit('playerList', rooms[roomId].players, rooms[roomId].spiesKnown);
        io.to(roomId).emit('nameChanged', { playerId, newName: player.name });
      }
    }
  });

  socket.on('setReady', ({ roomId, playerId, isReady }) => {
    if (rooms[roomId]) {
      const player = rooms[roomId].players.find(p => p.playerId === playerId);
      if (player && !player.isCreator) {
        player.isReady = isReady;
        io.to(roomId).emit('playerList', rooms[roomId].players, rooms[roomId].spiesKnown);
        io.to(roomId).emit('readyUpdated', { playerId, isReady });
      }
    }
  });

  socket.on('leaveRoom', ({ roomId, playerId }) => {
    if (rooms[roomId]) {
      const playerIndex = rooms[roomId].players.findIndex(p => p.playerId === playerId);
      if (playerIndex !== -1 && !rooms[roomId].players[playerIndex].isCreator) {
        rooms[roomId].players.splice(playerIndex, 1);
        socket.leave(roomId);
        io.to(roomId).emit('playerList', rooms[roomId].players, rooms[roomId].spiesKnown);
        io.to(roomId).emit('playerLeft');
      }
    }
  });

  socket.on('setPlayerId', (playerId) => {
    socket.playerId = playerId;
  });

  socket.on('disconnect', () => {
    console.log('Игрок отключился:', socket.id);
    for (const roomId in rooms) {
      const playerIndex = rooms[roomId].players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1 && !rooms[roomId].players[playerIndex].isCreator) {
        rooms[roomId].players.splice(playerIndex, 1);
        io.to(roomId).emit('playerList', rooms[roomId].players, rooms[roomId].spiesKnown);
        io.to(roomId).emit('playerLeft');
      }
    }
  });
});

// Запуск сервера
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
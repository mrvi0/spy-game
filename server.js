const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const rooms = {};

const locations = {
  default: ['Офис', 'Ресторан', 'Пляж', 'Кинотеатр', 'Парк'],
  fantasy: ['Замок', 'Лес эльфов', 'Пещера дракона', 'Деревня гномов', 'Башня мага'],
  'sci-fi': ['Космический корабль', 'База на Марсе', 'Лаборатория', 'Колония', 'Орбитальная станция']
};

app.get('/room/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  console.log('Попытка зайти в комнату:', roomId);
  if (rooms[roomId]) {
    res.sendFile(path.join(__dirname, 'public', 'room.html'));
  } else {
    res.status(404).send('Комната не найдена');
  }
});

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

io.on('connection', (socket) => {
  console.log('Игрок подключился:', socket.id);

  socket.on('createRoom', ({ maxPlayers, spiesCount, nickname }, callback) => {
    const roomId = `room-${Math.random().toString(36).substr(2, 6)}`;
    const creatorPlayerId = `player-${Math.random().toString(36).substr(2, 6)}`;
    rooms[roomId] = {
      players: [{ id: socket.id, playerId: creatorPlayerId, name: nickname || `Guest${Math.floor(Math.random() * 10000)}`, isReady: true, isCreator: true, isOut: false, votes: 0, isSpy: false }],
      maxPlayers: maxPlayers || 10,
      spiesCount: spiesCount || 2,
      roomName: 'Безымянная',
      locationTheme: 'default',
      gameTimer: 600,
      creator: creatorPlayerId,
      started: false,
      spies: [],
      location: '',
      votes: {},
      votedPlayers: [],
      votingInProgress: false,
      spiesKnown: false,
      lastCreatorCheck: Date.now()
    };
    socket.join(roomId);
    console.log('Создана комната:', roomId, 'Создатель:', creatorPlayerId);
    io.to(roomId).emit('playerList', rooms[roomId].players, rooms[roomId].spiesKnown);
    callback({ roomId, creatorPlayerId });
  });

  socket.on('joinRoom', ({ roomId, playerId }) => {
    if (rooms[roomId]) {
      const existingPlayer = rooms[roomId].players.find(p => p.playerId === playerId);
      if (existingPlayer) {
        existingPlayer.id = socket.id;
        socket.join(roomId);
        io.to(roomId).emit('playerList', rooms[roomId].players, rooms[roomId].spiesKnown);
        socket.emit('isCreator', rooms[roomId].creator === playerId);
        socket.emit('settingsUpdated', {
          roomName: rooms[roomId].roomName,
          maxPlayers: rooms[roomId].maxPlayers,
          spiesCount: rooms[roomId].spiesCount,
          locationTheme: rooms[roomId].locationTheme,
          gameTimer: rooms[roomId].gameTimer,
          spiesKnown: rooms[roomId].spiesKnown
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
        const player = { id: socket.id, playerId: playerId, name: `Guest${Math.floor(Math.random() * 10000)}`, isReady: false, isCreator: false, isOut: false, votes: 0, isSpy: false };
        rooms[roomId].players.push(player);
        io.to(roomId).emit('playerList', rooms[roomId].players, rooms[roomId].spiesKnown);
        socket.emit('isCreator', rooms[roomId].creator === playerId);
        socket.emit('settingsUpdated', {
          roomName: rooms[roomId].roomName,
          maxPlayers: rooms[roomId].maxPlayers,
          spiesCount: rooms[roomId].spiesCount,
          locationTheme: rooms[roomId].locationTheme,
          gameTimer: rooms[roomId].gameTimer,
          spiesKnown: rooms[roomId].spiesKnown
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
        spiesKnown: rooms[roomId].spiesKnown
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
        spiesKnown: rooms[roomId].spiesKnown
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
          io.to(roomId).emit('gameEnded', { spies: spyNames, location });
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
      io.to(roomId).emit('voteUpdated', { targetId, votes: targetPlayer.votes });
      const activePlayers = rooms[roomId].players.filter(p => !p.isOut).length;
      const majority = Math.floor(activePlayers / 2) + 1;
      if (targetPlayer.votes >= majority) {
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
            io.to(roomId).emit('spiesLost', { location: rooms[roomId].location, spies: rooms[roomId].spies.map(id => rooms[roomId].players.find(p => p.playerId === id).name) });
            rooms[roomId].started = false;
          } else if (nonSpiesLeft === 0 || spiesLeft >= nonSpiesLeft) {
            io.to(roomId).emit('gameEnded', { spies: rooms[roomId].spies.map(id => rooms[roomId].players.find(p => p.playerId === id).name), location: rooms[roomId].location });
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

server.listen(3001, () => console.log('Сервер на 3001'));
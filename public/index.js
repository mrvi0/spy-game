const socket = io();

document.getElementById('createRoom').addEventListener('click', () => {
  const maxPlayers = 10;
  const spiesCount = 2;
  const nickname = document.getElementById('nickname').value || `Guest${Math.floor(Math.random() * 10000)}`;
  socket.emit('createRoom', { maxPlayers, spiesCount, nickname }, ({ roomId, creatorPlayerId }) => {
    localStorage.setItem('playerId', creatorPlayerId);
    window.location.href = `/room/${roomId}`;
  });
});

document.getElementById('connectButton').addEventListener('click', () => {
  alert('Функционал "Connect" пока не реализован.');
});
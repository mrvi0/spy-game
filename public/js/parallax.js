// public/js/parallax.js
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
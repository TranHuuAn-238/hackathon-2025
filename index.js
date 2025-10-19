require('dotenv').config();
const io = require('socket.io-client');

const socket = io(process.env.SOCKET_SERVER, {
  auth: { token: process.env.TOKEN }
});

let myUID = null;
let myPos = { x: 0, y: 0 };
let currentDir = null;
let moveInterval = null;
let waitingForExplode = false;
let escaping = false;
let explosionRange = 2;
const forbiddenPositions = [
  { x: 40, y: 40 },
  { x: 565, y: 565 },
  { x: 40, y: 565 },
  { x: 565, y: 40 }
];
const ESCAPE_MS = 4900;
const BOMB_LIFE_MS = 5000;
const dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
const botName = 'BomberBoy';
const TILE_SIZE = 40;

function randomDir() {
  return dirs[Math.floor(Math.random() * dirs.length)];
}

function changeDir() {
  let dir;
  do { dir = randomDir(); } while (dir === currentDir);
  currentDir = dir;
}

function startMove() {
  if(moveInterval) clearInterval(moveInterval);
  moveInterval = setInterval(() => {
    if (currentDir && !waitingForExplode) {
      socket.emit('move', { orient: currentDir });
    };
  }, 17);
}

function stopMove() {
  if(moveInterval) { clearInterval(moveInterval); moveInterval = null; }
}

function scheduleChange() {
  const t = Math.floor(Math.random() * 2000) + 1000; // 1–3s
  setTimeout(() => { changeDir(); scheduleChange(); }, t);
}

function isSafe(bombX, bombY, explosionRange = 2) {
  const explosionDistance = explosionRange * TILE_SIZE;

  // Danger zone (same axis)
  const minX = bombX - explosionDistance - TILE_SIZE;
  const maxX = bombX + explosionDistance + TILE_SIZE;
  const minY = bombY - explosionDistance - TILE_SIZE;
  const maxY = bombY + explosionDistance + TILE_SIZE;

  const dx = Math.abs(myPos.x - bombX);
  const dy = Math.abs(myPos.y - bombY);

  if (myPos.x < minX || myPos.x > maxX || myPos.y < minY || myPos.y > maxY) {
    return true;
  }

  if (dx > TILE_SIZE && dy > TILE_SIZE) {
    return true;
  }

  return false;
}


// Select the escape direction and run during ESCAPE_MS time
function runEscapeFrom(bombX, bombY){
  if(escaping) return;
  escaping = true;
  waitingForExplode = false;

  // simple heuristic
  const dx = myPos.x - bombX;
  const dy = myPos.y - bombY;
  if (Math.abs(dx) >= Math.abs(dy)) {
    currentDir = dx >= 0 ? 'RIGHT' : 'LEFT';
  } else {
    currentDir = dy >= 0 ? 'DOWN' : 'UP';
  }

  // Runnn
  startMove();

  const checkInterval = setInterval(() => {
    if (isSafe(bombX, bombY, explosionRange)) {
      console.log('Safe zone reached! Stopping to wait for explosion...');
      stopMove();
      waitingForExplode = true;
      escaping = false;
      clearInterval(checkInterval);
    }
  }, 17);

  const escapeTimeout = setTimeout(() => {
    console.log('Escape timeout, stopping anyway');
    stopMove();
    waitingForExplode = true;
    escaping = false;
    clearInterval(checkInterval);
  }, BOMB_LIFE_MS - 100);
}

// Join
// socket.on('connect', () => {
  socket.emit('join', {});
  console.log('Connected!');
// });

socket.on('user', (data) => {
  const me = data.bombers.find(b => b.name === botName);
  if (me) {
    myUID = me.uid;
    myPos = { x: me.x, y: me.y };
    console.log('Founded bot:', myUID);
  }

  currentDir = randomDir();
  startMove();
  // scheduleChange();
});

// Production
// socket.on('start', () => {
//   currentDir = randomDir();
//   startMove();
//   scheduleChange();
// });

socket.on('player_move', (d) => {
  if (d.uid === myUID) {
    if (myPos.x === d.x && myPos.y === d.y) {
      const inForbidden = forbiddenPositions.some(pos =>
        Math.abs(pos.x - myPos.x) < 10 && Math.abs(pos.y - myPos.y) < 10
      );
      if (!waitingForExplode && !escaping && !inForbidden) {
        socket.emit('place_bomb');
      }
      changeDir();
    }
    myPos = { x: d.x, y: d.y };
    explosionRange = d.explosionRange;
  }
});

socket.on('new_bomb', (bomb) => {
  if(!bomb) return;
  if(bomb.uid === myUID){
    runEscapeFrom(bomb.x, bomb.y);
  } else {
    const sameX = Math.abs(bomb.x - myPos.x) <= 16;
    const sameY = Math.abs(bomb.y - myPos.y) <= 16;
    if(sameX || sameY){
      // runEscapeFrom(bomb.x, bomb.y);
      changeDir();
    }
  }
});

socket.on('bomb_explode', (bomb) => {
  if(!bomb) return;
  if(bomb.uid === myUID && waitingForExplode){
    // resume move
    waitingForExplode = false;
    escaping = false;
    currentDir = randomDir();
    startMove();
    // scheduleChange();
  }
});

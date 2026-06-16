require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { TikTokLive } = require('tiktok-live-connector');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Configuración
const PORT = process.env.PORT || 3000;
const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME || 'your_tiktok_username';

// Configuración de niveles de jefes
const BOSS_LEVELS = [
  { level: 1, maxHp: 10000, video: 'jefe1.mp4' },
  { level: 2, maxHp: 25000, video: 'jefe2.mp4' },
  { level: 3, maxHp: 50000, video: 'jefe3.mp4' }
];

// Estado global del juego
let gameState = {
  currentLevel: 1,
  vidaActual: BOSS_LEVELS[0].maxHp,
  vidaMaxima: BOSS_LEVELS[0].maxHp,
  currentBossVideo: BOSS_LEVELS[0].video,
  isGameActive: true,
  damageInProgress: false,
  lastDamageTime: 0
};

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Instancia de TikTok Live
let tiktokLive = null;
let isConnected = false;

// Intervalo de daño pasivo (3 segundos de daño, 2 segundos de descanso)
let damageInterval = null;
let restInterval = null;

// Función para aplicar daño pasivo
function applyPassiveDamage() {
  if (!gameState.isGameActive) return;

  gameState.vidaActual = Math.max(0, gameState.vidaActual - 1);
  
  // Emitir actualización a todos los clientes
  io.emit('hp_update', {
    vidaActual: gameState.vidaActual,
    vidaMaxima: gameState.vidaMaxima,
    currentLevel: gameState.currentLevel,
    tipo: 'passive'
  });

  console.log(`[PASSIVE DAMAGE] Vida actual: ${gameState.vidaActual}/${gameState.vidaMaxima}`);

  // Si la vida llega a 0, cambiar de nivel
  if (gameState.vidaActual === 0) {
    handleBossDefeated();
  } else {
    // Después de 3 segundos de daño, descansar 2 segundos
    clearInterval(damageInterval);
    
    restInterval = setTimeout(() => {
      // Después de 2 segundos de descanso, volver a hacer daño
      damageInterval = setInterval(applyPassiveDamage, 1000); // 1 segundo por HP (3 segundos total)
    }, 2000);
  }
}

// Función para manejar la derrota del jefe
function handleBossDefeated() {
  console.log(`¡¡¡ JEFE NIVEL ${gameState.currentLevel} DERROTADO !!!`);
  
  // Emitir evento de derrota
  io.emit('boss_defeated', {
    level: gameState.currentLevel,
    nextLevel: gameState.currentLevel + 1
  });

  // Detener daño pasivo
  clearInterval(damageInterval);
  clearTimeout(restInterval);

  // Si hay más niveles, pasar al siguiente
  if (gameState.currentLevel < BOSS_LEVELS.length) {
    setTimeout(() => {
      gameState.currentLevel++;
      const nextBoss = BOSS_LEVELS[gameState.currentLevel - 1];
      gameState.vidaActual = nextBoss.maxHp;
      gameState.vidaMaxima = nextBoss.maxHp;
      gameState.currentBossVideo = nextBoss.video;
      gameState.isGameActive = true;

      console.log(`Iniciando Nivel ${gameState.currentLevel} - Boss HP: ${gameState.vidaMaxima}`);

      // Emitir evento de nuevo nivel
      io.emit('level_start', {
        level: gameState.currentLevel,
        maxHp: gameState.vidaMaxima,
        video: gameState.currentBossVideo
      });

      // Reiniciar daño pasivo
      startPassiveDamage();
    }, 3000); // 3 segundos después de la derrota
  } else {
    console.log('¡¡¡ TODOS LOS JEFES HAN SIDO DERROTADOS !!!');
    gameState.isGameActive = false;
    
    io.emit('game_completed', {
      message: '¡¡¡ JUEGO COMPLETADO !!!'
    });
  }
}

// Función para iniciar el daño pasivo
function startPassiveDamage() {
  if (damageInterval) clearInterval(damageInterval);
  if (restInterval) clearTimeout(restInterval);
  
  // Primer daño después de 3 segundos
  damageInterval = setInterval(applyPassiveDamage, 1000); // Se ejecuta 3 veces (1 segundo x 3 = 3 segundos)
  
  let damageCount = 0;
  const tempInterval = setInterval(() => {
    damageCount++;
    if (damageCount >= 3) {
      clearInterval(tempInterval);
      clearInterval(damageInterval);
      
      // Descanso de 2 segundos
      restInterval = setTimeout(() => {
        startPassiveDamage();
      }, 2000);
    }
  }, 1000);
}

// Función para conectar a TikTok Live
function connectToTikTok() {
  if (isConnected) {
    console.log('Ya estamos conectados a TikTok Live');
    return;
  }

  tiktokLive = new TikTokLive({
    username: TIKTOK_USERNAME,
    processInitialData: false,
    fetchRoomInfoOnConnect: true,
    enableExtendedGiftInfo: true
  });

  // Evento de conexión exitosa
  tiktokLive.on('connected', () => {
    console.log(`✓ Conectado a TikTok Live de @${TIKTOK_USERNAME}`);
    isConnected = true;
    
    // Emitir estado inicial a todos los clientes conectados
    io.emit('init', gameState);
    
    // Iniciar daño pasivo
    startPassiveDamage();
  });

  // Evento de desconexión
  tiktokLive.on('disconnected', () => {
    console.log('✗ Desconectado de TikTok Live');
    isConnected = false;
    clearInterval(damageInterval);
    clearTimeout(restInterval);
  });

  // Evento de regalos
  tiktokLive.on('gift', (data) => {
    console.log(`[GIFT] ${data.uniqueId} envió ${data.giftName} (cantidad: ${data.giftCount})`);
    
    // Si el regalo es una rosa, restar 50 HP
    if (data.giftName.toLowerCase() === 'rose') {
      const damageAmount = (data.giftCount || 1) * 50;
      gameState.vidaActual = Math.max(0, gameState.vidaActual - damageAmount);
      
      console.log(`[ROSE DAMAGE] ${data.uniqueId} causó ${damageAmount} daño. Vida actual: ${gameState.vidaActual}/${gameState.vidaMaxima}`);
      
      // Emitir evento de golpe de rosa
      io.emit('rose_hit', {
        vidaActual: gameState.vidaActual,
        vidaMaxima: gameState.vidaMaxima,
        usuario: data.uniqueId,
        regalo: data.giftName,
        cantidad: data.giftCount,
        damageAmount: damageAmount
      });
      
      // Si la vida llega a 0, el jefe es derrotado
      if (gameState.vidaActual === 0) {
        handleBossDefeated();
      }
    }
  });

  // Evento de likes/corazones
  tiktokLive.on('like', (data) => {
    console.log(`[LIKE] ${data.uniqueId} envió un like`);
    
    // Restar 1 HP por like
    gameState.vidaActual = Math.max(0, gameState.vidaActual - 1);
    
    // Emitir evento de like
    io.emit('like_hit', {
      vidaActual: gameState.vidaActual,
      vidaMaxima: gameState.vidaMaxima,
      usuario: data.uniqueId
    });
    
    // Si la vida llega a 0, el jefe es derrotado
    if (gameState.vidaActual === 0) {
      handleBossDefeated();
    }
  });

  // Evento de error
  tiktokLive.on('error', (err) => {
    console.error('Error en TikTok Live:', err);
    isConnected = false;
  });

  // Evento de timeout
  tiktokLive.on('timeout', () => {
    console.log('Timeout en TikTok Live, intentando reconectar...');
    isConnected = false;
  });

  // Conectar
  try {
    tiktokLive.connect();
  } catch (err) {
    console.error('Error al conectar a TikTok Live:', err);
    isConnected = false;
  }
}

// Manejo de conexiones WebSocket
io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);
  
  // Enviar estado inicial al cliente que se conecta
  socket.emit('init', gameState);
  
  // Desconexión
  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
  
  // Evento para resetear el juego (opcional)
  socket.on('reset_game', () => {
    gameState.currentLevel = 1;
    gameState.vidaActual = BOSS_LEVELS[0].maxHp;
    gameState.vidaMaxima = BOSS_LEVELS[0].maxHp;
    gameState.currentBossVideo = BOSS_LEVELS[0].video;
    gameState.isGameActive = true;
    
    clearInterval(damageInterval);
    clearTimeout(restInterval);
    
    io.emit('game_reset', gameState);
    console.log('Juego reseteado');
    
    // Reiniciar daño pasivo
    startPassiveDamage();
  });
});

// Iniciar servidor
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📺 Abre la URL del servidor en OBS Studio como Browser Source`);
  
  // Conectar a TikTok Live después de un pequeño delay
  setTimeout(() => {
    connectToTikTok();
  }, 1000);
});

// Manejo de cierre graceful
process.on('SIGINT', () => {
  console.log('\nCerrando servidor...');
  clearInterval(damageInterval);
  clearTimeout(restInterval);
  if (tiktokLive && isConnected) {
    tiktokLive.disconnect();
  }
  server.close(() => {
    console.log('Servidor cerrado');
    process.exit(0);
  });
});

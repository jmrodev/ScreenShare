const express = require('express');
const https = require('https');
const socketIo = require('socket.io');
const os = require('os');
const fs = require('fs');

const app = express();

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};
const server = https.createServer(options, app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// --- Helper para obtener la IP local ---
function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Omitir direcciones no-IPv4 e internas (ej. 127.0.0.1)
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1'; // Fallback
}
const localIp = getLocalIp();

// Servir los archivos estáticos del frontend
app.use(express.static('public'));

// Endpoint para que el frontend obtenga la IP
app.get('/api/get-ip', (req, res) => {
  res.json({ ip: localIp, port: PORT });
});

// Lógica de señalización de WebRTC con Socket.io
io.on('connection', (socket) => {
  console.log('Un usuario se ha conectado:', socket.id);

  // El presentador se une a una sala única
  socket.on('presenter', () => {
    socket.join('presenter-room');
    console.log('Un presentador ha comenzado la transmisión.');
    socket.broadcast.emit('presenter-available');
  });

  // El espectador solicita unirse
  socket.on('viewer', (data) => {
    const presenterSocket = getPresenterSocket();
    if (presenterSocket) {
      const username = (data && data.username) ? data.username : 'Anónimo';
      presenterSocket.emit('viewer-request', { viewerId: socket.id, username });
    } else {
      socket.emit('no-presenter');
    }
  });

  // Oferta WebRTC del presentador al espectador
  socket.on('offer', (data) => {
    if (data && data.viewerId) {
      io.to(data.viewerId).emit('offer', {
        sdp: data.sdp,
        presenterId: socket.id,
      });
    }
  });

  // Respuesta WebRTC del espectador al presentador
  socket.on('answer', (data) => {
    if (data && data.presenterId) {
      io.to(data.presenterId).emit('answer', {
        sdp: data.sdp,
        viewerId: socket.id,
      });
    }
  });

  // Candidatos ICE para establecer la conexión
  socket.on('candidate', (data) => {
    if (data && data.toId) {
      io.to(data.toId).emit('candidate', {
        candidate: data.candidate,
        fromId: socket.id,
      });
    }
  });

  // Manejar desconexiones
  socket.on('disconnect', () => {
    console.log('Un usuario se ha desconectado:', socket.id);
     // Notificar al presentador si un espectador se desconecta
    const presenterSocket = getPresenterSocket();
    if (presenterSocket) {
        presenterSocket.emit('viewer-disconnected', { viewerId: socket.id });
    }
    // Si el que se desconecta es el presentador, notificar a todos
    if (socket.rooms.has('presenter-room')) {
      io.emit('presenter-disconnected');
      console.log('El presentador se ha desconectado.');
    }
  });
});

function getPresenterSocket() {
  const room = io.sockets.adapter.rooms.get('presenter-room');
  if (room && room.size > 0) {
    const presenterId = room.values().next().value;
    return io.sockets.sockets.get(presenterId);
  }
  return null;
}

server.listen(PORT, () => {
  console.log(`Servidor corriendo en https://localhost:${PORT}`);
  console.log(`Accesible en la red local en: https://${localIp}:${PORT}`);
});

const shutdown = () => {
  console.log('\n[Servidor] Recibida señal de apagado. Cerrando conexiones...');
  
  // Notificar a todos los clientes antes de desconectar
  io.emit('presenter-disconnected');

  // Cerramos Socket.io primero
  io.close(() => {
    console.log('[Servidor] Socket.io cerrado.');
    // Luego el servidor HTTPS
    server.close(() => {
      console.log('[Servidor] Conexiones HTTPS cerradas. Saliendo.');
      process.exit(0);
    });
  });

  // Si después de 3 segundos no se ha cerrado limpiamente, forzamos la salida
  setTimeout(() => {
    console.error('[Servidor] El cierre limpio está tardando demasiado. Forzando salida...');
    process.exit(1);
  }, 3000).unref(); // .unref() permite que el proceso termine si el timer es lo único que queda
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);


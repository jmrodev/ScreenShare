document.addEventListener('DOMContentLoaded', () => {
  const socket = io();

  let username;
  const watermarkElements = {};

  function getUsername() {
    if (!username) {
      username = prompt('Por favor, ingresa tu nombre de usuario:');
      if (!username) username = `Usuario${Math.floor(Math.random() * 1000)}`;
    }
  }

  // --- Referencias a elementos del DOM ---
  const presenterBtn = document.getElementById('presenterBtn');
  const viewerBtn = document.getElementById('viewerBtn');
  const enableAudioChat = document.getElementById('enable-audio-chat');
  const optimizeNetwork = document.getElementById('optimize-network');
  const statusEl = document.getElementById('status');
  const videoEl = document.getElementById('video');
  const shareInfoEl = document.getElementById('share-info');
  const shareUrlEl = document.getElementById('share-url');
  
  const videoContainer = document.getElementById('video-container');
  const viewerControls = document.getElementById('viewer-controls');
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  const pipBtn = document.getElementById('pip-btn');
  const lupaToggle = document.getElementById('lupa-toggle');
  const watermarkContainer = document.getElementById('watermark-container');

  const peerConnections = {};

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  const voiceAudioConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  const lowVideoConstraints = {
    height: { ideal: 720 },
    frameRate: { ideal: 10 }
  };


  // --- Lógica del Presentador ---
  presenterBtn.addEventListener('click', async () => {
    getUsername();
    try {
      const videoConstraints = optimizeNetwork.checked ? lowVideoConstraints : true;
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: videoConstraints, audio: true });
      let allTracks = [...displayStream.getTracks()];

      if (enableAudioChat.checked) {
        const audioConstraints = optimizeNetwork.checked ? voiceAudioConstraints : true;
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
        allTracks = [...allTracks, ...micStream.getTracks()];
      }

      const stream = new MediaStream(allTracks);
      videoEl.srcObject = stream;
      videoEl.muted = true;
      videoEl.style.display = 'block';
      hideControls();

      const serverInfo = await fetch('/api/get-ip').then(res => res.json());
      const url = `https://${serverInfo.ip}:${serverInfo.port}`;
      shareUrlEl.value = url;
      shareInfoEl.style.display = 'block';
      statusEl.textContent = '¡Transmitiendo! Pide a los demás que usen la dirección de arriba.';

      socket.emit('presenter');
      setupVideoControls();
      viewerControls.style.display = 'flex';

      socket.on('viewer-request', ({ viewerId, username }) => {
        if (!username) return; // Sanity check
        addWatermark(viewerId, username);

        const peerConnection = new RTCPeerConnection(configuration);
        peerConnections[viewerId] = peerConnection;
        stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

        peerConnection.ontrack = event => {
          if (event.track.kind === 'audio') {
            const audioElement = new Audio();
            audioElement.srcObject = event.streams[0];
            audioElement.autoplay = true;
            document.body.appendChild(audioElement);
          }
        };

        peerConnection.onicecandidate = event => {
          if (event.candidate) {
            socket.emit('candidate', { candidate: event.candidate, toId: viewerId });
          }
        };

        peerConnection.createOffer()
          .then(offer => peerConnection.setLocalDescription(offer))
          .then(() => {
            socket.emit('offer', { sdp: peerConnection.localDescription, viewerId });
            if (optimizeNetwork.checked) {
              setBitrateLimits(peerConnection);
            }
          });
      });

      socket.on('viewer-disconnected', ({ viewerId }) => {
        removeWatermark(viewerId);
      });

      socket.on('answer', ({ sdp, viewerId }) => {
        peerConnections[viewerId].setRemoteDescription(new RTCSessionDescription(sdp));
      });

      socket.on('candidate', ({ candidate, fromId }) => {
        peerConnections[fromId].addIceCandidate(new RTCIceCandidate(candidate));
      });

    } catch (err) {
      console.error('Error al iniciar la transmisión:', err);
      statusEl.textContent = 'Error al iniciar la transmisión. Asegúrate de permitir el acceso a la pantalla.';
      showControls();
    }
  });

  let viewerMicStream = null;

  // --- Lógica del Espectador ---
  viewerBtn.addEventListener('click', async () => {
    getUsername();
    try {
      if (enableAudioChat.checked) {
        const audioConstraints = optimizeNetwork.checked ? voiceAudioConstraints : true;
        viewerMicStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      }
      statusEl.textContent = 'Buscando una transmisión...';
      hideControls();
      socket.emit('viewer', { username });
    } catch (err) {
      console.error('Error al acceder al micrófono:', err);
      statusEl.textContent = 'Error al acceder al micrófono. Por favor, concede los permisos.';
    }
  });

  socket.on('presenter-available', () => {
    if (statusEl.textContent === 'Buscando una transmisión...') {
      socket.emit('viewer', { username });
    }
  });
  
  socket.on('no-presenter', () => {
    statusEl.textContent = 'No hay ninguna transmisión activa en este momento.';
    showControls();
  });

  socket.on('presenter-disconnected', () => {
    statusEl.textContent = 'La transmisión ha finalizado.';
    videoEl.style.display = 'none';
    videoEl.srcObject = null;
    viewerControls.style.display = 'none';
    if (viewerMicStream) {
      viewerMicStream.getTracks().forEach(track => track.stop());
      viewerMicStream = null;
    }
    showControls();
  });

  socket.on('offer', ({ sdp, presenterId }) => {
    const peerConnection = new RTCPeerConnection(configuration);
    peerConnections[presenterId] = peerConnection;

    if (viewerMicStream) {
      viewerMicStream.getTracks().forEach(track => peerConnection.addTrack(track, viewerMicStream));
    }

    peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));

    peerConnection.ontrack = event => {
      if (!videoEl.srcObject) {
        videoEl.srcObject = event.streams[0];
        videoEl.muted = false; // Asegurar que el espectador escucha el audio
        videoEl.style.display = 'block';
        viewerControls.style.display = 'flex';
        statusEl.textContent = 'Viendo la transmisión.';
        setupVideoControls();
      }
    };

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        socket.emit('candidate', { candidate: event.candidate, toId: presenterId });
      }
    };
    
    peerConnection.createAnswer()
      .then(answer => peerConnection.setLocalDescription(answer))
      .then(() => {
        socket.emit('answer', { sdp: peerConnection.localDescription, presenterId });
        if (optimizeNetwork.checked) {
          setBitrateLimits(peerConnection);
        }
      });
  });

  socket.on('candidate', ({ candidate, fromId }) => {
    if (peerConnections[fromId]) {
      peerConnections[fromId].addIceCandidate(new RTCIceCandidate(candidate));
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Desconectado del servidor:', reason);
    statusEl.textContent = 'Se ha perdido la conexión con el servidor.';
    videoEl.style.display = 'none';
    videoEl.srcObject = null;
    viewerControls.style.display = 'none';
    showControls();
  });

  // --- Lógica de Controles de Video (Zoom, Fullscreen, PiP) ---
  let zoomScale = 2.5;
  let initialPinchDistance = null;
  let isControlsSetup = false;

  function updateZoom() {
    videoContainer.style.setProperty('--zoom-scale', zoomScale);
  }

  function setupVideoControls() {
    if (isControlsSetup) return;
    isControlsSetup = true;

    fullscreenBtn.onclick = () => {
      if (videoContainer.requestFullscreen) {
        videoContainer.requestFullscreen();
      }
    };

    if (document.pictureInPictureEnabled) {
      pipBtn.onclick = () => {
        if (document.pictureInPictureElement) {
          document.exitPictureInPicture();
        } else {
          videoEl.requestPictureInPicture();
        }
      };
    } else {
      pipBtn.disabled = true;
    }

    lupaToggle.onchange = () => {
      videoContainer.classList.toggle('lupa-active', lupaToggle.checked);
      if (lupaToggle.checked) updateZoom();
    };

    const isTouchDevice = ('ontouchstart' in window);

    const handleLupaMove = (e) => {
      if (!videoContainer.classList.contains('lupa-active')) return;
      
      const rect = videoContainer.getBoundingClientRect();
      const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
      const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;

      const x = (clientX - rect.left) / rect.width * 100;
      const y = (clientY - rect.top) / rect.height * 100;
      videoEl.style.transformOrigin = `${x}% ${y}%`;
    };

    // Zoom con rueda del ratón
    videoContainer.addEventListener('wheel', (e) => {
      if (!lupaToggle.checked) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.3 : 0.3;
      zoomScale = Math.min(Math.max(1.1, zoomScale + delta), 10);
      updateZoom();
    }, { passive: false });

    // Zoom con gestos (pinch) y movimiento
    videoContainer.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        initialPinchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    });

    videoContainer.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && initialPinchDistance) {
        e.preventDefault();
        const currentDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const delta = (currentDistance - initialPinchDistance) / 50;
        zoomScale = Math.min(Math.max(1.1, zoomScale + delta), 10);
        updateZoom();
        initialPinchDistance = currentDistance;
        
        if (!lupaToggle.checked) {
            lupaToggle.checked = true;
            videoContainer.classList.add('lupa-active');
        }
      } else if (e.touches.length === 1 && lupaToggle.checked) {
        handleLupaMove(e);
      }
    }, { passive: false });

    if (!isTouchDevice) {
      videoContainer.addEventListener('mousemove', handleLupaMove);
    }

    // Atajos de teclado
    document.addEventListener('keydown', (e) => {
      // Solo actuar si el video está visible
      if (videoEl.style.display === 'none') return;

      const key = e.key.toLowerCase();
      
      if (key === 'l') {
        lupaToggle.checked = !lupaToggle.checked;
        lupaToggle.onchange();
      }

      if (!lupaToggle.checked) return;

      if (key === '+' || key === '=') {
        e.preventDefault();
        zoomScale = Math.min(zoomScale + 0.5, 10);
        updateZoom();
      } else if (key === '-') {
        e.preventDefault();
        zoomScale = Math.max(zoomScale - 0.5, 1.1);
        updateZoom();
      } else if (key === '0') {
        e.preventDefault();
        zoomScale = 2.5;
        updateZoom();
      }
    });
  }

  // --- Funciones de Utilidad ---
  function addWatermark(viewerId, name) {
    const watermarkEl = document.createElement('div');
    watermarkEl.className = 'watermark';
    watermarkEl.textContent = name;
    watermarkContainer.appendChild(watermarkEl);
    watermarkElements[viewerId] = watermarkEl;
  }

  function removeWatermark(viewerId) {
    const watermarkEl = watermarkElements[viewerId];
    if (watermarkEl) {
      watermarkEl.remove();
      delete watermarkElements[viewerId];
    }
  }

  async function setBitrateLimits(peerConnection) {
    const senders = peerConnection.getSenders();
    for (const sender of senders) {
      if (sender.track) {
        const parameters = sender.getParameters();
        if (!parameters.encodings) {
          parameters.encodings = [{}];
        }
        if (sender.track.kind === 'video') {
          parameters.encodings[0].maxBitrate = 200 * 1024; // 200 kbps
        } else if (sender.track.kind === 'audio') {
          parameters.encodings[0].maxBitrate = 20 * 1024; // 20 kbps
        }
        try {
          await sender.setParameters(parameters);
        } catch (err) {
          console.error('Error setting bitrate:', err);
        }
      }
    }
  }

  function hideControls() {
    presenterBtn.style.display = 'none';
    viewerBtn.style.display = 'none';
  }

  function showControls() {
    presenterBtn.style.display = 'inline-block';
    viewerBtn.style.display = 'inline-block';
    shareInfoEl.style.display = 'none';
    viewerControls.style.display = 'none';
  }
});

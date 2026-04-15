# ScreenShare Web 🚀

Una aplicación web ligera y potente para compartir pantalla en tiempo real dentro de tu red local utilizando **WebRTC** y **Socket.io**.

## ✨ Características

-   **📡 Transmisión Local**: Detecta automáticamente tu IP local para que otros se conecten fácilmente.
-   **🎙️ Audio Chat**: Opción para habilitar el micrófono y hablar mientras compartes pantalla.
-   **🔍 Lupa Dinámica e Interactiva**:
    -   **PC**: Usa la rueda del ratón o las teclas `+` / `-`.
    -   **Móvil**: Gesto de pellizcar (pinch-to-zoom).
    -   **Atajos**: Tecla `L` para activar/desactivar, `0` para restablecer.
-   **🛡️ Marcas de Agua**: El presentador ve el nombre de cada espectador sobre el video para mayor seguridad.
-   **📺 Controles Avanzados**: Soporte para Pantalla Completa y Ventana Flotante (Picture-in-Picture).
-   **⚡ Optimización**: Opción para optimizar la transmisión en redes lentas.
-   **🛑 Cierre Ordenado**: Notifica a todos los usuarios cuando el servidor se detiene (Ctrl+C).

## 🚀 Instalación y Uso

1.  **Clonar el repositorio** (o descargar los archivos).
2.  **Instalar dependencias**:
    ```bash
    npm install
    ```
3.  **Iniciar el servidor**:
    ```bash
    npm start
    ```
4.  **Acceder**:
    -   Abre `http://localhost:3000` en tu PC.
    -   Usa la dirección IP que aparece en la consola (ej. `http://192.168.1.XX:3000`) para conectar otros dispositivos.

## ⌨️ Atajos de Teclado (con Lupa activa)

| Tecla | Acción |
| :--- | :--- |
| **L** | Activar / Desactivar Lupa |
| **+** / **=** | Aumentar Zoom |
| **-** | Disminuir Zoom |
| **0** | Restablecer Zoom (2.5x) |

## ⚠️ Notas Importantes

-   **Seguridad del Navegador**: Debido a que se usa HTTP para evitar advertencias de certificados, las funciones de compartir pantalla y micrófono **solo funcionan en `localhost`** o si configuras tu navegador para permitir "sitios inseguros" específicos.
-   **Configuración en Chrome/Edge**: Puedes habilitar la transmisión en otros equipos entrando a:
    `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
    Y añadiendo la IP y puerto del servidor.

---
Desarrollado con ❤️ para streaming local rápido y sencillo.

# ScreenShare Web 🚀

Una aplicación web ligera y potente para compartir pantalla en tiempo real dentro de tu red local utilizando **WebRTC**, **Socket.io** y **HTTPS**.

## ✨ Características

-   **📡 Transmisión Local Segura**: Utiliza HTTPS para garantizar que las funciones de pantalla y audio estén disponibles en todos los dispositivos.
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
    -   Abre `https://localhost:3000` en tu PC.
    -   Usa la dirección IP que aparece en la consola (ej. `https://192.168.1.XX:3000`) para conectar otros dispositivos.

## ⌨️ Atajos de Teclado (con Lupa activa)

| Tecla | Acción |
| :--- | :--- |
| **L** | Activar / Desactivar Lupa |
| **+** / **=** | Aumentar Zoom |
| **-** | Disminuir Zoom |
| **0** | Restablecer Zoom (2.5x) |

## ⚠️ Notas sobre HTTPS y Seguridad

-   **Certificado Auto-firmado**: Al acceder, verás un aviso de "La conexión no es privada". Esto es normal ya que el certificado es local. Para continuar, haz clic en **"Configuración avanzada"** y después en **"Acceder a ... (sitio no seguro)"**.
-   **¿Por qué HTTPS?**: Los navegadores modernos bloquean el acceso a la pantalla y al micrófono en sitios que no sean seguros. Usar HTTPS (aunque sea con certificado local) permite que estas funciones trabajen correctamente en toda tu red local.

---
Desarrollado con ❤️ para streaming local rápido y sencillo.

# TikTok Boss Battle - Versión Final (9:16)

Este es un overlay interactivo para transmisiones en vivo de TikTok, optimizado para formato vertical (9:16), con un sistema de 3 niveles de jefes, daño pasivo y efectos especiales.

## 🎮 Características Principales

- **Formato 9:16**: Optimizado para la pantalla vertical de TikTok.
- **Sistema de 3 Niveles**:
  - **Jefe 1**: 10,000 HP (`jefe1.mp4`)
  - **Jefe 2**: 25,000 HP (`jefe2.mp4`)
  - **Jefe 3**: 50,000 HP (`jefe3.mp4`)
- **Daño Pasivo**: El jefe recibe 1 HP de daño cada 3 segundos, seguido de 2 segundos de descanso.
- **Interacción en Tiempo Real**:
  - **Likes ❤️**: Restan 1 HP + Confeti pequeño + Sonido agudo.
  - **Rosas 🌹**: Restan 50 HP + Confeti grande + Sonido grave.
- **Transiciones Automáticas**: Mensaje de "Siguiente Nivel" y cambio de video al derrotar a cada jefe.
- **Efectos Visuales**: Confeti dinámico con emojis temáticos.
- **Barra de Vida**: Degradado dinámico (Verde → Rojo) con contador numérico.

## 🚀 Instalación Rápida

1. **Descarga y extrae** el contenido del ZIP.
2. **Instala las dependencias**:
   ```bash
   npm install
   ```
3. **Configura tus variables**:
   Edita el archivo `.env` y pon tu usuario de TikTok:
   ```env
   TIKTOK_USERNAME=tu_usuario_sin_arroba
   PORT=3000
   ```
4. **Agrega tus videos**:
   Coloca los archivos `jefe1.mp4`, `jefe2.mp4` y `jefe3.mp4` en la carpeta `public/`.
5. **Inicia el servidor**:
   ```bash
   npm start
   ```

## 🌐 Despliegue en Render.com

1. Sube los archivos a un repositorio de **GitHub** (excepto `node_modules` y `.env`).
2. Crea un **Web Service** en Render conectado a ese repositorio.
3. En la pestaña **Environment** de Render, añade:
   - `TIKTOK_USERNAME`: Tu usuario.
   - `PORT`: 3000.
4. Usa la URL de Render en OBS.

## 🎥 Configuración en OBS Studio

1. Añade una **Fuente de Navegador** (Browser Source).
2. URL: `http://localhost:3000` (o tu URL de Render).
3. Ancho: **1080**
4. Alto: **1920**
5. Marca la casilla **"Controlar audio a través de OBS"**.

## ⚙️ Mecánicas de Daño

- **Daño Pasivo**: Ciclo automático de 3s de daño (1 HP/s) y 2s de pausa.
- **Likes**: 1 HP de daño por cada corazón recibido.
- **Rosas**: 50 HP de daño por cada rosa recibida.

## 🎹 Controles
- **Tecla R**: Presiona la tecla 'R' en la ventana del navegador para resetear el juego al Nivel 1.

---
**¡Disfruta de tu transmisión interactiva!** 🎮✨

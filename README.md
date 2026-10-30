# ♞ Chess Grandmaster AI - Entrenador Personalizado

Una aplicación de alto rendimiento de entrenamiento de ajedrez que indexa tu historial real de partidas en **Chess.com** (perfil predeterminado: **`jpeza`**), calcula la precisión objetiva con **Stockfish** y transforma los números fríos en diagnósticos tácticos, psicológicos y pedagógicos con **Google Gemini**.

---

## 🚀 Características Principales

1. **Sincronización Directa con Chess.com**:
   - Descarga tus partidas mensuales (Bullet, Blitz, Rápido) con tiempos de reloj reales por jugada (`[%clk ...]`).
   - Muestra tu Elo, avatar y efectividad de victorias/derrotas.

2. **Doble Motor de Análisis (Híbrido)**:
   - **Motor Heurístico Táctico (100% Offline)**: Identifica al instante motivos tácticos concretos sin consumir tokens ni internet:
     - Piezas colgadas / indefensas.
     - Tenedores y ataques dobles.
     - Omisiones de jaque mate y debilidad de pasillo.
     - **Apuro de reloj** (< 10s en el reloj) y **Jugadas impulsivas** (< 1.4s en el movimiento).
   - **Stockfish 17 (Cálculo Objetivo)**: Encuentra la mejor jugada de máquina y el delta de centipeones.

3. **Google Gemini Grandmaster Coach**:
   - Traduce los números en explicaciones de 2 a 3 frases claras, empáticas y pedagógicas.
   - Diagnostica la **trampa mental** y te brinda una **"Regla de Oro"** para evitar repetir el fallo.

4. **Dojo de Repaso Espaciado (SRS - Spaced Repetition)**:
   - Extrae los fallos reales de tus partidas y los convierte en flashcards tácticas interactivas.
   - Intervalos de repaso dinámicos (1 día -> 3 días -> 7 días -> 14 días) según tus aciertos.

5. **Laboratorio de Repertorio & Aperturas**:
   - Mide tu porcentaje de victorias y derrotas por cada variante de apertura jugada con Blancas y con Negras.

6. **Sparring contra IA**:
   - Juega partidas libres con nivel Elo adaptable (500 a 1500) y pistas en tiempo real.

---

## 🔑 Configuración de Google Gemini

Puedes configurar tu API Key de Gemini de dos maneras:

### Opción A: Desde la Interfaz (Recomendada para APK y Móvil)
1. Inicia la app y haz clic en el botón **Ajustes** (ícono de engranaje en la esquina superior derecha).
2. Pega tu API Key de Gemini.
3. Presiona **"Probar Clave"** para verificar la conexión.
4. Presiona **"Guardar Ajustes"**. Se almacenará en el almacenamiento seguro local (`localStorage`), por lo que **no necesitas recompilar la app**.

### Opción B: Archivo `.env` (Para desarrollo Web)
Edita el archivo `.env` en la raíz del proyecto:
```env
VITE_GEMINI_API_KEY=tu_clave_aqui
```
*(Puedes obtener tu clave gratuita en [Google AI Studio](https://aistudio.google.com/apikey)).*

---

## 💻 Ejecución en Modo Web

1. Iniciar el servidor local de desarrollo:
   ```bash
   npm run dev
   ```
2. Abrir en tu navegador la URL que indique Vite (habitualmente `http://localhost:5173`).

---

## 📱 Compilar para Android (APK)

La aplicación ya tiene configurado **Capacitor** con la plataforma Android lista en la carpeta `/android`.

1. Para reconstruir los cambios web y sincronizarlos con Android:
   ```bash
   npm run build:android
   ```

2. Para abrir el proyecto en **Android Studio**:
   ```bash
   npx cap open android
   ```
   En Android Studio:
   - Ve al menú: **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   - Tu archivo APK se generará en:
     `android/app/build/outputs/apk/debug/app-debug.apk`.

3. Para compilar directamente por terminal (si tienes Java y Android SDK en tu PATH):
   ```bash
   cd android
   .\gradlew.bat assembleDebug
   ```

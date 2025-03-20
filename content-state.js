// Определяем состояния
const States = {
  IDLE: "idle",
  PRESSED: "pressed",
  RELEASED: "released",
  HELD: "held",
};

// Определяем целевую клавишу в зависимости от платформы
const isMac = navigator.platform.toLowerCase().includes("mac");
const targetKey = isMac ? "Meta" : "Control";

// Порог для двойного нажатия (в миллисекундах)
const doublePressThreshold = 300;

// Переменные для отслеживания состояния
let state = States.IDLE;
let lastTime = 0;
let lastKeyUpTime = 0;
let currentKey = null;

// Функция для сброса состояния
function resetToIdle() {
  state = States.IDLE;
  currentKey = null;
  lastTime = 0;
  lastKeyUpTime = 0;
}

// Флаг для отслеживания процесса инициализации записи
let isRecordingInitializing = false;

// Флаг для контроля создания MediaRecorder
let createMediaRecorderAllowed = false;

// Потеря фокуса окном
window.addEventListener('blur', () => {
  createMediaRecorderAllowed = false;
  console.log('Окно потеряло фокус, createMediaRecorderAllowed =', createMediaRecorderAllowed);
});

// Функция для создания и отображения маски записи
function showRecordingMask() {
  try {
    // Проверяем настройку отображения маски
    if (settings.showRecordingMask === 'false') {
      console.log('Отображение маски записи отключено в настройках');
      return;
    }

    // Проверяем, существует ли уже маска
    let mask = document.getElementById('recording-mask');
    if (!mask) {
      mask = document.createElement('div');
      mask.id = 'recording-mask';
      mask.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 0, 0.15);
        z-index: 2147483647;
        pointer-events: none;
        opacity: 0;
        transition: all 0.3s ease;
      `;
      document.body.appendChild(mask);
      
      // Даем браузеру время на добавление элемента перед анимацией
      requestAnimationFrame(() => {
        mask.style.opacity = '1';
      });
    }
  } catch (error) {
    console.error('Ошибка при создании маски записи:', error);
  }
}

// Функция для изменения цвета маски на зеленый
function changeMaskToGreen() {
  try {
    // Проверяем настройку отображения маски
    if (settings.showRecordingMask === 'false') {
      return;
    }

    const mask = document.getElementById('recording-mask');
    if (mask) {
      mask.style.backgroundColor = 'rgba(0, 255, 0, 0.15)';
    }
  } catch (error) {
    console.error('Ошибка при изменении цвета маски:', error);
  }
}

// Функция для удаления маски записи
function hideRecordingMask() {
  try {
    // Проверяем настройку отображения маски
    if (settings.showRecordingMask === 'false') {
      return;
    }

    const mask = document.getElementById('recording-mask');
    if (mask) {
      // Плавно скрываем маску
      mask.style.opacity = '0';
      
      // Удаляем элемент после завершения анимации
      setTimeout(() => {
        if (mask && mask.parentNode) {
          mask.parentNode.removeChild(mask);
        }
      }, 300);
    }
  } catch (error) {
    console.error('Ошибка при удалении маски записи:', error);
  }
}

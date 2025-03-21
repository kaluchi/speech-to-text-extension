/**
 * Сервис для работы с UI элементами
 */
class PageObjectUiService {
  constructor(pageObject) {
    this._page = pageObject;
    this._mask = null;
    this._audioPlayer = null;
    this._defaultMaskColor = 'rgba(255, 255, 0, 0.15)';
  }

  /**
   * Инициализация сервиса
   */
  init() {
    // Ничего не делаем при инициализации
  }

  /**
   * Показывает затемняющую маску над контентом
   * @param {string} color - Цвет фона маски
   * @returns {HTMLElement} - Элемент маски
   */
  showMask(color = this._defaultMaskColor) {
    const { dom } = this._page;
    
    // Если маска уже существует, просто показываем её
    if (this._mask) {
      this._mask.style.backgroundColor = color;
      this._mask.style.display = 'block';
      return this._mask;
    }
    
    // Создаем новую маску
    this._mask = dom.createElement('div', 
      { id: 'speech-to-text-mask' }, 
      {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: color,
        zIndex: '2147483647',
        pointerEvents: 'none',
        transition: 'background-color 0.3s ease'
      }
    );
    
    dom.appendToBody(this._mask);
    return this._mask;
  }

  /**
   * Скрывает затемняющую маску
   */
  hideMask() {
    const { dom } = this._page;
    
    if (this._mask) {
      dom.removeElement(this._mask);
      this._mask = null;
    }
  }

  /**
   * Изменяет цвет маски
   * @param {string} color - Новый цвет маски
   */
  changeMaskColor(color) {
    if (this._mask) {
      this._mask.style.backgroundColor = color;
    }
  }

  /**
   * Показывает аудиоплеер для тестирования записи
   * @param {Blob} audioBlob - Аудиоданные для воспроизведения
   * @returns {HTMLElement} - Элемент аудиоплеера
   */
  showAudioPlayer(audioBlob) {
    const { dom } = this._page;
    
    // Если плеер уже существует, удаляем его
    if (this._audioPlayer) {
      dom.removeElement(this._audioPlayer);
    }
    
    // Создаем новый плеер
    this._audioPlayer = dom.createElement('div', 
      { id: 'speech-to-text-audio-player' }, 
      {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'white',
        padding: '10px',
        borderRadius: '5px',
        boxShadow: '0 0 10px rgba(0,0,0,0.3)',
        zIndex: '2147483646',
        display: 'flex',
        flexDirection: 'column',
        gap: '5px'
      }
    );
    
    // Создаем аудио-элемент
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = dom.createElement('audio', 
      { 
        controls: true,
        src: audioUrl,
        autoplay: false
      }, 
      {
        width: '250px'
      }
    );
    
    // Создаем заголовок
    const title = dom.createElement('div', {}, {
      fontWeight: 'bold',
      marginBottom: '5px'
    }, window.i18n?.getTranslation('debug_audio_preview') || 'Предпросмотр записи');
    
    // Создаем кнопку закрытия
    const closeButton = dom.createElement('button', {}, {
      marginTop: '5px',
      padding: '2px 5px',
      cursor: 'pointer'
    }, window.i18n?.getTranslation('close') || 'Закрыть');
    
    // Добавляем обработчик закрытия
    dom.addEventListener(closeButton, 'click', () => {
      this.hideAudioPlayer();
      URL.revokeObjectURL(audioUrl);
    });
    
    // Собираем плеер
    dom.appendChild(this._audioPlayer, title);
    dom.appendChild(this._audioPlayer, audio);
    dom.appendChild(this._audioPlayer, closeButton);
    dom.appendToBody(this._audioPlayer);
    
    return this._audioPlayer;
  }

  /**
   * Скрывает аудиоплеер
   */
  hideAudioPlayer() {
    const { dom } = this._page;
    
    if (this._audioPlayer) {
      dom.removeElement(this._audioPlayer);
      this._audioPlayer = null;
    }
  }

  /**
   * Показывает уведомление пользователю
   * @param {string} message - Текст уведомления
   * @param {string} type - Тип уведомления ('info', 'success', 'warning', 'error')
   * @param {number} duration - Длительность показа в мс
   * @returns {HTMLElement} - Элемент уведомления
   */
  showNotification(message, type = 'info', duration = 3000) {
    const { dom } = this._page;
    
    const notification = dom.createElement('div', 
      { 
        id: `speech-to-text-notification-${Date.now()}` 
      }, 
      {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '10px 15px',
        borderRadius: '5px',
        boxShadow: '0 0 10px rgba(0,0,0,0.2)',
        zIndex: '2147483645',
        maxWidth: '300px',
        wordWrap: 'break-word',
        fontSize: '14px',
        transition: 'opacity 0.3s ease',
        opacity: '0'
      },
      message
    );
    
    // Устанавливаем цвет в зависимости от типа уведомления
    switch(type) {
      case 'success':
        notification.style.backgroundColor = '#dff0d8';
        notification.style.color = '#3c763d';
        break;
      case 'warning':
        notification.style.backgroundColor = '#fcf8e3';
        notification.style.color = '#8a6d3b';
        break;
      case 'error':
        notification.style.backgroundColor = '#f2dede';
        notification.style.color = '#a94442';
        break;
      default: // info
        notification.style.backgroundColor = '#d9edf7';
        notification.style.color = '#31708f';
    }
    
    // Добавляем на страницу
    dom.appendToBody(notification);
    
    // Анимация появления
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 10);
    
    // Автоматическое скрытие
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        dom.removeElement(notification);
      }, 300);
    }, duration);
    
    return notification;
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectUiService = PageObjectUiService;

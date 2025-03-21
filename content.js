/**
 * Объединенный файл инициализации расширения
 * Полностью использует PageObject для всех операций
 */

// Создаем объект PageObject - основной координатор всех сервисов
window.page = new PageObject();

// Инициализируем приложение
(async () => {
  try {
    // Инициализируем PageObject и все его сервисы
    await window.page.init();
    window.page.logger.info('PageObject успешно инициализирован');
    
    // Клавиатурный контроллер теперь является обычным сервисом в структуре PageObject
    window.page.logger.info('Расширение для преобразования речи в текст успешно инициализировано');
  } catch (error) {
    console.error('Ошибка при инициализации:', error);
    
    // Создаем минимальный DOM сервис для резервного режима
    class MinimalDomService {
      addDocumentEventListener(eventType, handler, options = {}) {
        document.addEventListener(eventType, handler, options);
      }
    }
    
    // Обеспечиваем минимальную функциональность в случае ошибки
    const fallbackController = function() {
      console.warn("Используется запасной контроллер клавиш из-за ошибки инициализации PageObject");
      
      // Создаем минимальный DOM сервис
      const minimalDom = new MinimalDomService();
      
      // Определяем целевую клавишу в зависимости от платформы
      const isMac = navigator.platform.toLowerCase().includes("mac");
      const targetKey = isMac ? "Meta" : "Control";
      
      // Настраиваем минимальные обработчики для базовой работы
      minimalDom.addDocumentEventListener('keydown', (event) => {
        if (event.key === targetKey) {
          console.log(`Нажата клавиша ${targetKey}, но функционал ограничен из-за ошибки инициализации`);
        }
      });
      
      console.warn("Установлены базовые обработчики клавиш. Полный функционал недоступен.");
    };
    
    fallbackController();
  }
})();

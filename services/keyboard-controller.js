/**
 * Для обратной совместимости.
 * @deprecated Используйте keyboard.js вместо этого файла
 */
console.warn('keyboard-controller.js устарел и будет удален в следующих версиях. Используйте keyboard.js');

// Перенаправляем на новый класс
window.PageObjectKeyboardControllerService = window.PageObjectKeyboardService;

/**
 * Для обратной совместимости.
 * @deprecated Используйте recorder.js вместо этого файла
 */
console.warn('recording-controller.js устарел и будет удален в следующих версиях. Используйте recorder.js');

// Перенаправляем на новый класс
window.PageObjectRecordingControllerService = window.PageObjectRecorderService;

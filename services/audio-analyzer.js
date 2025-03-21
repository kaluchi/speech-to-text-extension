/**
 * Сервис для анализа аудиоданных
 */
class PageObjectAudioAnalyzerService {
  constructor(pageObject) {
    this._page = pageObject;
    this._audioContext = null;
  }

  /**
   * Инициализация сервиса
   */
  async init() {
    const { logger } = this._page;
    
    try {
      this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
      logger.debug('AudioContext создан');
    } catch (error) {
      logger.error('Ошибка при создании AudioContext:', error);
    }
  }

  /**
   * Проверка наличия звука в аудиозаписи
   * @param {Blob} audioBlob - Аудиоданные для анализа
   * @param {number} threshold - Порог громкости (от 0 до 1)
   * @returns {Promise<boolean>} - true, если в аудио есть звук выше порога
   */
  async hasSound(audioBlob, threshold = 0.001) { // Установлен порог 0.001
    const { logger } = this._page;
    
    try {
      // Инициализируем контекст если необходимо
      if (!this._audioContext) {
        await this.init();
      }
      
      const audioData = await this._loadAudioData(audioBlob);
      
      if (!audioData) {
        logger.warn('Не удалось загрузить аудиоданные для анализа');
        return false;
      }
      
      try {
        const audioBuffer = await this._audioContext.decodeAudioData(audioData);
        const channelData = audioBuffer.getChannelData(0);
        
        // Получаем статистику аудио
        const { rms, peak } = this._calculateAudioStats(channelData);
        
        logger.debug(`Анализ аудио: RMS = ${rms}, Peak = ${peak}, Порог = ${threshold}`);
        
        // Считаем звук присутствующим, если любой показатель выше порога
        return rms > threshold || peak > threshold * 5;
      } catch (decodeError) {
        logger.error('Ошибка при декодировании аудиоданных:', decodeError);
        return false;
      }
    } catch (error) {
      logger.error('Ошибка при анализе аудио:', error);
      return false;
    }
  }

  /**
   * Расчет статистики аудиоданных
   * @param {Float32Array} channelData - Аудиоданные канала
   * @returns {Object} - Объект со статистикой
   * @private
   */
  _calculateAudioStats(channelData) {
    let sum = 0;
    let peak = 0;
    
    for (let i = 0; i < channelData.length; i++) {
      const abs = Math.abs(channelData[i]);
      sum += abs * abs;
      if (abs > peak) peak = abs;
    }
    
    return { 
      rms: Math.sqrt(sum / channelData.length),
      peak
    };
  }

  /**
   * Получение амплитудной огибающей аудио
   * @param {Blob} audioBlob - Аудиоданные для анализа
   * @param {number} segments - Количество сегментов для анализа
   * @returns {Promise<Array<number>>} - Массив значений амплитуды
   */
  async getAmplitudeEnvelope(audioBlob, segments = 50) {
    const { logger } = this._page;
    
    try {
      if (!this._audioContext) {
        await this.init();
      }
      
      const audioData = await this._loadAudioData(audioBlob);
      
      if (!audioData) {
        logger.warn('Не удалось загрузить аудиоданные для анализа огибающей');
        return new Array(segments).fill(0);
      }
      
      const audioBuffer = await this._audioContext.decodeAudioData(audioData);
      const channelData = audioBuffer.getChannelData(0);
      
      // Вычисляем огибающую
      return this._calculateEnvelope(channelData, segments);
    } catch (error) {
      logger.error('Ошибка при получении огибающей аудио:', error);
      return new Array(segments).fill(0);
    }
  }

  /**
   * Определение пауз в аудио
   * @param {Blob} audioBlob - Аудиоданные для анализа
   * @param {number} threshold - Порог громкости (от 0 до 1)
   * @param {number} minPauseDuration - Минимальная длительность паузы в секундах
   * @returns {Promise<Array<{start: number, end: number}>>} - Массив пауз
   */
  async detectSilences(audioBlob, threshold = 0.01, minPauseDuration = 0.3) {
    const { logger } = this._page;
    
    try {
      if (!this._audioContext) {
        await this.init();
      }
      
      const audioData = await this._loadAudioData(audioBlob);
      
      if (!audioData) {
        logger.warn('Не удалось загрузить аудиоданные для анализа пауз');
        return [];
      }
      
      const audioBuffer = await this._audioContext.decodeAudioData(audioData);
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      
      // Минимальная длина паузы в сэмплах
      const minPauseSamples = Math.floor(minPauseDuration * sampleRate);
      
      return this._findSilences(channelData, threshold, minPauseSamples, sampleRate);
    } catch (error) {
      logger.error('Ошибка при определении пауз в аудио:', error);
      return [];
    }
  }

  /**
   * Загрузка аудиоданных из Blob
   * @param {Blob} audioBlob - Аудиоданные
   * @returns {Promise<ArrayBuffer>} - ArrayBuffer с данными
   * @private
   */
  async _loadAudioData(audioBlob) {
    const { logger } = this._page;
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => {
        logger.error('Ошибка при чтении аудиофайла:', reader.error);
        reject(reader.error);
      };
      
      reader.readAsArrayBuffer(audioBlob);
    });
  }

  /**
   * Расчет амплитудной огибающей
   * @param {Float32Array} channelData - Аудиоданные канала
   * @param {number} segments - Количество сегментов
   * @returns {Array<number>} - Массив значений огибающей
   * @private
   */
  _calculateEnvelope(channelData, segments) {
    const segmentSize = Math.floor(channelData.length / segments);
    const envelope = [];
    
    for (let i = 0; i < segments; i++) {
      const start = i * segmentSize;
      const end = start + segmentSize;
      let max = 0;
      
      for (let j = start; j < end && j < channelData.length; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > max) max = abs;
      }
      
      envelope.push(max);
    }
    
    return envelope;
  }

  /**
   * Поиск пауз в аудио
   * @param {Float32Array} channelData - Аудиоданные канала
   * @param {number} threshold - Порог громкости
   * @param {number} minPauseSamples - Минимальная длина паузы в сэмплах
   * @param {number} sampleRate - Частота дискретизации
   * @returns {Array<{start: number, end: number}>} - Массив пауз
   * @private
   */
  _findSilences(channelData, threshold, minPauseSamples, sampleRate) {
    const silences = [];
    let silenceStart = null;
    
    for (let i = 0; i < channelData.length; i++) {
      const amplitude = Math.abs(channelData[i]);
      
      if (amplitude < threshold) {
        // Начало тишины
        if (silenceStart === null) {
          silenceStart = i;
        }
      } else {
        // Конец тишины
        if (silenceStart !== null) {
          const duration = i - silenceStart;
          
          if (duration >= minPauseSamples) {
            silences.push({
              start: silenceStart / sampleRate,
              end: i / sampleRate,
              duration: duration / sampleRate
            });
          }
          
          silenceStart = null;
        }
      }
    }
    
    // Проверяем, не закончилась ли запись тишиной
    if (silenceStart !== null) {
      const duration = channelData.length - silenceStart;
      
      if (duration >= minPauseSamples) {
        silences.push({
          start: silenceStart / sampleRate,
          end: channelData.length / sampleRate,
          duration: duration / sampleRate
        });
      }
    }
    
    return silences;
  }
}

// Экспортируем класс в глобальную область видимости
window.PageObjectAudioAnalyzerService = PageObjectAudioAnalyzerService;

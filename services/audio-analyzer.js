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
    try {
      this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this._page.logger.debug('AudioContext создан');
    } catch (error) {
      this._page.logger.error('Ошибка при создании AudioContext:', error);
    }
  }

  /**
   * Проверка наличия звука в аудиозаписи
   * @param {Blob} audioBlob - Аудиоданные для анализа
   * @param {number} threshold - Порог громкости (от 0 до 1)
   * @returns {Promise<boolean>} - true, если в аудио есть звук выше порога
   */
  async hasSound(audioBlob, threshold = 0.001) { // Установлен порог 0.001
    try {
      // Убираем проверку на размер аудио - всегда анализируем содержимое
      
      if (!this._audioContext) {
        await this.init();
      }
      
      const audioData = await this._loadAudioData(audioBlob);
      
      if (!audioData) {
        console.warn('Не удалось загрузить аудиоданные для анализа');
        return false; // В случае ошибки считаем, что звука нет
      }
      
      try {
        const audioBuffer = await this._audioContext.decodeAudioData(audioData);
        const channelData = audioBuffer.getChannelData(0); // Берем первый канал
        
        // Анализируем среднеквадратичное значение амплитуды
        const rms = this._calculateRMS(channelData);
        
        // Анализируем пиковую амплитуду
        const peak = this._calculatePeak(channelData);
        
        console.log(`Анализ аудио: RMS = ${rms}, Peak = ${peak}, Порог = ${threshold}`);
        
        // Считаем звук присутствующим, если либо RMS, либо пиковая амплитуда выше порога
        return rms > threshold || peak > threshold * 5;
      } catch (decodeError) {
        console.error('Ошибка при декодировании аудиоданных:', decodeError);
        return false; // В случае ошибки декодирования считаем, что звука нет
      }
    } catch (error) {
      console.error('Ошибка при анализе аудио:', error);
      return false; // В случае любой ошибки считаем, что звука нет
    }
  }

  /**
   * Получение амплитудной огибающей аудио
   * @param {Blob} audioBlob - Аудиоданные для анализа
   * @param {number} segments - Количество сегментов для анализа
   * @returns {Promise<Array<number>>} - Массив значений амплитуды
   */
  async getAmplitudeEnvelope(audioBlob, segments = 50) {
    try {
      if (!this._audioContext) {
        await this.init();
      }
      
      const audioData = await this._loadAudioData(audioBlob);
      
      if (!audioData) {
        this._page.logger.warn('Не удалось загрузить аудиоданные для анализа огибающей');
        return new Array(segments).fill(0);
      }
      
      const audioBuffer = await this._audioContext.decodeAudioData(audioData);
      const channelData = audioBuffer.getChannelData(0);
      
      // Вычисляем огибающую
      return this._calculateEnvelope(channelData, segments);
    } catch (error) {
      this._page.logger.error('Ошибка при получении огибающей аудио:', error);
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
    try {
      if (!this._audioContext) {
        await this.init();
      }
      
      const audioData = await this._loadAudioData(audioBlob);
      
      if (!audioData) {
        this._page.logger.warn('Не удалось загрузить аудиоданные для анализа пауз');
        return [];
      }
      
      const audioBuffer = await this._audioContext.decodeAudioData(audioData);
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      
      // Минимальная длина паузы в сэмплах
      const minPauseSamples = Math.floor(minPauseDuration * sampleRate);
      
      return this._findSilences(channelData, threshold, minPauseSamples, sampleRate);
    } catch (error) {
      this._page.logger.error('Ошибка при определении пауз в аудио:', error);
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
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => {
        console.error('Ошибка при чтении аудиофайла:', reader.error);
        reject(reader.error);
      };
      
      reader.readAsArrayBuffer(audioBlob);
    });
  }

  /**
   * Расчет среднеквадратичного значения (RMS) аудиоданных
   * @param {Float32Array} channelData - Аудиоданные канала
   * @returns {number} - RMS значение (от 0 до 1)
   * @private
   */
  _calculateRMS(channelData) {
    let sum = 0;
    
    for (let i = 0; i < channelData.length; i++) {
      sum += channelData[i] * channelData[i];
    }
    
    const rms = Math.sqrt(sum / channelData.length);
    return rms;
  }

  /**
   * Расчет пиковой амплитуды
   * @param {Float32Array} channelData - Аудиоданные канала
   * @returns {number} - Пиковое значение (от 0 до 1)
   * @private
   */
  _calculatePeak(channelData) {
    let peak = 0;
    
    for (let i = 0; i < channelData.length; i++) {
      const abs = Math.abs(channelData[i]);
      if (abs > peak) {
        peak = abs;
      }
    }
    
    return peak;
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

// Обработчик keydown
document.addEventListener("keydown", (event) => {
  const currentTime = performance.now();

  if (event.key !== targetKey) {
    if (state !== States.IDLE) {
      console.log(`Нажата не целевая клавиша: ${event.key}, Сброс в Idle`);
      if (state === States.HELD) {
        stopRecording();
      }
      resetToIdle();
    }
    return;
  }

  switch (state) {
    case States.IDLE:
      state = States.PRESSED;
      currentKey = event.key;
      lastTime = currentTime;
      console.log(`Нажатие: ${event.key} (Pressed)`);
      break;

    case States.RELEASED:
      if (currentTime - lastKeyUpTime <= doublePressThreshold) {
        state = States.HELD;
        lastTime = currentTime;
        console.log(`Нажатие: ${event.key} (Удержание - Обнаружено двойное нажатие)`);
        startRecording();
      } else {
        state = States.PRESSED;
        lastTime = currentTime;
        console.log(`Нажатие: ${event.key} (Pressed - Слишком медленно)`);
      }
      break;

    case States.PRESSED:
    case States.HELD:
      break;

    default:
      break;
  }
});

// Обработчик keyup
document.addEventListener("keyup", (event) => {
  const keyUpTime = performance.now();

  if (event.key !== targetKey) {
    if (state !== States.IDLE) {
      console.log(`Отпущена не целевая клавиша: ${event.key}, Сброс в Idle`);
      if (state === States.HELD) {
        stopRecording();
      }
      resetToIdle();
    }
    return;
  }

  if (event.key === currentKey) {
    switch (state) {
      case States.PRESSED:
        state = States.RELEASED;
        lastKeyUpTime = keyUpTime;
        const duration = (keyUpTime - lastTime).toFixed(2);
        console.log(`Отпускание: ${event.key}, Время удержания: ${duration}мс (Released)`);
        break;

      case States.HELD:
        state = States.IDLE;
        const heldDuration = (keyUpTime - lastTime).toFixed(2);
        console.log(`Отпускание: ${event.key}, Время удержания в Held: ${heldDuration}мс`);
        stopRecording();
        resetToIdle();
        break;

      default:
        break;
    }
  }
});

// Обработчик сообщений от popup.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("Получено сообщение в content script:", request);
  
  if (request.command === "checkMicrophoneStatus") {
    // Проверяем доступ к микрофону
    checkMicrophonePermission()
      .then(result => {
        console.log("Результат проверки доступа к микрофону:", result);
        sendResponse(result);
      })
      .catch(error => {
        console.error("Ошибка при проверке доступа к микрофону:", error);
        sendResponse({
          hasAccess: false,
          errorMessage: getErrorMessageForMicrophone(error)
        });
      });
      
    // Необходимо вернуть true для асинхронной отправки ответа
    return true;
  }
});

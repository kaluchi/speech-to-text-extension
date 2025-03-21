# Voice Input with ElevenLabs - Chrome Extension

A Chrome extension that enables you to use ElevenLabs speech recognition technology for voice input in any text field on a web page.

## Important: API Key

⚠️ This extension is provided without an API key. To use it, you must:

1. Register on the [ElevenLabs website](https://elevenlabs.io/)
2. Go to "Profile Settings"
3. Find or generate your API key
4. Carefully review the [Privacy Policy](https://elevenlabs.io/privacy) and [Terms of Service](https://elevenlabs.io/terms)
   - ElevenLabs may store and analyze submitted audio recordings
   - Your voice data may be used to improve the service
   - Usage limitations apply depending on your account type

We recommend:
- Using a unique API key for this extension
- Regularly updating your key for security purposes
- Monitoring your key usage in your ElevenLabs dashboard
- If necessary, restricting key usage by IP or setting other limitations in ElevenLabs settings

## Features

- Activate voice recording with a double press and hold of the Cmd key (Mac) or Ctrl key (Windows/Linux)
- Convert speech to text using the ElevenLabs API
- Customizable recognition language (Russian, English, and others)
- Insert recognized text into the active text field with context awareness
- Automatically copy to clipboard if no active input field is present
- Visual recording process indication (customizable)
- Automatic settings page opening when API key is missing
- Support for insertion undo (Cmd+Z / Ctrl+Z)
- Advanced recognition settings:
  - Sound event marking (laughter, applause, etc.)
  - Timestamps for words or characters
  - Speaker identification in dialogues
  - Speaker count specification (up to 32)
  - Keywords to improve recognition accuracy
  - Preferred microphone selection
  - Audio recording debugging
  - Visual recording indication customization

## Service Architecture (PageObject Pattern)

The extension uses the PageObject pattern to encapsulate interaction with DOM, browser API, and other external services.

### Main advantages of the architecture:

1. **Modularity** - each service is responsible for its area
2. **Encapsulation** - complexities of working with DOM and browser APIs are hidden
3. **Improved testability** - modules can be tested in isolation
4. **Cleaner code** without primitive DOM manipulations
5. **Easier maintenance** - functionality is divided into logical blocks

### Project structure:

```
/
├── core/                        # Application core
│   ├── page-object.js           # Main PageObject class - service coordinator
│   └── localization.js          # Core localization module
├── services/                    # Services encapsulating functionality
│   ├── logger.js                # Logging service
│   ├── chrome.js                # Chrome API service
│   ├── i18n.js                  # Internationalization service
│   ├── settings.js              # Settings service
│   ├── dom.js                   # DOM service
│   ├── events.js                # Events service
│   ├── media.js                 # Media service (audio)
│   ├── ui.js                    # UI elements service
│   ├── text.js                  # Text insertion service
│   ├── clipboard.js             # Clipboard service
│   ├── notifications.js         # Notifications service
│   ├── audio-analyzer.js        # Audio analysis service
│   ├── speech-api.js            # Speech recognition API service
│   └── keyboard-controller.js   # Keyboard events service
├── content.js                   # Content script entry point
├── background.js                # Background script
├── popup.html/js                # Extension popup window
├── options.html/js              # Extension settings page
└── manifest.json                # Extension manifest
```

## Using PageObject

```javascript
// In the main content script, PageObject is available through the global variable window.page
// Created during initialization in content.js

// Examples of using various services:

// Logging
window.page.logger.info('Information message');
window.page.logger.error('Error', errorObject);

// Working with events
window.page.events.onKeyDown('Control', (event, currentTime) => {
  // Handle Control key press
});

// Working with media
const stream = await window.page.media.getAudioStream();
const recorder = window.page.media.createRecorder(stream);
window.page.media.startRecording();

// Text insertion
await window.page.text.insertText('Recognized text');

// UI management
window.page.ui.showMask();
window.page.ui.changeMaskColor('rgba(0, 255, 0, 0.15)');
window.page.ui.hideMask();

// Working with settings
const apiKey = await window.page.settings.getValue('apiKey');
await window.page.settings.checkApiKey();

// Localization
const message = window.page.i18n.getTranslation('key_name');
window.page.i18n.setLanguage('en');
window.page.i18n.applyTranslations(document.querySelector('.my-element'));
```

## Extension Installation

1. Download all files into a single folder on your computer
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer Mode" (toggle in the top right corner of the page)
4. Click the "Load unpacked extension" button
5. Select the folder containing the extension files

## Usage

1. Go to any web page and place your cursor in a text field
2. Quickly double-press and hold Cmd (Mac) or Ctrl (Windows/Linux)
3. Speak while holding the key
4. Release the key to finish recording
5. The recognized text will be inserted into the active field with undo capability (Cmd+Z / Ctrl+Z)

## Extension Configuration

The extension provides a user-friendly interface for configuration:

1. Click on the extension icon in the Chrome toolbar
2. Click the "Open Settings" button
3. In the settings page that opens, first specify:
   - ElevenLabs API key (required)
     - Get the key from the ElevenLabs website (see "Important: API Key" section)
     - The key field is hidden by default for security
     - The "Show" button allows you to view and edit the key
     - The field automatically shows when validation errors occur
     - Visual error indication with animation
   - Speech recognition language
   - Enable/disable sound event marking
   - Timestamp detail level (disabled/by words/by characters)
   - Speaker identification in dialogues
   - Maximum number of speakers (1-32)
   - Keywords to improve recognition (up to 100 words)
   - Preferred microphone for faster recording startup
   - Audio recording debugging (playback of recording)
   - Visual recording process indication

## Requirements

- Chrome version 80 or higher
- Microphone access
- Valid ElevenLabs API key (registration required)
- Internet connection for sending audio to the ElevenLabs API
- HTTPS connection for clipboard functionality
- Agreement with ElevenLabs' privacy policy and terms of service

## Security and Privacy

- The extension does not store or transmit data to third parties other than ElevenLabs
- Audio recordings are sent directly to the ElevenLabs API
- API key is stored locally in the browser in encrypted form
- We recommend regularly checking key usage in your ElevenLabs dashboard
- If you suspect your key has been compromised, immediately replace it in the extension settings and deactivate the old key in ElevenLabs

## Operational Features

The extension considers context when inserting text:

- If the cursor is after a punctuation mark (., !, ?), a space is added before insertion
- If the cursor is after a line break character, text is inserted without additional formatting
- In other cases, ". " is added before the inserted text to separate thoughts

When no active input field is present:
- Recognized text is automatically copied to the clipboard
- A notification of successful copying is displayed

Visual recording indication:
- Yellow overlay during recording initialization
- Green overlay during active recording
- Can be disabled in settings

API key verification:
- When attempting to start recording, the presence and validity of the API key is checked
- If the key is missing or invalid, the settings page opens automatically
- The key input field is automatically shown and focused when an error occurs
- Recording will not start until a valid API key is provided

## Code Working Principles

- Preferably divide large functions into smaller specialized ones
- Each function should have a single responsibility
- Minimize code duplication
- Improve readability and maintainability
- Maximum refactoring size: up to 100 lines of code at a time

## Code Management

- Use git for version control
- Make each change as a separate commit with an informative message
- Preferred commit format: "Refactoring: [brief description of changes]"

## Limitations

- Does not work on Chrome system pages (chrome://)
- Requires microphone access permission
- Free ElevenLabs account limitations may apply to speech recognition
- Clipboard copying may be restricted on some websites for security reasons

## Troubleshooting

If you experience issues with the extension:

1. Check if microphone access is enabled for the extension
2. Ensure your ElevenLabs API key is valid
3. Check the developer console for errors (F12 -> Console tab)
4. Try reloading the extension on the chrome://extensions/ page
5. If text is not copied to the clipboard:
   - Make sure the page is loaded via HTTPS
   - Check if copying is allowed on the current site
   - Try using a different browser or update your current one

## API Documentation

The extension uses the ElevenLabs Speech-to-Text API. Full documentation is available at:
https://elevenlabs.io/docs/api-reference/speech-to-text/convert
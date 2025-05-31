# ElevenLabs React Native Voice AI POC

This project is a React Native Proof of Concept (POC) application that demonstrates:
- Text-to-Speech (TTS) using the ElevenLabs API.
- Streaming audio data from ElevenLabs.
- Saving streamed audio to a local WAV file.
- Playing back the local audio file.
- A simple UI with a text input and a visual animation during audio playback.

## Features

- **Text Input**: Users can type text into an auto-resizing input field.
- **ElevenLabs TTS**: Converts the input text to speech using a specified voice from ElevenLabs.
- **Audio Streaming & Saving**: Audio is streamed from ElevenLabs as PCM data, converted to a WAV file, and saved locally in the app's document directory.
- **Audio Playback**: The saved WAV file is played back using `react-native-sound-player`.
- **Playback Animation**: A visual animation (`PlayingAnimator` component) is displayed while audio is playing.
- **Loading Indicator**: Shows an activity indicator during TTS generation and initial audio loading.
- **Cross-Platform**: Designed for iOS and Android (though primary testing and troubleshooting has focused on iOS).

## High-Level Architecture

1.  **UI (`App.tsx`, `AutoResizingTextInput.tsx`):**
    *   `App.tsx` is the main component, managing state for loading, audio playback, and user input.
    *   `AutoResizingTextInput.tsx` provides the text input field and a send button.
    *   `PlayingAnimator.tsx` displays a visual cue when audio is playing.

2.  **TTS Service (`services/elevenLabs.ts`):
    *   The `generateSpeech` function orchestrates the TTS process.
    *   It makes a POST request to the ElevenLabs `/text-to-speech/{voice_id}/stream` endpoint.
    *   The API key and voice ID are configured in `App.tsx` (currently hardcoded, should be moved to a config/env file for production).
    *   **Streaming & File Handling:**
        *   `RNFetchBlob` is used to stream the audio data from ElevenLabs and save it initially as a raw PCM file (`.pcm`).
        *   A WAV header is pre-pended to a `.wav` file.
        *   The PCM data is progressively read from the `.pcm` file and appended to the `.wav` file.
        *   Once the stream is complete, the PCM file is fully appended to the WAV file, and the WAV header (RIFF size, data chunk size) is updated with the correct file sizes.
        *   The temporary `.pcm` file is then deleted.
    *   The function returns a promise that resolves with the local file path to the final `.wav` file.

3.  **Audio Playback (`App.tsx` with `react-native-sound-player`):
    *   When the `generateSpeech` function successfully returns the `wavPath`:
        *   `App.tsx` constructs a `file:///` URL from the `wavPath`.
        *   `SoundPlayer.playUrl(url)` is called to play the audio.
    *   Event listeners (`FinishedLoadingURL`, `FinishedPlaying`) are attached to `SoundPlayer` to manage the `isAudioPlaying` state, which in turn controls the `PlayingAnimator` visibility and handles errors.
    *   `SoundPlayer.stop()` is called before starting a new playback to prevent overlapping audio.

## Setup & Running

1.  **Prerequisites:**
    *   Node.js (LTS version recommended)
    *   Yarn or npm
    *   React Native development environment set up (see [React Native Environment Setup](https://reactnative.dev/docs/environment-setup))
    *   CocoaPods (for iOS)
    *   An ElevenLabs API Key

2.  **Installation:**
    ```bash
    git clone <your-repository-url>
    cd <your-project-directory>
    npm install
    # or
    yarn install

    # For iOS, install pods
    cd ios
    pod install
    cd ..
    ```

3.  **Configuration:**
    *   Open `App.tsx`.
    *   Locate the `ELEVEN_API_KEY` constant.
    *   Replace the placeholder string with your actual ElevenLabs API key.
        ```javascript
        const ELEVEN_API_KEY = 'YOUR_ELEVENLABS_API_KEY_HERE';
        ```
    *   You can also change the `VOICE_ID` if desired.

4.  **Running the App:**
    *   **iOS:**
        ```bash
        npx react-native run-ios
        # Or open the .xcworkspace in Xcode and run from there.
        ```
    *   **Android:**
        ```bash
        npx react-native run-android
        ```

## Key Dependencies

*   `react-native`: Core framework.
*   `react-native-sound-player`: For playing audio files.
*   `react-native-blob-util`: For network requests (streaming) and file system access (saving audio).
*   `buffer`: Polyfill for Node.js Buffer API, used in `elevenLabs.ts` for manipulating WAV header data.

## Code Structure

```
.Eleven/
├── App.tsx                   # Main application component, UI logic, playback control
├── components/
│   ├── AutoResizingTextInput.tsx # Text input component
│   └── PlayingAnimator.tsx     # Animation component for playback
├── services/
│   └── elevenLabs.ts         # ElevenLabs API interaction, audio streaming, WAV creation
├── ios/                        # iOS native project
├── android/                    # Android native project
├── src/
│   └── types/                  # TypeScript declaration files (e.g., for modules without native types)
├── package.json
└── README.md                   # This file
```

## Notes & Potential Improvements

*   **API Key Management**: The ElevenLabs API key is currently hardcoded. For a real application, this should be moved to a secure configuration file (e.g., `.env`) and not committed to version control.
*   **Error Handling**: Error handling can be further improved, especially for network issues and API errors from ElevenLabs.
*   **Advanced Animation**: The current `PlayingAnimator` is basic. 
*   **Audio Format Configuration**: The output format (`pcm_16000`) is hardcoded. This could be made configurable.
*   **Background Audio**: Current setup might not support background audio playback robustly without additional configuration (e.g., using a dedicated background audio library like `react-native-track-player`).
*   **UI/UX**: The UI is minimalistic. Further enhancements could include message history, voice selection, etc.
*   **TypeScript Declarations**: Some modules might require manual `.d.ts` files if they don't ship with their own types (e.g., `src/types/react-native-sound-player.d.ts` was created during development).
*   **Streaming to Player Directly**: The current implementation saves the entire file then plays. True streaming (playing chunks as they arrive without saving the whole file first, or playing directly from the stream to the audio output) with `react-native-sound-player` might be complex or not fully supported. `react-native-track-player` might be better suited for advanced streaming and background audio.

## Troubleshooting History (Brief Overview)

During development, several issues were addressed:
*   **Module Not Found (TypeScript):** For libraries like `react-native-vector-icons`, `react-native-blob-util`, `react-native-sound-player`, manual TypeScript declaration files (`.d.ts`) or `npm install @types/...` were needed.
*   **iOS Build Failures (CocoaPods, Native Modules):** Issues with `react-native-reanimated` (related to New Architecture / `RCT_NEW_ARCH_ENABLED` flag) and `react-native-blob-util` (codegen issues) required version pinning, `pod deintegrate`, `pod install --repo-update`, and modifications to the `Podfile` to disable New Architecture for specific pods or globally.
*   **NativeWind Styling:** Initial use of NativeWind for styling caused issues with `className` props when NativeWind was later removed/misconfigured. Styles were converted to `StyleSheet`.
*   **Audio Playback Logic (`onReadyForPlayback`):** The initial implementation for `onReadyForPlayback` in `elevenLabs.ts` was too optimistic for short audio files. It was simplified to call `SoundPlayer.playUrl` only after the entire WAV file is generated and saved, ensuring reliability.
*   **`react-native-sound-player` Event Handling:** Ensured correct event listeners are used and `setIsAudioPlaying` is toggled appropriately.

This README should provide a good starting point for understanding and working with the project.

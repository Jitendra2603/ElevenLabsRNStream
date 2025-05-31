/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  View,
  Platform,
  StatusBar,
  ActivityIndicator,
  StyleSheet,
  EmitterSubscription,
} from 'react-native';
import AutoResizingInput from './components/AutoResizingTextInput';
import PlayingAnimator from './components/PlayingAnimator';
import { generateSpeech } from './services/elevenLabs';
import SoundPlayer from 'react-native-sound-player';


// No specific category API; iOS uses AVAudioSession by default.

const ELEVEN_API_KEY = ''; // TEMP hardcoded
const VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'; // Default voice

export default function App() {
  const [loading, setLoading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const finishedPlayingSubscription = useRef<EmitterSubscription | null>(null);
  const finishedLoadingURLSubscription = useRef<EmitterSubscription | null>(null);
  const finishedLoadingFileSubscription = useRef<EmitterSubscription | null>(null);

  useEffect(() => {
    console.log('Setting up SoundPlayer event listeners...');

    finishedPlayingSubscription.current = SoundPlayer.addEventListener('FinishedPlaying', (event: { success?: boolean, error?: any }) => {
      console.log('SoundPlayer Event: FinishedPlaying', event);
      setIsAudioPlaying(false);
      if (event.error) {
        Alert.alert('Playback Error', `FinishedPlaying reported an error: ${JSON.stringify(event.error)}`);
      }
    });

    finishedLoadingURLSubscription.current = SoundPlayer.addEventListener('FinishedLoadingURL', (event: { success?: boolean, url?: string, error?: any }) => {
      console.log('SoundPlayer Event: FinishedLoadingURL', event);
      if (event.success && event.url) {
        console.log('Finished loading URL, playback should start automatically by the library for URL:', event.url);
        setIsAudioPlaying(true);
      } else {
        console.error('Failed to load URL for playback', event);
        setIsAudioPlaying(false);
        Alert.alert('Playback Error', `Could not load audio for playback. URL: ${event.url}, Error: ${JSON.stringify(event.error)}`);
      }
    });

    finishedLoadingFileSubscription.current = SoundPlayer.addEventListener('FinishedLoadingFile', (event: { success?: boolean, path?: string, error?: any }) => {
      console.log('SoundPlayer Event: FinishedLoadingFile', event);
       if (event.success && event.path) {
        console.log('Finished loading file, playback should start automatically by the library for path:', event.path);
        setIsAudioPlaying(true);
      } else {
        console.error('Failed to load file for playback', event);
        setIsAudioPlaying(false);
        Alert.alert('Playback Error', `Could not load audio file for playback. Path: ${event.path}, Error: ${JSON.stringify(event.error)}`);
      }
    });

    return () => {
      console.log('Removing SoundPlayer event listeners...');
      finishedPlayingSubscription.current?.remove();
      finishedLoadingURLSubscription.current?.remove();
      finishedLoadingFileSubscription.current?.remove();
    };
  }, []);

  const handleSpeak = async (text: string) => {
    if (!text.trim()) {
      Alert.alert('Input required', 'Please enter some text to speak.');
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    try {
      console.log('Requesting speech for:', text);
      // Stop any currently playing audio before starting a new one
      try {
        SoundPlayer.stop();
      } catch (e) {
        /* ignore */
      }

      const filePath = await generateSpeech({
        text,
        voiceId: VOICE_ID,
        apiKey: ELEVEN_API_KEY,
      });
      console.log('TTS saved at:', filePath);

      const url = filePath.startsWith('file://') ? filePath : `file://${filePath}`;
      console.log('Playing final audio file:', url);
      SoundPlayer.playUrl(url);
      setIsAudioPlaying(true);

    } catch (error) {
      console.error('TTS Generation/Playback Error:', error);
      setIsAudioPlaying(false);
      Alert.alert('Error', 'Failed to generate or play speech. Please check your API key and network.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'light-content' : 'dark-content'} backgroundColor="#000000" />
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        enabled
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} style={styles.flexOne}>
          <View style={styles.appContainer}>
            <View style={styles.animationContainer}>
              <PlayingAnimator isPlaying={isAudioPlaying} />
            </View>

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            )}
            <AutoResizingInput onSend={handleSpeak} placeholder="Type to speak..." />
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardAvoiding: {
    flex: 1,
    backgroundColor: '#000000',
  },
  flexOne: {
    flex: 1,
  },
  appContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#000000',
  },
  animationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1,
  },
});

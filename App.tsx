/**
 * Eleven – React Native ElevenLabs TTS demo (streaming with TrackPlayer)
 */

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  View,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import TrackPlayer, { usePlaybackState, State } from 'react-native-track-player';
import AutoResizingInput from './components/AutoResizingTextInput';
import PlayingAnimator from './components/PlayingAnimator';
import { setupTrackPlayer } from './services/trackPlayerSetup';
import { streamingTts } from './services/streamingTts';

const ELEVEN_API_KEY = '';
const VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';

export default function App() {
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const playbackState = usePlaybackState();

  // Initialize TrackPlayer once
  useEffect(() => {
    setupTrackPlayer().catch(err => console.error('TrackPlayer init error', err));
    return () => {
      // Only cleanup if app is actually unmounting
      streamingTts.stop().catch(() => {});
    };
  }, []);

  // Update isPlaying based on TrackPlayer state
  useEffect(() => {
    const playing = playbackState?.state === State.Playing;
    setIsPlaying(playing);
  }, [playbackState]);

  const handleSpeak = async (text: string) => {
    if (!text.trim()) {
      Alert.alert('Input required', 'Please type something to speak.');
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    
    try {
      await streamingTts.startStreaming({
        text,
        voiceId: VOICE_ID,
        apiKey: ELEVEN_API_KEY,
        onPlaybackStart: () => {
          setLoading(false);
          console.log('Playback started');
        },
        onPlaybackEnd: () => {
          setIsPlaying(false);
          console.log('Playback ended');
        },
        onError: (error) => {
          console.error('Streaming error:', error);
          Alert.alert('TTS error', error.message);
          setLoading(false);
          setIsPlaying(false);
        },
      });
    } catch (e: any) {
      console.error(e);
      Alert.alert('TTS error', String(e?.message ?? e));
      setLoading(false);
      setIsPlaying(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} style={styles.flex}>
          <View style={styles.container}>
            <View style={styles.animWrapper}>
              <PlayingAnimator isPlaying={isPlaying} />
            </View>
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}
            <AutoResizingInput onSend={handleSpeak} placeholder="Type to speak…" />
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#000' },
  animWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});

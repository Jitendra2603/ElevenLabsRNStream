import TrackPlayer, { Track, State, usePlaybackState, useTrackPlayerEvents, Event } from 'react-native-track-player';
import { generateSpeech } from './elevenLabs';
import { audioProxy } from './audioProxy';
import { Buffer } from 'buffer';

interface StreamingTtsOptions {
  text: string;
  voiceId: string;
  apiKey: string;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onError?: (error: Error) => void;
}

class StreamingTtsService {
  private chunkCounter = 0;
  private isGenerating = false;
  private audioQueue: string[] = [];
  private currentTrackIndex = 0;
  private pcmBuffer: Buffer = Buffer.alloc(0);
  private readonly chunkSize = 64 * 1024; // 64KB chunks (~2 seconds at 16kHz)

  async startStreaming(options: StreamingTtsOptions): Promise<void> {
    const { text, voiceId, apiKey, onPlaybackStart, onPlaybackEnd, onError } = options;
    
    try {
      // Clear any existing queue
      await this.cleanup();
      await TrackPlayer.reset();
      
      this.isGenerating = true;
      this.chunkCounter = 0;
      this.currentTrackIndex = 0;
      this.pcmBuffer = Buffer.alloc(0);
      this.audioQueue = [];

      // Start generating speech
      console.log(`Starting TTS generation for text: "${text.substring(0, 50)}..."`);
      await generateSpeech({
        text,
        voiceId,
        apiKey,
        onPcm: async (chunk: Buffer) => {
          if (chunk.length === 0) {
            console.warn('Received empty PCM chunk, skipping');
            return;
          }
          console.log(`Received PCM chunk: ${chunk.length} bytes`);
          await this.handlePcmChunk(chunk, onPlaybackStart);
        },
      });
      console.log('TTS generation completed');

      // Process any remaining buffer
      if (this.pcmBuffer.length > 0) {
        console.log(`Processing final buffer: ${this.pcmBuffer.length} bytes`);
        await this.createAndAddChunk(this.pcmBuffer);
        
        // If we haven't started playing yet (only small chunks), start now
        if (this.audioQueue.length > 0 && this.currentTrackIndex === 0) {
          console.log('Starting playback with final chunks');
          await TrackPlayer.play();
          onPlaybackStart?.();
        }
      }

      this.isGenerating = false;
      
      // Auto-cleanup after playback
      this.setupAutoCleanup(onPlaybackEnd);
      
    } catch (error) {
      this.isGenerating = false;
      onError?.(error as Error);
      throw error;
    }
  }

  private async handlePcmChunk(chunk: Buffer, onPlaybackStart?: () => void): Promise<void> {
    // Add to buffer
    this.pcmBuffer = Buffer.concat([this.pcmBuffer, chunk]);
    console.log(`Buffer size: ${this.pcmBuffer.length}, target: ${this.chunkSize}`);

    // If buffer is large enough, create a chunk
    while (this.pcmBuffer.length >= this.chunkSize) {
      const chunkToProcess = this.pcmBuffer.slice(0, this.chunkSize);
      this.pcmBuffer = this.pcmBuffer.slice(this.chunkSize);
      
      await this.createAndAddChunk(chunkToProcess);
      
      // Start playback after we have 1 chunk buffered (faster response)
      if (this.audioQueue.length === 1 && this.currentTrackIndex === 0) {
        console.log('Starting playback with 1 chunk buffered');
        await TrackPlayer.play();
        onPlaybackStart?.();
      }
    }
  }

  private async createAndAddChunk(pcmData: Buffer): Promise<void> {
    const chunkId = `chunk_${Date.now()}_${this.chunkCounter++}`;
    
    try {
      const fileUrl = await audioProxy.createAudioChunk(chunkId, pcmData);
      
      const track: Track = {
        id: chunkId,
        url: fileUrl,
        title: `Speech Chunk ${this.chunkCounter}`,
        artist: 'ElevenLabs TTS',
      };

      await TrackPlayer.add(track);
      this.audioQueue.push(chunkId);
      
      console.log(`Added chunk ${chunkId} to queue. Queue length: ${this.audioQueue.length}`);
    } catch (error) {
      console.error('Failed to create audio chunk:', error);
    }
  }

  private setupAutoCleanup(onPlaybackEnd?: () => void): void {
    let cleanupTimeout: NodeJS.Timeout;
    let hasEnded = false;

    // Monitor playback state - but be less aggressive about cleanup
    const checkPlayback = setInterval(async () => {
      try {
        const queue = await TrackPlayer.getQueue();
        const currentTrack = await TrackPlayer.getCurrentTrack();
        const playbackState = await TrackPlayer.getPlaybackState();
        
        // Only cleanup old tracks, not the entire queue
        if (currentTrack !== null && queue.length > 2) {
          const currentIndex = queue.findIndex(track => track.id === currentTrack);
          
          // Clean up tracks that are no longer needed (2 tracks behind current)
          if (currentIndex > 1) {
            const tracksToRemove = queue.slice(0, currentIndex - 1);
            for (const track of tracksToRemove) {
              await audioProxy.cleanupChunk(track.id!);
              await TrackPlayer.remove(track.id!);
            }
            console.log(`Cleaned up ${tracksToRemove.length} old tracks`);
          }
        }
        
        // Only do full cleanup if generation is completely done AND queue is empty AND we're stopped
        if (!this.isGenerating && queue.length === 0 && 
            (playbackState.state === State.Stopped || playbackState.state === State.None) && 
            !hasEnded) {
          hasEnded = true;
          clearInterval(checkPlayback);
          
          // Add a delay before final cleanup to ensure everything has finished
          cleanupTimeout = setTimeout(async () => {
            await this.cleanup();
            onPlaybackEnd?.();
            console.log('Playback fully completed');
          }, 1000);
        }
      } catch (error) {
        console.error('Cleanup check error:', error);
      }
    }, 3000); // Check less frequently

    // Stop checking after 10 minutes as failsafe
    setTimeout(() => {
      if (cleanupTimeout) clearTimeout(cleanupTimeout);
      clearInterval(checkPlayback);
    }, 10 * 60 * 1000);
  }

  async stop(): Promise<void> {
    this.isGenerating = false;
    await TrackPlayer.stop();
    await this.cleanup();
  }

  async cleanup(): Promise<void> {
    try {
      // Clear TrackPlayer queue
      await TrackPlayer.reset();
      
      // Cleanup all audio files
      await audioProxy.cleanup();
      
      // Reset state
      this.audioQueue = [];
      this.currentTrackIndex = 0;
      this.chunkCounter = 0;
      this.pcmBuffer = Buffer.alloc(0);
      
      console.log('StreamingTts cleanup completed');
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

export const streamingTts = new StreamingTtsService(); 
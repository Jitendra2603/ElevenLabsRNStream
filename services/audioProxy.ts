import { NativeModules } from 'react-native';
import RNFetchBlob from 'react-native-blob-util';
import { Buffer } from 'buffer';

interface AudioChunk {
  id: string;
  data: Buffer;
  isComplete: boolean;
}

class AudioProxy {
  private chunks: Map<string, AudioChunk> = new Map();
  private server: any = null;
  private port = 8888;
  private baseUrl = `http://localhost:${this.port}`;

  async startServer(): Promise<void> {
    if (this.server) return;

    try {
      // Create a simple HTTP server using react-native-blob-util
      // We'll serve files from a temp directory
      console.log('AudioProxy: Starting local server...');
      
      // For now, we'll use file-based serving since creating an HTTP server
      // in React Native requires additional native modules
      return;
    } catch (error) {
      console.error('Failed to start audio proxy server:', error);
      throw error;
    }
  }

  async stopServer(): Promise<void> {
    if (this.server) {
      this.server = null;
    }
    this.chunks.clear();
  }

  // Convert PCM to WAV and save to temp file for serving
  private pcmToWav(pcmData: Buffer, sampleRate = 16000, channels = 1, bitsPerSample = 16): Buffer {
    // Ensure PCM data length is valid
    if (pcmData.length === 0) {
      throw new Error('PCM data is empty');
    }

    // Ensure PCM data length is even (for 16-bit samples)
    const actualDataLength = pcmData.length - (pcmData.length % 2);
    const validPcmData = pcmData.slice(0, actualDataLength);
    
    const headerLength = 44;
    const fileLength = headerLength + validPcmData.length;

    const header = Buffer.alloc(headerLength);
    let offset = 0;

    // RIFF header
    header.write('RIFF', offset); offset += 4;
    header.writeUInt32LE(fileLength - 8, offset); offset += 4;
    header.write('WAVE', offset); offset += 4;

    // fmt chunk
    header.write('fmt ', offset); offset += 4;
    header.writeUInt32LE(16, offset); offset += 4; // chunk size
    header.writeUInt16LE(1, offset); offset += 2; // PCM format
    header.writeUInt16LE(channels, offset); offset += 2;
    header.writeUInt32LE(sampleRate, offset); offset += 4;
    header.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), offset); offset += 4; // byte rate
    header.writeUInt16LE(channels * (bitsPerSample / 8), offset); offset += 2; // block align
    header.writeUInt16LE(bitsPerSample, offset); offset += 2;

    // data chunk
    header.write('data', offset); offset += 4;
    header.writeUInt32LE(validPcmData.length, offset);

    console.log(`Created WAV: ${validPcmData.length} bytes PCM, ${fileLength} total`);
    return Buffer.concat([header, validPcmData]);
  }

  async createAudioChunk(chunkId: string, pcmData: Buffer): Promise<string> {
    try {
      // Convert PCM to WAV
      const wavData = this.pcmToWav(pcmData);
      
      // Save to temp file
      const tempDir = RNFetchBlob.fs.dirs.DocumentDir;
      const filePath = `${tempDir}/audio_chunk_${chunkId}.wav`;
      
      await RNFetchBlob.fs.writeFile(filePath, wavData.toString('base64'), 'base64');
      
      // Store chunk info
      this.chunks.set(chunkId, {
        id: chunkId,
        data: pcmData,
        isComplete: true,
      });

      return `file://${filePath}`;
    } catch (error) {
      console.error('Failed to create audio chunk:', error);
      throw error;
    }
  }

  async cleanupChunk(chunkId: string): Promise<void> {
    try {
      const tempDir = RNFetchBlob.fs.dirs.DocumentDir;
      const filePath = `${tempDir}/audio_chunk_${chunkId}.wav`;
      
      await RNFetchBlob.fs.unlink(filePath).catch(() => {});
      this.chunks.delete(chunkId);
    } catch (error) {
      console.error('Failed to cleanup chunk:', error);
    }
  }

  async cleanup(): Promise<void> {
    const chunkIds = Array.from(this.chunks.keys());
    await Promise.all(chunkIds.map(id => this.cleanupChunk(id)));
  }
}

export const audioProxy = new AudioProxy(); 
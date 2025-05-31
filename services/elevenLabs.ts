import RNFetchBlob from 'react-native-blob-util';
import {Buffer} from 'buffer';

// Ensure global Buffer for environments where it's undefined
// @ts-ignore
if (typeof global.Buffer === 'undefined') {
  // @ts-ignore
  global.Buffer = Buffer;
}

interface GenerateSpeechParams {
  text: string;
  voiceId: string;
  apiKey: string;
  modelId?: string;
  outputFormat?: string; 
  onReadyForPlayback?: (localPath: string) => void; // called when first audio chunks written
}

/**
 * Streams speech from ElevenLabs TTS endpoint and saves it to a local wav file.
 * Returns the absolute file path to the saved audio file.
 */
export async function generateSpeech({
  text,
  voiceId,
  apiKey,
  modelId = 'eleven_flash_v2',
  outputFormat = 'pcm_16000',
  onReadyForPlayback,
}: GenerateSpeechParams): Promise<string> {
  if (!text) {
    throw new Error('Text cannot be empty');
  }
  if (!voiceId) {
    throw new Error('voiceId is required');
  }
  if (!apiKey) {
    throw new Error('ElevenLabs API key not provided');
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=${outputFormat}`;

  const body = {
    text,
    model_id: modelId,
  };

  const docDir = RNFetchBlob.fs.dirs.DocumentDir;
  const basename = `tts_${Date.now()}`;
  const pcmPath = `${docDir}/${basename}.pcm`;
  const wavPath = `${docDir}/${basename}.wav`;

  // Pre-create WAV with 0xFFFFFFFF sizes so it's readable while growing
  const riffSizePlaceholder = 0xffffffff;
  const writeUint32LE = (n: number) => {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(n, 0);
    return b;
  };
  const fmtChunk = Buffer.concat([
    Buffer.from('fmt '),                // chunk id
    writeUint32LE(16),                 // chunk size
    Buffer.from([1, 0]),               // audio format = PCM
    Buffer.from([1, 0]),               // num channels = 1
    writeUint32LE(16000),              // sample rate
    writeUint32LE(16000 * 2),          // byte rate
    Buffer.from([2, 0]),               // block align
    Buffer.from([16, 0]),              // bits per sample
  ]);
  const dataChunkHeader = Buffer.concat([
    Buffer.from('data'),
    writeUint32LE(riffSizePlaceholder),
  ]);
  const header = Buffer.concat([
    Buffer.from('RIFF'),
    writeUint32LE(riffSizePlaceholder),
    Buffer.from('WAVE'),
    fmtChunk,
    dataChunkHeader,
  ]);

  // Write header to wavPath
  await RNFetchBlob.fs.writeFile(wavPath, header.toString('base64'), 'base64');

  // --- Call onReadyForPlayback immediately after header is written --- START
  if (onReadyForPlayback) {
    // Ensure we are not in a promise chain that delays this call significantly.
    // Call it in the next tick if there are concerns.
    Promise.resolve().then(() => onReadyForPlayback(wavPath));
  }
  // --- Call onReadyForPlayback immediately after header is written --- END

  let copied = 0;
  let playbackStarted = false;

  await RNFetchBlob.config({ path: pcmPath, fileCache: true }).fetch(
    'POST',
    url,
    {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    JSON.stringify(body),
  ).progress({ count: 1 }, async (received: number) => {
    // The original logic for early playback start based on received size is removed.
    // Data will be appended to wavPath as it comes in.
    // If RNFetchBlob.fs.appendFile can handle concurrent reads by SoundPlayer, this is fine.
    // For simplicity now, we let the full PCM download then append.
    // Consider if smaller, more frequent appends are needed for true streaming feel.
  });

  // Append the fully downloaded PCM data to WAV
  const finalPcm = await RNFetchBlob.fs.readFile(pcmPath, 'base64');
  await RNFetchBlob.fs.appendFile(wavPath, finalPcm, 'base64');

  // Fix header sizes
  const pcmStat = await RNFetchBlob.fs.stat(pcmPath);
  const dataSize = Number(pcmStat.size);
  const riffSize = dataSize + 36;

  const wavBase64 = await RNFetchBlob.fs.readFile(wavPath, 'base64');
  const wavBuf = Buffer.from(wavBase64, 'base64');

  wavBuf.writeUInt32LE(riffSize, 4);  // RIFF size at offset 4
  wavBuf.writeUInt32LE(dataSize, 40); // data chunk size at offset 40

  await RNFetchBlob.fs.writeFile(wavPath, wavBuf.toString('base64'), 'base64');

  await RNFetchBlob.fs.unlink(pcmPath);

  return wavPath;
} 
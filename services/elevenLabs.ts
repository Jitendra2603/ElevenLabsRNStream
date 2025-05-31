import RNFetchBlob from 'react-native-blob-util';
import { Buffer } from 'buffer';

// Ensure global Buffer for environments where it's undefined
// @ts-ignore
if (typeof global.Buffer === 'undefined') {
  // @ts-ignore
  global.Buffer = Buffer;
}

export interface GenerateSpeechParams {
  text: string;
  voiceId: string;
  apiKey: string;
  modelId?: string; // e.g. "eleven_flash_v2"
  outputFormat?: string; // keep pcm_16000 for now
  onPcm?: (chunk: Buffer) => void; // streaming callback
}

// Stream ElevenLabs TTS as raw PCM and forward every new chunk via onPcm.
// No temp WAV files; caller is responsible for pushing PCM to a player.
export async function generateSpeech({
  text,
  voiceId,
  apiKey,
  modelId = 'eleven_flash_v2',
  outputFormat = 'pcm_16000',
  onPcm,
}: GenerateSpeechParams): Promise<void> {
  if (!text.trim()) throw new Error('Text is empty');
  if (!voiceId) throw new Error('voiceId required');
  if (!apiKey) throw new Error('ElevenLabs apiKey required');

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=${outputFormat}`;
  const body = JSON.stringify({ text: sanitize(text), model_id: modelId });

  // RNFetchBlob will write streaming response to this temp file.
  const tempPath = `${RNFetchBlob.fs.dirs.DocumentDir}/tts_stream_${Date.now()}.pcm`;
  let lastSize = 0;

  const resp = await RNFetchBlob.config({ path: tempPath, fileCache: true }).fetch(
    'POST',
    url,
    { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
    body,
  ).progress({ interval: 200 }, async () => {
    // Check file size growth and emit new bytes.
    const stat = await RNFetchBlob.fs.stat(tempPath).catch(() => undefined);
    if (!stat) return;
    const cur = Number(stat.size);
    if (cur > lastSize) {
      const base64 = await RNFetchBlob.fs.readFile(tempPath, 'base64');
      const buf = Buffer.from(base64, 'base64');
      const chunk = buf.slice(lastSize);
      lastSize = buf.length;
      onPcm?.(chunk);
    }
  });

  const status = resp.info().status;
  if (status !== 200) {
    await RNFetchBlob.fs.unlink(tempPath).catch(() => {});
    throw new Error(`ElevenLabs responded with status ${status}`);
  }

  // Emit any trailing bytes after stream ends.
  const finalBase64 = await RNFetchBlob.fs.readFile(tempPath, 'base64');
  const finalBuf = Buffer.from(finalBase64, 'base64');
  if (finalBuf.length > lastSize) {
    onPcm?.(finalBuf.slice(lastSize));
  }

  await RNFetchBlob.fs.unlink(tempPath).catch(() => {});
}

function sanitize(str: string) {
  return str.replace(/[""]/g, '"').replace(/['']/g, "'");
} 
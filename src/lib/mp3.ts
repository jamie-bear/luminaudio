import { Mp3Encoder } from "@breezystack/lamejs";

const MP3_BITRATE = 128; // kbps — good balance of quality vs size

function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

/**
 * Convert a WAV Blob to an MP3 Blob at 128 kbps.
 * Uses the Web Audio API to decode (handles PCM_16/PCM_24/PCM_32 transparently),
 * then encodes to MP3 with lamejs.
 */
export async function wavBlobToMp3Blob(wavBlob: Blob): Promise<Blob> {
  const arrayBuffer = await wavBlob.arrayBuffer();
  const audioCtx = new AudioContext();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    void audioCtx.close();
  }

  const channels = Math.min(audioBuffer.numberOfChannels, 2) as 1 | 2;
  const sampleRate = audioBuffer.sampleRate;

  const left = float32ToInt16(audioBuffer.getChannelData(0));
  const right = channels > 1 ? float32ToInt16(audioBuffer.getChannelData(1)) : left;

  const encoder = new Mp3Encoder(channels, sampleRate, MP3_BITRATE);
  const mp3Chunks: ArrayBuffer[] = [];

  // lamejs processes in blocks of 1152 samples (one MPEG frame)
  const blockSize = 1152;
  for (let i = 0; i < left.length; i += blockSize) {
    const chunk = encoder.encodeBuffer(
      left.subarray(i, i + blockSize),
      right.subarray(i, i + blockSize),
    );
    if (chunk.length > 0) mp3Chunks.push((chunk.buffer as ArrayBuffer).slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength));
  }

  const tail = encoder.flush();
  if (tail.length > 0) mp3Chunks.push((tail.buffer as ArrayBuffer).slice(tail.byteOffset, tail.byteOffset + tail.byteLength));

  return new Blob(mp3Chunks, { type: "audio/mpeg" });
}

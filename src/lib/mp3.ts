/**
 * WAV → MP3 conversion.
 *
 * AudioContext.decodeAudioData() is already async/non-blocking.
 * The CPU-intensive lamejs encoding loop runs in a Web Worker so the
 * main thread (and therefore the UI) stays fully responsive.
 */

function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

type WorkerMsg =
  | { type: "progress"; percent: number }
  | { type: "done"; buffer: ArrayBuffer }
  | { type: "error"; message: string };

/**
 * Convert a WAV Blob to an MP3 Blob at 128 kbps.
 *
 * @param wavBlob     The source WAV audio blob.
 * @param onProgress  Called with 0–100 as encoding proceeds (optional).
 */
export async function wavBlobToMp3Blob(
  wavBlob: Blob,
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  // Decode using the browser's native audio decoder — async, non-blocking.
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
  const right =
    channels > 1 ? float32ToInt16(audioBuffer.getChannelData(1)) : new Int16Array(0);

  // Hand the PCM data to the worker — Int16Arrays are transferred (zero-copy).
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./mp3.worker.ts", import.meta.url));

    worker.onmessage = (e: MessageEvent<WorkerMsg>) => {
      const msg = e.data;
      if (msg.type === "progress") {
        onProgress?.(msg.percent);
      } else if (msg.type === "done") {
        worker.terminate();
        onProgress?.(100);
        resolve(new Blob([msg.buffer], { type: "audio/mpeg" }));
      } else if (msg.type === "error") {
        worker.terminate();
        reject(new Error(msg.message));
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(new Error(err.message ?? "Worker error"));
    };

    // Copy into fresh buffers before transferring so we never move an
    // array that might still be referenced elsewhere (e.g. mono right === left).
    const leftBuf = new Int16Array(left);
    const transfers: Transferable[] = [leftBuf.buffer];
    let rightBuf: Int16Array;
    if (channels > 1) {
      rightBuf = new Int16Array(right);
      transfers.push(rightBuf.buffer);
    } else {
      rightBuf = new Int16Array(0); // Worker won't use right for mono
    }

    worker.postMessage({ left: leftBuf, right: rightBuf, channels, sampleRate }, transfers);
  });
}

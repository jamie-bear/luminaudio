/**
 * Web Worker: CPU-intensive lamejs MP3 encoding runs off the main thread
 * so the UI stays fully responsive during conversion.
 *
 * Message protocol
 * ─────────────────
 * Incoming  { left: Int16Array, right: Int16Array, channels: 1|2, sampleRate: number }
 * Outgoing  { type: "progress", percent: number }
 *         | { type: "done",     buffer: ArrayBuffer }   ← transferred (zero-copy)
 *         | { type: "error",    message: string }
 */

import { Mp3Encoder } from "@breezystack/lamejs";

interface EncodeInput {
  left: Int16Array;
  right: Int16Array;
  channels: 1 | 2;
  sampleRate: number;
}

type WorkerMsg =
  | { type: "progress"; percent: number }
  | { type: "done"; buffer: ArrayBuffer }
  | { type: "error"; message: string };

// Inline interface so we don't need the webworker lib type
const workerSelf = self as unknown as {
  onmessage: ((e: MessageEvent<EncodeInput>) => void) | null;
  postMessage(msg: WorkerMsg, transfer?: Transferable[]): void;
};

workerSelf.onmessage = (e: MessageEvent<EncodeInput>) => {
  try {
    const { left, right, channels, sampleRate } = e.data;
    const encoder = new Mp3Encoder(channels, sampleRate, 128);
    const chunks: ArrayBuffer[] = [];
    const blockSize = 1152;
    const total = left.length;
    let lastPercent = -1;

    for (let i = 0; i < total; i += blockSize) {
      const l = left.subarray(i, i + blockSize);
      const encoded =
        channels === 1
          ? encoder.encodeBuffer(l)
          : encoder.encodeBuffer(l, right.subarray(i, i + blockSize));

      if (encoded.length > 0) {
        chunks.push(
          (encoded.buffer as ArrayBuffer).slice(
            encoded.byteOffset,
            encoded.byteOffset + encoded.byteLength,
          ),
        );
      }

      // Post at most one message per percent point
      const percent = Math.min(Math.floor(((i + blockSize) / total) * 99), 99);
      if (percent !== lastPercent) {
        lastPercent = percent;
        workerSelf.postMessage({ type: "progress", percent } satisfies WorkerMsg);
      }
    }

    const tail = encoder.flush();
    if (tail.length > 0) {
      chunks.push(
        (tail.buffer as ArrayBuffer).slice(
          tail.byteOffset,
          tail.byteOffset + tail.byteLength,
        ),
      );
    }

    // Concatenate all MP3 frames into one buffer and transfer ownership
    const totalBytes = chunks.reduce((s, c) => s + c.byteLength, 0);
    const out = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }

    workerSelf.postMessage(
      { type: "done", buffer: out.buffer } satisfies WorkerMsg,
      [out.buffer],
    );
  } catch (err) {
    workerSelf.postMessage({
      type: "error",
      message: err instanceof Error ? err.message : "MP3 encoding failed",
    } satisfies WorkerMsg);
  }
};

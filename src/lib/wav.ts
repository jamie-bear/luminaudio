/**
 * WAV utilities for concatenating multiple WAV buffers into a single file.
 * Assumes all inputs share the same sample rate, bit depth, and channel count.
 */

/** Standard WAV header is 44 bytes */
const WAV_HEADER_SIZE = 44;

export interface WavMeta {
  sampleRate: number;
  bitsPerSample: number;
  numChannels: number;
}

/** Parse WAV header to extract metadata */
export function parseWavHeader(buf: Buffer): WavMeta {
  if (buf.length < WAV_HEADER_SIZE) {
    throw new Error(`WAV buffer too short (${buf.length} bytes); expected at least ${WAV_HEADER_SIZE}`);
  }
  const riff = buf.toString("ascii", 0, 4);
  const wave = buf.toString("ascii", 8, 12);
  if (riff !== "RIFF" || wave !== "WAVE") {
    throw new Error(
      `Invalid WAV data: expected RIFF/WAVE header, got "${riff}"/"${wave}". ` +
      "The API may have returned an error response instead of audio."
    );
  }
  const numChannels = buf.readUInt16LE(22);
  const sampleRate = buf.readUInt32LE(24);
  const bitsPerSample = buf.readUInt16LE(34);
  if (numChannels < 1 || numChannels > 32) {
    throw new Error(`Unreasonable numChannels in WAV header: ${numChannels}`);
  }
  if (sampleRate < 8000 || sampleRate > 384000) {
    throw new Error(`Unreasonable sampleRate in WAV header: ${sampleRate}`);
  }
  if (bitsPerSample < 8 || bitsPerSample > 64 || bitsPerSample % 8 !== 0) {
    throw new Error(`Unreasonable bitsPerSample in WAV header: ${bitsPerSample}`);
  }
  return { sampleRate, bitsPerSample, numChannels };
}

/** Strip header from a WAV buffer, returning raw PCM data */
export function stripWavHeader(buf: Buffer): Buffer {
  // Find the "data" chunk – it's usually at offset 36 but not always
  const dataStr = "data";
  let offset = 12; // skip RIFF header
  while (offset < buf.length - 8) {
    const chunkId = buf.toString("ascii", offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    if (chunkId === dataStr) {
      return buf.slice(offset + 8, offset + 8 + chunkSize);
    }
    offset += 8 + chunkSize;
  }
  // Fallback: assume standard 44-byte header
  return buf.slice(WAV_HEADER_SIZE);
}

/** Build a WAV header for the given PCM data length */
function buildWavHeader(
  dataLength: number,
  meta: WavMeta
): Buffer {
  const header = Buffer.alloc(WAV_HEADER_SIZE);
  const byteRate = meta.sampleRate * meta.numChannels * (meta.bitsPerSample / 8);
  const blockAlign = meta.numChannels * (meta.bitsPerSample / 8);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(meta.numChannels, 22);
  header.writeUInt32LE(meta.sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(meta.bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataLength, 40);

  return header;
}

/**
 * Concatenate multiple WAV buffers into one continuous WAV file.
 * Inserts a short silence gap between chunks for natural pacing.
 */
export function concatenateWavBuffers(
  buffers: Buffer[],
  silenceMs: number = 400
): Buffer {
  if (buffers.length === 0) return Buffer.alloc(0);
  if (buffers.length === 1) return buffers[0];

  const meta = parseWavHeader(buffers[0]);

  // Build silence gap
  const silenceSamples = Math.floor(
    (silenceMs / 1000) * meta.sampleRate * meta.numChannels
  );
  const bytesPerSample = meta.bitsPerSample / 8;
  const silenceBuffer = Buffer.alloc(silenceSamples * bytesPerSample);

  // Extract raw PCM from each buffer
  const pcmChunks: Buffer[] = [];
  for (let i = 0; i < buffers.length; i++) {
    pcmChunks.push(stripWavHeader(buffers[i]));
    if (i < buffers.length - 1) {
      pcmChunks.push(silenceBuffer);
    }
  }

  const totalPcm = Buffer.concat(pcmChunks);
  const header = buildWavHeader(totalPcm.length, meta);

  return Buffer.concat([header, totalPcm]);
}

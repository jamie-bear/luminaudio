declare module "lamejs" {
  class Mp3Encoder {
    constructor(channels: 1 | 2, sampleRate: number, kbps: number);
    encodeBuffer(left: Int16Array, right?: Int16Array): Int8Array;
    flush(): Int8Array;
  }
  export { Mp3Encoder };
}

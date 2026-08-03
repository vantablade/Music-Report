import { fromByteArray } from "base64-js";

import { pcm16ChunksToWavBase64 } from "@/audio/wav";
import { toByteArray } from "base64-js";

function b64OfBytes(...vals: number[]): string {
  return fromByteArray(Uint8Array.from(vals));
}

describe("pcm16ChunksToWavBase64", () => {
  it("prepends a valid 44-byte WAV header with the right sizes", () => {
    // two chunks of 4 PCM bytes each -> 8 bytes of audio data
    const chunks = [b64OfBytes(1, 2, 3, 4), b64OfBytes(5, 6, 7, 8)];
    const wav = toByteArray(pcm16ChunksToWavBase64(chunks, 44100));
    const dv = new DataView(wav.buffer);

    const tag = (o: number) => String.fromCharCode(wav[o], wav[o + 1], wav[o + 2], wav[o + 3]);
    expect(tag(0)).toBe("RIFF");
    expect(tag(8)).toBe("WAVE");
    expect(tag(36)).toBe("data");

    expect(wav.length).toBe(44 + 8);
    expect(dv.getUint32(4, true)).toBe(36 + 8); // RIFF size
    expect(dv.getUint32(40, true)).toBe(8); // data size
    expect(dv.getUint16(22, true)).toBe(1); // mono
    expect(dv.getUint32(24, true)).toBe(44100); // sample rate
    expect(dv.getUint16(34, true)).toBe(16); // bits per sample

    // audio bytes preserved after the header
    expect(Array.from(wav.slice(44))).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

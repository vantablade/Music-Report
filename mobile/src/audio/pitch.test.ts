import { hzToPitch, midiToHz, midiToName } from "./pitch";
import { PitchStabilizer } from "./stabilizer";

describe("hzToPitch", () => {
  it("maps reference frequencies to notes + cents", () => {
    expect(hzToPitch(440)).toEqual({ hz: 440, midi: 69, cents: 0 });
    expect(hzToPitch(261.63).midi).toBe(60); // middle C
    expect(hzToPitch(445)).toMatchObject({ midi: 69, cents: 20 }); // sharp A
    expect(hzToPitch(432).cents).toBeLessThan(0); // flat A
  });
});

describe("midi helpers", () => {
  it("round-trips and names notes", () => {
    expect(Math.round(midiToHz(69))).toBe(440);
    expect(midiToName(69)).toBe("A4");
    expect(midiToName(60)).toBe("C4");
  });
});

describe("PitchStabilizer", () => {
  it("only reports a note once N consecutive frames agree", () => {
    const s = new PitchStabilizer(3);
    expect(s.push(69)).toBeNull();
    expect(s.push(69)).toBeNull();
    expect(s.push(69)).toBe(69); // 3 in a row
    expect(s.push(71)).toBeNull(); // a stray jump is rejected
    expect(s.push(69)).toBeNull();
  });
});

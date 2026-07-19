import { compareNote, verdictColorStatus } from "./comparison";

describe("compareNote", () => {
  it("counts a note within tolerance as correct", () => {
    expect(compareNote(69, 69, 10)).toEqual({ verdict: "correct", centsOff: 10 });
  });

  it("flags sharp/flat when the right note is out of tune", () => {
    expect(compareNote(69, 69, 60).verdict).toBe("sharp");
    expect(compareNote(69, 69, -60).verdict).toBe("flat");
  });

  it("flags a wrong note", () => {
    expect(compareNote(69, 71, 0)).toEqual({ verdict: "wrong", centsOff: 200 });
  });

  it("treats no detected pitch as missed, and a rest as correct", () => {
    expect(compareNote(69, null, 0).verdict).toBe("missed");
    expect(compareNote(null, null, 0).verdict).toBe("correct");
  });

  it("maps verdicts to cursor colors", () => {
    expect(verdictColorStatus("correct")).toBe("correct");
    expect(verdictColorStatus("missed")).toBe("wrong");
    expect(verdictColorStatus("sharp")).toBe("near");
  });
});

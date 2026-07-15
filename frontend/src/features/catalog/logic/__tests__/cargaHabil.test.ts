import { describe, expect, it } from "vitest";
import { parseCargaHabilText } from "../cargaHabil";
import vectors from "./cargaHabil.vectors.json";

interface Vector {
  name: string;
  text: string;
  output: {
    mandatory: { code: string; name: string; type: string }[];
    electives: { code: string; name: string; type: string }[];
  };
}

describe("parseCargaHabilText parity with Python pdf_parser.py text parsing", () => {
  for (const vector of vectors as Vector[]) {
    it(`${vector.name} matches Python output`, () => {
      const result = parseCargaHabilText(vector.text);
      expect(result).toEqual(vector.output);
    });
  }
});

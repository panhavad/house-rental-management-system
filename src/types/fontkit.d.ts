declare module "fontkit" {
  import type { Fontkit } from "pdf-lib/cjs/types/fontkit";

  export type Font = {
    familyName: string;
    numGlyphs: number;
    hasGlyphForCodePoint(codePoint: number): boolean;
    layout(text: string): { glyphs: { id: number }[] };
  };

  export const create: Fontkit["create"];
  export function open(path: string, postscriptName?: string): Promise<Font | Font[]>;
}

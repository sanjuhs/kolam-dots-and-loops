import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require("../motifs.js");
require("../picture-symmetries.js");
export const engine = require("../puzzle-engine.js");
// The server independently checks rotational equivalence; no client-provided symmetries are trusted.
export async function samplePicture() {
  throw Error("Unknown picture variant");
}
export function validateMoves(lv, moves) {
  if (!Array.isArray(moves) || moves.length < 1 || moves.length > 8192)
    throw Error("Invalid move list");
  let hints = 0;
  for (const m of moves) {
    if (
      !m ||
      !Number.isInteger(m.i) ||
      m.i < 0 ||
      m.i >= lv.tiles.length ||
      !["tap", "hint", "back"].includes(m.type)
    )
      throw Error("Invalid move");
    if (engine.solved(lv))
      throw Error("Moves continue after the puzzle was solved");
    const c = lv.tiles[m.i];
    if (m.type === "hint") {
      const off = engine.off(lv, c);
      if (!off) throw Error("Invalid hint");
      c.rot += c.sym - off;
      hints++;
    } else {
      if (c.sym === 1 || (m.type === "back" && lv.kind !== "roll"))
        throw Error("Invalid turn");
      c.rot += m.type === "back" ? -1 : 1;
      c.rot = ((c.rot % c.sym) + c.sym) % c.sym;
    }
  }
  if (!engine.solved(lv)) throw Error("Puzzle is not solved");
  const base = engine.difficulty(lv),
    points = Math.max(
      Math.ceil(base * 0.25),
      base - Math.ceil(base * 0.1) * hints,
    );
  return { points, hints };
}

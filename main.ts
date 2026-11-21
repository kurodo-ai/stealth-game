// Quiet Hands — the hand-in program (Node 22, standard library only).
//
// It copies this repository's game/ and screenshots/ into the output folder
// and writes the dossier the judge reads, using the vendored make.fun
// library. It writes the same bytes on every run: no timestamps, no random
// values, files copied in directory order.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader, MAKEFUN_OUTPUT_DIR is unset and /output is used.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's caps for this bounty: at most 4 screenshots, each at most
// 256 KiB; game/ at most 993 files and 48 MiB; paths at most 1000 bytes;
// the dossier text at most 160 KiB. buildDossier enforces the text cap and
// the screenshot limits; the game itself is far under the file caps.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

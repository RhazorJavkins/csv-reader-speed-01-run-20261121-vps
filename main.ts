import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setFlagsFromString } from 'node:v8';

setFlagsFromString('--no-incremental-marking');
const { run } = await import('./solve.js');

const inputPath = join(process.env.MAKEFUN_INPUT_DIR ?? '/input', 'cases.json');
const outputPath = join(process.env.MAKEFUN_OUTPUT_DIR ?? '/output', 'answers.json');
const cases: { input: { text: string; header: boolean } }[] =
  JSON.parse(readFileSync(inputPath, 'utf8'));
writeFileSync(outputPath, JSON.stringify(cases.map(({ input }) => run(input))));

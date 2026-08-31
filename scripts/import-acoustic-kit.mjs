import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const samplesRoot = join(root, 'public', 'samples');
const output = join(samplesRoot, 'lofi-acoustic');
const manifestPath = join(samplesRoot, 'manifest.json');
const sampleRate = 22_050;
const sourceSampleRate = 48_000;
const revision = '9f04cf9a734527edfbb0a4eee1f674e45bbf71bc';
const repository = 'https://github.com/sfzinstruments/virtuosity_drums';
const rawBase = `https://raw.githubusercontent.com/sfzinstruments/virtuosity_drums/${revision}`;

const voices = [
  { filename: 'kick.wav', source: 'Samples/lofi/kick/lofi_kick_snon_vl3_rr2.flac', duration: 1.2, peak: 0.9, fade: 0.14 },
  { filename: 'snare.wav', source: 'Samples/lofi/snare/lofi_snare_center_vl24.flac', duration: 1.2, peak: 0.88, fade: 0.18 },
  { filename: 'ghost-snare.wav', source: 'Samples/lofi/snare/lofi_snare_center_vl9.flac', duration: 0.85, peak: 0.48, fade: 0.14 },
  { filename: 'hat-tip.wav', source: 'Samples/lofi/hh/lofi_hh_closed_vl2_rr1.flac', duration: 0.52, peak: 0.48, fade: 0.1 },
  { filename: 'open-hat.wav', source: 'Samples/lofi/hh/lofi_hh_open_vl3_rr2.flac', duration: 1.8, peak: 0.62, fade: 0.28 },
  { filename: 'floor-tom.wav', source: 'Samples/lofi/ltom/lofi_ltom_center_vl11.flac', duration: 1.35, peak: 0.82, fade: 0.22 },
  { filename: 'rack-tom.wav', source: 'Samples/lofi/htom/lofi_htom_center_vl11.flac', duration: 1.25, peak: 0.8, fade: 0.2 },
  { filename: 'pedal-hat.wav', source: 'Samples/lofi/hh/lofi_hh_pedal_vl2_rr3.flac', duration: 0.65, peak: 0.5, fade: 0.12 },
  { filename: 'cross-stick.wav', source: 'Samples/lofi/snare/lofi_snare_crossstick_vl10.flac', duration: 0.72, peak: 0.68, fade: 0.12 },
  { filename: 'hat-edge.wav', source: 'Samples/lofi/hh/lofi_hh_closed_vl4_rr4.flac', duration: 0.6, peak: 0.62, fade: 0.11 },
  { filename: 'ride.wav', source: 'Samples/lofi/ride/lofi_ride_ride_vl2_rr2.flac', duration: 2.5, peak: 0.58, fade: 0.35 },
  { filename: 'ride-bell.wav', source: 'Samples/lofi/ride/lofi_ride_bell_vl2_rr1.flac', duration: 2.2, peak: 0.64, fade: 0.32 },
  { filename: 'crash.wav', source: 'Samples/lofi/crash/lofi_crash_crash_vl2_rr3.flac', duration: 3, peak: 0.62, fade: 0.4 },
  { filename: 'splash.wav', source: 'Samples/lofi/hh/lofi_hh_splash_rr2.flac', duration: 2.2, peak: 0.58, fade: 0.34 },
  { filename: 'rimshot.wav', source: 'Samples/lofi/snare/lofi_snare_rimshot_vl9.flac', duration: 0.95, peak: 0.86, fade: 0.16 },
  { filename: 'soft-kick.wav', source: 'Samples/lofi/kick/lofi_kick_snon_vl1_rr4.flac', duration: 1.05, peak: 0.5, fade: 0.14 },
];

async function download(url, destination) {
  const response = await fetch(url, { headers: { 'User-Agent': 'mcpmpc-sample-import/1.0' } });
  if (!response.ok) throw new Error(`Could not download ${url}: ${response.status}`);
  writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
}

function decodeFlac(path) {
  const decoded = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', path,
    '-f', 'f32le', '-ac', '1', '-ar', String(sourceSampleRate), 'pipe:1',
  ], { encoding: null, maxBuffer: 64 * 1024 * 1024 });
  if (decoded.error) throw decoded.error;
  if (decoded.status !== 0) throw new Error(decoded.stderr.toString().trim() || `ffmpeg failed for ${path}`);

  const samples = new Float32Array(decoded.stdout.length / 4);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = decoded.stdout.readFloatLE(index * 4);
  }
  return samples;
}

function prepareVoice(source, { duration, peak: targetPeak, fade }) {
  let sourcePeak = 0;
  for (const sample of source) sourcePeak = Math.max(sourcePeak, Math.abs(sample));
  const onsetThreshold = sourcePeak * 0.018;
  let onset = source.findIndex((sample) => Math.abs(sample) >= onsetThreshold);
  if (onset < 0) onset = 0;
  const start = Math.max(0, onset - Math.round(sourceSampleRate * 0.008));
  const end = Math.min(source.length, start + Math.round(duration * sourceSampleRate));
  const trimmed = source.subarray(start, end);

  const filtered = new Float32Array(trimmed.length);
  const lowCoefficient = 1 - Math.exp(-Math.PI * 2 * 9_200 / sourceSampleRate);
  const highCoefficient = 1 - Math.exp(-Math.PI * 2 * 28 / sourceSampleRate);
  let lowState = 0;
  let subState = 0;
  for (let index = 0; index < trimmed.length; index += 1) {
    subState += highCoefficient * (trimmed[index] - subState);
    const highPassed = trimmed[index] - subState;
    lowState += lowCoefficient * (highPassed - lowState);
    filtered[index] = Math.tanh(lowState * 1.12) / Math.tanh(1.12);
  }

  const outputLength = Math.max(1, Math.floor(filtered.length * sampleRate / sourceSampleRate));
  const resampled = new Float32Array(outputLength);
  const step = sourceSampleRate / sampleRate;
  for (let index = 0; index < outputLength; index += 1) {
    const position = index * step;
    const before = Math.floor(position);
    const after = Math.min(filtered.length - 1, before + 1);
    const fraction = position - before;
    resampled[index] = filtered[before] * (1 - fraction) + filtered[after] * fraction;
  }

  const fadeInSamples = Math.min(Math.round(sampleRate * 0.002), resampled.length);
  const fadeOutSamples = Math.min(Math.round(sampleRate * fade), resampled.length);
  let processedPeak = 0;
  for (let index = 0; index < resampled.length; index += 1) {
    const fadeIn = Math.min(1, index / Math.max(1, fadeInSamples));
    const fadeOut = Math.min(1, (resampled.length - index - 1) / Math.max(1, fadeOutSamples));
    resampled[index] *= Math.max(0, Math.min(fadeIn, fadeOut));
    processedPeak = Math.max(processedPeak, Math.abs(resampled[index]));
  }

  const gain = processedPeak > 0 ? targetPeak / processedPeak : 1;
  const quantizer = 2 ** 13;
  for (let index = 0; index < resampled.length; index += 1) {
    const normalized = Math.max(-1, Math.min(1, resampled[index] * gain));
    resampled[index] = Math.round(normalized * quantizer) / quantizer;
  }
  return resampled;
}

function wavBuffer(samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, index) => {
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32_767), 44 + index * 2);
  });
  return buffer;
}

const temporary = mkdtempSync(join(tmpdir(), 'mcpmpc-acoustic-'));
const processed = [];

try {
  rmSync(output, { recursive: true, force: true });
  mkdirSync(output, { recursive: true });

  for (const voice of voices) {
    const sourcePath = join(temporary, `${voice.filename}.flac`);
    await download(`${rawBase}/${voice.source}`, sourcePath);
    const buffer = wavBuffer(prepareVoice(decodeFlac(sourcePath), voice));
    writeFileSync(join(output, voice.filename), buffer);
    processed.push({
      file: voice.filename,
      sourceFile: voice.source,
      sha256: createHash('sha256').update(buffer).digest('hex'),
    });
  }

  await download(`${rawBase}/LICENSE`, join(output, 'LICENSE-CC0.txt'));

  const provenance = [
    '# Lo-Fi Acoustic kit provenance',
    '',
    'These are real acoustic drum recordings from Virtuosity Drums, played by Austin McMahon and recorded at Virtuosity Musical Instruments in Boston by Versilian Studios / Karoryfer Samples.',
    '',
    `- Source: ${repository}`,
    `- Pinned revision: \`${revision}\``,
    '- License: CC0 1.0 Universal (see `LICENSE-CC0.txt`)',
    '- Mic set: source `lofi` / vintage mono mic recordings',
    '- Processing: onset trim, gentle 28 Hz high-pass, 9.2 kHz low-pass, mild saturation, linear resample from 48 kHz to 22.05 kHz, 14-bit-style quantization, fades, and 16-bit mono WAV encoding',
    '',
    '| Output | Source recording | SHA-256 |',
    '| --- | --- | --- |',
    ...processed.map((item) => `| \`${item.file}\` | \`${item.sourceFile}\` | \`${item.sha256}\` |`),
    '',
  ].join('\n');
  writeFileSync(join(output, 'PROVENANCE.md'), provenance);

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const acousticKit = {
    id: 'lofi-acoustic',
    kind: 'recorded',
    rights: 'CC0 1.0 Universal',
    source: {
      name: 'Virtuosity Drums',
      repository,
      revision,
      performer: 'Austin McMahon',
      recording: 'Virtuosity Musical Instruments, Boston; Versilian Studios / Karoryfer Samples',
      micSet: 'lofi / vintage mono mic',
    },
    processing: 'Onset-trimmed, lightly filtered and saturated, resampled to 22.05 kHz, 14-bit-style quantized, and encoded as 16-bit mono PCM WAV.',
    files: voices.map((voice) => voice.filename),
    provenance: processed,
  };
  manifest.kits = manifest.kits.filter((kit) => kit.id !== acousticKit.id);
  manifest.kits.splice(1, 0, acousticKit);
  manifest.generatedBy = 'scripts/generate-samples.mjs + scripts/import-acoustic-kit.mjs';
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

console.log(`Imported ${voices.length} CC0 acoustic recordings into ${output}`);

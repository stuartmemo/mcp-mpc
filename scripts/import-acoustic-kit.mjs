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
const manifestPath = join(samplesRoot, 'manifest.json');
const sampleRate = 22_050;
const sourceSampleRate = 48_000;
const revision = '9f04cf9a734527edfbb0a4eee1f674e45bbf71bc';
const repository = 'https://github.com/sfzinstruments/virtuosity_drums';
const rawBase = `https://raw.githubusercontent.com/sfzinstruments/virtuosity_drums/${revision}`;

const source = (path, gain = 1, delaySeconds = 0) => ({ path, gain, delaySeconds });

const recordedKits = [
  {
    id: 'hip-hop',
    title: 'Hip-Hop',
    micSet: 'close kick/snare, natural mid and overhead microphones, plus selected vintage mono room hits',
    processing: 'Real acoustic hits pitched and resampled into tight boom-bap one-shots, with focused filtering, moderate saturation, 12/13-bit-style quantization, short tails, and 16-bit mono PCM WAV encoding.',
    provenanceProcessing: 'onset trim, per-hit pitch resampling, focused high/low-pass filtering, moderate saturation, 12/13-bit-style quantization, MPC-length fades, peak normalization, and 16-bit mono WAV encoding',
    prepare: prepareHipHopVoice,
    decodeRate: sourceSampleRate,
    voices: [
      { filename: 'kick.wav', sources: [source('Samples/kickmic/kick/kickmic_kick_snoff_vl4_rr3.flac', 0.82), source('Samples/mid/kick/mid_kick_snoff_vl4_rr3.flac', 0.38)], duration: 0.78, peak: 0.94, fade: 0.08, pitch: -2, highPass: 28, lowPass: 7_200, drive: 1.6, bits: 13 },
      { filename: 'snare.wav', sources: [source('Samples/snaremic/snare/snaremic_snare_center_vl34.flac', 0.78), source('Samples/mid/snare/mid_snare_center_vl34.flac', 0.42)], duration: 0.72, peak: 0.92, fade: 0.1, pitch: -1, highPass: 70, lowPass: 9_800, drive: 1.55, bits: 13 },
      { filename: 'snare-stack.wav', sources: [source('Samples/snaremic/snare/snaremic_snare_center_vl32.flac', 0.62), source('Samples/snaremic/snare/snaremic_snare_rimshot_vl10.flac', 0.28, 0.012), source('Samples/mid/snare/mid_snare_offcenter_vl30.flac', 0.35, 0.024)], duration: 0.82, peak: 0.91, fade: 0.12, pitch: -1, highPass: 75, lowPass: 9_200, drive: 1.7, bits: 13 },
      { filename: 'closed-hat.wav', sources: [source('Samples/oh/hh/oh_hh_closed_vl4_rr3.flac')], duration: 0.26, peak: 0.63, fade: 0.05, pitch: -1, highPass: 380, lowPass: 10_500, drive: 1.35, bits: 13 },
      { filename: 'open-hat.wav', sources: [source('Samples/oh/hh/oh_hh_open_vl4_rr1.flac')], duration: 0.82, peak: 0.68, fade: 0.16, pitch: -2, highPass: 300, lowPass: 10_000, drive: 1.35, bits: 13 },
      { filename: 'deep-kick.wav', sources: [source('Samples/kickmic/kick/kickmic_kick_snoff_vl4_rr1.flac', 0.84), source('Samples/mid/kick/mid_kick_snoff_vl4_rr1.flac', 0.35)], duration: 1.1, peak: 0.94, fade: 0.16, pitch: -5, highPass: 25, lowPass: 5_500, drive: 1.75, bits: 13 },
      { filename: 'low-tom.wav', sources: [source('Samples/mid/ltom/mid_ltom_center_vl15.flac')], duration: 0.82, peak: 0.84, fade: 0.12, pitch: -4, highPass: 35, lowPass: 7_200, drive: 1.55, bits: 13 },
      { filename: 'pedal-hat.wav', sources: [source('Samples/oh/hh/oh_hh_pedal_vl3_rr4.flac')], duration: 0.32, peak: 0.58, fade: 0.06, pitch: -1, highPass: 400, lowPass: 10_500, drive: 1.35, bits: 13 },
      { filename: 'rim.wav', sources: [source('Samples/snaremic/snare/snaremic_snare_rimshot_vl10.flac', 0.82), source('Samples/mid/snare/mid_snare_rimshot_vl10.flac', 0.3)], duration: 0.38, peak: 0.78, fade: 0.06, pitch: -1, highPass: 120, lowPass: 9_000, drive: 1.5, bits: 13 },
      { filename: 'ride-bell.wav', sources: [source('Samples/oh/ride/oh_ride_bell_vl3_rr3.flac')], duration: 0.72, peak: 0.7, fade: 0.14, pitch: -3, highPass: 180, lowPass: 9_500, drive: 1.45, bits: 13 },
      { filename: 'high-tom.wav', sources: [source('Samples/mid/htom/mid_htom_offcenter_vl15.flac')], duration: 0.72, peak: 0.82, fade: 0.1, pitch: -2, highPass: 45, lowPass: 8_000, drive: 1.5, bits: 13 },
      { filename: 'ghost-snare.wav', sources: [source('Samples/snaremic/snare/snaremic_snare_offcenter_vl12.flac', 0.75), source('Samples/mid/snare/mid_snare_offcenter_vl12.flac', 0.4)], duration: 0.48, peak: 0.56, fade: 0.08, pitch: -1, highPass: 70, lowPass: 9_200, drive: 1.4, bits: 13 },
      { filename: 'crash.wav', sources: [source('Samples/oh/crash/oh_crash_crash_vl3_rr4.flac')], duration: 1.8, peak: 0.67, fade: 0.38, pitch: -3, highPass: 100, lowPass: 8_500, drive: 1.35, bits: 13 },
      { filename: 'snare-flam.wav', sources: [source('Samples/snaremic/snare/snaremic_snare_flam_vl12.flac', 0.76), source('Samples/mid/snare/mid_snare_flam_vl12.flac', 0.42)], duration: 0.9, peak: 0.88, fade: 0.14, pitch: -1, highPass: 70, lowPass: 9_500, drive: 1.55, bits: 13 },
      { filename: 'room-kick.wav', sources: [source('Samples/lofi/kick/lofi_kick_snon_vl3_rr2.flac')], duration: 0.92, peak: 0.86, fade: 0.14, pitch: -3, highPass: 25, lowPass: 6_000, drive: 1.7, bits: 12 },
      { filename: 'room-snare.wav', sources: [source('Samples/lofi/snare/lofi_snare_center_vl24.flac')], duration: 0.88, peak: 0.86, fade: 0.14, pitch: -2, highPass: 60, lowPass: 7_800, drive: 1.7, bits: 12 },
    ],
  },
  {
    id: 'lofi-acoustic',
    title: 'Lo-Fi Acoustic',
    micSet: 'lofi / vintage mono mic',
    processing: 'Onset-trimmed, lightly filtered and saturated, resampled to 22.05 kHz, 14-bit-style quantized, and encoded as 16-bit mono PCM WAV.',
    provenanceProcessing: 'onset trim, gentle 28 Hz high-pass, 9.2 kHz low-pass, mild saturation, linear resample from 48 kHz to 22.05 kHz, 14-bit-style quantization, fades, and 16-bit mono WAV encoding',
    prepare: prepareLoFiVoice,
    decodeRate: sourceSampleRate,
    voices: [
      { filename: 'kick.wav', sources: [source('Samples/lofi/kick/lofi_kick_snon_vl3_rr2.flac')], duration: 1.2, peak: 0.9, fade: 0.14 },
      { filename: 'snare.wav', sources: [source('Samples/lofi/snare/lofi_snare_center_vl24.flac')], duration: 1.2, peak: 0.88, fade: 0.18 },
      { filename: 'ghost-snare.wav', sources: [source('Samples/lofi/snare/lofi_snare_center_vl9.flac')], duration: 0.85, peak: 0.48, fade: 0.14 },
      { filename: 'hat-tip.wav', sources: [source('Samples/lofi/hh/lofi_hh_closed_vl2_rr1.flac')], duration: 0.52, peak: 0.48, fade: 0.1 },
      { filename: 'open-hat.wav', sources: [source('Samples/lofi/hh/lofi_hh_open_vl3_rr2.flac')], duration: 1.8, peak: 0.62, fade: 0.28 },
      { filename: 'floor-tom.wav', sources: [source('Samples/lofi/ltom/lofi_ltom_center_vl11.flac')], duration: 1.35, peak: 0.82, fade: 0.22 },
      { filename: 'rack-tom.wav', sources: [source('Samples/lofi/htom/lofi_htom_center_vl11.flac')], duration: 1.25, peak: 0.8, fade: 0.2 },
      { filename: 'pedal-hat.wav', sources: [source('Samples/lofi/hh/lofi_hh_pedal_vl2_rr3.flac')], duration: 0.65, peak: 0.5, fade: 0.12 },
      { filename: 'cross-stick.wav', sources: [source('Samples/lofi/snare/lofi_snare_crossstick_vl10.flac')], duration: 0.72, peak: 0.68, fade: 0.12 },
      { filename: 'hat-edge.wav', sources: [source('Samples/lofi/hh/lofi_hh_closed_vl4_rr4.flac')], duration: 0.6, peak: 0.62, fade: 0.11 },
      { filename: 'ride.wav', sources: [source('Samples/lofi/ride/lofi_ride_ride_vl2_rr2.flac')], duration: 2.5, peak: 0.58, fade: 0.35 },
      { filename: 'ride-bell.wav', sources: [source('Samples/lofi/ride/lofi_ride_bell_vl2_rr1.flac')], duration: 2.2, peak: 0.64, fade: 0.32 },
      { filename: 'crash.wav', sources: [source('Samples/lofi/crash/lofi_crash_crash_vl2_rr3.flac')], duration: 3, peak: 0.62, fade: 0.4 },
      { filename: 'splash.wav', sources: [source('Samples/lofi/hh/lofi_hh_splash_rr2.flac')], duration: 2.2, peak: 0.58, fade: 0.34 },
      { filename: 'rimshot.wav', sources: [source('Samples/lofi/snare/lofi_snare_rimshot_vl9.flac')], duration: 0.95, peak: 0.86, fade: 0.16 },
      { filename: 'soft-kick.wav', sources: [source('Samples/lofi/kick/lofi_kick_snon_vl1_rr4.flac')], duration: 1.05, peak: 0.5, fade: 0.14 },
    ],
  },
  {
    id: 'traditional',
    title: 'Traditional Kit',
    micSet: 'close kick/snare blended with natural mid and overhead microphones',
    processing: 'Phase-aligned microphone blends with onset trim, a transparent 24 Hz high-pass, clean 22.05 kHz resampling, short fades, peak normalization, and 16-bit mono PCM WAV encoding.',
    provenanceProcessing: 'phase-aligned close/mid microphone blending where applicable, onset trim, transparent 24 Hz high-pass, high-quality ffmpeg resampling to 22.05 kHz, short fades, peak normalization, and 16-bit mono WAV encoding',
    prepare: prepareTraditionalVoice,
    decodeRate: sampleRate,
    voices: [
      { filename: 'kick.wav', sources: [source('Samples/kickmic/kick/kickmic_kick_snon_vl4_rr2.flac', 0.78), source('Samples/mid/kick/mid_kick_snon_vl4_rr2.flac', 0.52)], duration: 1.45, peak: 0.92, fade: 0.16 },
      { filename: 'snare.wav', sources: [source('Samples/snaremic/snare/snaremic_snare_center_vl32.flac', 0.76), source('Samples/mid/snare/mid_snare_center_vl32.flac', 0.5)], duration: 1.35, peak: 0.9, fade: 0.2 },
      { filename: 'ghost-snare.wav', sources: [source('Samples/snaremic/snare/snaremic_snare_center_vl10.flac', 0.72), source('Samples/mid/snare/mid_snare_center_vl10.flac', 0.56)], duration: 0.95, peak: 0.5, fade: 0.16 },
      { filename: 'closed-hat.wav', sources: [source('Samples/oh/hh/oh_hh_closed_vl4_rr1.flac')], duration: 0.58, peak: 0.62, fade: 0.1 },
      { filename: 'open-hat.wav', sources: [source('Samples/oh/hh/oh_hh_open_vl4_rr2.flac')], duration: 1.9, peak: 0.7, fade: 0.3 },
      { filename: 'floor-tom.wav', sources: [source('Samples/mid/ltom/mid_ltom_center_vl14.flac')], duration: 1.55, peak: 0.86, fade: 0.24 },
      { filename: 'rack-tom.wav', sources: [source('Samples/mid/htom/mid_htom_center_vl14.flac')], duration: 1.4, peak: 0.84, fade: 0.22 },
      { filename: 'pedal-hat.wav', sources: [source('Samples/oh/hh/oh_hh_pedal_vl3_rr2.flac')], duration: 0.72, peak: 0.58, fade: 0.12 },
      { filename: 'cross-stick.wav', sources: [source('Samples/snaremic/snare/snaremic_snare_crossstick_vl14.flac', 0.72), source('Samples/mid/snare/mid_snare_crossstick_vl14.flac', 0.58)], duration: 0.78, peak: 0.72, fade: 0.13 },
      { filename: 'half-open-hat.wav', sources: [source('Samples/oh/hh/oh_hh_34_vl4_rr3.flac')], duration: 1.15, peak: 0.66, fade: 0.2 },
      { filename: 'ride.wav', sources: [source('Samples/oh/ride/oh_ride_ride_vl3_rr2.flac')], duration: 3.2, peak: 0.67, fade: 0.45 },
      { filename: 'ride-bell.wav', sources: [source('Samples/oh/ride/oh_ride_bell_vl3_rr1.flac')], duration: 2.7, peak: 0.72, fade: 0.4 },
      { filename: 'crash.wav', sources: [source('Samples/oh/crash/oh_crash_crash_vl3_rr1.flac')], duration: 4.2, peak: 0.72, fade: 0.55 },
      { filename: 'second-crash.wav', sources: [source('Samples/oh/flatride/oh_flatride_crash_vl4.flac')], duration: 3.6, peak: 0.7, fade: 0.5 },
      { filename: 'rimshot.wav', sources: [source('Samples/snaremic/snare/snaremic_snare_rimshot_vl9.flac', 0.76), source('Samples/mid/snare/mid_snare_rimshot_vl9.flac', 0.5)], duration: 1.05, peak: 0.9, fade: 0.18 },
      { filename: 'soft-kick.wav', sources: [source('Samples/kickmic/kick/kickmic_kick_snon_vl2_rr4.flac', 0.76), source('Samples/mid/kick/mid_kick_snon_vl2_rr4.flac', 0.54)], duration: 1.25, peak: 0.58, fade: 0.16 },
    ],
  },
];

async function download(url, destination) {
  const response = await fetch(url, { headers: { 'User-Agent': 'mcpmpc-sample-import/1.0' } });
  if (!response.ok) throw new Error(`Could not download ${url}: ${response.status}`);
  writeFileSync(destination, Buffer.from(await response.arrayBuffer()));
}

function decodeFlac(path, targetRate) {
  const decoded = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-i', path,
    '-f', 'f32le', '-ac', '1', '-ar', String(targetRate), 'pipe:1',
  ], { encoding: null, maxBuffer: 64 * 1024 * 1024 });
  if (decoded.error) throw decoded.error;
  if (decoded.status !== 0) throw new Error(decoded.stderr.toString().trim() || `ffmpeg failed for ${path}`);

  const samples = new Float32Array(decoded.stdout.length / 4);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = decoded.stdout.readFloatLE(index * 4);
  }
  return samples;
}

function mixSources(layers, inputRate) {
  if (layers.length === 1 && layers[0].gain === 1 && layers[0].delaySeconds === 0) return layers[0].samples;
  const length = Math.max(...layers.map(({ samples, delaySeconds }) => (
    samples.length + Math.round(delaySeconds * inputRate)
  )));
  const mixed = new Float32Array(length);
  const gainTotal = layers.reduce((total, layer) => total + layer.gain, 0);
  for (const { samples, gain, delaySeconds } of layers) {
    const normalizedGain = gain / gainTotal;
    const delaySamples = Math.round(delaySeconds * inputRate);
    for (let index = 0; index < samples.length; index += 1) {
      mixed[index + delaySamples] += samples[index] * normalizedGain;
    }
  }
  return mixed;
}

function trimToOnset(sourceSamples, duration, inputRate, thresholdRatio, preRollSeconds) {
  let sourcePeak = 0;
  for (const sample of sourceSamples) sourcePeak = Math.max(sourcePeak, Math.abs(sample));
  const onsetThreshold = sourcePeak * thresholdRatio;
  let onset = sourceSamples.findIndex((sample) => Math.abs(sample) >= onsetThreshold);
  if (onset < 0) onset = 0;
  const start = Math.max(0, onset - Math.round(inputRate * preRollSeconds));
  const end = Math.min(sourceSamples.length, start + Math.round(duration * inputRate));
  return sourceSamples.subarray(start, end);
}

function addFadesAndNormalize(samples, targetPeak, fadeSeconds) {
  const fadeInSamples = Math.min(Math.round(sampleRate * 0.002), samples.length);
  const fadeOutSamples = Math.min(Math.round(sampleRate * fadeSeconds), samples.length);
  let processedPeak = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const fadeIn = Math.min(1, index / Math.max(1, fadeInSamples));
    const fadeOut = Math.min(1, (samples.length - index - 1) / Math.max(1, fadeOutSamples));
    samples[index] *= Math.max(0, Math.min(fadeIn, fadeOut));
    processedPeak = Math.max(processedPeak, Math.abs(samples[index]));
  }

  const gain = processedPeak > 0 ? targetPeak / processedPeak : 1;
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = Math.max(-1, Math.min(1, samples[index] * gain));
  }
  return samples;
}

function prepareLoFiVoice(sourceSamples, { duration, peak: targetPeak, fade }) {
  const trimmed = trimToOnset(sourceSamples, duration, sourceSampleRate, 0.018, 0.008);
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

  addFadesAndNormalize(resampled, targetPeak, fade);
  const quantizer = 2 ** 13;
  for (let index = 0; index < resampled.length; index += 1) {
    resampled[index] = Math.round(resampled[index] * quantizer) / quantizer;
  }
  return resampled;
}

function prepareHipHopVoice(sourceSamples, {
  duration,
  peak: targetPeak,
  fade,
  pitch = 0,
  highPass = 30,
  lowPass = 9_500,
  drive = 1.5,
  bits = 13,
}) {
  const trimmed = trimToOnset(sourceSamples, duration, sourceSampleRate, 0.014, 0.006);
  const filtered = new Float32Array(trimmed.length);
  const highCoefficient = 1 - Math.exp(-Math.PI * 2 * highPass / sourceSampleRate);
  const lowCoefficient = 1 - Math.exp(-Math.PI * 2 * lowPass / sourceSampleRate);
  const driveScale = Math.tanh(drive);
  let subState = 0;
  let lowState = 0;
  for (let index = 0; index < trimmed.length; index += 1) {
    subState += highCoefficient * (trimmed[index] - subState);
    const highPassed = trimmed[index] - subState;
    lowState += lowCoefficient * (highPassed - lowState);
    filtered[index] = Math.tanh(lowState * drive) / driveScale;
  }

  const pitchRatio = 2 ** (pitch / 12);
  const step = sourceSampleRate * pitchRatio / sampleRate;
  const outputLength = Math.max(1, Math.floor(filtered.length / step));
  const resampled = new Float32Array(outputLength);
  for (let index = 0; index < outputLength; index += 1) {
    const position = index * step;
    const before = Math.floor(position);
    const after = Math.min(filtered.length - 1, before + 1);
    const fraction = position - before;
    resampled[index] = filtered[before] * (1 - fraction) + filtered[after] * fraction;
  }

  addFadesAndNormalize(resampled, targetPeak, fade);
  const quantizer = 2 ** (bits - 1);
  for (let index = 0; index < resampled.length; index += 1) {
    resampled[index] = Math.round(resampled[index] * quantizer) / quantizer;
  }
  return resampled;
}

function prepareTraditionalVoice(sourceSamples, { duration, peak: targetPeak, fade }) {
  const trimmed = trimToOnset(sourceSamples, duration, sampleRate, 0.012, 0.005);
  const highPassed = new Float32Array(trimmed.length);
  const highCoefficient = 1 - Math.exp(-Math.PI * 2 * 24 / sampleRate);
  let subState = 0;
  for (let index = 0; index < trimmed.length; index += 1) {
    subState += highCoefficient * (trimmed[index] - subState);
    highPassed[index] = trimmed[index] - subState;
  }
  return addFadesAndNormalize(highPassed, targetPeak, fade);
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
const downloadCache = new Map();
const manifestEntries = [];

try {
  const licensePath = join(temporary, 'LICENSE-CC0.txt');
  await download(`${rawBase}/LICENSE`, licensePath);

  for (const kit of recordedKits) {
    const output = join(samplesRoot, kit.id);
    const processed = [];
    rmSync(output, { recursive: true, force: true });
    mkdirSync(output, { recursive: true });

    for (const voice of kit.voices) {
      const layers = [];
      for (const layer of voice.sources) {
        if (!downloadCache.has(layer.path)) {
          const cacheName = `${createHash('sha1').update(layer.path).digest('hex')}.flac`;
          const sourcePath = join(temporary, cacheName);
          await download(`${rawBase}/${layer.path}`, sourcePath);
          downloadCache.set(layer.path, sourcePath);
        }
        layers.push({
          samples: decodeFlac(downloadCache.get(layer.path), kit.decodeRate),
          gain: layer.gain,
          delaySeconds: layer.delaySeconds,
        });
      }

      const buffer = wavBuffer(kit.prepare(mixSources(layers, kit.decodeRate), voice));
      writeFileSync(join(output, voice.filename), buffer);
      processed.push({
        file: voice.filename,
        sourceFiles: voice.sources.map((layer) => ({
          path: layer.path,
          gain: layer.gain,
          ...(layer.delaySeconds > 0 ? { delaySeconds: layer.delaySeconds } : {}),
        })),
        sha256: createHash('sha256').update(buffer).digest('hex'),
      });
    }

    writeFileSync(join(output, 'LICENSE-CC0.txt'), readFileSync(licensePath));
    const provenance = [
      `# ${kit.title} provenance`,
      '',
      'These are real acoustic drum recordings from Virtuosity Drums, played by Austin McMahon and recorded at Virtuosity Musical Instruments in Boston by Versilian Studios / Karoryfer Samples.',
      '',
      `- Source: ${repository}`,
      `- Pinned revision: \`${revision}\``,
      '- License: CC0 1.0 Universal (see `LICENSE-CC0.txt`)',
      `- Mic set: ${kit.micSet}`,
      `- Processing: ${kit.provenanceProcessing}`,
      '',
      '| Output | Source recording(s) and mix gain | SHA-256 |',
      '| --- | --- | --- |',
      ...processed.map((item) => {
        const sources = item.sourceFiles.map((layer) => {
          const delay = layer.delaySeconds ? ` after ${Math.round(layer.delaySeconds * 1_000)} ms` : '';
          return `\`${layer.path}\` at ${layer.gain}${delay}`;
        }).join('<br>');
        return `| \`${item.file}\` | ${sources} | \`${item.sha256}\` |`;
      }),
      '',
    ].join('\n');
    writeFileSync(join(output, 'PROVENANCE.md'), provenance);

    manifestEntries.push({
      id: kit.id,
      kind: 'recorded',
      rights: 'CC0 1.0 Universal',
      source: {
        name: 'Virtuosity Drums',
        repository,
        revision,
        performer: 'Austin McMahon',
        recording: 'Virtuosity Musical Instruments, Boston; Versilian Studios / Karoryfer Samples',
        micSet: kit.micSet,
      },
      processing: kit.processing,
      files: kit.voices.map((voice) => voice.filename),
      provenance: processed,
    });
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const recordedIds = new Set(manifestEntries.map((kit) => kit.id));
  manifest.kits = [...manifest.kits.filter((kit) => !recordedIds.has(kit.id)), ...manifestEntries];
  const kitOrder = new Map(['hip-hop', 'traditional', 'dusty-crate', 'lofi-acoustic'].map((id, index) => [id, index]));
  manifest.kits.sort((left, right) => (kitOrder.get(left.id) ?? 99) - (kitOrder.get(right.id) ?? 99));
  manifest.generatedBy = 'scripts/generate-samples.mjs + scripts/import-acoustic-kit.mjs';
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

const importedVoices = recordedKits.reduce((count, kit) => count + kit.voices.length, 0);
console.log(`Imported ${importedVoices} CC0 acoustic recordings across ${recordedKits.length} kits`);

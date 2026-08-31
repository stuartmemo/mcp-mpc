import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'public', 'samples');
const sampleRate = 22_050;
const TAU = Math.PI * 2;

const profiles = {
  dusty: {
    seedOffset: 2_000,
    bitDepth: 12,
    drive: 1.85,
    peak: 0.86,
    room: [[0.028, 0.055], [0.061, 0.032]],
  },
  hiphop: {
    seedOffset: 8_000,
    bitDepth: 14,
    drive: 2.35,
    peak: 0.92,
    room: [[0.021, 0.028]],
  },
};

function seededNoise(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return (state / 0xffff_ffff) * 2 - 1;
  };
}

function lowPass(cutoff) {
  const coefficient = 1 - Math.exp(-TAU * cutoff / sampleRate);
  let previous = 0;
  return (value) => {
    previous += coefficient * (value - previous);
    return previous;
  };
}

function highPass(cutoff) {
  const low = lowPass(cutoff);
  return (value) => value - low(value);
}

function bandPass(lowCutoff, highCutoff) {
  const high = highPass(lowCutoff);
  const low = lowPass(highCutoff);
  return (value) => low(high(value));
}

function sweepPhase(t, startFrequency, endFrequency, decay) {
  return TAU * (
    endFrequency * t
    + ((startFrequency - endFrequency) * (1 - Math.exp(-decay * t))) / decay
  );
}

function burstEnvelope(t, starts, decay) {
  return starts.reduce((sum, start) => sum + (t >= start ? Math.exp(-(t - start) * decay) : 0), 0);
}

function metallic(t, frequencies, square = false) {
  return frequencies.reduce((sum, [frequency, gain]) => {
    const wave = Math.sin(TAU * frequency * t);
    return sum + (square ? Math.sign(wave) : wave) * gain;
  }, 0);
}

function renderVoice(seconds, seed, render, options = {}) {
  const length = Math.ceil(seconds * sampleRate);
  const data = new Float32Array(length);
  const noise = seededNoise(seed);
  const room = options.room ?? [];
  const drive = options.drive ?? 1;
  const peakTarget = options.peak ?? 0.9;
  const bitDepth = options.bitDepth ?? 16;

  for (let index = 0; index < length; index += 1) {
    data[index] = render(index / sampleRate, index, noise);
  }

  for (const [delaySeconds, gain] of room) {
    const delay = Math.round(delaySeconds * sampleRate);
    for (let index = delay; index < data.length; index += 1) {
      data[index] += data[index - delay] * gain;
    }
  }

  let mean = 0;
  for (const sample of data) mean += sample;
  mean /= Math.max(1, data.length);

  const driveScale = Math.tanh(drive);
  const fadeSamples = Math.min(Math.round(sampleRate * 0.012), Math.floor(data.length / 4));
  let peak = 0;
  for (let index = 0; index < data.length; index += 1) {
    const fade = index >= data.length - fadeSamples
      ? (data.length - index - 1) / Math.max(1, fadeSamples)
      : 1;
    const driven = Math.tanh((data[index] - mean) * drive) / driveScale;
    data[index] = driven * Math.max(0, fade);
    peak = Math.max(peak, Math.abs(data[index]));
  }

  const gain = peak > 0 ? peakTarget / peak : 1;
  const quantizer = 2 ** (bitDepth - 1);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = Math.round(Math.max(-1, Math.min(1, data[index] * gain)) * quantizer) / quantizer;
  }

  return data;
}

function modeledOptions(style, overrides = {}) {
  return { ...profiles[style], ...overrides };
}

function makeKick(style) {
  const dusty = style === 'dusty';
  const bodyFilter = lowPass(dusty ? 2_100 : 4_200);
  const clickFilter = highPass(dusty ? 1_900 : 3_100);
  return renderVoice(dusty ? 0.7 : 0.58, profiles[style].seedOffset + 11, (t, _index, noise) => {
    const body = Math.sin(sweepPhase(t, dusty ? 142 : 176, dusty ? 46 : 52, dusty ? 30 : 38))
      * Math.exp(-t * (dusty ? 6.3 : 8.2));
    const knock = Math.sin(TAU * (dusty ? 112 : 138) * t) * Math.exp(-t * 28) * (dusty ? 0.24 : 0.32);
    const click = clickFilter(noise()) * Math.exp(-t * (dusty ? 145 : 210)) * (dusty ? 0.17 : 0.3);
    return bodyFilter(body + knock) + click;
  }, modeledOptions(style, { peak: dusty ? 0.9 : 0.94, room: dusty ? [[0.036, 0.025]] : [[0.024, 0.04]] }));
}

function makeSnare(style) {
  const dusty = style === 'dusty';
  const noiseFilter = bandPass(dusty ? 620 : 900, dusty ? 5_600 : 8_600);
  return renderVoice(dusty ? 0.58 : 0.68, profiles[style].seedOffset + 22, (t, _index, noise) => {
    const body = (
      Math.sin(TAU * (dusty ? 168 : 198) * t) * 0.48
      + Math.sin(TAU * (dusty ? 283 : 336) * t) * 0.2
    ) * Math.exp(-t * (dusty ? 11 : 14));
    const wires = noiseFilter(noise()) * Math.exp(-t * (dusty ? 8.5 : 7.2))
      * (0.68 + Math.sin(TAU * 2_750 * t) * 0.12);
    const crack = noise() * Math.exp(-t * 120) * (dusty ? 0.2 : 0.3);
    return body + wires + crack;
  }, modeledOptions(style, { room: dusty ? [[0.029, 0.045], [0.067, 0.022]] : [[0.018, 0.09], [0.041, 0.065], [0.077, 0.035]] }));
}

function makeClap(style) {
  const dusty = style === 'dusty';
  const clapFilter = bandPass(dusty ? 760 : 1_100, dusty ? 6_200 : 9_000);
  const starts = dusty ? [0, 0.023, 0.047] : [0, 0.018, 0.039, 0.061];
  return renderVoice(dusty ? 0.52 : 0.62, profiles[style].seedOffset + 33, (t, _index, noise) => {
    const bursts = burstEnvelope(t, starts, dusty ? 82 : 105);
    const tail = t > starts.at(-1) ? Math.exp(-(t - starts.at(-1)) * (dusty ? 10 : 7)) : 0;
    return clapFilter(noise()) * (bursts * 0.74 + tail * 0.42);
  }, modeledOptions(style, { room: dusty ? [[0.032, 0.06], [0.073, 0.035]] : [[0.021, 0.13], [0.049, 0.08], [0.093, 0.04]] }));
}

function makeHat(style, open) {
  const dusty = style === 'dusty';
  const duration = open ? (dusty ? 0.68 : 0.82) : (dusty ? 0.18 : 0.16);
  const decay = open ? (dusty ? 5.8 : 4.7) : (dusty ? 34 : 45);
  const brightness = highPass(dusty ? 3_900 : 5_300);
  const frequencies = dusty
    ? [[5_147, 0.22], [6_829, 0.17], [8_113, 0.13]]
    : [[5_923, 0.24], [7_431, 0.19], [9_271, 0.13]];
  return renderVoice(duration, profiles[style].seedOffset + (open ? 55 : 44), (t, _index, noise) => {
    const metal = metallic(t, frequencies, true);
    const wash = brightness(noise()) * (dusty ? 0.62 : 0.72);
    return (metal + wash) * Math.exp(-t * decay);
  }, modeledOptions(style, { peak: open ? 0.72 : 0.68, room: open && !dusty ? [[0.019, 0.07], [0.052, 0.035]] : [] }));
}

function makeTom(style) {
  const dusty = style === 'dusty';
  const filter = lowPass(dusty ? 3_100 : 4_800);
  return renderVoice(0.62, profiles[style].seedOffset + 66, (t, _index, noise) => {
    const body = Math.sin(sweepPhase(t, dusty ? 126 : 148, dusty ? 82 : 94, 19)) * Math.exp(-t * (dusty ? 7.2 : 8.6));
    const skin = noise() * Math.exp(-t * 80) * 0.16;
    const ring = Math.sin(TAU * (dusty ? 171 : 196) * t) * Math.exp(-t * 12) * 0.18;
    return filter(body + skin + ring);
  }, modeledOptions(style, { room: dusty ? [[0.041, 0.035]] : [[0.027, 0.085], [0.071, 0.04]] }));
}

function makeConga(style) {
  const dusty = style === 'dusty';
  const filter = lowPass(dusty ? 4_200 : 6_000);
  const slapFilter = highPass(1_700);
  return renderVoice(0.48, profiles[style].seedOffset + 77, (t, _index, noise) => {
    const body = Math.sin(sweepPhase(t, dusty ? 310 : 352, dusty ? 218 : 248, 28)) * Math.exp(-t * 10.5);
    const overtone = Math.sin(TAU * (dusty ? 472 : 528) * t) * Math.exp(-t * 17) * 0.25;
    const slap = slapFilter(noise()) * Math.exp(-t * 115) * 0.2;
    return filter(body + overtone + slap);
  }, modeledOptions(style, { room: dusty ? [[0.033, 0.03]] : [[0.023, 0.07], [0.058, 0.035]] }));
}

function makeTambourine(style) {
  const dusty = style === 'dusty';
  const brightness = highPass(dusty ? 3_100 : 4_500);
  const rings = dusty
    ? [[3_911, 0.18], [5_207, 0.15], [7_033, 0.1]]
    : [[4_617, 0.2], [6_113, 0.16], [8_409, 0.12]];
  return renderVoice(dusty ? 0.58 : 0.68, profiles[style].seedOffset + 88, (t, _index, noise) => {
    const pulses = burstEnvelope(t, [0, 0.031, 0.067, 0.11], 45);
    const wash = brightness(noise()) * (0.5 + pulses * 0.36);
    return (wash + metallic(t, rings) * 0.34) * Math.exp(-t * (dusty ? 7.5 : 6));
  }, modeledOptions(style, { peak: 0.72, room: dusty ? [[0.026, 0.04]] : [[0.018, 0.09], [0.041, 0.065], [0.077, 0.035]] }));
}

function makeRim(style) {
  const dusty = style === 'dusty';
  const filter = highPass(dusty ? 600 : 850);
  return renderVoice(0.24, profiles[style].seedOffset + 99, (t, _index, noise) => {
    const click = metallic(t, dusty ? [[1_410, 0.62], [2_180, 0.35]] : [[1_760, 0.68], [2_930, 0.4]]);
    return filter(click * Math.exp(-t * (dusty ? 34 : 43)) + noise() * Math.exp(-t * 105) * 0.17);
  }, modeledOptions(style, { peak: 0.75, room: dusty ? [] : [[0.022, 0.05]] }));
}

function makeCowbell(style) {
  const dusty = style === 'dusty';
  const filter = bandPass(dusty ? 280 : 390, dusty ? 3_300 : 4_900);
  return renderVoice(dusty ? 0.52 : 0.58, profiles[style].seedOffset + 110, (t) => {
    const bell = metallic(t, dusty ? [[523, 0.58], [781, 0.38]] : [[562, 0.6], [845, 0.4]], true);
    return filter(bell) * Math.exp(-t * (dusty ? 9.4 : 8.2));
  }, modeledOptions(style, { peak: 0.74, room: dusty ? [[0.031, 0.025]] : [[0.024, 0.07], [0.069, 0.035]] }));
}

function makeShaker(style) {
  const dusty = style === 'dusty';
  const brightness = bandPass(dusty ? 2_100 : 3_300, dusty ? 7_200 : 10_000);
  return renderVoice(dusty ? 0.36 : 0.42, profiles[style].seedOffset + 121, (t, _index, noise) => {
    const grains = 0.3 + Math.max(0, Math.sin(TAU * (dusty ? 37 : 48) * t)) ** 3;
    return brightness(noise()) * grains * Math.exp(-t * (dusty ? 10.5 : 8.8));
  }, modeledOptions(style, { peak: 0.62, room: dusty ? [] : [[0.019, 0.04]] }));
}

function makeWoodPerc(style) {
  const dusty = style === 'dusty';
  const filter = bandPass(dusty ? 380 : 520, dusty ? 4_200 : 5_800);
  return renderVoice(0.32, profiles[style].seedOffset + 132, (t, _index, noise) => {
    const wood = metallic(t, dusty ? [[612, 0.66], [1_044, 0.26]] : [[748, 0.68], [1_296, 0.28]]);
    return filter(wood * Math.exp(-t * (dusty ? 22 : 28)) + noise() * Math.exp(-t * 120) * 0.12);
  }, modeledOptions(style, { peak: 0.72, room: dusty ? [] : [[0.026, 0.05]] }));
}

function makeCrash(style) {
  const dusty = style === 'dusty';
  const brightness = bandPass(dusty ? 1_700 : 2_300, dusty ? 7_600 : 10_200);
  const frequencies = dusty
    ? [[2_719, 0.12], [4_103, 0.1], [5_683, 0.08], [7_411, 0.06]]
    : [[3_127, 0.13], [4_709, 0.11], [6_313, 0.09], [8_341, 0.07]];
  return renderVoice(dusty ? 1.45 : 1.65, profiles[style].seedOffset + 143, (t, _index, noise) => {
    const envelope = Math.exp(-t * (dusty ? 2.8 : 2.35));
    return (brightness(noise()) * 0.68 + metallic(t, frequencies) * 0.5) * envelope;
  }, modeledOptions(style, { peak: 0.72, room: dusty ? [[0.039, 0.04], [0.089, 0.025]] : [[0.018, 0.09], [0.041, 0.065], [0.077, 0.035]] }));
}

function makeRide(style) {
  const dusty = style === 'dusty';
  const washFilter = bandPass(dusty ? 1_900 : 2_800, dusty ? 8_000 : 10_500);
  return renderVoice(dusty ? 1.28 : 1.42, profiles[style].seedOffset + 154, (t, _index, noise) => {
    const ping = metallic(t, dusty ? [[1_940, 0.42], [3_062, 0.24], [4_487, 0.1]] : [[2_304, 0.46], [3_492, 0.27], [5_118, 0.12]]);
    const wash = washFilter(noise()) * 0.3;
    return (ping + wash) * Math.exp(-t * (dusty ? 3.5 : 3));
  }, modeledOptions(style, { peak: 0.68, room: dusty ? [[0.047, 0.03]] : [[0.018, 0.09], [0.041, 0.065], [0.077, 0.035]] }));
}

function makeBassStab(style) {
  const dusty = style === 'dusty';
  const filter = lowPass(dusty ? 1_050 : 1_900);
  return renderVoice(dusty ? 0.78 : 0.7, profiles[style].seedOffset + 165, (t) => {
    const frequency = dusty ? 54 : 61;
    const harmonics = metallic(t, [[frequency, 0.75], [frequency * 2, 0.25], [frequency * 3, 0.12], [frequency * 4, 0.07]]);
    const pluck = 0.65 + Math.exp(-t * 42) * 0.35;
    return filter(harmonics * pluck) * Math.exp(-t * (dusty ? 5.1 : 6.2));
  }, modeledOptions(style, { peak: 0.86, room: dusty ? [[0.043, 0.025]] : [[0.029, 0.045]] }));
}

function makeVinylHit(style) {
  const dusty = style === 'dusty';
  const texture = bandPass(dusty ? 180 : 420, dusty ? 5_000 : 7_800);
  return renderVoice(dusty ? 0.72 : 0.62, profiles[style].seedOffset + 176, (t, index, noise) => {
    const chirp = Math.sin(TAU * ((dusty ? 260 : 380) * t + (dusty ? 680 : 1_240) * t * t)) * Math.exp(-t * 7.5);
    const crackle = index % (dusty ? 641 : 887) === 0 ? noise() * 0.8 : 0;
    const hiss = texture(noise()) * Math.exp(-t * (dusty ? 4.8 : 6.5));
    return chirp * (dusty ? 0.42 : 0.52) + hiss * 0.48 + crackle;
  }, modeledOptions(style, { peak: 0.74, room: dusty ? [[0.057, 0.045]] : [[0.031, 0.05], [0.081, 0.025]] }));
}

function make808Kick() {
  const clickFilter = highPass(2_400);
  const bodyFilter = lowPass(1_900);
  return renderVoice(1.18, profiles.hiphop.seedOffset + 187, (t, _index, noise) => {
    const sub = Math.sin(sweepPhase(t, 118, 43, 24)) * Math.exp(-t * 3.45);
    const second = Math.sin(sweepPhase(t, 174, 86, 31)) * Math.exp(-t * 10.5) * 0.19;
    const click = clickFilter(noise()) * Math.exp(-t * 185) * 0.16;
    return bodyFilter(sub + second) + click;
  }, modeledOptions('hiphop', {
    bitDepth: 16,
    drive: 1.65,
    peak: 0.94,
    room: [],
  }));
}

function makeFingerSnap() {
  const snapFilter = bandPass(1_250, 8_400);
  return renderVoice(0.42, profiles.hiphop.seedOffset + 198, (t, _index, noise) => {
    const cracks = burstEnvelope(t, [0, 0.012, 0.027], 155);
    const body = Math.sin(TAU * 1_720 * t) * Math.exp(-t * 43) * 0.26;
    return snapFilter(noise()) * cracks * 0.82 + body;
  }, modeledOptions('hiphop', {
    peak: 0.78,
    room: [[0.035, 0.07], [0.083, 0.035]],
  }));
}

function makeReverseHit() {
  const washFilter = bandPass(1_300, 9_600);
  const duration = 0.92;
  return renderVoice(duration, profiles.hiphop.seedOffset + 209, (t, _index, noise) => {
    const rise = Math.min(1, t / 0.72) ** 1.8;
    const cutoffTail = t < 0.79 ? 1 : Math.exp(-(t - 0.79) * 24);
    const metal = metallic(t, [[2_813, 0.11], [4_379, 0.09], [6_947, 0.07]]);
    return (washFilter(noise()) * 0.74 + metal) * rise * cutoffTail;
  }, modeledOptions('hiphop', {
    peak: 0.74,
    room: [],
  }));
}

function modeledKit(style) {
  return [
    ['kick.wav', makeKick(style)],
    ['snare.wav', makeSnare(style)],
    ['clap.wav', makeClap(style)],
    ['closed-hat.wav', makeHat(style, false)],
    ['open-hat.wav', makeHat(style, true)],
    ['low-tom.wav', makeTom(style)],
    ['conga.wav', makeConga(style)],
    ['tambourine.wav', makeTambourine(style)],
    ['rim.wav', makeRim(style)],
    ['cowbell.wav', makeCowbell(style)],
    ['shaker.wav', makeShaker(style)],
    ['wood-perc.wav', makeWoodPerc(style)],
    ['crash.wav', makeCrash(style)],
    ['ride.wav', makeRide(style)],
    ['bass-stab.wav', makeBassStab(style)],
    ['vinyl-hit.wav', makeVinylHit(style)],
  ];
}

function hipHopKit() {
  return [
    ['kick.wav', makeKick('hiphop')],
    ['snare.wav', makeSnare('hiphop')],
    ['clap.wav', makeClap('hiphop')],
    ['closed-hat.wav', makeHat('hiphop', false)],
    ['open-hat.wav', makeHat('hiphop', true)],
    ['808-kick.wav', make808Kick()],
    ['low-perc.wav', makeConga('hiphop')],
    ['tambourine.wav', makeTambourine('hiphop')],
    ['rim.wav', makeRim('hiphop')],
    ['cowbell.wav', makeCowbell('hiphop')],
    ['shaker.wav', makeShaker('hiphop')],
    ['snap.wav', makeFingerSnap()],
    ['crash.wav', makeCrash('hiphop')],
    ['reverse-hit.wav', makeReverseHit()],
    ['sub-bass.wav', makeBassStab('hiphop')],
    ['vinyl-hit.wav', makeVinylHit('hiphop')],
  ];
}

function writeWav(kitId, filename, samples) {
  const directory = join(output, kitId);
  mkdirSync(directory, { recursive: true });
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
  writeFileSync(join(directory, filename), buffer);
}

const kits = [
  ['dusty-crate', modeledKit('dusty')],
  ['hip-hop', hipHopKit()],
];

for (const retiredKitId of ['disco-room', 'pixel-circuit']) {
  rmSync(join(output, retiredKitId), { recursive: true, force: true });
}

for (const retiredRootSample of [
  'bass-stab.wav', 'clap.wav', 'closed-hat.wav', 'cowbell.wav',
  'crash.wav', 'high-tom.wav', 'kick.wav', 'low-tom.wav',
  'mid-tom.wav', 'open-hat.wav', 'perc.wav', 'ride.wav',
  'rim.wav', 'shaker.wav', 'snare.wav', 'vinyl-hit.wav',
]) {
  rmSync(join(output, retiredRootSample), { force: true });
}

for (const [kitId, voices] of kits) {
  for (const [filename, samples] of voices) writeWav(kitId, filename, samples);
}

mkdirSync(output, { recursive: true });
writeFileSync(join(output, 'manifest.json'), `${JSON.stringify({
  generatedBy: 'scripts/generate-samples.mjs',
  sampleRate,
  format: '16-bit mono PCM WAV',
  rights: 'Rights and provenance are listed per kit.',
  kits: kits.map(([id, voices]) => ({
    id,
    kind: 'procedural',
    rights: 'Original deterministic procedural synthesis. No third-party samples.',
    files: voices.map(([filename]) => filename),
  })),
}, null, 2)}\n`);

console.log(`Generated ${kits.length} original kits (${kits.reduce((count, [, voices]) => count + voices.length, 0)} samples) in ${output}`);

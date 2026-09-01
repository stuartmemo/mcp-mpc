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
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const samplesRoot = join(root, 'public', 'samples');
const sampleRate = 22_050;

const voice = (filename, path, duration, peak = 0.9, fade = 0.06) => ({
  filename,
  path,
  duration,
  peak,
  fade,
});

const kits = [
  {
    id: 'fischer-808',
    title: 'Fischer 808',
    rights: 'CC0 1.0 Universal',
    source: {
      name: 'Roland TR-808 Rhythm Composer Sound Sample Set 1.0.0',
      repository: 'https://github.com/tidalcycles/sounds-tr808-fischer',
      revision: '85fbecf1bec32553395625ea659e2a56dfd7c0e1',
      creator: 'Michael Fischer / Technopolis',
      licensePath: 'LICENSE',
    },
    description: 'Direct 16-bit recordings of a real TR-808, selected from Michael Fischer\'s 116-sample capture.',
    processing: 'Onset trim, transparent mono resampling to 22.05 kHz, per-hit tail shaping, peak normalization, and 16-bit PCM WAV encoding.',
    voices: [
      voice('kick.wav', 'bd8/BD5050.WAV', 1.12, 0.94, 0.1),
      voice('snare.wav', 'sd8/SD5050.WAV', 0.82, 0.92, 0.09),
      voice('clap.wav', 'cp8/CP.WAV', 0.68, 0.88, 0.08),
      voice('closed-hat.wav', 'ch8/CH.WAV', 0.24, 0.78, 0.035),
      voice('open-hat.wav', 'oh8/OH50.WAV', 0.88, 0.82, 0.1),
      voice('low-tom.wav', 'lt8/LT50.WAV', 0.7, 0.9, 0.08),
      voice('mid-tom.wav', 'mt8/MT50.WAV', 0.62, 0.88, 0.07),
      voice('high-tom.wav', 'ht8/HT50.WAV', 0.56, 0.86, 0.065),
      voice('rimshot.wav', 'rs8/RS.WAV', 0.3, 0.82, 0.045),
      voice('cowbell.wav', 'cb8/CB.WAV', 0.62, 0.82, 0.07),
      voice('claves.wav', 'cl8/CL.WAV', 0.3, 0.8, 0.04),
      voice('maracas.wav', 'ma8/MA.WAV', 0.34, 0.74, 0.045),
      voice('cymbal.wav', 'cy8/CY5050.WAV', 1.45, 0.82, 0.14),
      voice('low-conga.wav', 'lc8/LC50.WAV', 0.5, 0.86, 0.06),
      voice('mid-conga.wav', 'mc8/MC50.WAV', 0.46, 0.84, 0.055),
      voice('high-conga.wav', 'hc8/HC50.WAV', 0.42, 0.82, 0.05),
    ],
  },
  {
    id: 'uzu',
    title: 'Uzu Modern',
    rights: 'The Unlicense / public-domain dedication',
    source: {
      name: 'uzu-drumkit',
      repository: 'https://github.com/tidalcycles/uzu-drumkit',
      revision: '2f3e05c70ab4d73ad053a1467adec89bd27377a0',
      creator: 'Mot4i, Switch Angel, and Ludens',
      licensePath: 'LICENSE',
    },
    description: 'Synthesized and analog-processed electronic drums, including modular sound-design hits.',
    processing: 'Onset trim, stereo-to-mono fold-down, transparent resampling to 22.05 kHz, per-hit tail shaping, peak normalization, and 16-bit PCM WAV encoding.',
    voices: [
      voice('punch-kick.wav', 'bd/10_bd_switchangel.wav', 0.36, 0.94, 0.06),
      voice('deep-kick.wav', 'bd/17_bd_switchangel.wav', 0.98, 0.94, 0.1),
      voice('wide-snare.wav', 'sd/10_sd_switchangel-bounce-2.wav', 0.58, 0.92, 0.08),
      voice('tight-snare.wav', 'sd/11_sd_switchangel_3.wav', 0.3, 0.9, 0.05),
      voice('clap.wav', 'cp/10_cp_switchangel.wav', 0.46, 0.88, 0.07),
      voice('closed-hat.wav', 'hh/10_hh_switchangel.wav', 0.24, 0.78, 0.04),
      voice('hat-tick.wav', 'hh/12_hh_switchangel.wav', 0.16, 0.74, 0.03),
      voice('open-hat.wav', 'oh/10_oh_switchangel.wav', 0.68, 0.82, 0.09),
      voice('rim.wav', 'rim/10_rim_switchangel.wav', 0.18, 0.8, 0.03),
      voice('low-tom.wav', 'lt/10_lt_mot4i.wav', 0.8, 0.9, 0.09),
      voice('mid-tom.wav', 'mt/10_mt_mot4i.wav', 0.5, 0.88, 0.07),
      voice('high-tom.wav', 'ht/10_ht_mot4i.wav', 0.46, 0.86, 0.06),
      voice('crash.wav', 'cr/11_cr_mot4i.wav', 1.52, 0.82, 0.15),
      voice('ride.wav', 'rd/10_rd_switchangel.wav', 0.58, 0.8, 0.08),
      voice('shaker.wav', 'sh/10_sh_switchangel.wav', 0.16, 0.72, 0.03),
      voice('modular-hit.wav', 'misc/10_misc_switchangel_ludens.wav', 0.2, 0.82, 0.035),
    ],
  },
  {
    id: 'big-rusty',
    title: 'Big Rusty Room',
    rights: 'CC0 1.0 Universal',
    source: {
      name: 'Big Rusty Drums 1.100',
      repository: 'https://github.com/sfzinstruments/karoryfer.big-rusty-drums',
      revision: 'f07ce00df34a46b6b08375be56fe116cf15782bc',
      creator: 'Karoryfer Samples',
      licensePath: 'LICENSE',
    },
    description: 'Room-forward hits from a large vintage Polish acoustic kit, with four oversized toms and unusual cymbals.',
    processing: 'Overhead microphone recordings folded to mono, onset-trimmed, resampled to 22.05 kHz, tail-shaped, peak-normalized, and encoded as 16-bit PCM WAV.',
    voices: [
      voice('kick.wav', 'Samples/kick_24/kick/oh/k_vl9_rr1.flac', 1.45, 0.94, 0.13),
      voice('snare.wav', 'Samples/snare_14/center/oh/sn_center_vl9_rr1.flac', 1.18, 0.92, 0.12),
      voice('rimshot.wav', 'Samples/snare_14/rimshot/oh/sn_rims_vl6_rr1.flac', 0.9, 0.9, 0.1),
      voice('closed-hat.wav', 'Samples/hihat_14/cl/oh/ht_cl_vl6_rr1.flac', 0.38, 0.78, 0.05),
      voice('open-hat.wav', 'Samples/hihat_14/open/oh/ht_open_vl6_rr1.flac', 1.25, 0.82, 0.13),
      voice('floor-tom.wav', 'Samples/tom_22/center/oh/t22_vl7_rr1.flac', 1.42, 0.92, 0.13),
      voice('low-tom.wav', 'Samples/tom_18/center/oh/t18_vl8_rr1.flac', 1.28, 0.9, 0.12),
      voice('mid-tom.wav', 'Samples/tom_15/center/oh/t15_vl7_rr1.flac', 1.12, 0.88, 0.11),
      voice('high-tom.wav', 'Samples/tom_14/center/oh/t14_vl6_rr1.flac', 1.02, 0.88, 0.1),
      voice('pedal-hat.wav', 'Samples/hihat_14/chik/oh/ht_chik_vl5_rr1.flac', 0.42, 0.76, 0.055),
      voice('sidestick.wav', 'Samples/snare_14/sidestick/oh/sn_ss_vl4_rr1.flac', 0.54, 0.82, 0.065),
      voice('ride.wav', 'Samples/ride_22/rd/oh/rd_vl9_rr1.flac', 1.6, 0.82, 0.15),
      voice('ride-bell.wav', 'Samples/ride_22/bl/oh/rd_bl_vl4_rr1.flac', 1.24, 0.84, 0.12),
      voice('crash.wav', 'Samples/crash_17/cr/oh/cr_vl5_rr1.flac', 1.72, 0.82, 0.16),
      voice('china.wav', 'Samples/china_18/cn/oh/cn_vl5_rr1.flac', 1.62, 0.82, 0.15),
      voice('cymbal-stack.wav', 'Samples/stack_3_layer/mid/oh/st_mid_vl6_rr1.flac', 1.35, 0.84, 0.13),
    ],
  },
  {
    id: 'swirly',
    title: 'Swirly Brushes',
    rights: 'CC0 1.0 Universal',
    source: {
      name: 'Swirly Drums 1.100',
      repository: 'https://github.com/sfzinstruments/karoryfer.swirly-drums',
      revision: 'c40dafe0011cb2e54c0c220ff0fa308a11fc60f5',
      creator: 'Karoryfer Samples',
      licensePath: 'license',
    },
    description: 'A brushed and hand-played character palette with cajon, snare buzz, hand drums, and cracked cymbals.',
    processing: 'Recorded hits onset-trimmed, folded to mono where needed, resampled to 22.05 kHz, tail-shaped, peak-normalized, and encoded as 16-bit PCM WAV.',
    voices: [
      voice('cajon-kick.wav', 'Samples/cajon_kick/cajon_kick_vl13_rr1_rear.wav', 0.78, 0.92, 0.09),
      voice('buzz-kick.wav', 'Samples/kick_buzz/buzz_kick_with_snare_buzz_vl9_rr1.wav', 1.0, 0.92, 0.1),
      voice('brush-snare.wav', 'Samples/snare_main/snare_hit_vl12_rr1_top.wav', 0.86, 0.9, 0.09),
      voice('snare-dig.wav', 'Samples/snare_dig/snare_dig_vl10_rr1_top.wav', 0.68, 0.86, 0.08),
      voice('closed-hat.wav', 'Samples/hat_closed/hh_closed_vl12_rr1.wav', 0.42, 0.76, 0.055),
      voice('open-hat.wav', 'Samples/hat_open/hh_open_vl14_rr1.wav', 1.02, 0.8, 0.11),
      voice('darbouka.wav', 'Samples/darbouka/darbouka_vl12_rr1.wav', 0.72, 0.88, 0.08),
      voice('djembe.wav', 'Samples/djembe/djembe_vl12_rr1.wav', 0.84, 0.9, 0.09),
      voice('high-bongo.wav', 'Samples/hbongo/hbongo_vl9_rr1.wav', 0.52, 0.84, 0.065),
      voice('low-bongo.wav', 'Samples/lbongo/lbongo_vl9_rr1.wav', 0.58, 0.86, 0.07),
      voice('cowbell.wav', 'Samples/cowbell/cowbell_vl9_rr1.wav', 0.52, 0.8, 0.065),
      voice('snare-edge.wav', 'Samples/snare_edge/snare_edge_vl10_rr1_top.wav', 0.76, 0.86, 0.08),
      voice('broken-crash.wav', 'Samples/crash_broken/crash_vl12_rr1.wav', 1.5, 0.8, 0.14),
      voice('cracked-splash.wav', 'Samples/splash_broken/splash_vl9_rr1.wav', 1.2, 0.8, 0.12),
      voice('china.wav', 'Samples/china/china_vl12_rr1.wav', 1.62, 0.8, 0.15),
      voice('ride.wav', 'Samples/ride/ride_vl9_rr1.wav', 1.5, 0.8, 0.14),
    ],
  },
];

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function rawUrl(source, path) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `https://raw.githubusercontent.com/${new URL(source.repository).pathname.slice(1)}/${source.revision}/${encodedPath}`;
}

async function download(url, destination) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(destination, buffer);
  return buffer;
}

function decodeToPcm(sourcePath, rawPath) {
  const result = spawnSync('ffmpeg', [
    '-hide_banner',
    '-loglevel', 'error',
    '-y',
    '-i', sourcePath,
    '-vn',
    '-ac', '1',
    '-ar', String(sampleRate),
    '-f', 's16le',
    '-acodec', 'pcm_s16le',
    rawPath,
  ], { encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error(`ffmpeg failed for ${sourcePath}: ${result.stderr.trim()}`);
  }
}

function preparePcm(rawBuffer, durationSeconds, targetPeak, fadeSeconds) {
  const sourceLength = Math.floor(rawBuffer.length / 2);
  const source = new Int16Array(sourceLength);
  let sourcePeak = 0;
  for (let index = 0; index < sourceLength; index += 1) {
    source[index] = rawBuffer.readInt16LE(index * 2);
    sourcePeak = Math.max(sourcePeak, Math.abs(source[index]));
  }
  if (sourcePeak < 16) throw new Error('Decoded source is silent.');

  const onsetThreshold = Math.max(96, sourcePeak * 0.008);
  let onset = 0;
  while (onset < source.length && Math.abs(source[onset]) < onsetThreshold) onset += 1;
  onset = Math.max(0, onset - Math.round(sampleRate * 0.006));

  const outputLength = Math.max(Math.round(durationSeconds * sampleRate), Math.round(sampleRate * 0.12));
  const audibleLength = Math.min(outputLength, source.length - onset);
  const prepared = new Float64Array(outputLength);
  for (let index = 0; index < audibleLength; index += 1) prepared[index] = source[onset + index];

  const fadeLength = Math.min(Math.round(fadeSeconds * sampleRate), Math.floor(audibleLength / 2));
  for (let index = 0; index < fadeLength; index += 1) {
    const position = audibleLength - fadeLength + index;
    prepared[position] *= Math.cos((index / Math.max(1, fadeLength - 1)) * Math.PI * 0.5);
  }

  let peak = 0;
  for (const sample of prepared) peak = Math.max(peak, Math.abs(sample));
  const scale = (targetPeak * 32_767) / peak;

  const output = Buffer.alloc(outputLength * 2);
  for (let index = 0; index < outputLength; index += 1) {
    const sample = Math.max(-32_768, Math.min(32_767, Math.round(prepared[index] * scale)));
    output.writeInt16LE(sample, index * 2);
  }
  return output;
}

function encodeWav(pcm) {
  const wav = Buffer.alloc(44 + pcm.length);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + pcm.length, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(pcm.length, 40);
  pcm.copy(wav, 44);
  return wav;
}

function provenanceDocument(kit, entries) {
  const rows = entries.map((entry) => (
    `| \`${entry.file}\` | \`${entry.sourceFiles[0].path}\` | \`${entry.sourceFiles[0].sha256}\` | \`${entry.sha256}\` |`
  )).join('\n');
  return `# ${kit.title} sample provenance

- Source: [${kit.source.name}](${kit.source.repository})
- Creator: ${kit.source.creator}
- Pinned revision: \`${kit.source.revision}\`
- Rights: ${kit.rights}
- Processing: ${kit.processing}

The files below are compact derivatives made for MCP-MPC. The source checksum identifies the exact upstream recording downloaded from the pinned revision; the output checksum identifies the committed derivative.

| Output | Upstream recording | Source SHA-256 | Output SHA-256 |
| --- | --- | --- | --- |
${rows}
`;
}

function sourcesDocument() {
  const sections = kits.map((kit) => `## ${kit.title}

- Upstream: [${kit.source.name}](${kit.source.repository})
- Creator: ${kit.source.creator}
- Revision: \`${kit.source.revision}\`
- Rights: ${kit.rights}
- Selection: ${kit.description}
`).join('\n');
  return `# Factory sample sources

All factory samples are compact derivatives of openly redistributable recordings. Each kit directory includes the upstream license and a file-by-file provenance table. Exact source and output checksums also live in \`manifest.json\`.

${sections}`;
}

async function main() {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'mcpmpc-factory-kits-'));
  rmSync(samplesRoot, { recursive: true, force: true });
  mkdirSync(samplesRoot, { recursive: true });

  const manifestKits = [];
  try {
    for (const kit of kits) {
      const directory = join(samplesRoot, kit.id);
      mkdirSync(directory, { recursive: true });
      const license = await download(rawUrl(kit.source, kit.source.licensePath), join(directory, 'LICENSE.txt'));
      const provenance = [];

      for (let index = 0; index < kit.voices.length; index += 1) {
        const sample = kit.voices[index];
        const extension = extname(sample.path) || '.audio';
        const sourcePath = join(temporaryRoot, `${kit.id}-${index}${extension}`);
        const rawPath = join(temporaryRoot, `${kit.id}-${index}.pcm`);
        const sourceBuffer = await download(rawUrl(kit.source, sample.path), sourcePath);
        decodeToPcm(sourcePath, rawPath);
        const pcm = preparePcm(readFileSync(rawPath), sample.duration, sample.peak, sample.fade);
        const wav = encodeWav(pcm);
        writeFileSync(join(directory, sample.filename), wav);
        provenance.push({
          file: sample.filename,
          sourceFiles: [{ path: sample.path, sha256: sha256(sourceBuffer) }],
          durationSeconds: sample.duration,
          peak: sample.peak,
          sha256: sha256(wav),
        });
        process.stdout.write(`Imported ${kit.id}/${sample.filename}\n`);
      }

      writeFileSync(join(directory, 'PROVENANCE.md'), provenanceDocument(kit, provenance));
      manifestKits.push({
        id: kit.id,
        kind: 'recorded',
        rights: kit.rights,
        licenseSha256: sha256(license),
        source: {
          name: kit.source.name,
          repository: kit.source.repository,
          revision: kit.source.revision,
          creator: kit.source.creator,
        },
        description: kit.description,
        processing: kit.processing,
        files: kit.voices.map((sample) => sample.filename),
        provenance,
      });
    }

    const manifest = {
      generatedBy: 'scripts/import-factory-kits.mjs',
      sampleRate,
      format: '16-bit mono PCM WAV',
      rights: 'Rights, pinned sources, licenses, and per-file checksums are recorded for every kit.',
      kits: manifestKits,
    };
    writeFileSync(join(samplesRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    writeFileSync(join(samplesRoot, 'SOURCES.md'), sourcesDocument());
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

await main();

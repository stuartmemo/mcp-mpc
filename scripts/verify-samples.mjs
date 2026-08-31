import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const samplesRoot = join(root, 'public', 'samples');
const manifest = JSON.parse(readFileSync(join(samplesRoot, 'manifest.json'), 'utf8'));
const expectedKitIds = ['hip-hop', 'traditional', 'dusty-crate', 'lofi-acoustic'];

assert.deepEqual(
  manifest.kits.map((kit) => kit.id),
  expectedKitIds,
  'Sample manifest kit order or membership does not match the app.',
);

let verifiedFiles = 0;
for (const kit of manifest.kits) {
  assert.equal(kit.files.length, 16, `${kit.id} must contain exactly 16 samples.`);
  assert.equal(new Set(kit.files).size, 16, `${kit.id} contains duplicate sample filenames.`);

  const directory = join(samplesRoot, kit.id);
  const diskFiles = readdirSync(directory).filter((name) => name.endsWith('.wav')).sort();
  assert.deepEqual(diskFiles, [...kit.files].sort(), `${kit.id} manifest and directory disagree.`);

  const provenance = new Map((kit.provenance ?? []).map((entry) => [entry.file, entry.sha256]));
  if (kit.kind === 'recorded') {
    assert.equal(provenance.size, 16, `${kit.id} must record provenance for all 16 samples.`);
    assert.equal(readFileSync(join(directory, 'LICENSE-CC0.txt'), 'utf8').length > 100, true);
    assert.equal(readFileSync(join(directory, 'PROVENANCE.md'), 'utf8').length > 500, true);
  }

  for (const filename of kit.files) {
    const wav = readFileSync(join(directory, filename));
    assert.equal(wav.subarray(0, 4).toString(), 'RIFF', `${kit.id}/${filename} is not RIFF.`);
    assert.equal(wav.subarray(8, 12).toString(), 'WAVE', `${kit.id}/${filename} is not WAV.`);
    assert.equal(wav.readUInt16LE(20), 1, `${kit.id}/${filename} must use PCM encoding.`);
    assert.equal(wav.readUInt16LE(22), 1, `${kit.id}/${filename} must be mono.`);
    assert.equal(wav.readUInt32LE(24), 22_050, `${kit.id}/${filename} has the wrong sample rate.`);
    assert.equal(wav.readUInt16LE(34), 16, `${kit.id}/${filename} must be 16-bit.`);

    const dataBytes = wav.readUInt32LE(40);
    assert.equal(wav.length, 44 + dataBytes, `${kit.id}/${filename} has an invalid data length.`);
    assert.ok(dataBytes >= 22_050 * 2 * 0.12, `${kit.id}/${filename} is suspiciously short.`);
    let peak = 0;
    for (let offset = 44; offset < wav.length; offset += 2) {
      peak = Math.max(peak, Math.abs(wav.readInt16LE(offset)));
    }
    assert.ok(peak >= 8_000, `${kit.id}/${filename} is silent or unexpectedly quiet.`);

    if (provenance.has(filename)) {
      const digest = createHash('sha256').update(wav).digest('hex');
      assert.equal(digest, provenance.get(filename), `${kit.id}/${filename} checksum does not match provenance.`);
    }
    verifiedFiles += 1;
  }
}

console.log(`Verified ${verifiedFiles} samples across ${manifest.kits.length} kits`);

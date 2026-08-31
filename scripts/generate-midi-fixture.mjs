import { writeFileSync } from 'node:fs';
import midiPackage from '@tonejs/midi';

const { Midi } = midiPackage;

const midi = new Midi();
midi.header.setTempo(118);
const track = midi.addTrack();
track.name = 'MCP MPC QA DRUM LOOP';

const sixteenth = 60 / 118 / 4;
[
  [36, 0], [42, 0],
  [42, 2],
  [38, 4], [42, 4],
  [42, 6],
  [36, 8], [42, 8],
  [42, 10],
  [38, 12], [42, 12],
  [36, 14], [46, 14],
].forEach(([note, step]) => track.addNote({
  midi: note,
  time: step * sixteenth,
  duration: sixteenth * 0.72,
  velocity: 0.9,
}));

writeFileSync(new URL('../artifacts/qa-pattern.mid', import.meta.url), midi.toArray());
console.log('Generated artifacts/qa-pattern.mid');

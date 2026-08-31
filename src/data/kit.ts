export type PadColor = 'coral' | 'violet' | 'mint' | 'gold';

export type KitId = 'hip-hop' | 'traditional' | 'dusty-crate' | 'lofi-acoustic';

export type PadConfig = {
  id: number;
  name: string;
  shortName: string;
  key: string;
  midi: number;
  bufferId: string;
  url: string;
  pitch: number;
  sliceStart: number;
  sliceEnd: number;
  color: PadColor;
  source: 'kit' | 'sample' | 'chop';
};

type PadDefinition = readonly [
  name: string,
  shortName: string,
  key: string,
  midi: number,
  filename: string,
  color: PadColor,
];

export type KitDefinition = {
  id: KitId;
  name: string;
  shortName: string;
  description: string;
  pads: readonly PadDefinition[];
};

const hipHopPads = [
  ['PUNCH KICK', 'KICK', 'z', 36, 'kick.wav', 'coral'],
  ['CRACK SNARE', 'SNARE', 'x', 38, 'snare.wav', 'coral'],
  ['DRY CLAP', 'CLAP', 'c', 39, 'clap.wav', 'coral'],
  ['TIGHT HAT', 'C.HH', 'v', 42, 'closed-hat.wav', 'coral'],
  ['OPEN HAT', 'O.HH', 'a', 46, 'open-hat.wav', 'gold'],
  ['808 KICK', '808', 's', 41, '808-kick.wav', 'gold'],
  ['LOW PERC', 'PERC', 'd', 45, 'low-perc.wav', 'gold'],
  ['TAMBOURINE', 'TAMB', 'f', 54, 'tambourine.wav', 'gold'],
  ['RIMSHOT', 'RIM', 'q', 37, 'rim.wav', 'mint'],
  ['COWBELL', 'COW', 'w', 56, 'cowbell.wav', 'mint'],
  ['SHAKER', 'SHKR', 'e', 70, 'shaker.wav', 'mint'],
  ['FINGER SNAP', 'SNAP', 'r', 69, 'snap.wav', 'mint'],
  ['CRASH', 'CRSH', '1', 49, 'crash.wav', 'violet'],
  ['REVERSE HIT', 'REV', '2', 52, 'reverse-hit.wav', 'violet'],
  ['SUB BASS', 'SUB', '3', 35, 'sub-bass.wav', 'violet'],
  ['VINYL HIT', 'VNYL', '4', 55, 'vinyl-hit.wav', 'violet'],
] as const satisfies readonly PadDefinition[];

const traditionalPads = [
  ['ACOUSTIC KICK', 'KICK', 'z', 36, 'kick.wav', 'coral'],
  ['ACOUSTIC SNARE', 'SNARE', 'x', 38, 'snare.wav', 'coral'],
  ['GHOST SNARE', 'GHST', 'c', 40, 'ghost-snare.wav', 'coral'],
  ['CLOSED HAT', 'C.HH', 'v', 42, 'closed-hat.wav', 'coral'],
  ['OPEN HAT', 'O.HH', 'a', 46, 'open-hat.wav', 'gold'],
  ['FLOOR TOM', 'F.TOM', 's', 41, 'floor-tom.wav', 'gold'],
  ['RACK TOM', 'R.TOM', 'd', 48, 'rack-tom.wav', 'gold'],
  ['PEDAL HAT', 'P.HH', 'f', 44, 'pedal-hat.wav', 'gold'],
  ['CROSS STICK', 'X.STK', 'q', 37, 'cross-stick.wav', 'mint'],
  ['HALF-OPEN HAT', 'H.HH', 'w', 22, 'half-open-hat.wav', 'mint'],
  ['RIDE BOW', 'RIDE', 'e', 51, 'ride.wav', 'mint'],
  ['RIDE BELL', 'BELL', 'r', 53, 'ride-bell.wav', 'mint'],
  ['CRASH 1', 'CRSH1', '1', 49, 'crash.wav', 'violet'],
  ['CRASH 2', 'CRSH2', '2', 57, 'second-crash.wav', 'violet'],
  ['RIMSHOT', 'RIM', '3', 39, 'rimshot.wav', 'violet'],
  ['SOFT KICK', 'S.KIK', '4', 35, 'soft-kick.wav', 'violet'],
] as const satisfies readonly PadDefinition[];

const dustyCratePads = [
  ['ROUND KICK', 'R.KIK', 'z', 36, 'kick.wav', 'coral'],
  ['DUST SNARE', 'D.SNR', 'x', 38, 'snare.wav', 'coral'],
  ['HAND CLAP', 'CLAP', 'c', 39, 'clap.wav', 'coral'],
  ['CLOSED HAT', 'C.HH', 'v', 42, 'closed-hat.wav', 'coral'],
  ['OPEN HAT', 'O.HH', 'a', 46, 'open-hat.wav', 'gold'],
  ['LOW TOM', 'L.TOM', 's', 41, 'low-tom.wav', 'gold'],
  ['CONGA', 'CONGA', 'd', 45, 'conga.wav', 'gold'],
  ['TAMBOURINE', 'TAMB', 'f', 50, 'tambourine.wav', 'gold'],
  ['RIM CLICK', 'RIM', 'q', 37, 'rim.wav', 'mint'],
  ['COWBELL', 'COW', 'w', 56, 'cowbell.wav', 'mint'],
  ['SHAKER', 'SHKR', 'e', 70, 'shaker.wav', 'mint'],
  ['WOOD PERC', 'WOOD', 'r', 64, 'wood-perc.wav', 'mint'],
  ['DARK CRASH', 'CRSH', '1', 49, 'crash.wav', 'violet'],
  ['DUSTY RIDE', 'RIDE', '2', 51, 'ride.wav', 'violet'],
  ['BASS STAB', 'BASS', '3', 35, 'bass-stab.wav', 'violet'],
  ['VINYL HIT', 'VNYL', '4', 52, 'vinyl-hit.wav', 'violet'],
] as const satisfies readonly PadDefinition[];

const lofiAcousticPads = [
  ['TAPE KICK', 'KICK', 'z', 36, 'kick.wav', 'coral'],
  ['ROOM SNARE', 'SNAR', 'x', 38, 'snare.wav', 'coral'],
  ['GHOST NOTE', 'GHST', 'c', 40, 'ghost-snare.wav', 'coral'],
  ['HAT TIP', 'H.TIP', 'v', 42, 'hat-tip.wav', 'coral'],
  ['OPEN HAT', 'O.HH', 'a', 46, 'open-hat.wav', 'gold'],
  ['FLOOR TOM', 'F.TOM', 's', 41, 'floor-tom.wav', 'gold'],
  ['RACK TOM', 'R.TOM', 'd', 48, 'rack-tom.wav', 'gold'],
  ['PEDAL HAT', 'P.HH', 'f', 44, 'pedal-hat.wav', 'gold'],
  ['CROSS STICK', 'X.STK', 'q', 37, 'cross-stick.wav', 'mint'],
  ['HAT EDGE', 'H.EDG', 'w', 22, 'hat-edge.wav', 'mint'],
  ['RIDE BOW', 'RIDE', 'e', 51, 'ride.wav', 'mint'],
  ['RIDE BELL', 'BELL', 'r', 53, 'ride-bell.wav', 'mint'],
  ['DARK CRASH', 'CRSH', '1', 49, 'crash.wav', 'violet'],
  ['HAT SPLASH', 'SPLH', '2', 55, 'splash.wav', 'violet'],
  ['RIMSHOT', 'RIM', '3', 39, 'rimshot.wav', 'violet'],
  ['SOFT KICK', 'S.KIK', '4', 35, 'soft-kick.wav', 'violet'],
] as const satisfies readonly PadDefinition[];

export const KITS = [
  {
    id: 'hip-hop',
    name: 'HIP-HOP',
    shortName: 'HIP-HOP',
    description: 'Punchy kicks, an 808, crack snare, dry clap, tight hats, sub bass, and classic beat-making percussion.',
    pads: hipHopPads,
  },
  {
    id: 'traditional',
    name: 'TRADITIONAL KIT',
    shortName: 'TRAD',
    description: 'A clean, natural acoustic set with close kick and snare, toms, expressive hats, ride, and two crashes.',
    pads: traditionalPads,
  },
  {
    id: 'dusty-crate',
    name: 'DUSTY CRATE',
    shortName: 'DUSTY',
    description: 'Warm, layered drums and organic percussion with a dark sampled edge.',
    pads: dustyCratePads,
  },
  {
    id: 'lofi-acoustic',
    name: 'LO-FI ACOUSTIC',
    shortName: 'ACOUSTIC',
    description: 'Real jazz-kit recordings through a vintage mic, with ghost notes, soft hits, and dusty cymbals.',
    pads: lofiAcousticPads,
  },
] as const satisfies readonly KitDefinition[];

export const DEFAULT_KIT_ID: KitId = 'hip-hop';
export const KIT_IDS = KITS.map((kit) => kit.id);

export function isKitId(value: string): value is KitId {
  return KIT_IDS.some((kitId) => kitId === value);
}

export function getKitDefinition(kitId: KitId): KitDefinition {
  return KITS.find((kit) => kit.id === kitId) ?? KITS[0];
}

const samplesBase = `${import.meta.env.BASE_URL}samples`;

export const createFactoryKit = (kitId: KitId = DEFAULT_KIT_ID): PadConfig[] => {
  const kit = getKitDefinition(kitId);
  return kit.pads.map((definition, index) => ({
    id: index,
    name: definition[0],
    shortName: definition[1],
    key: definition[2],
    midi: definition[3],
    bufferId: `factory-${kit.id}-${index}`,
    url: `${samplesBase}/${kit.id}/${definition[4]}`,
    pitch: 0,
    sliceStart: 0,
    sliceEnd: 1,
    color: definition[5],
    source: 'kit',
  }));
};

export const GM_TO_PAD: Map<number, number> = new Map(
  hipHopPads.map((definition, index) => [definition[3], index]),
);

export const PAD_DISPLAY_ORDER = [12, 13, 14, 15, 8, 9, 10, 11, 4, 5, 6, 7, 0, 1, 2, 3];

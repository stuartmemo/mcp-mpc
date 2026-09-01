export type PadColor = 'coral' | 'violet' | 'mint' | 'gold';

export type KitId = 'fischer-808' | 'uzu' | 'big-rusty' | 'swirly';

export type PadConfig = {
  id: number;
  name: string;
  shortName: string;
  key: string;
  midi: number;
  bufferId: string;
  url: string;
  pitch: number;
  volume: number;
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

const fischer808Pads = [
  ['808 KICK', 'KICK', 'z', 36, 'kick.wav', 'coral'],
  ['808 SNARE', 'SNARE', 'x', 38, 'snare.wav', 'coral'],
  ['HAND CLAP', 'CLAP', 'c', 39, 'clap.wav', 'coral'],
  ['CLOSED HAT', 'C.HH', 'v', 42, 'closed-hat.wav', 'coral'],
  ['OPEN HAT', 'O.HH', 'a', 46, 'open-hat.wav', 'gold'],
  ['LOW TOM', 'L.TOM', 's', 41, 'low-tom.wav', 'gold'],
  ['MID TOM', 'M.TOM', 'd', 45, 'mid-tom.wav', 'gold'],
  ['HIGH TOM', 'H.TOM', 'f', 48, 'high-tom.wav', 'gold'],
  ['RIMSHOT', 'RIM', 'q', 37, 'rimshot.wav', 'mint'],
  ['COWBELL', 'COW', 'w', 56, 'cowbell.wav', 'mint'],
  ['CLAVES', 'CLAVE', 'e', 75, 'claves.wav', 'mint'],
  ['MARACAS', 'MAR', 'r', 70, 'maracas.wav', 'mint'],
  ['CYMBAL', 'CYMB', '1', 49, 'cymbal.wav', 'violet'],
  ['LOW CONGA', 'L.CNG', '2', 64, 'low-conga.wav', 'violet'],
  ['MID CONGA', 'M.CNG', '3', 63, 'mid-conga.wav', 'violet'],
  ['HIGH CONGA', 'H.CNG', '4', 62, 'high-conga.wav', 'violet'],
] as const satisfies readonly PadDefinition[];

const uzuPads = [
  ['PUNCH KICK', 'P.KIK', 'z', 36, 'punch-kick.wav', 'coral'],
  ['WIDE SNARE', 'W.SNR', 'x', 38, 'wide-snare.wav', 'coral'],
  ['ANALOG CLAP', 'CLAP', 'c', 39, 'clap.wav', 'coral'],
  ['CLOSED HAT', 'C.HH', 'v', 42, 'closed-hat.wav', 'coral'],
  ['OPEN HAT', 'O.HH', 'a', 46, 'open-hat.wav', 'gold'],
  ['DEEP KICK', 'D.KIK', 's', 35, 'deep-kick.wav', 'gold'],
  ['LOW TOM', 'L.TOM', 'd', 41, 'low-tom.wav', 'gold'],
  ['HIGH TOM', 'H.TOM', 'f', 48, 'high-tom.wav', 'gold'],
  ['RIM CLICK', 'RIM', 'q', 37, 'rim.wav', 'mint'],
  ['RIDE', 'RIDE', 'w', 51, 'ride.wav', 'mint'],
  ['MID TOM', 'M.TOM', 'e', 45, 'mid-tom.wav', 'mint'],
  ['HAT TICK', 'TICK', 'r', 44, 'hat-tick.wav', 'mint'],
  ['CRASH', 'CRSH', '1', 49, 'crash.wav', 'violet'],
  ['TIGHT SNARE', 'T.SNR', '2', 40, 'tight-snare.wav', 'violet'],
  ['SHAKER', 'SHKR', '3', 70, 'shaker.wav', 'violet'],
  ['MODULAR HIT', 'MOD', '4', 55, 'modular-hit.wav', 'violet'],
] as const satisfies readonly PadDefinition[];

const bigRustyPads = [
  ['24 INCH KICK', '24KIK', 'z', 36, 'kick.wav', 'coral'],
  ['ROOM SNARE', 'SNARE', 'x', 38, 'snare.wav', 'coral'],
  ['RIMSHOT', 'RIM', 'c', 39, 'rimshot.wav', 'coral'],
  ['CLOSED HAT', 'C.HH', 'v', 42, 'closed-hat.wav', 'coral'],
  ['OPEN HAT', 'O.HH', 'a', 46, 'open-hat.wav', 'gold'],
  ['22 INCH TOM', '22TOM', 's', 41, 'floor-tom.wav', 'gold'],
  ['18 INCH TOM', '18TOM', 'd', 45, 'low-tom.wav', 'gold'],
  ['PEDAL HAT', 'P.HH', 'f', 44, 'pedal-hat.wav', 'gold'],
  ['SIDESTICK', 'SIDE', 'q', 37, 'sidestick.wav', 'mint'],
  ['RIDE BOW', 'RIDE', 'w', 51, 'ride.wav', 'mint'],
  ['15 INCH TOM', '15TOM', 'e', 47, 'mid-tom.wav', 'mint'],
  ['14 INCH TOM', '14TOM', 'r', 48, 'high-tom.wav', 'mint'],
  ['CRASH', 'CRSH', '1', 49, 'crash.wav', 'violet'],
  ['CHINA', 'CHINA', '2', 52, 'china.wav', 'violet'],
  ['RIDE BELL', 'BELL', '3', 53, 'ride-bell.wav', 'violet'],
  ['CYMBAL STACK', 'STACK', '4', 55, 'cymbal-stack.wav', 'violet'],
] as const satisfies readonly PadDefinition[];

const swirlyPads = [
  ['CAJON KICK', 'CAJON', 'z', 36, 'cajon-kick.wav', 'coral'],
  ['BRUSH SNARE', 'BRUSH', 'x', 38, 'brush-snare.wav', 'coral'],
  ['SNARE DIG', 'DIG', 'c', 40, 'snare-dig.wav', 'coral'],
  ['CLOSED HAT', 'C.HH', 'v', 42, 'closed-hat.wav', 'coral'],
  ['OPEN HAT', 'O.HH', 'a', 46, 'open-hat.wav', 'gold'],
  ['BUZZ KICK', 'BUZZ', 's', 35, 'buzz-kick.wav', 'gold'],
  ['DARBOUKA', 'DRBK', 'd', 64, 'darbouka.wav', 'gold'],
  ['DJEMBE', 'DJMB', 'f', 63, 'djembe.wav', 'gold'],
  ['HIGH BONGO', 'H.BNG', 'q', 60, 'high-bongo.wav', 'mint'],
  ['LOW BONGO', 'L.BNG', 'w', 61, 'low-bongo.wav', 'mint'],
  ['COWBELL', 'COW', 'e', 56, 'cowbell.wav', 'mint'],
  ['SNARE EDGE', 'EDGE', 'r', 39, 'snare-edge.wav', 'mint'],
  ['BROKEN CRASH', 'BROKE', '1', 49, 'broken-crash.wav', 'violet'],
  ['CRACKED SPLASH', 'SPLSH', '2', 55, 'cracked-splash.wav', 'violet'],
  ['CHINA', 'CHINA', '3', 52, 'china.wav', 'violet'],
  ['BRUSH RIDE', 'RIDE', '4', 51, 'ride.wav', 'violet'],
] as const satisfies readonly PadDefinition[];

export const KITS = [
  {
    id: 'fischer-808',
    name: 'FISCHER 808',
    shortName: '808',
    description: 'A direct, comprehensive capture of a real TR-808 with classic drums, cymbal, congas, cowbell, claves, and maracas.',
    pads: fischer808Pads,
  },
  {
    id: 'uzu',
    name: 'UZU MODERN',
    shortName: 'UZU',
    description: 'Synthesized and analog-processed electronic hits with two kicks, two snares, modular percussion, and sharp metal.',
    pads: uzuPads,
  },
  {
    id: 'big-rusty',
    name: 'BIG RUSTY ROOM',
    shortName: 'RUSTY',
    description: 'A large vintage Polish acoustic kit heard through its room mics, with four oversized toms and unruly cymbals.',
    pads: bigRustyPads,
  },
  {
    id: 'swirly',
    name: 'SWIRLY BRUSHES',
    shortName: 'SWIRLY',
    description: 'A brushed character kit pairing cajon and snare buzz with hand drums, cracked cymbals, and unusual metal.',
    pads: swirlyPads,
  },
] as const satisfies readonly KitDefinition[];

export const DEFAULT_KIT_ID: KitId = 'fischer-808';
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
    volume: 100,
    sliceStart: 0,
    sliceEnd: 1,
    color: definition[5],
    source: 'kit',
  }));
};

export const GM_TO_PAD: Map<number, number> = new Map(
  fischer808Pads.map((definition, index) => [definition[3], index]),
);

export const PAD_DISPLAY_ORDER = [12, 13, 14, 15, 8, 9, 10, 11, 4, 5, 6, 7, 0, 1, 2, 3];

import { KIT_IDS, isKitId, type KitId } from '../data/kit';

export type LoadSampleInput = {
  pad: number;
  url: string;
  name?: string;
  shortName?: string;
};

export type AssignPadInput = {
  sourcePad: number;
  targetPad: number;
};

export type ConfigurePadInput = {
  pad: number;
  pitch?: number;
  volume?: number;
  sliceStart?: number;
  sliceEnd?: number;
  name?: string;
  shortName?: string;
};

export type SetSampleRangeInput = {
  pad: number;
  startSeconds?: number;
  endSeconds?: number;
};

export type ChopSampleInput = {
  sourcePad: number;
  count: 2 | 4 | 8 | 16;
  startPad: number;
  sliceStart?: number;
  sliceEnd?: number;
};

export type SequenceTrack = {
  pad: number;
  steps: number[];
};

export type CreateSequenceInput = {
  tracks: SequenceTrack[];
  mode: 'replace' | 'merge';
  bpm?: number;
  swing?: number;
  play?: boolean;
};

export type PlayPadInput = {
  pad: number;
  velocity: number;
};

export type SetVolumeInput = {
  volume: number;
};

export type SetTransportInput = {
  playing?: boolean;
  bpm?: number;
  swing?: number;
};

export type SelectKitInput = {
  kit: KitId;
};

export type McpMpcController = {
  getState: () => unknown;
  selectKit: (input: SelectKitInput, signal: AbortSignal) => Promise<unknown>;
  loadSample: (input: LoadSampleInput, signal: AbortSignal) => Promise<unknown>;
  assignPad: (input: AssignPadInput, signal: AbortSignal) => Promise<unknown>;
  configurePad: (input: ConfigurePadInput) => unknown;
  setSampleRange: (input: SetSampleRangeInput, signal: AbortSignal) => Promise<unknown>;
  chopSample: (input: ChopSampleInput, signal: AbortSignal) => Promise<unknown>;
  createSequence: (input: CreateSequenceInput) => unknown;
  playPad: (input: PlayPadInput) => Promise<unknown>;
  setVolume: (input: SetVolumeInput) => unknown;
  setTransport: (input: SetTransportInput) => unknown;
};

type InputRecord = Record<string, unknown>;

const PAD_SCHEMA = { type: 'integer', minimum: 1, maximum: 16 } as const;

function inputRecord(value: unknown): InputRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Tool input must be an object.');
  }
  return value as InputRecord;
}

function rejectUnknownKeys(input: InputRecord, allowed: string[]) {
  const unknown = Object.keys(input).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error(`Unknown input field${unknown.length === 1 ? '' : 's'}: ${unknown.join(', ')}.`);
}

function numberField(input: InputRecord, key: string, minimum: number, maximum: number, required = false) {
  const value = input[key];
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${key} must be a number from ${minimum} to ${maximum}.`);
  }
  return value;
}

function integerField(input: InputRecord, key: string, minimum: number, maximum: number, required = false) {
  const value = numberField(input, key, minimum, maximum, required);
  if (value !== undefined && !Number.isInteger(value)) throw new Error(`${key} must be an integer.`);
  return value;
}

function stringField(input: InputRecord, key: string, maximum: number, required = false) {
  const value = input[key];
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum) {
    throw new Error(`${key} must be a non-empty string no longer than ${maximum} characters.`);
  }
  return value.trim();
}

function booleanField(input: InputRecord, key: string) {
  const value = input[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new Error(`${key} must be true or false.`);
  return value;
}

function padField(input: InputRecord, key: string, required = true) {
  return integerField(input, key, 1, 16, required);
}

function response(summary: string, data: unknown) {
  return {
    content: [{ type: 'text', text: summary }],
    structuredContent: data,
  };
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'The WebMCP operation failed.';
  return {
    isError: true,
    content: [{ type: 'text', text: message }],
    structuredContent: { error: message },
  };
}

function executeSafely(
  operation: (input: InputRecord, signal: AbortSignal) => unknown | Promise<unknown>,
): WebMCP.ToolExecuteCallback {
  return async (rawInput, options) => {
    try {
      const input = inputRecord(rawInput);
      return await operation(input, options.signal);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export async function registerMcpMpcTools(
  modelContext: WebMCP.ModelContext,
  controller: McpMpcController,
  signal: AbortSignal,
) {
  const tools: WebMCP.ModelContextTool[] = [
    {
      name: 'mcpmpc_get_state',
      title: 'Inspect MCP-MPC',
      description: 'Read the current MCP-MPC pads, sample assignments, normalized trims, loaded-sample start/end times and durations, pitches, per-pad levels, master output volume, sequence, tempo, swing, and transport state. Pad and step numbers are 1-based.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: executeSafely((input) => {
        rejectUnknownKeys(input, []);
        const state = controller.getState();
        return response('Read the current MCP-MPC state.', state);
      }),
    },
    {
      name: 'mcpmpc_select_kit',
      title: 'Select factory kit',
      description: 'Replace all 16 pad assignments with one MCP-MPC factory kit while preserving the current sequence, tempo, swing, and transport state.',
      inputSchema: {
        type: 'object',
        properties: {
          kit: {
            type: 'string',
            enum: KIT_IDS,
            description: 'Factory kit identifier. Fischer 808 is classic analog; Uzu is modern electronic; Big Rusty is a roomy acoustic kit; Swirly is a brushed hand-percussion palette.',
          },
        },
        required: ['kit'],
        additionalProperties: false,
      },
      execute: executeSafely(async (input, toolSignal) => {
        rejectUnknownKeys(input, ['kit']);
        const kit = stringField(input, 'kit', 32, true)!;
        if (!isKitId(kit)) throw new Error(`kit must be one of: ${KIT_IDS.join(', ')}.`);
        const result = await controller.selectKit({ kit }, toolSignal);
        return response(`Selected the ${kit} factory kit.`, result);
      }),
    },
    {
      name: 'mcpmpc_load_sample',
      title: 'Load sample to pad',
      description: 'Fetch a directly accessible audio URL and load it onto one pad. The URL must be HTTPS or same-origin HTTP, a blob URL, or an audio data URL; cross-origin servers must allow CORS.',
      inputSchema: {
        type: 'object',
        properties: {
          pad: PAD_SCHEMA,
          url: { type: 'string', minLength: 1, description: 'Direct URL of an audio file, not a webpage.' },
          name: { type: 'string', minLength: 1, maxLength: 24 },
          shortName: { type: 'string', minLength: 1, maxLength: 6 },
        },
        required: ['pad', 'url'],
        additionalProperties: false,
      },
      execute: executeSafely(async (input, toolSignal) => {
        rejectUnknownKeys(input, ['pad', 'url', 'name', 'shortName']);
        const result = await controller.loadSample({
          pad: padField(input, 'pad')!,
          url: stringField(input, 'url', 2_048, true)!,
          name: stringField(input, 'name', 24),
          shortName: stringField(input, 'shortName', 6),
        }, toolSignal);
        return response('Loaded the sample and assigned it to the requested pad.', result);
      }),
    },
    {
      name: 'mcpmpc_assign_pad',
      title: 'Copy sample to pad',
      description: 'Copy a sample assignment, including its current pitch, level, and trim, from one pad to another pad.',
      inputSchema: {
        type: 'object',
        properties: { sourcePad: PAD_SCHEMA, targetPad: PAD_SCHEMA },
        required: ['sourcePad', 'targetPad'],
        additionalProperties: false,
      },
      execute: executeSafely(async (input, toolSignal) => {
        rejectUnknownKeys(input, ['sourcePad', 'targetPad']);
        const sourcePad = padField(input, 'sourcePad')!;
        const targetPad = padField(input, 'targetPad')!;
        if (sourcePad === targetPad) throw new Error('sourcePad and targetPad must be different.');
        const result = await controller.assignPad({ sourcePad, targetPad }, toolSignal);
        return response(`Copied pad ${sourcePad} to pad ${targetPad}.`, result);
      }),
    },
    {
      name: 'mcpmpc_configure_pad',
      title: 'Configure pad',
      description: 'Change one pad\'s pitch, volume, normalized sample trim, or display names. Pitch is measured in semitones, volume is a percentage, and trim positions are normalized from 0 to 1. For start/end times in seconds, use mcpmpc_set_sample_range.',
      inputSchema: {
        type: 'object',
        properties: {
          pad: PAD_SCHEMA,
          pitch: { type: 'number', minimum: -24, maximum: 24 },
          volume: { type: 'number', minimum: 0, maximum: 100, description: 'Level for only this pad, as a percentage.' },
          sliceStart: { type: 'number', minimum: 0, maximum: 0.999 },
          sliceEnd: { type: 'number', minimum: 0.001, maximum: 1 },
          name: { type: 'string', minLength: 1, maxLength: 24 },
          shortName: { type: 'string', minLength: 1, maxLength: 6 },
        },
        required: ['pad'],
        additionalProperties: false,
      },
      execute: executeSafely((input) => {
        rejectUnknownKeys(input, ['pad', 'pitch', 'volume', 'sliceStart', 'sliceEnd', 'name', 'shortName']);
        const configuration: ConfigurePadInput = {
          pad: padField(input, 'pad')!,
          pitch: numberField(input, 'pitch', -24, 24),
          volume: numberField(input, 'volume', 0, 100),
          sliceStart: numberField(input, 'sliceStart', 0, 0.999),
          sliceEnd: numberField(input, 'sliceEnd', 0.001, 1),
          name: stringField(input, 'name', 24),
          shortName: stringField(input, 'shortName', 6),
        };
        if (Object.values(configuration).filter((value) => value !== undefined).length === 1) {
          throw new Error('Provide at least one setting to change in addition to pad.');
        }
        const result = controller.configurePad(configuration);
        return response(`Configured pad ${configuration.pad}.`, result);
      }),
    },
    {
      name: 'mcpmpc_set_sample_range',
      title: 'Set sample start and end',
      description: 'Set the playable start and/or end time, in seconds, for the sample assigned to one pad. Omit either boundary to keep its current value. Use mcpmpc_get_state to inspect the sample duration and current startSeconds/endSeconds.',
      inputSchema: {
        type: 'object',
        properties: {
          pad: PAD_SCHEMA,
          startSeconds: { type: 'number', minimum: 0, description: 'Playable start time measured from the beginning of the source sample.' },
          endSeconds: { type: 'number', exclusiveMinimum: 0, description: 'Playable end time measured from the beginning of the source sample.' },
        },
        required: ['pad'],
        anyOf: [
          { required: ['startSeconds'] },
          { required: ['endSeconds'] },
        ],
        additionalProperties: false,
      },
      execute: executeSafely(async (input, toolSignal) => {
        rejectUnknownKeys(input, ['pad', 'startSeconds', 'endSeconds']);
        const range: SetSampleRangeInput = {
          pad: padField(input, 'pad')!,
          startSeconds: numberField(input, 'startSeconds', 0, Number.MAX_SAFE_INTEGER),
          endSeconds: numberField(input, 'endSeconds', 0, Number.MAX_SAFE_INTEGER),
        };
        if (range.startSeconds === undefined && range.endSeconds === undefined) {
          throw new Error('Provide startSeconds, endSeconds, or both.');
        }
        if (range.endSeconds !== undefined && range.endSeconds <= 0) {
          throw new Error('endSeconds must be greater than 0.');
        }
        const result = await controller.setSampleRange(range, toolSignal);
        return response(`Set the playable sample range for pad ${range.pad}.`, result);
      }),
    },
    {
      name: 'mcpmpc_chop_sample',
      title: 'Chop sample across pads',
      description: 'Split a source pad sample evenly into 2, 4, 8, or 16 chops and assign them to consecutive pads. The destination range cannot run past pad 16.',
      inputSchema: {
        type: 'object',
        properties: {
          sourcePad: PAD_SCHEMA,
          count: { type: 'integer', enum: [2, 4, 8, 16] },
          startPad: { ...PAD_SCHEMA, description: 'First destination pad. Defaults to sourcePad.' },
          sliceStart: { type: 'number', minimum: 0, maximum: 0.999 },
          sliceEnd: { type: 'number', minimum: 0.001, maximum: 1 },
        },
        required: ['sourcePad', 'count'],
        additionalProperties: false,
      },
      execute: executeSafely(async (input, toolSignal) => {
        rejectUnknownKeys(input, ['sourcePad', 'count', 'startPad', 'sliceStart', 'sliceEnd']);
        const sourcePad = padField(input, 'sourcePad')!;
        const rawCount = integerField(input, 'count', 2, 16, true)!;
        if (![2, 4, 8, 16].includes(rawCount)) throw new Error('count must be 2, 4, 8, or 16.');
        const count = rawCount as ChopSampleInput['count'];
        const startPad = padField(input, 'startPad', false) ?? sourcePad;
        if (startPad + count - 1 > 16) throw new Error(`A ${count}-chop assignment starting at pad ${startPad} would run past pad 16.`);
        const result = await controller.chopSample({
          sourcePad,
          count,
          startPad,
          sliceStart: numberField(input, 'sliceStart', 0, 0.999),
          sliceEnd: numberField(input, 'sliceEnd', 0.001, 1),
        }, toolSignal);
        return response(`Chopped pad ${sourcePad} into ${count} slices starting at pad ${startPad}.`, result);
      }),
    },
    {
      name: 'mcpmpc_create_sequence',
      title: 'Create 16-step sequence',
      description: 'Create or merge a one-bar, 16-step drum sequence. Supply tracks with 1-based pad and step numbers, plus optional tempo, swing, and play state.',
      inputSchema: {
        type: 'object',
        properties: {
          tracks: {
            type: 'array',
            minItems: 1,
            maxItems: 16,
            items: {
              type: 'object',
              properties: {
                pad: PAD_SCHEMA,
                steps: { type: 'array', maxItems: 16, uniqueItems: true, items: { type: 'integer', minimum: 1, maximum: 16 } },
              },
              required: ['pad', 'steps'],
              additionalProperties: false,
            },
          },
          mode: { type: 'string', enum: ['replace', 'merge'], default: 'replace' },
          bpm: { type: 'number', minimum: 40, maximum: 220 },
          swing: { type: 'number', minimum: 0, maximum: 60 },
          play: { type: 'boolean' },
        },
        required: ['tracks'],
        additionalProperties: false,
      },
      execute: executeSafely((input) => {
        rejectUnknownKeys(input, ['tracks', 'mode', 'bpm', 'swing', 'play']);
        if (!Array.isArray(input.tracks) || input.tracks.length < 1 || input.tracks.length > 16) {
          throw new Error('tracks must contain from 1 to 16 track objects.');
        }
        const tracks = input.tracks.map((rawTrack, index) => {
          const track = inputRecord(rawTrack);
          rejectUnknownKeys(track, ['pad', 'steps']);
          if (!Array.isArray(track.steps) || track.steps.length > 16) {
            throw new Error(`tracks[${index}].steps must be an array with no more than 16 steps.`);
          }
          const steps = track.steps.map((rawStep) => {
            if (typeof rawStep !== 'number' || !Number.isInteger(rawStep) || rawStep < 1 || rawStep > 16) {
              throw new Error(`Every step in tracks[${index}].steps must be an integer from 1 to 16.`);
            }
            return rawStep;
          });
          if (new Set(steps).size !== steps.length) throw new Error(`tracks[${index}].steps contains duplicate step numbers.`);
          return { pad: padField(track, 'pad')!, steps };
        });
        const mode = input.mode ?? 'replace';
        if (mode !== 'replace' && mode !== 'merge') throw new Error('mode must be replace or merge.');
        const sequence: CreateSequenceInput = {
          tracks,
          mode,
          bpm: numberField(input, 'bpm', 40, 220),
          swing: numberField(input, 'swing', 0, 60),
          play: booleanField(input, 'play'),
        };
        const result = controller.createSequence(sequence);
        return response(`Created a ${sequence.mode} sequence using ${tracks.length} track${tracks.length === 1 ? '' : 's'}.`, result);
      }),
    },
    {
      name: 'mcpmpc_play_pad',
      title: 'Play pad',
      description: 'Trigger one MCP-MPC pad now at an optional velocity from 0.04 to 1.',
      inputSchema: {
        type: 'object',
        properties: { pad: PAD_SCHEMA, velocity: { type: 'number', minimum: 0.04, maximum: 1, default: 0.94 } },
        required: ['pad'],
        additionalProperties: false,
      },
      execute: executeSafely(async (input) => {
        rejectUnknownKeys(input, ['pad', 'velocity']);
        const pad = padField(input, 'pad')!;
        const velocity = numberField(input, 'velocity', 0.04, 1) ?? 0.94;
        const result = await controller.playPad({ pad, velocity });
        return response(`Triggered pad ${pad}.`, result);
      }),
    },
    {
      name: 'mcpmpc_set_volume',
      title: 'Set master volume',
      description: 'Set the master output level shared by every pad and sample. To change one pad only, use mcpmpc_configure_pad with its volume field. Use 0 to mute or 100 for full level.',
      inputSchema: {
        type: 'object',
        properties: {
          volume: { type: 'number', minimum: 0, maximum: 100, description: 'Master output level as a percentage.' },
        },
        required: ['volume'],
        additionalProperties: false,
      },
      execute: executeSafely((input) => {
        rejectUnknownKeys(input, ['volume']);
        const volume = numberField(input, 'volume', 0, 100, true)!;
        const result = controller.setVolume({ volume });
        return response(`Set the master output volume to ${Math.round(volume)} percent.`, result);
      }),
    },
    {
      name: 'mcpmpc_set_transport',
      title: 'Set transport',
      description: 'Start or stop the current sequence and optionally set its tempo and swing.',
      inputSchema: {
        type: 'object',
        properties: {
          playing: { type: 'boolean' },
          bpm: { type: 'number', minimum: 40, maximum: 220 },
          swing: { type: 'number', minimum: 0, maximum: 60 },
        },
        additionalProperties: false,
      },
      execute: executeSafely((input) => {
        rejectUnknownKeys(input, ['playing', 'bpm', 'swing']);
        const transport: SetTransportInput = {
          playing: booleanField(input, 'playing'),
          bpm: numberField(input, 'bpm', 40, 220),
          swing: numberField(input, 'swing', 0, 60),
        };
        if (Object.values(transport).every((value) => value === undefined)) {
          throw new Error('Provide playing, bpm, swing, or a combination of them.');
        }
        const result = controller.setTransport(transport);
        return response('Updated the MCP-MPC transport.', result);
      }),
    },
  ];

  await Promise.all(tools.map((tool) => modelContext.registerTool(tool, { signal })));
}

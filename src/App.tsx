import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Midi } from '@tonejs/midi';
import {
  Circle,
  Download,
  FileMusic,
  Link2,
  Mic,
  Play,
  Power,
  RotateCcw,
  Scissors,
  Square,
  Trash2,
  Upload,
  Volume2,
  WandSparkles,
} from 'lucide-react';
import '@fontsource/press-start-2p';
import '@fontsource/vt323';
import { AudioEngine } from './audio/AudioEngine';
import { Waveform } from './components/Waveform';
import {
  createFactoryKit,
  DEFAULT_KIT_ID,
  getKitDefinition,
  GM_TO_PAD,
  KITS,
  PAD_DISPLAY_ORDER,
  type KitId,
  type PadConfig,
} from './data/kit';
import {
  registerMcpMpcTools,
  type McpMpcController,
} from './webmcp/registerTools';
import './App.css';

const STEPS = 16;
const PAD_COUNT = 16;
const DEFAULT_MASTER_VOLUME = 88;

type Pattern = boolean[][];

function makeStarterPattern(): Pattern {
  const pattern = Array.from({ length: PAD_COUNT }, () => Array(STEPS).fill(false));
  [0, 6, 8, 11].forEach((step) => { pattern[0][step] = true; });
  [4, 12].forEach((step) => { pattern[1][step] = true; });
  [12].forEach((step) => { pattern[2][step] = true; });
  [0, 2, 4, 6, 8, 10, 12, 14].forEach((step) => { pattern[3][step] = true; });
  [7, 15].forEach((step) => { pattern[4][step] = true; });
  return pattern;
}

const clonePattern = (pattern: Pattern) => pattern.map((row) => [...row]);

const timeLabel = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
const SLICE_STEP = 0.001;

const slicePositionLabel = (position: number, duration?: number) => duration
  ? `${(position * duration).toFixed(3)}s`
  : `${(position * 100).toFixed(1)}%`;

const resolveSampleUrl = (rawUrl: string) => {
  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) throw new Error('Enter a direct audio file URL.');

  const resolved = new URL(trimmedUrl, window.location.href);
  const isAudioDataUrl = resolved.protocol === 'data:' && /^data:audio\//i.test(trimmedUrl);
  const isAllowed = resolved.protocol === 'https:'
    || (resolved.protocol === 'http:' && resolved.origin === window.location.origin)
    || resolved.protocol === 'blob:'
    || isAudioDataUrl;
  if (!isAllowed) {
    throw new Error('Sample URL must be HTTPS, same-origin HTTP, a blob URL, or an audio data URL.');
  }
  return resolved.href;
};

const inferSampleName = (resolvedUrl: string, padIndex: number) => {
  try {
    const parsedUrl = new URL(resolvedUrl);
    if (parsedUrl.protocol === 'data:') return `SAMPLE ${padIndex + 1}`;
    const fileName = decodeURIComponent(parsedUrl.pathname.split('/').pop() ?? '');
    return fileName.replace(/\.[^.]+$/, '').slice(0, 24).toUpperCase() || `SAMPLE ${padIndex + 1}`;
  } catch {
    return `SAMPLE ${padIndex + 1}`;
  }
};

function App() {
  const audio = useMemo(() => new AudioEngine(), []);
  const [activeKitId, setActiveKitId] = useState<KitId>(DEFAULT_KIT_ID);
  const activeKitRef = useRef<KitId>(activeKitId);
  const activeKit = getKitDefinition(activeKitId);
  const [kitLoading, setKitLoading] = useState(false);
  const [pads, setPads] = useState<PadConfig[]>(() => createFactoryKit(DEFAULT_KIT_ID));
  const padsRef = useRef(pads);
  const [pattern, setPattern] = useState<Pattern>(makeStarterPattern);
  const patternRef = useRef(pattern);
  const [selectedPad, setSelectedPad] = useState(0);
  const selectedPadRef = useRef(selectedPad);
  const [activePads, setActivePads] = useState<Set<number>>(new Set());
  const [currentStep, setCurrentStep] = useState(-1);
  const visualStepRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(playing);
  const [recordArmed, setRecordArmed] = useState(false);
  const recordArmedRef = useRef(false);
  const [powered, setPowered] = useState(false);
  const poweredRef = useRef(powered);
  const [powering, setPowering] = useState(false);
  const powerPromise = useRef<Promise<void> | null>(null);
  const [bpm, setBpm] = useState(92);
  const bpmRef = useRef(bpm);
  const [swing, setSwing] = useState(12);
  const swingRef = useRef(swing);
  const [masterVolume, setMasterVolume] = useState(DEFAULT_MASTER_VOLUME);
  const masterVolumeRef = useRef(masterVolume);
  const [chopCount, setChopCount] = useState(4);
  const chopCountRef = useRef(chopCount);
  const [status, setStatus] = useState('INSERT COIN / POWER ON');
  const [webMcpStatus, setWebMcpStatus] = useState<'CHECKING' | 'READY' | 'BROWSER NEEDED' | 'ERROR'>(
    () => document.modelContext ? 'CHECKING' : 'BROWSER NEEDED',
  );
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [sampleUrl, setSampleUrl] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const recordSecondsRef = useRef(0);
  const [meter, setMeter] = useState([2, 4, 1, 3, 2, 1, 0, 0]);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const midiInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const schedulerTimerRef = useRef<number | null>(null);
  const scheduledUiTimers = useRef<number[]>([]);
  const nextNoteTimeRef = useRef(0);
  const scheduleStepRef = useRef(0);
  const triggerPadRef = useRef<(padIndex: number, velocity?: number) => Promise<void>>(async () => undefined);

  useEffect(() => { padsRef.current = pads; }, [pads]);
  useEffect(() => { activeKitRef.current = activeKitId; }, [activeKitId]);
  useEffect(() => { patternRef.current = pattern; }, [pattern]);
  useEffect(() => { selectedPadRef.current = selectedPad; }, [selectedPad]);
  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { poweredRef.current = powered; }, [powered]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { swingRef.current = swing; }, [swing]);
  useEffect(() => { chopCountRef.current = chopCount; }, [chopCount]);
  useEffect(() => { recordSecondsRef.current = recordSeconds; }, [recordSeconds]);
  useEffect(() => { recordArmedRef.current = recordArmed; }, [recordArmed]);

  const commitPads = useCallback((next: PadConfig[]) => {
    padsRef.current = next;
    setPads(next);
  }, []);

  const commitPattern = useCallback((next: Pattern) => {
    patternRef.current = next;
    setPattern(next);
  }, []);

  const commitMasterVolume = useCallback((nextVolume: number) => {
    const clamped = Math.round(Math.max(0, Math.min(100, nextVolume)));
    masterVolumeRef.current = clamped;
    setMasterVolume(clamped);
    audio.setOutputLevel(clamped / 100);
  }, [audio]);

  const selected = pads[selectedPad];
  const selectedBuffer = audio.getBuffer(selected.bufferId);
  const selectedDuration = selectedBuffer?.duration;

  const powerOn = useCallback(async () => {
    if (poweredRef.current) {
      await audio.activate();
      return;
    }
    if (powerPromise.current) return powerPromise.current;
    setPowering(true);
    setStatus('LOADING KIT...');
    powerPromise.current = (async () => {
      try {
        await audio.activate();
        await Promise.all(padsRef.current
          .filter((pad) => pad.url)
          .map((pad) => audio.loadUrl(pad.bufferId, pad.url)));
        poweredRef.current = true;
        setPowered(true);
        setStatus(`${getKitDefinition(activeKitRef.current).name} / READY`);
      } catch (error) {
        console.error(error);
        setStatus('LOAD ERROR / TRY AGAIN');
        powerPromise.current = null;
      } finally {
        setPowering(false);
      }
    })();
    return powerPromise.current;
  }, [audio]);

  const selectFactoryKit = useCallback(async (kitId: KitId, signal?: AbortSignal) => {
    const kit = getKitDefinition(kitId);
    const nextPads = createFactoryKit(kitId);
    setKitLoading(true);
    setStatus(`LOADING ${kit.name}...`);
    try {
      if (poweredRef.current) {
        await Promise.all(nextPads.map((pad) => audio.loadUrl(pad.bufferId, pad.url, signal)));
      }
      activeKitRef.current = kitId;
      setActiveKitId(kitId);
      commitPads(nextPads);
      setStatus(`${kit.name} / READY`);
    } catch (error) {
      if (!signal?.aborted) setStatus(`COULD NOT LOAD ${kit.name}`);
      throw error;
    } finally {
      setKitLoading(false);
    }
  }, [audio, commitPads]);

  const flashPad = useCallback((padIndex: number, when = 0) => {
    const delay = Math.max(0, when - audio.currentTime) * 1000;
    const timer = window.setTimeout(() => {
      setActivePads((current) => new Set(current).add(padIndex));
      setMeter(Array.from({ length: 8 }, (_, index) => Math.max(0, Math.min(5, Math.round((7 - index) * Math.random())))));
      window.setTimeout(() => {
        setActivePads((current) => {
          const next = new Set(current);
          next.delete(padIndex);
          return next;
        });
      }, 115);
    }, delay);
    scheduledUiTimers.current.push(timer);
  }, [audio]);

  const triggerPad = useCallback(async (padIndex: number, velocity = 0.94, fromSequence = false, when?: number) => {
    const pad = padsRef.current[padIndex];
    if (!pad) return;
    if (poweredRef.current) await audio.activate();
    else await powerOn();
    if (!audio.getBuffer(pad.bufferId) && pad.url) {
      await audio.loadUrl(pad.bufferId, pad.url);
    }
    const playAt = when ?? audio.currentTime;
    audio.play(pad, playAt, velocity);
    flashPad(padIndex, playAt);

    if (!fromSequence) {
      selectedPadRef.current = padIndex;
      setSelectedPad(padIndex);
      setStatus(`PAD ${String(padIndex + 1).padStart(2, '0')} / ${pad.name}`);
      if (recordArmedRef.current && playingRef.current) {
        const step = visualStepRef.current;
        const next = clonePattern(patternRef.current);
        next[padIndex][step] = true;
        commitPattern(next);
      }
    }
  }, [audio, commitPattern, flashPad, powerOn]);

  useEffect(() => { triggerPadRef.current = triggerPad; }, [triggerPad]);

  const toggleTransport = useCallback(() => {
    const nextPlaying = !playingRef.current;
    if (!nextPlaying) {
      setCurrentStep(-1);
      setStatus('SEQUENCE STOPPED');
    }
    playingRef.current = nextPlaying;
    setPlaying(nextPlaying);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isEditing = target.matches('input:not([type="range"]), select, textarea, [contenteditable="true"]');
      if (isEditing || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.code === 'Space') {
        if (target.matches('button, [role="button"]')) return;
        event.preventDefault();
        toggleTransport();
        return;
      }
      if (event.repeat) return;
      const pressedKey = event.code.startsWith('Key')
        ? event.code.slice(3).toLowerCase()
        : event.code.startsWith('Digit')
          ? event.code.slice(5)
          : event.key.toLowerCase();
      const padIndex = padsRef.current.findIndex((pad) => pad.key === pressedKey);
      if (padIndex >= 0) {
        event.preventDefault();
        void triggerPad(padIndex);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleTransport, triggerPad]);

  useEffect(() => {
    if (!playing) {
      if (schedulerTimerRef.current) window.clearInterval(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
      scheduledUiTimers.current.forEach(window.clearTimeout);
      scheduledUiTimers.current = [];
      return;
    }

    let cancelled = false;
    void powerOn().then(() => {
      if (cancelled) return;
      scheduleStepRef.current = 0;
      nextNoteTimeRef.current = audio.currentTime + 0.08;
      setStatus(recordArmedRef.current ? 'PLAY + RECORD / LIVE QUANTIZE' : 'PLAYING SEQ 01');

      const scheduler = () => {
        const contextNow = audio.currentTime;
        const stepLength = 60 / bpmRef.current / 4;
        while (nextNoteTimeRef.current < contextNow + 0.12) {
          const step = scheduleStepRef.current;
          const swingOffset = step % 2 ? stepLength * (swingRef.current / 100) * 0.66 : 0;
          const noteTime = nextNoteTimeRef.current + swingOffset;
          patternRef.current.forEach((row, padIndex) => {
            if (row[step]) {
              audio.play(padsRef.current[padIndex], noteTime, 0.9);
              flashPad(padIndex, noteTime);
            }
          });
          const uiTimer = window.setTimeout(() => {
            visualStepRef.current = step;
            setCurrentStep(step);
          }, Math.max(0, noteTime - audio.currentTime) * 1000);
          scheduledUiTimers.current.push(uiTimer);
          nextNoteTimeRef.current += stepLength;
          scheduleStepRef.current = (step + 1) % STEPS;
        }
      };

      scheduler();
      schedulerTimerRef.current = window.setInterval(scheduler, 24);
    });

    return () => {
      cancelled = true;
      if (schedulerTimerRef.current) window.clearInterval(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
    };
  }, [audio, playing, powerOn, flashPad]);

  useEffect(() => {
    if (!recording) return;
    const started = Date.now();
    const timer = window.setInterval(() => setRecordSeconds((Date.now() - started) / 1000), 100);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const updateSelectedPad = (patch: Partial<PadConfig>) => {
    commitPads(padsRef.current.map((pad, index) => index === selectedPad ? { ...pad, ...patch } : pad));
  };

  const changePitch = (amount: number) => {
    const pitch = Math.max(-24, Math.min(24, selected.pitch + amount));
    updateSelectedPad({ pitch });
    setStatus(`TUNE ${pitch > 0 ? '+' : ''}${pitch} ST / PAD ${String(selectedPad + 1).padStart(2, '0')}`);
  };

  const changeSelectedPadVolume = (nextVolume: number) => {
    const volume = Math.round(Math.max(0, Math.min(100, nextVolume)));
    updateSelectedPad({ volume });
    setStatus(volume === 0
      ? `PAD ${String(selectedPad + 1).padStart(2, '0')} MUTED`
      : `PAD ${String(selectedPad + 1).padStart(2, '0')} LEVEL / ${volume}%`);
  };

  const toggleStep = (padIndex: number, step: number) => {
    const next = clonePattern(patternRef.current);
    next[padIndex][step] = !next[padIndex][step];
    commitPattern(next);
    selectedPadRef.current = padIndex;
    setSelectedPad(padIndex);
  };

  const clearPattern = () => {
    commitPattern(Array.from({ length: PAD_COUNT }, () => Array(STEPS).fill(false)));
    setStatus('SEQUENCE 01 CLEARED');
  };

  const makeBeat = () => {
    const next = makeStarterPattern();
    [3, 10].forEach((step) => { next[8][step] = true; });
    [2, 5, 9, 13].forEach((step) => { next[10][step] = Math.random() > 0.45; });
    next[9][14] = true;
    commitPattern(next);
    setStatus('MAGIC BEAT GENERATED');
  };

  const loadAudioFile = async (file: File) => {
    if (!file.type.startsWith('audio/') && !/\.(wav|mp3|m4a|aac|ogg|flac)$/i.test(file.name)) {
      setStatus('NOT AN AUDIO FILE');
      return;
    }
    try {
      setStatus('SAMPLING...');
      const id = `user-${Date.now()}`;
      await audio.loadFile(id, file);
      const cleanName = file.name.replace(/\.[^.]+$/, '').slice(0, 12).toUpperCase();
      updateSelectedPad({
        bufferId: id,
        url: '',
        name: cleanName || 'USER SAMPLE',
        shortName: cleanName.slice(0, 4) || 'USER',
        pitch: 0,
        sliceStart: 0,
        sliceEnd: 1,
        source: 'sample',
      });
      setStatus(`SAMPLED ${cleanName || 'AUDIO'} TO PAD ${selectedPad + 1}`);
      poweredRef.current = true;
      setPowered(true);
    } catch (error) {
      console.error(error);
      setStatus('SAMPLE FORMAT ERROR');
    }
  };

  const handleAudioInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void loadAudioFile(file);
    event.target.value = '';
  };

  const loadAudioUrl = useCallback(async (
    padIndex: number,
    rawUrl: string,
    options: { name?: string; shortName?: string; signal?: AbortSignal } = {},
  ) => {
    await powerOn();
    const resolvedUrl = resolveSampleUrl(rawUrl);
    const bufferId = `url-${Date.now()}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    await audio.loadUrl(bufferId, resolvedUrl, options.signal);

    const inferredName = inferSampleName(resolvedUrl, padIndex);
    const displayName = (options.name ?? inferredName).slice(0, 24).toUpperCase();
    const displayShortName = (options.shortName ?? displayName.slice(0, 6)).slice(0, 6).toUpperCase();
    const next = padsRef.current.map((current, index) => index === padIndex ? {
      ...current,
      bufferId,
      url: resolvedUrl,
      name: displayName,
      shortName: displayShortName,
      pitch: 0,
      sliceStart: 0,
      sliceEnd: 1,
      source: 'sample' as const,
    } : current);
    commitPads(next);
    selectedPadRef.current = padIndex;
    setSelectedPad(padIndex);
    poweredRef.current = true;
    setPowered(true);
    return displayName;
  }, [audio, commitPads, powerOn]);

  const handleSampleUrlSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const padIndex = selectedPadRef.current;
    setUrlLoading(true);
    setStatus(`FETCHING URL / PAD ${padIndex + 1}`);
    try {
      const displayName = await loadAudioUrl(padIndex, sampleUrl);
      setSampleUrl('');
      setStatus(`URL ${displayName} → PAD ${padIndex + 1}`);
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error && error.message.startsWith('Sample URL must')
        ? 'URL MUST BE HTTPS OR SAME-ORIGIN'
        : 'URL LOAD FAILED / CHECK CORS + FORMAT');
    } finally {
      setUrlLoading(false);
    }
  };

  const toggleMicRecording = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      mediaChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) mediaChunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(mediaChunksRef.current, { type: recorder.mimeType });
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        if (!blob.size) return;
        try {
          const id = `recording-${Date.now()}`;
          await audio.loadFile(id, blob);
          updateSelectedPad({
            bufferId: id,
            url: '',
            name: 'MIC SAMPLE',
            shortName: 'MIC',
            pitch: 0,
            sliceStart: 0,
            sliceEnd: 1,
            source: 'sample',
          });
          poweredRef.current = true;
          setPowered(true);
          setStatus(`RECORDED ${timeLabel(recordSecondsRef.current)} / PAD ${selectedPad + 1}`);
        } catch (error) {
          console.error(error);
          setStatus('COULD NOT DECODE RECORDING');
        }
      };
      recorder.start();
      setRecordSeconds(0);
      setRecording(true);
      setStatus(`RECORDING INPUT TO PAD ${selectedPad + 1}`);
    } catch (error) {
      console.error(error);
      setStatus('MIC ACCESS NEEDED');
    }
  };

  const applyChops = () => {
    const buffer = audio.getBuffer(selected.bufferId);
    if (!buffer) {
      setStatus('LOAD OR RECORD A SAMPLE FIRST');
      return;
    }
    const baseStart = selected.sliceStart;
    const usable = selected.sliceEnd - selected.sliceStart;
    const next = [...padsRef.current];
    for (let chop = 0; chop < chopCount; chop += 1) {
      const index = (selectedPad + chop) % PAD_COUNT;
      next[index] = {
        ...next[index],
        bufferId: selected.bufferId,
        url: selected.url,
        name: `CHOP ${chop + 1}`,
        shortName: `C${chop + 1}`,
        pitch: selected.pitch,
        volume: selected.volume,
        sliceStart: baseStart + usable * (chop / chopCount),
        sliceEnd: baseStart + usable * ((chop + 1) / chopCount),
        source: 'chop',
      };
    }
    commitPads(next);
    setStatus(`${chopCount} CHOPS → PADS ${selectedPad + 1}-${((selectedPad + chopCount - 1) % PAD_COUNT) + 1}`);
  };

  const resetFactoryPad = async () => {
    const factory = createFactoryKit(activeKitRef.current)[selectedPad];
    commitPads(padsRef.current.map((pad, index) => index === selectedPad ? factory : pad));
    await audio.loadUrl(factory.bufferId, factory.url);
    setStatus(`PAD ${selectedPad + 1} RESTORED / ${getKitDefinition(activeKitRef.current).name}`);
  };

  const importMidi = async (file: File) => {
    try {
      const midi = new Midi(await file.arrayBuffer());
      const next = Array.from({ length: PAD_COUNT }, () => Array(STEPS).fill(false));
      const ticksPerStep = midi.header.ppq / 4;
      let noteCount = 0;
      midi.tracks.forEach((track) => track.notes.forEach((note) => {
        const mapped = GM_TO_PAD.get(note.midi) ?? (((note.midi - 36) % PAD_COUNT) + PAD_COUNT) % PAD_COUNT;
        const step = Math.round(note.ticks / ticksPerStep) % STEPS;
        next[mapped][step] = true;
        noteCount += 1;
      }));
      if (!noteCount) throw new Error('No MIDI notes');
      commitPattern(next);
      const tempo = midi.header.tempos[0]?.bpm;
      if (tempo) setBpm(Math.max(40, Math.min(240, Math.round(tempo))));
      setStatus(`MIDI LOADED / ${noteCount} NOTES QUANTIZED`);
    } catch (error) {
      console.error(error);
      setStatus('MIDI FILE COULD NOT BE READ');
    }
  };

  const exportMidi = () => {
    const midi = new Midi();
    midi.header.setTempo(bpm);
    const track = midi.addTrack();
    track.name = 'MCP MPC - SEQ 01';
    const stepLength = 60 / bpm / 4;
    pattern.forEach((row, padIndex) => row.forEach((enabled, step) => {
      if (enabled) track.addNote({
        midi: padsRef.current[padIndex].midi,
        time: step * stepLength,
        duration: stepLength * 0.72,
        velocity: 0.9,
      });
    }));
    const bytes = midi.toArray();
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/midi' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `bitcrate-${bpm}bpm.mid`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1_000);
    setStatus('MIDI SAVED TO DISK');
  };

  const webMcpController = useMemo<McpMpcController>(() => {
    const selectedPadNow = (padIndex: number) => {
      selectedPadRef.current = padIndex;
      setSelectedPad(padIndex);
    };

    const setPoweredNow = () => {
      poweredRef.current = true;
      setPowered(true);
    };

    const ensurePadBuffer = async (padIndex: number, signal: AbortSignal) => {
      const pad = padsRef.current[padIndex];
      if (!pad) throw new Error(`Pad ${padIndex + 1} does not exist.`);
      if (!audio.getBuffer(pad.bufferId) && pad.url) {
        await audio.loadUrl(pad.bufferId, pad.url, signal);
      }
      if (!audio.getBuffer(pad.bufferId)) {
        throw new Error(`Pad ${padIndex + 1} has no playable sample loaded.`);
      }
      return padsRef.current[padIndex];
    };

    const stateSnapshot = () => ({
      device: 'MCP-MPC',
      powered: poweredRef.current,
      selectedPad: selectedPadRef.current + 1,
      kit: {
        id: activeKitRef.current,
        name: getKitDefinition(activeKitRef.current).name,
      },
      availableKits: KITS.map((kit) => ({
        id: kit.id,
        name: kit.name,
        description: kit.description,
      })),
      output: {
        volumePercent: masterVolumeRef.current,
      },
      transport: {
        playing: playingRef.current,
        bpm: bpmRef.current,
        swing: swingRef.current,
        steps: STEPS,
      },
      chopCount: chopCountRef.current,
      pads: padsRef.current.map((pad, index) => {
        const buffer = audio.getBuffer(pad.bufferId);
        return {
          pad: index + 1,
          name: pad.name,
          shortName: pad.shortName,
          source: pad.source,
          pitch: pad.pitch,
          volumePercent: pad.volume,
          sliceStart: pad.sliceStart,
          sliceEnd: pad.sliceEnd,
          loaded: Boolean(buffer),
          durationSeconds: buffer ? Number(buffer.duration.toFixed(3)) : null,
          keyboardKey: pad.key.toUpperCase(),
          midiNote: pad.midi,
        };
      }),
      sequence: patternRef.current
        .map((row, padIndex) => ({
          pad: padIndex + 1,
          steps: row.flatMap((enabled, step) => enabled ? [step + 1] : []),
        }))
        .filter((track) => track.steps.length > 0),
    });

    return {
      getState: stateSnapshot,

      selectKit: async ({ kit }, signal) => {
        await selectFactoryKit(kit, signal);
        return stateSnapshot();
      },

      loadSample: async ({ pad, url, name, shortName }, signal) => {
        setStatus(`WEBMCP / LOADING PAD ${pad}`);
        const padIndex = pad - 1;
        const displayName = await loadAudioUrl(padIndex, url, { name, shortName, signal });
        setStatus(`WEBMCP / ${displayName} → PAD ${pad}`);
        return stateSnapshot();
      },

      assignPad: async ({ sourcePad, targetPad }, signal) => {
        await powerOn();
        const source = await ensurePadBuffer(sourcePad - 1, signal);
        const targetIndex = targetPad - 1;
        const next = padsRef.current.map((current, index) => index === targetIndex ? {
          ...current,
          bufferId: source.bufferId,
          url: source.url,
          name: source.name,
          shortName: source.shortName,
          pitch: source.pitch,
          volume: source.volume,
          sliceStart: source.sliceStart,
          sliceEnd: source.sliceEnd,
          source: source.source,
        } : current);
        commitPads(next);
        selectedPadNow(targetIndex);
        setPoweredNow();
        setStatus(`WEBMCP / PAD ${sourcePad} → PAD ${targetPad}`);
        return stateSnapshot();
      },

      configurePad: ({ pad, pitch, volume, sliceStart, sliceEnd, name, shortName }) => {
        const padIndex = pad - 1;
        const current = padsRef.current[padIndex];
        if (!current) throw new Error(`Pad ${pad} does not exist.`);
        const nextStart = sliceStart ?? current.sliceStart;
        const nextEnd = sliceEnd ?? current.sliceEnd;
        if (nextStart >= nextEnd) throw new Error('sliceStart must be lower than sliceEnd.');
        const next = padsRef.current.map((candidate, index) => index === padIndex ? {
          ...candidate,
          ...(pitch === undefined ? {} : { pitch }),
          ...(volume === undefined ? {} : { volume }),
          ...(sliceStart === undefined ? {} : { sliceStart }),
          ...(sliceEnd === undefined ? {} : { sliceEnd }),
          ...(name === undefined ? {} : { name: name.toUpperCase() }),
          ...(shortName === undefined ? {} : { shortName: shortName.toUpperCase() }),
        } : candidate);
        commitPads(next);
        selectedPadNow(padIndex);
        setStatus(`WEBMCP / PAD ${pad} CONFIGURED`);
        return stateSnapshot();
      },

      chopSample: async ({ sourcePad, count, startPad, sliceStart, sliceEnd }, signal) => {
        await powerOn();
        const source = await ensurePadBuffer(sourcePad - 1, signal);
        const start = sliceStart ?? source.sliceStart;
        const end = sliceEnd ?? source.sliceEnd;
        if (start >= end) throw new Error('sliceStart must be lower than sliceEnd.');
        const duration = end - start;
        const startIndex = startPad - 1;
        const next = [...padsRef.current];
        for (let chop = 0; chop < count; chop += 1) {
          const targetIndex = startIndex + chop;
          next[targetIndex] = {
            ...next[targetIndex],
            bufferId: source.bufferId,
            url: source.url,
            name: `CHOP ${chop + 1}`,
            shortName: `C${chop + 1}`,
            pitch: source.pitch,
            volume: source.volume,
            sliceStart: start + duration * (chop / count),
            sliceEnd: start + duration * ((chop + 1) / count),
            source: 'chop',
          };
        }
        commitPads(next);
        chopCountRef.current = count;
        setChopCount(count);
        selectedPadNow(startIndex);
        setPoweredNow();
        setStatus(`WEBMCP / ${count} CHOPS → PADS ${startPad}-${startPad + count - 1}`);
        return stateSnapshot();
      },

      createSequence: ({ tracks, mode, bpm: nextBpm, swing: nextSwing, play }) => {
        const next = mode === 'replace'
          ? Array.from({ length: PAD_COUNT }, () => Array(STEPS).fill(false))
          : clonePattern(patternRef.current);
        tracks.forEach((track) => {
          track.steps.forEach((step) => { next[track.pad - 1][step - 1] = true; });
        });
        commitPattern(next);
        if (nextBpm !== undefined) {
          bpmRef.current = nextBpm;
          setBpm(nextBpm);
        }
        if (nextSwing !== undefined) {
          swingRef.current = nextSwing;
          setSwing(nextSwing);
        }
        if (play !== undefined) {
          playingRef.current = play;
          setPlaying(play);
          if (!play) setCurrentStep(-1);
        }
        setStatus(`WEBMCP / ${mode.toUpperCase()} SEQUENCE READY`);
        return stateSnapshot();
      },

      playPad: async ({ pad, velocity }) => {
        await triggerPadRef.current(pad - 1, velocity);
        return stateSnapshot();
      },

      setVolume: ({ volume }) => {
        commitMasterVolume(volume);
        setStatus(volume === 0 ? 'WEBMCP / MASTER MUTED' : `WEBMCP / MASTER LEVEL ${Math.round(volume)}%`);
        return stateSnapshot();
      },

      setTransport: ({ playing: nextPlaying, bpm: nextBpm, swing: nextSwing }) => {
        if (nextBpm !== undefined) {
          bpmRef.current = nextBpm;
          setBpm(nextBpm);
        }
        if (nextSwing !== undefined) {
          swingRef.current = nextSwing;
          setSwing(nextSwing);
        }
        if (nextPlaying !== undefined) {
          playingRef.current = nextPlaying;
          setPlaying(nextPlaying);
          if (!nextPlaying) setCurrentStep(-1);
        }
        setStatus(`WEBMCP / ${nextPlaying === undefined ? 'TRANSPORT UPDATED' : nextPlaying ? 'PLAYING' : 'STOPPED'}`);
        return stateSnapshot();
      },
    };
  }, [audio, commitMasterVolume, commitPads, commitPattern, loadAudioUrl, powerOn, selectFactoryKit]);

  useEffect(() => {
    const modelContext = document.modelContext;
    if (!modelContext) return;

    const registration = new AbortController();
    let active = true;
    void registerMcpMpcTools(modelContext, webMcpController, registration.signal)
      .then(() => {
        if (active) setWebMcpStatus('READY');
      })
      .catch((error) => {
        if (!registration.signal.aborted) {
          console.error('Could not register WebMCP tools.', error);
          if (active) setWebMcpStatus('ERROR');
        }
      });

    return () => {
      active = false;
      registration.abort();
    };
  }, [webMcpController]);

  const filledSteps = useMemo(() => pattern.flat().filter(Boolean).length, [pattern]);

  return (
    <main
      className="app-shell"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) void loadAudioFile(file);
      }}
    >
      <div className="pixel-sky" aria-hidden="true">
        <div className="skyline skyline-back" />
        <div className="skyline skyline-front" />
      </div>

      <header className="game-header">
        <div className="header-main">
          <div className="header-copy">
            <span className="eyebrow">WEBMCP CHALLENGE</span>
            <h1>MCP-MPC</h1>
          </div>
          <p className="header-intro">
            An MPC is a pad-based sampler for chopping sounds and building beats.
            <br />
            The MPC reshaped hip-hop and electronic music by making sample-based production fast, tactile, and self-contained.
          </p>
        </div>
        <div className="header-score" aria-label="Session information">
          <span>SEQ <strong>01</strong></span>
          <span>HITS <strong>{String(filledSteps).padStart(3, '0')}</strong></span>
        </div>
      </header>

      <section className={`machine ${powered ? 'is-powered' : ''}`} aria-label="MCP MPC sampler">
        <div className="machine-topbar">
          <div className="brand-block">
            <span className="brand-mark">BC</span>
            <div><strong>16-BIT SAMPLING WORKSTATION</strong><small>MADE IN THE BEDROOM</small></div>
          </div>
          <div className="kit-selector">
            <label htmlFor="factory-kit">SOUND CARTRIDGE</label>
            <div className="kit-select-row">
              <select
                id="factory-kit"
                value={activeKitId}
                disabled={kitLoading}
                aria-describedby="factory-kit-description"
                onChange={(event) => void selectFactoryKit(event.target.value as KitId)}
              >
                {KITS.map((kit) => <option key={kit.id} value={kit.id}>{kit.name}</option>)}
              </select>
              <output aria-label={`Kit ${KITS.findIndex((kit) => kit.id === activeKitId) + 1} of ${KITS.length}`}>
                {String(KITS.findIndex((kit) => kit.id === activeKitId) + 1).padStart(2, '0')}/{String(KITS.length).padStart(2, '0')}
              </output>
            </div>
            <small id="factory-kit-description">{kitLoading ? 'LOADING CARTRIDGE...' : activeKit.description}</small>
          </div>
          <label className="master-level" htmlFor="master-volume">
            <span className="master-level-heading"><Volume2 size={14} /> MASTER OUT</span>
            <span className="master-level-row">
              <input
                id="master-volume"
                type="range"
                min="0"
                max="100"
                step="1"
                value={masterVolume}
                aria-label="Master output volume"
                aria-valuetext={masterVolume === 0 ? 'Muted' : `${masterVolume} percent`}
                onChange={(event) => {
                  const nextVolume = Number(event.target.value);
                  commitMasterVolume(nextVolume);
                  setStatus(nextVolume === 0 ? 'MASTER OUTPUT MUTED' : `MASTER OUT / ${nextVolume}%`);
                }}
              />
              <output htmlFor="master-volume">{String(masterVolume).padStart(3, '0')}%</output>
            </span>
          </label>
        </div>

        <div className="control-deck">
          <section className="display-panel" aria-label="Sample editor">
            <div className="lcd-bezel">
              <div className="lcd-head">
                <span>EDIT:PAD {String(selectedPad + 1).padStart(2, '0')}</span>
                <span>{selected.source.toUpperCase()}</span>
              </div>
              <div className="lcd-main">
                <div className="lcd-title-row">
                  <div>
                    <strong>{selected.name}</strong>
                    <span>{selected.pitch >= 0 ? '+' : ''}{selected.pitch} ST • {selectedBuffer ? `${selectedBuffer.duration.toFixed(2)} SEC` : 'STANDBY'}</span>
                  </div>
                  <div className="level-meter" aria-label="Output activity">
                    {meter.map((level, index) => <i key={index} style={{ height: `${7 + level * 5}px` }} />)}
                  </div>
                </div>
                <Waveform buffer={selectedBuffer} start={selected.sliceStart} end={selected.sliceEnd} chops={chopCount} />
                <div className="lcd-status"><span className="status-dot" /> {status}</div>
              </div>
            </div>

            <section className={`pad-volume-panel ${selected.color}`} aria-labelledby="selected-pad-volume-title">
              <div className="pad-volume-identity">
                <span id="selected-pad-volume-title">SELECTED PAD LEVEL</span>
                <strong><b>{String(selectedPad + 1).padStart(2, '0')}</b> {selected.shortName}</strong>
              </div>
              <label className="pad-volume-control" htmlFor={`selected-pad-volume-${selected.id}`}>
                <span>{selected.volume === 0 ? 'MUTED' : 'PAD GAIN'}</span>
                <input
                  id={`selected-pad-volume-${selected.id}`}
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={selected.volume}
                  style={{ background: `linear-gradient(90deg, var(--pad-accent) 0 ${selected.volume}%, #5f5a67 ${selected.volume}% 100%)` }}
                  aria-label={`Volume for pad ${selectedPad + 1}, ${selected.name}`}
                  aria-valuetext={selected.volume === 0 ? 'Muted' : `${selected.volume} percent`}
                  onChange={(event) => changeSelectedPadVolume(Number(event.target.value))}
                />
              </label>
              <output htmlFor={`selected-pad-volume-${selected.id}`} aria-live="polite">
                {String(selected.volume).padStart(3, '0')}%
              </output>
            </section>

            <div className="sample-controls">
              <div className="control-group tune-group">
                <span className="control-label">PITCH / SEMITONES</span>
                <div className="tune-control">
                  <button onClick={() => changePitch(-1)} aria-label="Pitch down one semitone">−</button>
                  <output>{selected.pitch > 0 ? '+' : ''}{selected.pitch}</output>
                  <button onClick={() => changePitch(1)} aria-label="Pitch up one semitone">+</button>
                </div>
              </div>
              <div className="control-group trim-group">
                <label>
                  <span>START<output>{slicePositionLabel(selected.sliceStart, selectedDuration)}</output></span>
                  <input
                    type="range"
                    min="0"
                    max={1 - SLICE_STEP}
                    step={SLICE_STEP}
                    value={selected.sliceStart}
                    aria-label={`Start point for ${selected.name}`}
                    aria-valuetext={slicePositionLabel(selected.sliceStart, selectedDuration)}
                    onChange={(event) => updateSelectedPad({ sliceStart: Math.min(Number(event.target.value), selected.sliceEnd - SLICE_STEP) })}
                  />
                </label>
                <label>
                  <span>END<output>{slicePositionLabel(selected.sliceEnd, selectedDuration)}</output></span>
                  <input
                    type="range"
                    min={SLICE_STEP}
                    max="1"
                    step={SLICE_STEP}
                    value={selected.sliceEnd}
                    aria-label={`End point for ${selected.name}`}
                    aria-valuetext={slicePositionLabel(selected.sliceEnd, selectedDuration)}
                    onChange={(event) => updateSelectedPad({ sliceEnd: Math.max(Number(event.target.value), selected.sliceStart + SLICE_STEP) })}
                  />
                </label>
              </div>
              <div className="control-group chop-group">
                <span className="control-label">AUTO CHOP</span>
                <div className="chop-buttons">
                  {[2, 4, 8, 16].map((count) => <button key={count} className={chopCount === count ? 'selected' : ''} onClick={() => setChopCount(count)}>{count}</button>)}
                </div>
                <button className="action-button amber" onClick={applyChops}><Scissors size={14} /> SLICE TO PADS</button>
              </div>
            </div>

            <div className="transport-row" role="group" aria-label="Tempo and sequence transport">
              <div className="tempo-display">
                <span>TEMPO</span>
                <strong>{bpm}</strong>
                <small>BPM</small>
              </div>
              <label className="tempo-slider"><span className="sr-only">Tempo</span><input type="range" min="40" max="220" value={bpm} onChange={(event) => setBpm(Number(event.target.value))} /></label>
              <div className="transport-buttons">
                <button className={playing ? 'active play' : 'play'} onClick={toggleTransport} aria-label={playing ? 'Stop sequence' : 'Play sequence'}>
                  {playing ? <Square size={18} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                  <span>{playing ? 'STOP' : 'PLAY'}</span>
                </button>
                <button className={recordArmed ? 'record armed' : 'record'} onClick={() => setRecordArmed((current) => !current)} aria-pressed={recordArmed}>
                  <Circle size={18} fill="currentColor" /><span>SEQ REC</span>
                </button>
              </div>
            </div>
          </section>

          <section className="performance-panel" aria-label="Performance pads">
            <div className="pads-grid">
              {PAD_DISPLAY_ORDER.map((padIndex) => {
                const pad = pads[padIndex];
                return (
                  <button
                    key={pad.id}
                    className={`drum-pad ${pad.color} ${activePads.has(padIndex) ? 'active' : ''} ${selectedPad === padIndex ? 'selected' : ''}`}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      const velocity = 0.62 + (1 - Math.min(1, event.nativeEvent.offsetY / Math.max(1, event.currentTarget.clientHeight))) * 0.45;
                      void triggerPad(padIndex, velocity);
                    }}
                    aria-label={`Pad ${padIndex + 1}: ${pad.name}. Keyboard ${pad.key}`}
                  >
                    <span className="pad-number">{String(padIndex + 1).padStart(2, '0')}</span>
                    <strong>{pad.shortName}</strong>
                    <kbd>{pad.key.toUpperCase()}</kbd>
                    <i className="pad-led" />
                  </button>
                );
              })}
            </div>

            <div className="performance-tools">
              <input ref={audioInputRef} className="sr-only" type="file" accept="audio/*,.wav,.mp3,.m4a,.aac,.ogg,.flac" onChange={handleAudioInput} />
              <button onClick={() => audioInputRef.current?.click()}><Upload size={15} /> LOAD SAMPLE</button>
              <button className={recording ? 'recording' : ''} onClick={() => void toggleMicRecording()}><Mic size={15} /> {recording ? `STOP ${timeLabel(recordSeconds)}` : 'MIC SAMPLE'}</button>
              <button onClick={() => void resetFactoryPad()}><RotateCcw size={15} /> RESET PAD</button>
            </div>
            <form className="url-sample-loader" aria-busy={urlLoading} onSubmit={(event) => void handleSampleUrlSubmit(event)}>
              <label htmlFor="sample-url">
                <span><Link2 size={13} /> SAMPLE URL → PAD {String(selectedPad + 1).padStart(2, '0')}</span>
                <small id="sample-url-help">DIRECT AUDIO FILE • CORS REQUIRED</small>
              </label>
              <div className="url-sample-row">
                <input
                  id="sample-url"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  spellCheck="false"
                  value={sampleUrl}
                  placeholder="https://…/sample.wav"
                  aria-describedby="sample-url-help"
                  onChange={(event) => setSampleUrl(event.target.value)}
                />
                <button type="submit" disabled={urlLoading || !sampleUrl.trim()}>
                  <Download size={14} /> {urlLoading ? 'FETCHING' : 'LOAD URL'}
                </button>
              </div>
            </form>
            <p className="keyboard-hint">KEYS: Z X C V • A S D F • Q W E R • 1 2 3 4</p>
          </section>
        </div>

        <section className="sequence-panel" aria-label="Sixteen step sequencer">
          <div className="sequence-header">
            <div>
              <span className="eyebrow dark">PATTERN EDIT</span>
              <h2>SEQ 01 / 1 BAR</h2>
            </div>
            <label className="swing-control">SWING <strong>{swing}%</strong><input type="range" min="0" max="60" value={swing} onChange={(event) => setSwing(Number(event.target.value))} /></label>
            <div className="sequence-actions">
              <button onClick={makeBeat}><WandSparkles size={14} /> MAGIC BEAT</button>
              <button onClick={clearPattern}><Trash2 size={14} /> CLEAR</button>
            </div>
          </div>
          <div className="sequencer-scroll">
            <div className="step-numbers">
              <span />
              {Array.from({ length: STEPS }, (_, step) => <span key={step} className={currentStep === step ? 'current' : ''}>{step + 1}</span>)}
            </div>
            <div className="sequence-grid">
              {[...PAD_DISPLAY_ORDER].reverse().map((padIndex) => (
                <div className={`sequence-row ${selectedPad === padIndex ? 'selected' : ''}`} key={padIndex}>
                  <button className="track-name" onClick={() => setSelectedPad(padIndex)}><span>{String(padIndex + 1).padStart(2, '0')}</span>{pads[padIndex].shortName}</button>
                  {Array.from({ length: STEPS }, (_, step) => (
                    <button
                      key={step}
                      className={`step ${pattern[padIndex][step] ? 'enabled' : ''} ${currentStep === step ? 'current' : ''} ${step % 4 === 0 ? 'beat' : ''}`}
                      onClick={() => toggleStep(padIndex, step)}
                      aria-label={`${pads[padIndex].name}, step ${step + 1}${pattern[padIndex][step] ? ', active' : ''}`}
                      aria-pressed={pattern[padIndex][step]}
                    ><i /></button>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="midi-strip">
            <div className="midi-label"><FileMusic size={21} /><span><strong>STANDARD MIDI</strong><small>GM DRUM MAP • 1/16 QUANTIZE</small></span></div>
            <input ref={midiInputRef} className="sr-only" type="file" accept=".mid,.midi,audio/midi" onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importMidi(file);
              event.target.value = '';
            }} />
            <button onClick={() => midiInputRef.current?.click()}><Upload size={14} /> IMPORT .MID</button>
            <button onClick={exportMidi}><Download size={14} /> EXPORT .MID</button>
          </div>
        </section>

        <footer className="machine-footer">
          <span>16 VOICE</span><span>22.05 kHz SAMPLE SETS</span><span>WEB AUDIO POWERED</span>
          <span className={`webmcp-state webmcp-${webMcpStatus.toLowerCase().replace(' ', '-')}`} title="WebMCP agent control status">
            WEBMCP: {webMcpStatus}
          </span>
          <span>NO DATA LEAVES THIS MACHINE</span>
        </footer>
      </section>

      <div className="help-legend">
        <span><i className="legend-dot coral" /> DRUMS</span>
        <span><i className="legend-dot gold" /> TOMS</span>
        <span><i className="legend-dot mint" /> PERC</span>
        <span><i className="legend-dot violet" /> FX</span>
        <span>SPACE = PLAY / STOP</span>
        <span>DROP AUDIO ANYWHERE</span>
      </div>

      {!powered && (
        <div className="boot-curtain" role="dialog" aria-label="Power on MCP MPC">
          <div className="boot-card">
            <div className="mini-cartridge"><span>MCP<br />MPC</span><i /></div>
            <h2>PRESS START</h2>
            <p>Sound on required.</p>
            <button onClick={() => void powerOn()} disabled={powering}>
              <Power size={18} /> {powering ? 'LOADING SAMPLES...' : 'POWER ON'}
            </button>
            <small>LOCAL ONLY • NO UPLOADS • {KITS.length} SOUND CARTRIDGES</small>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;

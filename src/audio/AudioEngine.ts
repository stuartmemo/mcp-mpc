export type PlayablePad = {
  id: number;
  bufferId: string;
  pitch: number;
  volume: number;
  sliceStart: number;
  sliceEnd: number;
};

const PAD_RELEASE_SECONDS = 0.008;
const PAD_RETRIGGER_SECONDS = 0.008;

type ActiveVoice = {
  padId: number;
  source: AudioBufferSourceNode;
  gain: GainNode;
  startTime: number;
  endTime: number;
};

export class AudioEngine {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private outputLevel = 0.88;
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<AudioBuffer>>();
  private activeVoices = new Set<ActiveVoice>();

  private ensureContext() {
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: 'interactive' });
      this.output = this.context.createGain();
      this.output.gain.value = this.outputLevel;
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.value = -10;
      this.compressor.knee.value = 8;
      this.compressor.ratio.value = 7;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.18;
      this.compressor.connect(this.output).connect(this.context.destination);
    }
    return this.context;
  }

  async activate() {
    const context = this.ensureContext();
    if (context.state === 'suspended') await context.resume();
    return context;
  }

  get currentTime() {
    return this.context?.currentTime ?? 0;
  }

  setOutputLevel(level: number) {
    this.outputLevel = Math.max(0, Math.min(1, level));
    if (!this.context || !this.output) return;
    const now = this.context.currentTime;
    this.output.gain.cancelScheduledValues(now);
    this.output.gain.setTargetAtTime(this.outputLevel, now, 0.012);
  }

  async loadUrl(id: string, url: string, signal?: AbortSignal) {
    if (this.buffers.has(id)) return this.buffers.get(id)!;
    if (this.loading.has(id)) return this.loading.get(id)!;

    const promise = (async () => {
      try {
        const context = this.ensureContext();
        const response = await fetch(url, { signal });
        if (!response.ok) throw new Error(`Could not load sample: ${url}`);
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        this.buffers.set(id, buffer);
        return buffer;
      } finally {
        this.loading.delete(id);
      }
    })();

    this.loading.set(id, promise);
    return promise;
  }

  async loadFile(id: string, file: Blob) {
    const context = this.ensureContext();
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    this.buffers.set(id, buffer);
    return buffer;
  }

  getBuffer(id: string) {
    return this.buffers.get(id);
  }

  private releaseVoice(voice: ActiveVoice, at: number) {
    const releaseAt = Math.max(voice.startTime, at);
    if (releaseAt >= voice.endTime) return;

    const releaseEnd = Math.min(voice.endTime, releaseAt + PAD_RETRIGGER_SECONDS);
    voice.gain.gain.cancelAndHoldAtTime(releaseAt);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);
    voice.source.stop(releaseEnd);
    voice.endTime = releaseEnd;
  }

  play(pad: PlayablePad, when = this.currentTime, velocity = 1) {
    const context = this.context;
    const compressor = this.compressor;
    const buffer = this.buffers.get(pad.bufferId);
    if (!context || !compressor || !buffer) return false;

    const level = Math.max(0, Math.min(1.15, velocity)) * Math.max(0, Math.min(1, pad.volume / 100));
    if (level === 0) return false;

    const source = context.createBufferSource();
    const gain = context.createGain();
    const start = Math.max(0, Math.min(0.999, pad.sliceStart)) * buffer.duration;
    const end = Math.max(pad.sliceStart + 0.001, Math.min(1, pad.sliceEnd)) * buffer.duration;
    source.buffer = buffer;
    source.playbackRate.value = 2 ** (pad.pitch / 12);
    const startTime = Math.max(when, context.currentTime);
    const playbackDuration = (end - start) / source.playbackRate.value;
    const releaseDuration = Math.min(PAD_RELEASE_SECONDS, playbackDuration);
    const releaseStart = startTime + playbackDuration - releaseDuration;
    const naturalEndTime = startTime + playbackDuration;
    gain.gain.setValueAtTime(level, startTime);
    gain.gain.setValueAtTime(level, releaseStart);
    gain.gain.exponentialRampToValueAtTime(0.0001, naturalEndTime);
    source.connect(gain).connect(compressor);

    const conflictingVoices = Array.from(this.activeVoices)
      .filter((voice) => voice.padId === pad.id);
    const nextConflictTime = conflictingVoices
      .filter((voice) => voice.startTime > startTime && voice.startTime < naturalEndTime)
      .reduce((earliest, voice) => Math.min(earliest, voice.startTime), Number.POSITIVE_INFINITY);
    const voice: ActiveVoice = {
      padId: pad.id,
      source,
      gain,
      startTime,
      endTime: naturalEndTime,
    };
    source.onended = () => this.activeVoices.delete(voice);
    source.start(startTime, start, end - start);
    this.activeVoices.add(voice);

    conflictingVoices
      .filter((active) => active.startTime <= startTime && active.endTime > startTime)
      .forEach((active) => this.releaseVoice(active, startTime));
    if (Number.isFinite(nextConflictTime)) this.releaseVoice(voice, nextConflictTime);
    return true;
  }
}

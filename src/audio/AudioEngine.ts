export type PlayablePad = {
  bufferId: string;
  pitch: number;
  sliceStart: number;
  sliceEnd: number;
};

export class AudioEngine {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private outputLevel = 0.88;
  private buffers = new Map<string, AudioBuffer>();
  private loading = new Map<string, Promise<AudioBuffer>>();

  async activate() {
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
    if (this.context.state === 'suspended') await this.context.resume();
    return this.context;
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
        const context = await this.activate();
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
    const context = await this.activate();
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    this.buffers.set(id, buffer);
    return buffer;
  }

  getBuffer(id: string) {
    return this.buffers.get(id);
  }

  play(pad: PlayablePad, when = this.currentTime, velocity = 1) {
    const context = this.context;
    const compressor = this.compressor;
    const buffer = this.buffers.get(pad.bufferId);
    if (!context || !compressor || !buffer) return false;

    const source = context.createBufferSource();
    const gain = context.createGain();
    const start = Math.max(0, Math.min(0.999, pad.sliceStart)) * buffer.duration;
    const end = Math.max(pad.sliceStart + 0.001, Math.min(1, pad.sliceEnd)) * buffer.duration;
    source.buffer = buffer;
    source.playbackRate.value = 2 ** (pad.pitch / 12);
    gain.gain.setValueAtTime(Math.max(0.04, Math.min(1.15, velocity)), when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.04, (end - start) / source.playbackRate.value));
    source.connect(gain).connect(compressor);
    source.start(when, start, end - start);
    return true;
  }
}

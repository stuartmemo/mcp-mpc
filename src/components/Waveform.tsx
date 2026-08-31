import { useEffect, useRef } from 'react';

type WaveformProps = {
  buffer?: AudioBuffer;
  start: number;
  end: number;
  chops?: number;
};

export function Waveform({ buffer, start, end, chops = 1 }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const scale = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * scale;
    canvas.height = height * scale;
    context.scale(scale, scale);
    context.clearRect(0, 0, width, height);

    context.fillStyle = '#101a2b';
    context.fillRect(0, 0, width, height);
    context.fillStyle = 'rgba(145, 211, 166, 0.08)';
    for (let x = 0; x < width; x += 8) context.fillRect(x, 0, 1, height);
    for (let y = 0; y < height; y += 8) context.fillRect(0, y, width, 1);

    if (!buffer) {
      context.fillStyle = '#91d3a6';
      context.font = '20px VT323';
      context.fillText('PRESS A PAD TO LOAD WAVE', 14, height / 2 + 6);
      return;
    }

    const data = buffer.getChannelData(0);
    const stride = Math.max(1, Math.floor(data.length / width));
    context.fillStyle = '#91d3a6';
    for (let x = 0; x < width; x += 1) {
      let min = 1;
      let max = -1;
      const offset = x * stride;
      for (let i = 0; i < stride; i += 1) {
        const value = data[offset + i] ?? 0;
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
      const top = (1 - max) * height * 0.5;
      const bottom = (1 - min) * height * 0.5;
      context.fillRect(x, top, 1, Math.max(1, bottom - top));
    }

    context.fillStyle = 'rgba(244, 181, 90, 0.22)';
    context.fillRect(0, 0, start * width, height);
    context.fillRect(end * width, 0, (1 - end) * width, height);
    context.strokeStyle = '#f4b55a';
    context.lineWidth = 2;
    context.strokeRect(start * width, 1, Math.max(1, (end - start) * width), height - 2);

    if (chops > 1) {
      context.strokeStyle = 'rgba(255, 231, 181, 0.72)';
      context.setLineDash([3, 3]);
      for (let i = 1; i < chops; i += 1) {
        const x = ((start + ((end - start) * i) / chops) * width) | 0;
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
    }
  }, [buffer, start, end, chops]);

  return <canvas ref={canvasRef} className="waveform-canvas" aria-label="Sample waveform" />;
}

# MCP MPC

A local-first, SNES-inspired web sampling workstation. Built for the WebMCP Challenge, MCP MPC runs entirely in the browser with the Web Audio API: no account, server, or sample upload is required.

## Features

- 16 playable velocity-sensitive pads with keyboard shortcuts
- Two switchable 16-pad sample kits
- Per-pad pitch, start, and end controls
- Shared pad/sample output volume with mute at 0%
- Load or drag in audio, or record from a microphone/line input
- Automatic 2, 4, 8, or 16-slice sample chopping across pads
- Audio-clocked 16-step sequencer with tempo, swing, and live record
- General MIDI drum-file import with 1/16 quantization
- Standard MIDI export
- Responsive touch layout and accessible controls
- WebMCP tools for inspecting and controlling kits, pads, sequencing, and transport

## Run locally

```bash
npm install
npm run dev
```

Open the local URL, press **Power On**, and use the pads or the mapped keys:

```text
1 2 3 4
Q W E R
A S D F
Z X C V
```

Press Space to start or stop the sequence. Audio files can also be dropped anywhere on the page; they load into the currently selected pad.

## Production build

```bash
npm run build
npm run preview
```

The generated app is static and can be deployed on any static host. Microphone recording requires HTTPS outside localhost.

## Built-in kits

**Dusty Crate** is the default: warm, modeled drums and organic percussion with a dark sampled edge. **Lo-Fi Acoustic** is a real jazz kit captured through a vintage mono mic, with softer dynamics, ghost notes, and dusty cymbals.

The 16 sounds in **Dusty Crate** are original, deterministic 22.05 kHz mono synthesis. The 16 sounds in **Lo-Fi Acoustic** are real drum recordings from the CC0 [Virtuosity Drums](https://github.com/sfzinstruments/virtuosity_drums) library, captured through its vintage/lo-fi mic and trimmed for an MPC-style 22.05 kHz palette. Full source-file mappings, the pinned revision, processing notes, and checksums are recorded in `public/samples/manifest.json` and `public/samples/lofi-acoustic/PROVENANCE.md`.

Rebuild both kits with Node.js and `ffmpeg` available on `PATH`:

```bash
npm run generate:samples
```

Changing the sound cartridge replaces the 16 factory pad assignments while preserving the current pattern, tempo, swing, and transport state. **Reset Pad** restores the selected pad from the active cartridge.

## WebMCP

In a WebMCP-capable browser, the page registers tools through `document.modelContext`. Alongside sample, pad, sequence, and transport controls, `mcpmpc_select_kit` accepts `dusty-crate` or `lofi-acoustic`, `mcpmpc_set_volume` changes the shared pad/sample output level, and `mcpmpc_get_state` reports both settings.

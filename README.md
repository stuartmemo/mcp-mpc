# MCP MPC

A local-first, SNES-inspired web sampling workstation. Built for the WebMCP Challenge, MCP MPC runs entirely in the browser with the Web Audio API: no account, server, or sample upload is required.

## Features

- 16 playable velocity-sensitive pads with keyboard shortcuts
- Four switchable 16-pad sample kits
- Per-pad volume, pitch, start, and end controls
- Independent master output level with mute at 0%
- Load, drag, or fetch audio from a direct URL, or record from a microphone/line input
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

Press Space to start or stop the sequence. Audio files can also be dropped anywhere on the page; they load into the currently selected pad. To fetch a sample, paste its direct audio-file URL into **Sample URL** below the pads. Cross-origin hosts must allow CORS requests.

## Production build

```bash
npm run build
npm run preview
```

The generated app is static and can be deployed on any static host. Microphone recording requires HTTPS outside localhost.

## Built-in kits

**Hip-Hop** is the default: real acoustic drum recordings pitched, stacked, shortened, and saturated into a tight boom-bap palette with hard and deep kicks, crack and room snares, crisp hats, toms, and fills. **Traditional Kit** is a clean acoustic set with close-miked kick and snare blended with natural mid and overhead microphones, plus toms, expressive hats, ride, and two crashes.

**Dusty Crate** remains available for warm modeled drums and organic percussion, while **Lo-Fi Acoustic** keeps the softer vintage-mic jazz palette. Dusty Crate uses original deterministic 22.05 kHz mono synthesis. Hip-Hop, Traditional Kit, and Lo-Fi Acoustic use real CC0 recordings from [Virtuosity Drums](https://github.com/sfzinstruments/virtuosity_drums), pinned to a specific revision and processed into compact MPC-style one-shots. Full source mappings, mix weights, processing notes, and checksums live in `public/samples/manifest.json` and each recorded kit's `PROVENANCE.md`.

Rebuild all four kits with Node.js and `ffmpeg` available on `PATH`:

```bash
npm run generate:samples
```

Changing the sound cartridge replaces the 16 factory pad assignments while preserving the current pattern, tempo, swing, and transport state. **Reset Pad** restores the selected pad from the active cartridge.

## WebMCP

In a WebMCP-capable browser, the page registers tools through `document.modelContext`. Alongside sample, pad, sequence, and transport controls, `mcpmpc_select_kit` accepts `hip-hop`, `traditional`, `dusty-crate`, or `lofi-acoustic`; `mcpmpc_configure_pad` changes one pad's level through its `volume` field, `mcpmpc_set_volume` changes the master output, and `mcpmpc_get_state` reports both settings.

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

**Fischer 808** is the default: a 16-voice selection from Michael Fischer's direct capture of a real TR-808, including the classic drums plus congas, cowbell, claves, and maracas. **Uzu Modern** supplies punchier synthesized and analog-processed electronics with modular character hits.

**Big Rusty Room** is a room-forward vintage acoustic kit with a 24-inch kick, four oversized toms, and unusual cymbals. **Swirly Brushes** is the left-field organic cartridge: brushed snare and cajon, hand drums, snare buzz, and cracked metal. The recordings come from [Fischer's TR-808 set](https://github.com/tidalcycles/sounds-tr808-fischer), [uzu-drumkit](https://github.com/tidalcycles/uzu-drumkit), [Big Rusty Drums](https://github.com/sfzinstruments/karoryfer.big-rusty-drums), and [Swirly Drums](https://github.com/sfzinstruments/karoryfer.swirly-drums). All four sources use CC0 or an equivalent public-domain dedication, and every source revision is pinned. Full licenses, source mappings, processing notes, and source/output checksums live under `public/samples/`.

Rebuild all four kits with Node.js and `ffmpeg` available on `PATH`:

```bash
npm run generate:samples
```

Changing the sound cartridge replaces the 16 factory pad assignments while preserving the current pattern, tempo, swing, and transport state. **Reset Pad** restores the selected pad from the active cartridge.

## WebMCP

In a WebMCP-capable browser, the page registers tools through `document.modelContext`. Alongside sample, pad, sequence, and transport controls, `mcpmpc_select_kit` accepts `fischer-808`, `uzu`, `big-rusty`, or `swirly`; `mcpmpc_configure_pad` changes one pad's level through its `volume` field, `mcpmpc_set_volume` changes the master output, and `mcpmpc_get_state` reports both settings.

# MCEdu Client GUI (standalone)

This is a standalone Windows GUI prototype with clickable module toggles and in-app
hotkeys. It does **not** inject into Minecraft Education, read or modify the game,
or implement gameplay cheats.

## Included modules
- HUD demo
- Coordinates display demo
- Keystrokes display demo
- Test-mode movement indicator
- Distance display demo

These are interface/demo toggles only; they do not affect Minecraft gameplay.

## Requirements
- Windows 10/11
- CMake 3.20+
- Visual Studio Build Tools with **Desktop development with C++**

## Build
Open a terminal in this folder and run:

    cmake -S . -B build -A x64
    cmake --build build --config Release

Run `build\\Release\\mcedu_client.exe` (or `build\\mcedu_client.exe` depending on generator).

## Controls
- Click a row's toggle to turn a demo module on/off.
- F1–F5 toggle the five modules while this app window is focused.
- Esc closes the app.

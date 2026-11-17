# Dino Runner

Dino Runner is a single-player PixelMug game. A dinosaur runs across the 32 × 16 display while the player jumps over obstacles using the mug's touch key or the WebApp button. The game includes sound effects, increasing difficulty, and a bonus for clearing the hardest obstacle.

## Open in PixelMug Studio

1. Open this project directory in PixelMug Studio and configure a Bot token.
2. Bind a PixelMug S1 to your account, then start the project in Studio.
3. Send `/dinoRunner` to the Bot and open its WebApp link. The loading page installs and starts the MPY app automatically; use **Retry** if it fails.
4. Enter the game. The WebApp connects over BLE, and either the phone button or the mug touch key starts, jumps, and restarts the game.

The Bot and WebApp use the Studio-provided `STUDIO_WEBAPP_URL`, `STUDIO_MPS_ID`, and `STUDIO_MPS_VERSION`. Studio hosts the built WebApp, so no separate static server or application-specific environment file is needed.

## Scores and controls

The device is the only score authority. Its MPY app saves the last and best scores in `dino_score.json` when a round ends. The WebApp reads scores from the device through the existing BLE `dinoGetState` response and `dinoGameOver` event. It does not save scores or send them to the Bot. The Bot only provides binding help and the game link.

The phone's Jump button sends one byte, `0x4A` (`J`), on the simple BLE RAW channel. On the mug, the rising edge of `mpy_button.is_pressed()` starts, jumps, or restarts according to the game state; release the key before pressing again. The WebApp and MPY code both use the BLE app ID `DinoRunner`.

Below the Last and Best scores, the WebApp offers a 0–100 Sound effects volume slider. Zero mutes and stops the current sound effect. Changes are sent through the `dinoSetSoundVolume` BLE command and applied immediately by the device's Audio Service. The current volume is returned by `dinoGetState` when the WebApp connects; it resets to 100 when the device app restarts.

Device assets are in `mpy/assets/` and use device-relative paths. `mpy/mps.json` declares the required MicroPython modules and version `1.0.0`.

## Project layout

```text
bot/index.js       Bot commands and bilingual messages
webapp/            Vue controller and MPY launch page
mpy/__main__.py    Device game and score storage
mpy/mps.json       MPS manifest
mpy/assets/        Sprite sheet and sounds
```

## Local checks

Run `npm install` in the project root and `npm --prefix webapp install` for the WebApp. Then run `npm run build` and the PixelMug Skill project validator. Studio supplies the runtime configuration when the project is opened there.

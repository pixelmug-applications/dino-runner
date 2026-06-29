# 恐龙暴走

一个 PixelMug MPS 小游戏：在 32x16 像素屏上控制小恐龙跳过障碍。杯身触摸和 WebApp 按钮都可以触发跳跃。

## Structure

```text
dino-runner/
  bot/      Bubble bot entrypoint
  webapp/   Vue 3 + Vite mobile WebApp
  mpy/      MicroPython device-side game
```

## BLE Protocol

WebApp sends commands to the MicroPython app:

```json
{ "method": "dinoJump", "id": "dino_..." }
{ "method": "dinoRestart", "id": "dino_..." }
{ "method": "dinoPause", "id": "dino_..." }
{ "method": "dinoResume", "id": "dino_..." }
{ "method": "dinoSetConfig", "id": "dino_...", "params": { "difficulty": "normal" } }
```

The MicroPython app reports game state:

```json
{
  "event": "dinoState",
  "state": "running",
  "score": 12,
  "bestScore": 20,
  "difficulty": "normal"
}
```

Difficulty values are `easy`, `normal`, and `hard`.

## Build WebApp

```sh
npm --prefix webapp install
npm run build
```

## Run Bot

Required:

```sh
set BUBBLE_BOT_TOKEN=your-bot-token
```

Optional:

```sh
set BUBBLE_API_BASE_URL=https://api.devjeejio.com:5443/im/
set WEBAPP_HOST=your-lan-ip
set WEBAPP_PORT=8799
set WEBAPP_URL=https://your-public-webapp-url/index.html
set MPS_ID=your-mps-id
set MPS_VERSION=0.0.1
```

Start:

```sh
npm run bot
```

Commands:

- `/bindDevice`: sends the PixelMug binding card.
- `/dinoRunner`: opens this WebApp.
- `/webapp` and `/start`: also open this WebApp.

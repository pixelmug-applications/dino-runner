import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { BubbleBot, InlineKeyboard } from "../../jeejio-bubble/sdk/BubbleSDK.js";
import PixelMug from "../../jeejio-bubble/devices/PixelMug_1.1.js";
import { apiBaseUrl, token } from "./config.pub.js";

const staticPort = Number(process.env.WEBAPP_PORT || 8799);
const webAppHost = process.env.WEBAPP_HOST || localAddressHint();
const generatedWebAppUrl = `http://${webAppHost}:${staticPort}/index.html`;
const mpsLaunchConfig = {
  id: process.env.MPS_ID || "9898564609",
  version: process.env.MPS_VERSION || "1.0.5",
};
const webAppUrl = withMpsLaunchConfig(process.env.WEBAPP_URL || generatedWebAppUrl);
const shouldServeStatic = !process.env.WEBAPP_URL;

const messages = {
  "zh-CN": {
    bindContent: "\u7ed1\u5b9a PixelMug \u540e\u5373\u53ef\u8fd0\u884c\u6050\u9f99\u66b4\u8d70\u3002",
    bindButton: "\u7ed1\u5b9a PixelMug",
    openButton: "\u6253\u5f00\u6050\u9f99\u66b4\u8d70",
    intro: "**\u6050\u9f99\u66b4\u8d70**\n\n\u5728 PixelMug \u4e0a\u542f\u52a8\u50cf\u7d20\u5c0f\u6050\u9f99\uff0c\u7528\u624b\u673a\u6216\u676f\u8eab\u89e6\u6478\u952e\u8df3\u8dc3\uff0c\u8eb2\u5f00\u4e00\u8def\u51b2\u6765\u7684\u969c\u788d\u3002\n\n\u70b9\u51fb\u4e0b\u65b9\u6309\u94ae\u5f00\u59cb\u6e38\u620f\u3002",
    commands: "\u547d\u4ee4\uff1a/bindDevice\uff0c/dinoRunner",
    commandBind: "\u7ed1\u5b9a PixelMug",
    commandDino: "\u6253\u5f00\u6050\u9f99\u66b4\u8d70",
  },
  "en-US": {
    bindContent: "Bind a PixelMug before running Dino Runner.",
    bindButton: "Bind PixelMug",
    openButton: "Open Dino Runner",
    intro: "**Dino Runner**\n\nLaunch a tiny pixel dino on PixelMug, jump with your phone or the mug touch key, and dodge the incoming obstacles.\n\nTap the button below to start.",
    commands: "Commands: /bindDevice, /dinoRunner",
    commandBind: "Bind PixelMug",
    commandDino: "Open Dino Runner",
  },
};

const pixelMug = new PixelMug();
pixelMug.compatible = ["PixelMugS1"];

const bot = new BubbleBot(token, {
  apiBaseUrl,
  debug: process.env.DEBUG !== "false",
  observeWebAppDeviceCalls: true,
  webAppDeviceAccess: "any",
});

bot.registerDevices([pixelMug]);

bot.on("error", async (ctx) => {
  console.error("[dino-runner-bot]", ctx.error || ctx);
});

bot.on("web_app_data", async (ctx) => {
  const data = ctx.webAppData || {};
  if (data.type !== "app.dinoBestScore") return;

  const payload = data.payload || {};
  const user = userInfoFromContext(ctx);
  const bestScore = Number(payload.bestScore || 0);

  console.log(`[dino-runner-bot] user ${user.username || user.userId || "unknown"} scored best=${bestScore}`, {
    userId: user.userId,
    username: user.username,
    bestScore,
    lastScore: Number(payload.lastScore || payload.score || 0),
    score: Number(payload.score || 0),
    reportedAt: payload.reportedAt,
  });
});

bot.on("web_app_device_call", async (ctx) => {
  const call = ctx.webAppDeviceCall || {};
  console.log("[dino-runner-bot] WebApp device call", {
    direction: call.direction,
    method: call.method,
    slotId: call.slotId,
    deviceId: call.deviceId,
    result: call.result,
  });
});

bot.on("device_notify", async (ctx) => {
  const rawEvents = ctx.tal?.notify || [];
  const parsedEvents = pixelMug.parseNotify(rawEvents);
  console.log("[dino-runner-bot] Device notify", {
    deviceId: ctx.from?.id,
    rawEvents,
    parsedEvents,
  });
});

bot.on("message", async (ctx) => {
  const locale = localeFromContext(ctx);
  const command = extractCommand(ctx.message?.content || ctx.message?.text || "");

  if (command === "/bindDevice") {
    await ctx.sendBindDevice({
      content: text(locale, "bindContent"),
      actionButtonTitle: text(locale, "bindButton"),
    });
    return;
  }

  if (command === "/dinoRunner" || command === "/webapp" || command === "/start") {
    const keyboard = new InlineKeyboard().url(text(locale, "openButton"), withLocale(webAppUrl, locale));
    await ctx.sendKeyboard(
      text(locale, "intro"),
      keyboard,
      {
        mentionOnly: ctx.chat?.type === "group" ? true : undefined,
      }
    );
    return;
  }

  await ctx.sendText(text(locale, "commands"));
});

if (shouldServeStatic) {
  await startStaticServer();
}

await bot.setCommands([
  {
    command: "bindDevice",
    description: messages["en-US"].commandBind,
    descTranslations: {
      "zh-CN": messages["zh-CN"].commandBind,
      en: messages["en-US"].commandBind,
    },
  },
  {
    command: "dinoRunner",
    description: messages["en-US"].commandDino,
    descTranslations: {
      "zh-CN": messages["zh-CN"].commandDino,
      en: messages["en-US"].commandDino,
    },
  },
]);

await bot.start();

console.log("mps-dino-runner bot is running.");
console.log(`WebApp URL: ${webAppUrl}`);

function userInfoFromContext(ctx) {
  const from = ctx.from || {};
  return {
    userId: from.id || from.userId || (typeof ctx.from === "string" ? ctx.from : undefined),
    username: from.username || from.userName || from.name || from.nickName || from.nickname,
  };
}

function extractCommand(text) {
  const match = String(text || "").trim().match(/\/[a-zA-Z0-9_-]+(?:@[a-zA-Z0-9_-]+)?/);
  if (!match) return "";
  return match[0].split("@")[0];
}

function localeFromContext(ctx) {
  const value = ctx.chat?.language || ctx.from?.language || process.env.APP_LOCALE;
  return normalizeLocale(value);
}

function normalizeLocale(value) {
  const source = String(value || "").toLowerCase();
  return source.startsWith("zh") ? "zh-CN" : "en-US";
}

function text(locale, key) {
  return messages[locale]?.[key] || messages["en-US"][key] || key;
}

function startStaticServer() {
  const distRoot = fileURLToPath(new URL("../webapp/dist", import.meta.url));

  const server = createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
      const filePath = normalize(join(distRoot, decodeURIComponent(pathname)));
      const rel = relative(distRoot, filePath);

      if (rel.startsWith("..")) {
        sendStatus(res, 403, "Forbidden");
        return;
      }

      const info = await stat(filePath);
      if (!info.isFile()) {
        sendStatus(res, 404, "Not found");
        return;
      }

      res.writeHead(200, {
        "content-type": contentType(filePath),
        "cache-control": "no-store",
      });
      createReadStream(filePath).pipe(res);
    } catch (error) {
      const message = String(error?.code || error?.message || error);
      if (message.includes("ENOENT")) {
        sendStatus(res, 404, "Build not found. Run npm run build first.");
        return;
      }
      sendStatus(res, 404, "Not found");
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(staticPort, "0.0.0.0", () => {
      server.off("error", reject);
      console.log(`Static WebApp server listening on http://0.0.0.0:${staticPort}`);
      resolve(server);
    });
  });
}

function sendStatus(res, status, body) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(body);
}

function contentType(filePath) {
  switch (extname(filePath)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".mp4":
      return "video/mp4";
    case ".mp3":
      return "audio/mpeg";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}

function withMpsLaunchConfig(url) {
  const next = new URL(url);
  next.searchParams.set("mps_id", mpsLaunchConfig.id);
  next.searchParams.set("mps_version", mpsLaunchConfig.version);
  return next.toString();
}

function withLocale(url, locale) {
  const next = new URL(url);
  next.searchParams.set("lang", locale);
  return next.toString();
}

function localAddressHint() {
  return process.env.HOST || "127.0.0.1";
}

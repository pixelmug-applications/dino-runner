import { BubbleBot, InlineKeyboard } from "@jeejio-bubble/bot/sdk";
import PixelMugS1 from "@jeejio-bubble/bot/devices/pixelmug-s1";

const messages = {
  "zh-CN": {
    bindContent: "请先绑定 PixelMug，再开始恐龙跑酷。",
    bindButton: "绑定 PixelMug",
    addedIntro: "欢迎来到恐龙跑酷！先绑定 PixelMug，然后打开游戏。你可以轻触杯子，或在手机页面按下跳跃按钮来躲避障碍。最高分保存在设备上。",
    openButton: "打开恐龙跑酷",
    intro: "**恐龙跑酷**\n\n让小恐龙在 PixelMug 上奔跑。轻触杯子或按手机上的跳跃按钮，躲开障碍并挑战最高分。\n\n点击下方按钮开始。",
    commands: "可用命令：/bindDevice、/dinoRunner",
    commandBind: "绑定 PixelMug",
    commandDino: "打开恐龙跑酷",
  },
  "en-US": {
    bindContent: "Bind a PixelMug before playing Dino Runner.",
    bindButton: "Bind PixelMug",
    addedIntro: "Welcome to Dino Runner! Bind a PixelMug, then open the game. Tap the mug or press Jump on your phone to dodge obstacles. Your best score is saved on the device.",
    openButton: "Open Dino Runner",
    intro: "**Dino Runner**\n\nRun with a tiny dinosaur on PixelMug. Tap the mug or press Jump on your phone to dodge obstacles and beat your best score.\n\nTap below to start.",
    commands: "Commands: /bindDevice, /dinoRunner",
    commandBind: "Bind PixelMug",
    commandDino: "Open Dino Runner",
  },
};

const webAppUrl = new URL(requiredEnv("STUDIO_WEBAPP_URL"));
webAppUrl.searchParams.set("mps_id", requiredEnv("STUDIO_MPS_ID"));
webAppUrl.searchParams.set("mps_version", requiredEnv("STUDIO_MPS_VERSION"));

const bot = new BubbleBot(requiredEnv("BOT_TOKEN"), {
  apiBaseUrl: process.env.BOT_API_BASE_URL,
  webAppDeviceAccess: "any",
});
bot.registerDevices([new PixelMugS1()]);

bot.on("error", (ctx) => console.error("[dino-runner]", ctx.error || ctx));
bot.on("contact_added", (ctx) => sendAddedIntro(ctx));
bot.on("joined_group", (ctx) => sendAddedIntro(ctx, { mentionOnly: false }));

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

  if (["/dinoRunner", "/webapp", "/start"].includes(command)) {
    const url = new URL(webAppUrl);
    url.searchParams.set("lang", locale);
    await ctx.sendKeyboard(
      text(locale, "intro"),
      new InlineKeyboard().url(text(locale, "openButton"), url.toString()),
      { mentionOnly: ctx.chat?.type === "group" ? true : undefined },
    );
    return;
  }

  await ctx.sendText(text(locale, "commands"));
});

await bot.setCommands([
  {
    command: "bindDevice",
    description: messages["en-US"].commandBind,
    descTranslations: { "zh-CN": messages["zh-CN"].commandBind, en: messages["en-US"].commandBind },
  },
  {
    command: "dinoRunner",
    description: messages["en-US"].commandDino,
    descTranslations: { "zh-CN": messages["zh-CN"].commandDino, en: messages["en-US"].commandDino },
  },
]);

await bot.start();
console.log("Dino Runner bot is running.");

function sendAddedIntro(ctx, options = {}) {
  const locale = localeFromContext(ctx);
  return ctx.sendBindDevice({
    content: text(locale, "addedIntro"),
    actionButtonTitle: text(locale, "bindButton"),
    ...options,
  });
}

function localeFromContext(ctx) {
  const source = String(ctx.from?.language || ctx.chat?.language || process.env.APP_LOCALE || "").toLowerCase();
  return source.startsWith("zh") ? "zh-CN" : "en-US";
}

function extractCommand(value) {
  const match = String(value || "").trim().match(/\/[a-zA-Z0-9_-]+(?:@[a-zA-Z0-9_-]+)?/);
  return match ? match[0].split("@")[0] : "";
}

function text(locale, key) {
  return messages[locale]?.[key] || messages["en-US"][key] || key;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

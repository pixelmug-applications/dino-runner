const envName = normalizeEnv(process.env.BUBBLE_BOT_ENV);
const configModule = await import(`./config.${envName}.js`);

export const configEnv = envName;
export const token = process.env.BUBBLE_BOT_TOKEN || configModule.token || "";
const configuredApiBaseUrl = process.env.BUBBLE_API_BASE_URL || configModule.apiBaseUrl;
export const apiBaseUrl = configuredApiBaseUrl || undefined;

if (!token) {
  throw new Error(
    "Missing Bubble bot token. Set BUBBLE_BOT_TOKEN, or configure bot/config.dev.js or bot/config.pub.js."
  );
}

function normalizeEnv(value) {
  const text = String(value || "dev").toLowerCase();
  return text === "pub" || text === "prod" || text === "production" ? "pub" : "dev";
}

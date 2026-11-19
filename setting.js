const fs = require("fs");
const chalk = require('chalk');
const moment = require("moment-timezone");
const { loadEnv } = require("./function/env");

// Muat konfigurasi sensitif dari file .env
loadEnv();

// Veyra Pay QRIS Payment Gateway (https://pay.veyra.id)
global.veyraBaseUrl = process.env.VEYRA_BASE_URL || "https://pay.veyra.id";
global.apikeyVeyra = process.env.APIKEY_VEYRA || "APIKEY_VEYRA_KAMU";
global.veyraWdPin = process.env.VEYRA_WD_PIN || "";
global.veyraExpireMinutes = Number(process.env.VEYRA_EXPIRE_MINUTES || 15);

// Biaya admin tambahan bot (opsional, default 0 karena Veyra Pay sudah menambahkan kode unik otomatis)
global.qrisFeePercent = Number(process.env.QRIS_FEE_PERCENT || 0);
global.qrisFeeFixed = Number(process.env.QRIS_FEE_FIXED || 0);

// Opsional: Webhook Server Veyra Pay (ubah VEYRA_WEBHOOK_ENABLED=true di .env saat deploy VPS)
// Pastikan whitelist IP server Veyra Pay: 103.177.100.55
global.veyraWebhookEnabled = String(process.env.VEYRA_WEBHOOK_ENABLED || "false").toLowerCase() === "true";
global.veyraWebhookPort = Number(process.env.VEYRA_WEBHOOK_PORT || 3000);
global.veyraWebhookPath = process.env.VEYRA_WEBHOOK_PATH || "/veyra-webhook";
global.veyraWebhookSecret = process.env.VEYRA_WEBHOOK_SECRET || "";

// Force Subscribe (Wajib Join Channel & Opsional Grup)
global.FORCE_SUB_ENABLED = String(process.env.FORCE_SUB_ENABLED || "false").toLowerCase() === "true";
global.FORCE_SUB_CHANNEL_ENABLED = String(process.env.FORCE_SUB_CHANNEL_ENABLED || "true").toLowerCase() === "true";
global.FORCE_SUB_CHANNEL = process.env.FORCE_SUB_CHANNEL || "";
global.FORCE_SUB_CHANNEL_URL = process.env.FORCE_SUB_CHANNEL_URL || "";
global.FORCE_SUB_GROUP_ENABLED = String(process.env.FORCE_SUB_GROUP_ENABLED || "false").toLowerCase() === "true";
global.FORCE_SUB_GROUP = process.env.FORCE_SUB_GROUP || "";
global.FORCE_SUB_GROUP_URL = process.env.FORCE_SUB_GROUP_URL || "";

// Setting Bot
global.urlBot = process.env.URL_BOT || 't.me/username_bot_anda';
global.BOT_TOKEN = process.env.BOT_TOKEN || "YOUR_TELEGRAM_BOT_TOKEN";
global.BOT_NAME = process.env.BOT_NAME || "Hams Auto Order";
global.OWNER_ID = process.env.OWNER_ID || "1234567890";
global.OWNER_NAME = process.env.OWNER_NAME || "Hams - Offc";
global.OWNER_NUMBER = process.env.OWNER_NUMBER || "6285781549773";
global.OWNER = [`https://t.me/${(process.env.OWNER_USERNAME || "hamsoffc23").replace(/^@/, '')}`];
global.CHANNEL = process.env.CHANNEL || "https://t.me/hamstore_info";

// Images
global.thumbnail = "./options/image/thumbnail.jpg";

// Message
global.mess = {
  sukses: "Done🤗",
  admin: "Command ini hanya bisa digunakan oleh Admin Grup",
  botAdmin: "Bot Harus menjadi admin",
  owner: "Command ini hanya dapat digunakan oleh owner bot",
  prem: "Command ini khusus member premium",
  group: "Command ini hanya bisa digunakan di grup",
  private: "Command ini hanya bisa digunakan di Private Chat",
  wait: "⏳ Mohon tunggu sebentar...",
  error: {
    lv: "Link yang kamu berikan tidak valid",
    api: "Maaf terjadi kesalahan"
  }
};

let time = moment(new Date()).format('HH:mm:ss DD/MM/YYYY');
let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.greenBright(`[ ${BOT_NAME} ]  `) + time + chalk.cyanBright(` "${file}" Telah diupdate!`));
  delete require.cache[file];
  require(file);
});

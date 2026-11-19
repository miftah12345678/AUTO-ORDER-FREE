// function/env.js
// Zero-dependency .env file loader
const fs = require('fs');
const path = require('path');

function loadEnv(envPath) {
    const filePath = envPath || path.resolve(__dirname, '..', '.env');
    if (!fs.existsSync(filePath)) return {};

    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = {};

    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const eqIndex = line.indexOf('=');
        if (eqIndex === -1) continue;

        const key = line.slice(0, eqIndex).trim();
        let value = line.slice(eqIndex + 1).trim();

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        parsed[key] = value;
        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }

    return parsed;
}

module.exports = { loadEnv };

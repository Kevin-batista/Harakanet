const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ROOT = __dirname;
const ENV_FILE = path.join(ROOT, '.env.local');
const OUTPUT_FILE = path.join(ROOT, '.env.production.local');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const values = {};
  for (const arg of args) {
    const [key, ...rest] = arg.split('=');
    if (!key) continue;
    values[key] = rest.join('=');
  }
  return values;
};

const main = () => {
  const overrides = parseArgs();
  const envPath = fs.existsSync(ENV_FILE) ? ENV_FILE : null;
  const parsed = envPath ? dotenv.parse(fs.readFileSync(envPath)) : {};

  const env = {
    ...parsed,
    ...process.env,
    ...overrides,
  };

  const lines = Object.entries(env)
    .filter(([key]) => key && !key.startsWith('npm_'))
    .map(([key, value]) => `${key}=${String(value)}`)
    .sort();

  fs.writeFileSync(OUTPUT_FILE, `${lines.join('\n')}\n`);
  console.log(`Wrote ${lines.length} environment variables to ${OUTPUT_FILE}`);
};

main();

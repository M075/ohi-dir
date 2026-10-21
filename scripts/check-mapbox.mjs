// scripts/check-mapbox.mjs
//
// Diagnoses a dead Mapbox integration. Probes each API the app actually uses
// with the project's token and reports the HTTP status and Mapbox's own
// message for each.
//
//   node scripts/check-mapbox.mjs
//
// Override the token with a flag if the one in .env is not the broken one:
//   node scripts/check-mapbox.mjs --token=pk.eyJ...

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readTokenFromEnvFile() {
  let raw;
  try {
    raw = readFileSync(resolve(projectRoot, '.env'), 'utf8');
  } catch {
    return null;
  }
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*NEXT_PUBLIC_MAPBOX_TOKEN\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[1].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value) return value;
  }
  return null;
}

const flagToken = process.argv
  .find((arg) => arg.startsWith('--token='))
  ?.slice('--token='.length);

const token = flagToken || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || readTokenFromEnvFile();

if (!token) {
  console.error(
    'No token found. Set NEXT_PUBLIC_MAPBOX_TOKEN in .env, export it in the\n' +
    'shell, or pass --token=pk....'
  );
  process.exit(1);
}

console.log(`Token: ${token.slice(0, 12)}...${token.slice(-6)}`);
console.log(`Source: ${flagToken ? '--token flag' : process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? 'process.env' : '.env file'}`);
console.log('');

const probes = [
  {
    name: 'Token info',
    url: `https://api.mapbox.com/tokens/v2/?access_token=${token}`,
    expect: 200,
    tells: '401/403 here means the token itself is dead (revoked, suspended account, or URL-restricted).',
  },
  {
    name: 'Geocoding (address autocomplete)',
    url: `https://api.mapbox.com/geocoding/v5/mapbox.places/Johannesburg.json?access_token=${token}&limit=1`,
    expect: 200,
    tells: 'This is the exact call utils/addressAutocomplete.js makes.',
  },
  {
    name: 'Standard style (the map style)',
    url: `https://api.mapbox.com/styles/v1/mapbox/standard?access_token=${token}`,
    expect: 200,
    tells: 'The stores map loads mapbox://styles/mapbox/standard, which resolves to this.',
  },
  {
    name: 'Sprite (Standard style dependency)',
    url: `https://api.mapbox.com/v4/mapbox.standard-sprite/1.0.0/mapbox/light/0.0.0@2x.png?access_token=${token}`,
    expect: 200,
    tells: 'A 401 here means the token lacks sprite/tile read scopes.',
  },
  {
    name: 'Raster tile',
    url: `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/1.0.0/28.0473/-26.2041/5.png?access_token=${token}`,
    expect: 200,
    tells: 'Fails the same way as the vector tiles the Standard style uses.',
  },
];

function verdict(status) {
  if (status === 200) return 'OK';
  if (status === 401) return 'UNAUTHORIZED — token invalid, revoked, or URL-restricted to a domain you no longer serve';
  if (status === 402) return 'PAYMENT REQUIRED — account out of quota or billing method lapsed';
  if (status === 403) return 'FORBIDDEN — account suspended, or token lacks the required scope';
  if (status === 404) return 'NOT FOUND — wrong style/tile path (not a token problem)';
  if (status === 429) return 'RATE LIMITED';
  if (status === 0) return 'NO RESPONSE — DNS or network problem, not an auth problem';
  return `UNEXPECTED STATUS ${status}`;
}

let failures = 0;

for (const probe of probes) {
  let status = 0;
  let body = '';

  try {
    const response = await fetch(probe.url);
    status = response.status;
    const text = await response.text();
    body = text.length > 400 ? `${text.slice(0, 400)}...` : text;
  } catch (error) {
    body = String(error?.message || error);
  }

  const ok = status === probe.expect;
  if (!ok) failures += 1;

  console.log(`${ok ? 'PASS' : 'FAIL'}  ${probe.name}`);
  console.log(`      status: ${status} — ${verdict(status)}`);
  if (body) console.log(`      body:   ${body.replace(/\s+/g, ' ')}`);
  console.log(`      note:   ${probe.tells}`);
  console.log('');
}

console.log('---');
if (failures === 0) {
  console.log('All Mapbox APIs responded 200. The token is valid and reachable from');
  console.log('this machine — so an in-app failure is a build/env problem instead:');
  console.log('NEXT_PUBLIC_* values are inlined at build time, so a token missing from');
  console.log('the build produces a bundle with no token at all.');
  console.log('');
  console.log('Check in the browser: DevTools > Network > filter "mapbox.com".');
  console.log('  - No request to api.mapbox.com at all  -> token missing from the build.');
  console.log('  - A request that 401/403s              -> token rejected (see above).');
  console.log('  - A request that 200s                   -> the token is fine; look elsewhere.');
} else {
  console.log(`${failures} of ${probes.length} probes failed.`);
  console.log('');
  console.log('Likely causes, in order:');
  console.log('  1. Token URL-restricted to a domain you no longer serve.');
  console.log('     Mapbox checks the Origin/Referer, so http://localhost:3000 fails too.');
  console.log('     Fix: account.mapbox.com > Access tokens > your token > remove the');
  console.log('     restriction, or add your production domain and localhost.');
  console.log('  2. Token revoked or rotated in the Mapbox account.');
  console.log('     Fix: generate a new public token with scopes');
  console.log('     styles:read, fonts:read, datasets:read, tiles:read, geocoding.');
  console.log('  3. Account out of quota, or the billing method lapsed.');
  console.log('     Fix: check billing at account.mapbox.com.');
  console.log('');
  console.log('After rotating the token: put it in .env AND in the Vercel project env');
  console.log('vars, then redeploy — NEXT_PUBLIC_* is inlined at build time, so a');
  console.log('redeploy is required for the new value to reach the browser.');
}

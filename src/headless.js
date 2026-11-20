#!/usr/bin/env node
// CLI headless theo Test Contract v1.0:
// node src/headless.js --seed <int> --night 1 [--scenario f.json] [--inputs f.json] --ticks <int> --out f.jsonl [--snapshot-every 10]
// Mã thoát: 0 = xong; 2 = file inputs/scenario sai định dạng; 1 = lỗi khác (tham số sai, ...).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NIGHTS } from './sim/core.js';
import { runHeadless, validateInputs, validateScenario, FormatError } from './sim/run.js';

function fail(msg, code) {
  process.stderr.write(`headless: ${msg}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const known = new Set(['--seed', '--night', '--scenario', '--inputs', '--ticks', '--out', '--snapshot-every']);
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!known.has(key)) fail(`tham số không hợp lệ: ${key}`, 1);
    const val = argv[i + 1];
    if (val === undefined) fail(`thiếu giá trị cho ${key}`, 1);
    args[key.slice(2)] = val;
    i++;
  }
  return args;
}

function parseIntArg(args, name, { required = false, min = -Infinity, def } = {}) {
  if (args[name] === undefined) {
    if (required) fail(`thiếu --${name}`, 1);
    return def;
  }
  if (!/^-?\d+$/.test(args[name])) fail(`--${name} phải là số nguyên`, 1);
  const v = Number(args[name]);
  if (v < min) fail(`--${name} phải >= ${min}`, 1);
  return v;
}

function readJsonFile(path, label) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (e) {
    fail(`không đọc được file ${label}: ${path}`, 2);
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    fail(`file ${label} không phải JSON hợp lệ: ${e.message}`, 2);
  }
}

const args = parseArgs(process.argv.slice(2));
const seed = parseIntArg(args, 'seed', { required: true });
const night = parseIntArg(args, 'night', { required: true });
const ticks = parseIntArg(args, 'ticks', { required: true, min: 0 });
const snapshotEvery = parseIntArg(args, 'snapshot-every', { min: 1, def: 10 });
if (!args.out) fail('thiếu --out', 1);
if (!NIGHTS[night]) fail(`night ${night} chưa được hỗ trợ`, 1);

const here = dirname(fileURLToPath(import.meta.url));
const contract = JSON.parse(readFileSync(resolve(here, '..', 'game.contract.json'), 'utf8'));

let scenario = null;
let frames = [];
try {
  if (args.scenario) {
    scenario = validateScenario(readJsonFile(args.scenario, 'scenario'), NIGHTS[night].lanterns.map((l) => l.id));
  }
  if (args.inputs) frames = validateInputs(readJsonFile(args.inputs, 'inputs'));
} catch (e) {
  if (e instanceof FormatError) fail(e.message, 2);
  fail(e.message, 1);
}

let lines;
try {
  lines = runHeadless({ tuning: contract.tuning, seed, night, scenario, frames, ticks, snapshotEvery });
} catch (e) {
  fail(e.message, 1);
}

try {
  mkdirSync(dirname(resolve(args.out)), { recursive: true });
  writeFileSync(args.out, lines.join('\n') + '\n');
} catch (e) {
  fail(`không ghi được --out: ${e.message}`, 1);
}
process.exit(0);

#!/usr/bin/env node
/**
 * Script runner for sc4sap hook scripts.
 * Executes the specified ESM script with proper error handling.
 * Usage: node run.cjs <script-path> [args...]
 */
'use strict';

const { execFile } = require('child_process');
const path = require('path');

const scriptPath = process.argv[2];
if (!scriptPath) {
  process.exit(0);
}

const args = process.argv.slice(3);
const resolved = path.resolve(scriptPath);

const child = execFile('node', ['--experimental-vm-modules', resolved, ...args], {
  env: { ...process.env },
  timeout: 30000,
  maxBuffer: 1024 * 1024,
}, (error, stdout, stderr) => {
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
  if (error) {
    // Hook scripts should not block the user's workflow on failure
    // Log the error but exit cleanly
    if (process.env.SC4SAP_DEBUG) {
      console.error(`[sc4sap] Script error: ${error.message}`);
    }
  }
  process.exit(0);
});

// The hook payload arrives on this process's stdin, and the script reads it
// from its own. Without this pipe the child's stdin is a pipe nobody writes to
// or closes, so every script sat out its 5-second stdin timeout before doing
// anything — five seconds per hook, on every prompt, every tool call and every
// stop. Forwarding stdin, EOF included, is what lets the script read and go.
if (child.stdin) {
  process.stdin.on('error', () => {});
  child.stdin.on('error', () => {});
  process.stdin.pipe(child.stdin);
}

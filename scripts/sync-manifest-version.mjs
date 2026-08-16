#!/usr/bin/env node
// Run by package.json's "version" script during `npm version` — copies the
// just-bumped package.json version into manifest.json's own "version"
// field, so a Chrome Web Store upload always carries the same version
// number as the git tag/release. Whatever this script git-adds is folded
// into npm version's auto-created commit (see package.json).

import { readFileSync, writeFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8'));

// A surgical string replace, rather than JSON.parse + JSON.stringify the
// whole file back out — manifest.json hand-formats some arrays inline
// (e.g. "permissions": ["activeTab", ...]), which JSON.stringify would
// otherwise expand onto multiple lines, turning every version bump's
// auto-created commit into a noisy full-file reformat.
const manifestPath = 'manifest.json';
const manifestRaw = readFileSync(manifestPath, 'utf8');

// Matches manifest.json's own top-level "version" key, not "manifest_version"
// — the character before "version" there is "_", not the quote this pattern
// requires immediately before the literal text "version".
const versionLine = /^(\s*"version"\s*:\s*)"[^"]*"/m;
if (!versionLine.test(manifestRaw)) {
  throw new Error('manifest.json has no top-level "version" field to update');
}

writeFileSync(manifestPath, manifestRaw.replace(versionLine, (_, prefix) => `${prefix}"${version}"`));

console.log(`manifest.json version set to ${version}`);

// Turns the single-file build into an Artifact page body (the host adds doctype/html/head/body).
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist-artifact/index.html', 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta charset[^>]*>|<meta name="viewport"[^>]*>/g, '');
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
writeFileSync('dist-artifact/nyota.html', `${head.trim()}\n${body.trim()}\n`);
console.log('wrote dist-artifact/nyota.html', Math.round((head.length + body.length) / 1024), 'KB');

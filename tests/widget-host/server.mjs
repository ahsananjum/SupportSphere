import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const key = process.env.WIDGET_TEST_KEY;
const appOrigin = process.env.WIDGET_APP_ORIGIN;
const port = Number(process.env.WIDGET_HOST_PORT || 4177);
if (!/^wgt_[a-f0-9]{32}$/.test(key ?? '') || !appOrigin)
  throw new Error('Set WIDGET_TEST_KEY and WIDGET_APP_ORIGIN.');
const template = await readFile(
  new URL('./index.html', import.meta.url),
  'utf8',
);
const snippet = `<script async src="${new URL('/widget/loader.js', appOrigin)}" data-widget-key="${key}"></script>`;
createServer((_request, response) => {
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(template.replace('{{WIDGET_EMBED}}', snippet));
}).listen(port, () =>
  process.stdout.write(`External widget host ready on localhost:${port}\n`),
);

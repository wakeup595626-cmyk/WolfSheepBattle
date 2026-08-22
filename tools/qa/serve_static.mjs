import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(process.argv[2] ?? '.');
const port = Number(process.argv[3] ?? 7472);
const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mp3': 'audio/mpeg',
    '.png': 'image/png',
    '.ttf': 'font/ttf',
    '.wasm': 'application/wasm',
};

const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', `http://${request.headers.host}`).pathname);
    if (pathname === '/favicon.ico') {
        response.writeHead(204).end();
        return;
    }
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^[/\\]+/, '');
    const target = path.resolve(root, relative);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
    }
    fs.stat(target, (statError, stats) => {
        if (statError || !stats.isFile()) {
            response.writeHead(404).end('Not found');
            return;
        }
        response.setHeader('Content-Type', mimeTypes[path.extname(target).toLowerCase()]
            ?? 'application/octet-stream');
        fs.createReadStream(target)
            .on('error', () => response.writeHead(500).end('Read error'))
            .pipe(response);
    });
});

server.listen(port, '127.0.0.1', () => {
    console.log(`Serving ${root} at http://127.0.0.1:${port}`);
});

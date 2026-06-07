const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process'); 

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    transports: ['polling', 'websocket'] 
});

const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Wispbyte Web Terminal</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.1.0/css/xterm.css" />
            <script src="https://cdn.jsdelivr.net/npm/xterm@5.1.0/lib/xterm.js"></script>
            <script src="/socket.io/socket.io.js"></script>
            <style>body { background: #1a1a1a; margin: 10px; color: #fff; } #terminal { height: 95vh; }</style>
        </head>
        <body>
            <div id="terminal"></div>
            <script>
                const socket = io({ transports: ['polling', 'websocket'] });
                
                const term = new Terminal({ 
                    theme: { background: '#1a1a1a' }, 
                    cursorBlink: true,
                    disableStdin: false
                });
                term.open(document.getElementById('terminal'));
                term.focus();
                
                term.onData(data => {
                    socket.emit('input', data);
                });
                
                socket.on('output', data => {
                    term.write(data);
                });
                
                socket.on('connect', () => {
                    console.log('Connected to terminal server');
                });
            </script>
        </body>
        </html>
    `);
});

io.on('connection', (socket) => {
    let shell = null;

    // 启动 bash shell，正确配置 stdio
    shell = spawn('bash', [], {
        env: Object.assign({}, process.env, { 
            TERM: 'xterm-256color',
            PS1: '\\u@\\h:\\w$ '
        }),
        cwd: '/app',
        stdio: ['pipe', 'pipe', 'pipe']
    });

    shell.stdout.on('data', (data) => {
        socket.emit('output', data.toString());
    });

    shell.stderr.on('data', (data) => {
        socket.emit('output', data.toString());
    });

    socket.on('input', (data) => {
        if (shell && shell.stdin.writable) {
            shell.stdin.write(data);
        }
    });

    socket.on('disconnect', () => {
        if (shell) {
            shell.kill('SIGTERM');
        }
    });
    
    socket.on('error', (error) => {
        console.error('Socket error:', error);
        if (shell) {
            shell.kill('SIGTERM');
        }
    });
});

server.listen(port, '0.0.0.0', () => {
    console.log(`纯 Node.js 轻量终端已成功启动，正在监听端口：${port}`);
});

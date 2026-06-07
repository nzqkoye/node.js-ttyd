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
                const password = prompt("请输入访问密码:");
                const socket = io({ transports: ['polling', 'websocket'] });
                
                socket.emit('auth', password);

                socket.on('auth_result', (success) => {
                    if (!success) {
                        alert("密码错误！");
                        window.location.reload();
                        return;
                    }
                    const term = new Terminal({ theme: { background: '#1a1a1a' }, cursorBlink: true });
                    term.open(document.getElementById('terminal'));
                    
                    term.onData(data => socket.emit('input', data));
                    socket.on('output', data => term.write(data));
                });
            </script>
        </body>
        </html>
    `);
});

io.on('connection', (socket) => {
    let shell = null;

    socket.on('auth', (password) => {
        if (password !== '123456') {
            socket.emit('auth_result', false);
            return;
        }
        socket.emit('auth_result', true);

        shell = spawn('sh', [], {
            env: Object.assign({}, process.env, { TERM: 'xterm-256color' })
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
                shell.kill();
            }
        });
    });
});

server.listen(port, '0.0.0.0', () => {
    console.log(`纯 Node.js 轻量终端已成功启动，正在监听端口: ${port}`);
});

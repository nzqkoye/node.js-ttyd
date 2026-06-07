const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Web Terminal</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css" />
  <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js"></script>
  <script src="/socket.io/socket.io.js"></script>
  <style>
    body { background: #1a1a1a; margin: 0; padding: 10px; }
    #terminal { height: 95vh; }
    #status { 
      position: fixed; 
      top: 5px; 
      right: 10px; 
      background: #333; 
      color: #fff; 
      padding: 5px 10px; 
      border-radius: 4px; 
      font-size: 12px;
      z-index: 1000;
    }
    .connected { background: #28a745; }
    .disconnected { background: #dc3545; }
  </style>
</head>
<body>
  <div id="status" class="disconnected">Connecting...</div>
  <div id="terminal"></div>
  <script>
    const statusDiv = document.getElementById('status');
    
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10
    });

    const term = new Terminal({
      theme: { background: '#1a1a1a' },
      cursorBlink: true,
      disableStdin: false,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace'
    });
    
    term.open(document.getElementById('terminal'));
    
    // 强制聚焦
    setTimeout(() => {
      term.focus();
      console.log('Terminal focused');
    }, 100);

    // 点击终端时聚焦
    document.getElementById('terminal').addEventListener('click', () => {
      term.focus();
    });

    socket.on('connect', () => {
      statusDiv.textContent = 'Connected';
      statusDiv.className = 'connected';
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      statusDiv.textContent = 'Disconnected';
      statusDiv.className = 'disconnected';
      console.log('Socket disconnected');
    });

    socket.on('connect_error', (err) => {
      statusDiv.textContent = 'Connection Error: ' + err.message;
      statusDiv.className = 'disconnected';
      console.error('Connection error:', err);
    });

    socket.on('output', (data) => {
      term.write(data);
    });

    term.onData((data) => {
      console.log('Sending input:', JSON.stringify(data));
      socket.emit('input', data);
    });

    term.onKey((e) => {
      console.log('Key pressed:', e.key);
    });
  </script>
</body>
</html>
  `);
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  let shell = null;

  try {
    shell = spawn('bash', ['-i'], {
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        PS1: '\\u@\\h:\\w\\$ '
      },
      cwd: '/app',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    shell.stdout.on('data', (data) => {
      socket.emit('output', data.toString());
    });

    shell.stderr.on('data', (data) => {
      socket.emit('output', data.toString());
    });

    shell.on('error', (err) => {
      console.error('Shell error:', err);
      socket.emit('output', '\\r\\nShell error: ' + err.message + '\\r\\n');
    });

    shell.on('exit', (code) => {
      console.log('Shell exited:', code);
      socket.emit('output', '\\r\\n\\n[Process exited]\\r\\n');
    });

  } catch (err) {
    console.error('Failed to spawn shell:', err);
    socket.emit('output', '\\r\\nFailed to start shell: ' + err.message + '\\r\\n');
  }

  socket.on('input', (data) => {
    if (shell && shell.stdin.writable) {
      shell.stdin.write(data);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (shell) {
      shell.kill('SIGTERM');
    }
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Terminal server listening on port ${port}`);
});

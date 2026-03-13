const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const { handleMessages } = require('./main');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Browser Path Finder
function findBrowser() {
    const list = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        '/usr/bin/google-chrome-stable'
    ];
    for (const p of list) { if (fs.existsSync(p)) return p; }
    return null;
}

const waClient = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
        headless: true,
        executablePath: findBrowser(),
        args: ['--no-sandbox']
    }
});

// Logs for dashboard
const logs = [];
function addLog(e) { logs.push(e); if (logs.length > 50) logs.shift(); io.emit(e.ev, e.data); }

waClient.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    io.emit('status', { status: 'qr_ready', message: 'امسح الكود' });
});

waClient.on('ready', () => {
    console.log('✅ SABER BOT Connected!');
    io.emit('status', { status: 'ready', message: 'متصل 🟢', phone: waClient.info.wid.user });
});

// الربط مع main.js
waClient.on('message', async (msg) => {
    if (msg.from === 'status@broadcast' || msg.isGroupMsg) return;
    addLog({ ev: 'message', data: { from: msg.from.split('@')[0], text: msg.body, time: new Date().toLocaleTimeString() } });
    
    // هنا كنصيفطو الميساج لـ main.js باش يحللو
    await handleMessages(waClient, msg);
});

app.get('/', (req, res) => res.send('SABER BOT IS RUNNING'));

server.listen(3000, () => {
    console.log('🚀 Server started on port 3000');
    waClient.initialize();
});
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const http = require('http');
const { Server } = require('socket.io');
const { handleMessages } = require('./main'); // تأكد هاد الملف موجود حداه

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// إعدادات البوت والكروم (مناسبة لـ Linux/Back4App)
const waClient = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
        headless: true,
        executablePath: '/usr/bin/chromium', 
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--single-process'
        ]
    }
});

// التعامل مع الـ QR Code
waClient.on('qr', (qr) => {
    // كيطبع فـ Terminal (كيبقى احتياطي)
    qrcodeTerminal.generate(qr, {small: true});
    
    // كيحول الـ QR لصورة وكيصيفطها للمتصفح (Dashboard)
    qrcode.toDataURL(qr, (err, url) => {
        io.emit('qr_code', url);
        io.emit('status', 'Waiting for scan...');
    });
});

// ملي كيخدم البوت
waClient.on('ready', () => {
    console.log('✅ SABER BOT IS READY!');
    io.emit('ready', {
        message: 'Connected 🟢',
        user: waClient.info.pushname,
        number: waClient.info.wid.user
    });
});

// التعامل مع الميساجات
waClient.on('message', async (msg) => {
    // تجاهل ميساجات الستوري
    if (msg.from === 'status@broadcast') return;
    
    // صيفط الميساج لـ Dashboard باش تشوفو لايف
    io.emit('new_message', {
        from: msg.from.split('@')[0],
        body: msg.body,
        time: new Date().toLocaleTimeString()
    });

    // الخدمة ديال الذكاء الاصطناعي (من ملف main.js)
    await handleMessages(waClient, msg);
});

// الواجهة ديال التحكم (Dashboard)
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>SABER BOT | Control Panel</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script src="/socket.io/socket.io.js"></script>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0b141a; color: #e9edef; text-align: center; padding: 20px; }
            .container { max-width: 500px; margin: auto; background: #111b21; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
            h1 { color: #00a884; margin-bottom: 5px; }
            #status { font-size: 1.2em; margin: 20px 0; color: #ffd700; }
            #qr-container img { background: white; padding: 15px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,168,132,0.3); max-width: 100%; }
            .log-box { margin-top: 20px; text-align: left; background: #202c33; height: 150px; overflow-y: auto; padding: 10px; border-radius: 8px; font-size: 0.9em; border: 1px solid #374045; }
            .log-msg { border-bottom: 1px solid #2a3942; padding: 5px 0; }
            .time { color: #8696a0; font-size: 0.8em; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>SABER BOT AI</h1>
            <p>WhatsApp Automation System</p>
            <div id="status">Starting System... ⏳</div>
            <div id="qr-container">
                <img id="qrcode" src="" style="display:none;" />
            </div>
            <div class="log-box" id="logs">
                <div class="log-msg">System initialized... waiting for WhatsApp.</div>
            </div>
        </div>

        <script>
            const socket = io();
            const qrImg = document.getElementById('qrcode');
            const statusDiv = document.getElementById('status');
            const logsDiv = document.getElementById('logs');

            socket.on('qr_code', (url) => {
                qrImg.src = url;
                qrImg.style.display = 'inline-block';
                statusDiv.innerHTML = 'Scan the QR Code 📱';
                statusDiv.style.color = '#ffd700';
            });

            socket.on('ready', (data) => {
                qrImg.style.display = 'none';
                statusDiv.innerHTML = 'SABER BOT IS ONLINE 🟢';
                statusDiv.style.color = '#00ff00';
                addLog('Bot connected: ' + data.user);
            });

            socket.on('new_message', (msg) => {
                addLog('Message from ' + msg.from + ': ' + msg.body);
            });

            function addLog(text) {
                const div = document.createElement('div');
                div.className = 'log-msg';
                div.innerHTML = '<span class="time">[' + new Date().toLocaleTimeString() + ']</span> ' + text;
                logsDiv.prepend(div);
            }
        </script>
    </body>
    </html>
    `);
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('🚀 Server running on port ' + PORT);
    waClient.initialize().catch(err => console.error('Error initializing client:', err));
});
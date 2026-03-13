const { askGemini } = require('./ai/gemeni');
const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

async function handleMessages(client, msg) {
    const text = msg.body.trim();
    const user = msg.from;
    const chat = await msg.getChat();

    // 1. المينيو مزوق وبالتصويرة
    if (text.toLowerCase() === '.menu') {
        const menuMsg = `
╭━━━〔 🤖 *SABER BOT* 〕━━━╮
┃
┃  ✨ *مرحباً بيك أ عشيري*
┃
┃ 🛠 *الأوامر:*
┃ 📝 *.ai* + هضرتك (جاوب مباشر)
┃ 📸 صيفط صورة + *.ai* (تحليل بصري)
┃
┃ 💡 *سابر كيهضر بحال بنادم، جرب تعصبو!*
┃
╰━━━━━━━━━━━━━━━━━━━━╯`.trim();

        const imgPath = path.join(__dirname, 'img', '1.png');
        if (fs.existsSync(imgPath)) {
            const media = MessageMedia.fromFilePath(imgPath);
            await client.sendMessage(user, media, { caption: menuMsg });
        } else {
            await msg.reply(menuMsg);
        }
        return;
    }

    // 2. الجواب المباشر .ai (نص أو صورة)
    if (text.toLowerCase().startsWith('.ai')) {
        let query = text.replace(/^\.ai\s*/i, '').trim();
        
        // كيبين للبناادم بلي راه كيكتب (Typing...) باش يبان واقعي
        chat.sendStateTyping();

        if (msg.hasMedia) {
            const media = await msg.downloadMedia();
            const res = await askGemini(user, query, media.data);
            await msg.reply(res);
        } else {
            if (!query) return msg.reply("كتب شي حاجة، مالك ساكت؟ 😒");
            const res = await askGemini(user, query);
            await msg.reply(res);
        }
    }
}

module.exports = { handleMessages };
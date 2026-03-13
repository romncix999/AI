const OpenAI = require('openai');
const aiTools = require('../aifix/ai');

const ai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: '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',
    timeout: 60000, // زيدنا الوقت لـ 60 ثانية (دقيقة)
    maxRetries: 3,  // يعاود يحاول 3 المرات يلا وقع مشكل
});

async function askGemini(uid, msg, imageBase64 = null) {
    const history = aiTools.getHistory(uid);
    let userContent = [];

    if (imageBase64) {
        userContent.push({ type: "text", text: msg || "شوف هاد التصويرة وقوليا شنو كاين." });
        userContent.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } });
    } else {
        userContent = msg;
    }

    try {
        const r = await ai.chat.completions.create({
            model: 'google/gemini-2.0-flash-001',
            messages: [
                { role: 'system', content: aiTools.systemPrompt },
                ...history,
                { role: 'user', content: userContent }
            ],
        });

        const reply = r.choices[0].message.content;
        aiTools.saveToHistory(uid, 'user', msg || "[صورة]");
        aiTools.saveToHistory(uid, 'assistant', reply);
        return aiTools.format(reply);
    } catch (e) {
        // التعامل مع الخطأ باش ما يوقفش البوت
        if (e.name === 'OpenAIConnectionTimeoutError' || e.name === 'APIConnectionTimeoutError') {
            return "عشيري السيرفر ثقيل بزاف، عاود صيفط الميساج دابا نجاوبك! 😒";
        }
        console.error('Error Details:', e.message);
        return "هاد الساعة السيرفر عيان، جرب من بعد! 😒";
    }
}

module.exports = { askGemini };
// services/bale.service.js

const axios = require('axios');
const cron = require('node-cron');
const Price = require('../models/price.model');
require('dotenv').config();

class BaleService {
  constructor() {
    if (BaleService.instance) {
      return BaleService.instance;
    }

    this.token = process.env.BALE_TOKEN;

    // چند گروه
    this.chatIds = process.env.BALE_CHAT_IDS
      ? process.env.BALE_CHAT_IDS.split(',')
      : [];

    this.isRunning = false;

    // آخرین قیمت ارسال شده
    this.lastSentPriceId = null;

    // آخرین متن ارسال شده
    this.lastMessageHash = null;

    this.init();

    BaleService.instance = this;
  }

  init() {
    // هر 30 دقیقه
    cron.schedule('*/60 * * * *', async () => {
      await this.processSend();
    });

    console.log('✅ Bale service started');
  }

  formatNumber(num) {
    return Number(num || 0).toLocaleString('fa-IR');
  }

  getPersianDate(dateInput = new Date()) {
    const date = new Date(dateInput);

    return {
      date: date.toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),

      time: date.toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  }

  async getLatestPrice() {
    return await Price.findOne().sort({ createdAt: -1 });
  }

  generateHash(price) {
    return JSON.stringify({
      dollar: price.Dollar,
      gold18: price.YekGram18,
      ounce: price.OunceTala,
      updated: price.updatedAt
    });
  }

  async shouldSend(price) {
    if (!price) return false;

    const currentHash = this.generateHash(price);

    // جلوگیری از ارسال تکراری
    if (this.lastMessageHash === currentHash) {
      console.log('⏩ قیمت تغییری نکرده - پیام ارسال نشد');
      return false;
    }

    this.lastMessageHash = currentHash;

    return true;
  }

  buildMessage(price) {
    const { date, time } = this.getPersianDate(price.TimeRead);

    return `
🌕 گرم ۱۸ بجنورد:   ${this.formatNumber(price.YekGram18)}  تومان
🌕 مظنه نقدی:   ${this.formatNumber(price.KharidMotefaregheh18)}  تومان
🌕 انس جهانی طلا:   ${this.formatNumber(price.OunceTala)}  دلار
🌕 مظنه جهانی:   ${this.formatNumber(price.YekGram21)}  تومان

💵 دلار:   ${this.formatNumber(price.Dollar)}  تومان 🇺🇸

📌 آخرین بروزرسانی :   ${time} ⏱️
📌 ${date}

━━━◈❖✿❖◈━━━◈❖✿❖◈━━━

🏤 بازار طلا و نقره مظفر

☎️ شماره های تماس:
📲 ۰۵۸۴۴۴۴۳۳۵۵ | ۰۵۸۳۲۲۴۳۳۵۵

👤 آیدی پشتیبانی | @mozaffargold 🆔️
👤 آیدی پشتیبانی | @mozaffargold 🆔️

💎 کانال بازار طلا و نقره مظفر👇
🔗 [لینک کانال بله: مجتمع طلا و نقره مظفر](https://ble.ir/mozaffar_gold)
🔗 [لینک سایت: مجتمع طلا و نقره مظفر](https://mozafar.gold)
`;
  }

  async sendToChat(chatId, text, retry = 0) {
    try {
      const url = `https://tapi.bale.ai/bot${this.token}/sendMessage`;

      const response = await axios.post(
        url,
        {
          chat_id: chatId,
          text
        },
        {
          timeout: 15000
        }
      );

      console.log(`✅ پیام ارسال شد -> ${chatId}`);

      return response.data;

    } catch (error) {
      console.error(`❌ خطا در ارسال به ${chatId}`);

      if (retry < 3) {
        console.log(`🔄 تلاش مجدد (${retry + 1}/3)...`);

        await this.delay(3000);

        return this.sendToChat(chatId, text, retry + 1);
      }

      console.error(error.response?.data || error.message);

      return null;
    }
  }

  async sendToAllChats(text) {
    const results = [];

    for (const chatId of this.chatIds) {
      const result = await this.sendToChat(chatId.trim(), text);

      results.push({
        chatId,
        success: !!result
      });
    }

    return results;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async processSend() {
    if (this.isRunning) {
      console.log('⏳ ارسال قبلی هنوز تمام نشده');
      return;
    }

    this.isRunning = true;

    try {
      console.log('📡 بررسی قیمت جدید...');

      const latestPrice = await this.getLatestPrice();

      if (!latestPrice) {
        console.log('❌ قیمتی پیدا نشد');
        return;
      }

      const shouldSend = await this.shouldSend(latestPrice);

      if (!shouldSend) {
        return;
      }

      const message = this.buildMessage(latestPrice);

      console.log('📨 در حال ارسال پیام به بله...');

      const results = await this.sendToAllChats(message);

      console.log('✅ عملیات ارسال کامل شد');
      console.log(results);

    } catch (error) {
      console.error('❌ Bale Service Error:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  async manualSend() {
    return await this.processSend();
  }

  getStatus() {
    return {
      service: 'active',
      running: this.isRunning,
      chats: this.chatIds.length,
      lastMessageHash: this.lastMessageHash
    };
  }
}

const baleServiceInstance = new BaleService();

module.exports = baleServiceInstance;

// const MeliPayamak = require('node-melipayamak');
// require('dotenv').config();

// class SMSManager {
//   constructor(apikey, fromNumber) {
//     if (SMSManager.instance) {
//       return SMSManager.instance;
//     }
    
//     this.token = apikey;
//     this.from = fromNumber || "5000xxx"; // شماره فرستنده پیش‌فرض
//     this.sms = new MeliPayamak(this.token);
    
//     SMSManager.instance = this;
//   }

//   // متد داخلی برای ارسال پیامک
//   async _sendSMS(to, text) {
//     console.log('_sendSMS')
//     try {
//       const response = await this.sms.sendSimple({
//         from: this.from,
//         to: to.toString(),
//         text: text.toString().trim()
//       });
//       console.log('SMS sent:::', response);
//       return response;
//     } catch (error) {
//       console.error('Error sending SMS:', error);
//       throw error;
//     }
//   }

//   // ارسال کد تأیید
//   async sendVerificationCode(phone, code) {
//     const text = `کد تأیید شما: ${code}`;
//     return await this._sendSMS(phone, text);
//   }

//   // ارسال اعلان تراکنش
//   async sendTransactionAlert(phone, amount, type) {
//     const text = `اعلان تراکنش: ${type} به مبلغ ${amount} تومان`;
//     return await this._sendSMS(phone, text);
//   }

//   // ارسال پیام خوش‌آمدگویی
//   async sendWelcomeMessage(phone, name) {
//     const text = `${name} عزیز، به سرویس ما خوش آمدید!`;
//     return await this._sendSMS(phone, text);
//   }

//   // ارسال پیام رد شدن درخواست ارتقا سطح
//   async sendLevelUpRejection(phone, reason = "مدارک ناقص یا نامعتبر بود") {
//     const text = `درخواست ارتقا سطح شما رد شد.\nدلیل: ${reason}\nلطفاً مدارک صحیح را دوباره ارسال کنید.`;
//     return await this._sendSMS(phone, text);
//   }

// }

// // ایجاد نمونه اولیه با استفاده از متغیرهای محیطی
// const smsManager = new SMSManager(
//   process.env.SMS_APIKEY,
//   process.env.SMS_FROM_NUMBER
// );

// module.exports = smsManager;


const qs = require("querystring");
const https = require("https");

class SMSManager {
  constructor(username, password, fromNumber) {
    if (SMSManager.instance) {
      return SMSManager.instance;
    }
    
    this.username = username;
    this.password = password;
    this.from = fromNumber || "5000xxx"; // شماره فرستنده پیش‌فرض
    this.hostname = "console.melipayamak.com";
    
    SMSManager.instance = this;
  }

  // ارسال پیام خدماتی
  _sendSMS(patternId, to, args) {
    return new Promise((resolve, reject) => {
      console.log('this.pass', this.password);
      const data = JSON.stringify({
        bodyId: patternId,
        to: to.toString(),
        args
      })
      const options = {
        method: "POST",
        port: 443,
        hostname: this.hostname,
        path: `/api/send/shared/447eddf45ff24bc6a1e38ca392a4a933`,
        // path: `/api/send/shared/${this.password}`,
        headers: {
          "content-type": "application/json", 
          'Content-Length': data.length
        }
      };

      const req = https.request(options, res => {
        console.log('statusCode: ' + res.statusCode); 
        res.on('data', d => { process.stdout.write(d) }); 
      }); 
      // const req = https.request(options, (res) => {
      //   const chunks = [];
      //   res.on("data", (chunk) => chunks.push(chunk));
      //   res.on("end", () => {
      //     const body = Buffer.concat(chunks);
      //     resolve(body.toString());
      //   });
      // });

      req.on("error", reject);

      req.write(data);
      req.end();
    });
  }

  // متد داخلی برای ارسال پیامک
  // _sendSMS(to, text) {
  //   return new Promise((resolve, reject) => {
  //     console.log('this.pass', this.password);
  //     const data = JSON.stringify({
  //       from: this.from,
  //       to: to.toString(),
  //       text: text.toString().trim()
  //     })
  //     const options = {
  //       method: "POST",
  //       port: 443,
  //       hostname: this.hostname,
  //       path: `/api/send/simple/${this.password}`,
  //       headers: {
  //         "content-type": "application/json", 
  //         'Content-Length': data.length
  //       }
  //     };

  //     const req = https.request(options, res => {
  //       console.log('statusCode: ' + res.statusCode); 
  //       res.on('data', d => { process.stdout.write(d) }); 
  //     }); 
  //     // const req = https.request(options, (res) => {
  //     //   const chunks = [];
  //     //   res.on("data", (chunk) => chunks.push(chunk));
  //     //   res.on("end", () => {
  //     //     const body = Buffer.concat(chunks);
  //     //     resolve(body.toString());
  //     //   });
  //     // });

  //     req.on("error", reject);

  //     req.write(data);
  //     req.end();
  //   });
  // }

  // ارسال کد تأیید
  async sendVerificationCode(phone, code) {
    // const text = `کد تأیید شما: ${code}`;
    return await this._sendSMS(440070, phone, [code]);
  }

  // ارسال اعلان تراکنش
  async sendTransactionAlert(phone, amount, type) {
    const text = `اعلان تراکنش: ${type} به مبلغ ${amount} تومان`;
    // return await this._sendSMS(phone, text);
  }

  // ارسال پیام خوش‌آمدگویی
  async sendWelcomeMessage(phone, name) {
    const text = `${name} عزیز، به سرویس ما خوش آمدید!`;
    // return await this._sendSMS(phone, text);
  }

  // ارسال پیام رد شدن درخواست ارتقا سطح
  async sendLevelUpRejection(phone, reason = "مدارک ناقص یا نامعتبر بود") {
    const text = `درخواست ارتقا سطح شما رد شد.\nدلیل: ${reason}\nلطفاً مدارک صحیح را دوباره ارسال کنید.`;
    // return await this._sendSMS(phone, text);
  }

}

// ایجاد نمونه اولیه با استفاده از متغیرهای محیطی
const smsManager = new SMSManager(
  process.env.SMS_USERNAME,
  process.env.SMS_PASSWORD,
  process.env.SMS_FROM_NUMBER
);

module.exports = smsManager;
const axios = require('axios');
const Price = require('../models/price.model');
const cron = require('node-cron');

class PriceService {
  constructor() {
    if (PriceService.instance) {
      return PriceService.instance;
    }
    
    this.isRunning = false;
    this.latestPrice = null;
    this.init();
    this.loadLatestPrice();
    
    PriceService.instance = this;
  }

  async loadLatestPrice() {
    try {
      this.latestPrice = await Price.findOne().sort({ createdAt: -1 });
      console.log('Latest price loaded from database');
    } catch (error) {
      console.error('Error loading latest price:', error.message);
    }
  }

  init() {
    cron.schedule('* * * * *', () => {
      this.fetchAndSavePrices();
    });
  }

  async fetchAndSavePrices() {
    if (this.isRunning) {
      console.log('Previous request still running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      console.log('Fetching prices from API...');
      
      const response = await axios.get(
        'https://webservice.tgnsrv.ir/Pr/Get/mozafargold9902/m09982209902m',
        {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );

      let data = response.data;

      if (data.Error && process.env.FAKE_DATA) {
        data = {
          "SekehRob": 35100, "SekehNim": 61000, "SekehTamam": 111600, 
          "SekehEmam": 117000, "YekGram18": 11263000, "KharidMotefaregheh18": 11038000, 
          "TavizMotefaregheh18": 11113000, "YekGram20": 12510000, "SekehGerami": 17000, 
          "YekGram21": 13140000, "Dollar": 114400, "Euro": 130770, "Derham": 31100, 
          "OunceTala": 4064, "TimeRead": "2025/11/24 04:24:2"
        };
      }

      const priceData = {
        ...data,
        TimeRead: new Date(data.TimeRead.replace(/(\d{4})\/(\d{2})\/(\d{2}) (\d{2}:\d{2}:\d{2})/, '$1-$2-$3T$4'))
      };

      const savedPrice = await Price.create(priceData);
      this.latestPrice = savedPrice;

      console.log(`Prices saved successfully at ${new Date().toISOString()}`);
      console.log(`Last update time: ${data.TimeRead}`);
      
      return savedPrice;

    } catch (error) {
      console.error('Error fetching or saving prices:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      return null;
    } finally {
      this.isRunning = false;
    }
  }

  async getLatestPrices() {
    if (this.latestPrice) {
      return this.latestPrice;
    }
    
    return await Price.findOne().sort({ createdAt: -1 });
  }

  async getPriceHistory(startDate, endDate) {
    const query = {};
    
    if (startDate && endDate) {
      query.TimeRead = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    return await Price.find(query).sort({ TimeRead: 1 });
  }

  async startManualFetch() {
    return await this.fetchAndSavePrices();
  }

  getServiceStatus() {
    return {
      isRunning: this.isRunning,
      lastPrice: this.latestPrice ? this.latestPrice.TimeRead : null,
      service: 'active'
    };
  }
}

// حذف Object.freeze()
const priceServiceInstance = new PriceService();
module.exports = priceServiceInstance;
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Explicitly log what we are trying to use
// console.log('Env MONGODB_URI:', process.env.MONGODB_URI);

// console.log('Env MONGODB_URI:', process.env.MONGODB_URI);

const MONGODB_URI = 'mongodb://localhost:27017/gold';
console.log('Connecting to:', MONGODB_URI);

async function fixOtpIndex() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
    
    // List Databases
    const admin = new mongoose.mongo.Admin(mongoose.connection.db);
    const dbInfo = await admin.listDatabases();
    console.log('Available Databases:', dbInfo.databases.map(d => d.name));

    // Scan all databases
    for (const db of dbInfo.databases) {
       console.log(`Checking database: ${db.name}`);
       const targetDb = mongoose.connection.useDb(db.name);
       const collections = await targetDb.db.listCollections().toArray();
       const hasUsers = collections.some(c => c.name === 'users');
       
       if (hasUsers) {
         console.log(`FOUND 'users' collection in database: ${db.name}`);
         const collection = targetDb.collection('users');
         const indexes = await collection.indexes();
         console.log(`Indexes in ${db.name}.users:`, indexes.map(i => i.name));
         
         const indexName = 'otp.expiresAt_1';
         if (indexes.find(i => i.name === indexName)) {
           console.log(`Found target index ${indexName} in ${db.name}, dropping it...`);
           await collection.dropIndex(indexName);
           console.log(`Successfully dropped index: ${indexName} in ${db.name}`);
         }
       }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

fixOtpIndex();

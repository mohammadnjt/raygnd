const mongoose = require("mongoose");
const Ang = require("./models/ang.model");

async function fix() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/rayg');
    console.log("Connected to DB");
    
    try {
      await mongoose.connection.collection('angs').dropIndex("code_1");
      console.log("Dropped old unique code index");
    } catch(e) {
      console.log("Index code_1 not found or already dropped.");
    }

    try {
      await Ang.syncIndexes();
      console.log("Synced new indexes");
    } catch(e) {
      console.log("Error syncing indexes:", e.message);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}
fix();

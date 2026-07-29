const mongoose = require("mongoose");
const Ang = require("./models/ang.model");

async function fix() {
  if (mongoose.connection.readyState !== 1) return;
  try {
    await mongoose.connection.collection('angs').dropIndex("code_1");
    console.log("Dropped old code_1 index");
  } catch (e) {
    // ignore
  }
}
module.exports = fix;

const mongoose = require("mongoose");
const Ang = require("./models/ang.model");

async function check() {
  await mongoose.connect('mongodb://127.0.0.1:27017/rayg');
  const count = await Ang.countDocuments({ code: "26007" });
  console.log("Count in DB for 26007:", count);
  const angs = await Ang.find({ code: "26007" }).lean();
  console.log(angs.map(a => a.labName));
  await mongoose.disconnect();
}
check();

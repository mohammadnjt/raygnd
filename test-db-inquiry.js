const mongoose = require("mongoose");
const Ang = require("./models/ang.model");

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/rayg');
  const code = "26007";
  const newAng = {
    code,
    labName: "تست آزمایشگاه 1",
    purity: "740"
  };
  const newAng2 = {
    code,
    labName: "تست آزمایشگاه 2",
    purity: "750"
  };
  await Ang.updateOne(
     { code, labName: newAng.labName, purity: newAng.purity },
     { $set: newAng },
     { upsert: true }
  );
  await Ang.updateOne(
     { code, labName: newAng2.labName, purity: newAng2.purity },
     { $set: newAng2 },
     { upsert: true }
  );
  const angs = await Ang.find({ code });
  console.log("Angs with code 26007:", angs.map(a => a.labName));
  await mongoose.disconnect();
}
test();

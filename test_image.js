const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const sharp = require('sharp');

async function run() {
  // create a real png
  await sharp({
    create: { width: 10, height: 10, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } }
  }).png().toFile('red.png');

  const form = new FormData();
  form.append('file', fs.createReadStream('red.png'));

  try {
    const res = await axios.post('http://localhost:3000/api/upload?type=profile', form, {
      headers: form.getHeaders()
    });
    console.log(res.data);
    
    const getRes = await axios.get('http://localhost:3000' + res.data.data.path);
    console.log("GET success:", getRes.status);
  } catch (err) {
    if (err.response) {
      console.log(err.response.status, err.response.data);
    } else console.log(err.message);
  }
}
run();

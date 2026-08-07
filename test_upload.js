const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

async function testUpload() {
  const form = new FormData();
  fs.writeFileSync('test.png', 'fake image data');
  form.append('file', fs.createReadStream('test.png'));
  
  try {
    const res = await axios.post('http://localhost:3000/api/upload?type=profile', form, {
      headers: form.getHeaders(),
    });
    console.log("Upload Success:", res.data);
    
    // Now try to GET it
    const fileUrl = 'http://localhost:3000' + res.data.data.path;
    console.log("Fetching:", fileUrl);
    
    const getRes = await axios.get(fileUrl);
    console.log("GET Success:", getRes.status);
  } catch (err) {
    if (err.response) {
      console.log("Error status:", err.response.status);
      console.log("Error data:", err.response.data);
    } else {
      console.log("Error:", err.message);
    }
  }
}

testUpload();

const axios = require("axios");
const FormData = require("form-data");
const { JSDOM } = require("jsdom");

async function run() {
    const form = new FormData();
    form.append("code", "26007");
    form.append("submit", "");
    try {
        const response = await axios.post("https://msanjesh.com/report/index", form, { headers: form.getHeaders() });
        console.log(response.data);
    } catch (e) {
        console.error(e.message);
    }
}
run();

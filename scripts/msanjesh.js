const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const mammoth = require("mammoth");
const { JSDOM } = require("jsdom");

async function fetchFromMSanjesh(code) {
  try {
    const form = new FormData();
    form.append("code", code);
    form.append("submit", "");

    const htmlResponse = await axios.post(
      "https://msanjesh.com/report/index",
      form,
      { headers: form.getHeaders() }
    );

    const html = htmlResponse.data;
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const rows = [...document.querySelectorAll(".row")];

    const tableData = rows.map((row) => {
      const cells = [...row.querySelectorAll(".cell")];
      return {
        customer: cells[0].textContent.trim(),
        result: cells[1].textContent.trim(),
        center: cells[2].textContent.trim(),
        receipt: cells[3].textContent.trim()
      };
    });

    let docText = null;

    const docLink = [...document.querySelectorAll("a")]
      .map((a) => a.href)
      .find((h) => h.endsWith(".doc") || h.endsWith(".docx"));

    if (docLink) {
      const docBuffer = await axios.get(docLink, { responseType: "arraybuffer" });
      fs.writeFileSync("./report.doc", docBuffer.data);

      const extract = await mammoth.extractRawText({ path: "./report.doc" });
      docText = extract.value;
    }

    return {
      success: true,
      htmlData: tableData,
      docText
    };

  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = fetchFromMSanjesh;

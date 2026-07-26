const TeraboxUploader = require("terabox-upload-tool");

const credentials = {
  ndus: "YqZLbFx5eHuilbKlhMpNieh8gJqiEJQ4BamHBSim", //Required: Get this from your session (See guide below)
  appId: "250528", //Required: Get this from your session (See guide below)
  uploadId: "N1-ODkuMjUxLjkuMjMwOjE3NjQ3NjYwMzA6ODk2NTc5NzMxMTM0MzYyNjIwMQ==", //Required: Get this from your session (See guide below)
//   uploadId: "P1-MTAuMjUyLjcxLjQ1OjE3NjQ3NjMwNDY6ODk2NDk5NjI1OTI4NDY2NDUxMg==", //Required: Get this from your session (See guide below)
  jsToken: "AC4B9B51EAF8BF1BA8183B45AF83262ECE91883330934CDE57A8F8B9CFAF2D2E7B0D556B89132ABA01D6619D75532EDD", //Required: Get this from your session (See guide below)
  browserId: "gQTsmuVgJ9m7kjKMyad8jBCAeeOCOXU9UBgemJbM9LxNFqxhKKawuR8sGc8=", //Required: Get this from your session (See guide below)
};

const uploader = new TeraboxUploader(credentials);

module.exports = uploader;
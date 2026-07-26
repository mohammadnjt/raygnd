const express = require('express');
const router = express.Router();
const apiController = require('../controllers/api.controller');
const upload = require('../middleware/upload.middlware');

// Handle single file upload for op=m_upload
router.all('/upload', upload.single('ufile'), apiController.handleOperation);

// Route all op requests (GET, POST, etc.)
router.all('/', upload.single('ufile'), apiController.handleOperation);
router.all('/:op', upload.single('ufile'), apiController.handleOperation);

module.exports = router;

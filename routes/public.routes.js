const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');
const apiController = require('../controllers/api.controller');
const upload = require('../middleware/upload.middlware');

// Legacy report route
router.get('/report', publicController.report);

// Catch-all operations handler (handles GET & POST with op param or op route)
router.all('/', upload.single('ufile'), apiController.handleOperation);
router.all('/:op', upload.single('ufile'), apiController.handleOperation);

module.exports = router;

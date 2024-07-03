const express = require('express');
const multer = require('multer');
const csvConverter = require('./controllers/csvConverter');
const { Pool } = require('pg');
require('dotenv').config('.env');

const app = express();

const upload = multer({ dest: process.env.UPLOAD_DIR });


app.post('/api/convert-csv', upload.single('file'), csvConverter.convertCsvToJson);

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
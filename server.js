const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      return cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
    cb(null, true);
  }
});

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'kunal@123',
  database: 'btl_portal'
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    process.exit(1);
  }
  console.log('✅ Connected to MySQL database');
});

app.use(express.static('public'));

const requiredColumns = [
  'State',
  'Zone',
  'Dealer Name',
  'Dealer SAP Code',
  'Element',
  'UOM',
  'Attribute',
  'Date of Execution'
];

app.post('/upload', upload.single('excelFile'), async (req, res) => {
  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (!data.length) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Uploaded Excel file is empty or invalid.' });
    }

    const headers = Object.keys(data[0]);
    const missing = requiredColumns.filter(col => !headers.includes(col));
    if (missing.length > 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: `Missing required columns: ${missing.join(', ')}` });
    }

    const errors = [];
    const rowsToInsert = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const elementName = row['Element']?.trim();
      const attributeName = row['Attribute']?.trim();
      const uom = row['UOM']?.trim();

      const [elementResult] = await db.promise().query('SELECT id FROM Elements WHERE element_name = ?', [elementName]);
      if (!elementResult.length) {
        errors.push(`Row ${i + 2}: Invalid Element '${elementName}'`);
        continue;
      }

      const elementId = elementResult[0].id;

      let attributeId = null;
      if (attributeName) {
        const [attributeResult] = await db.promise().query('SELECT id FROM Attributes WHERE attribute_name = ? AND element_id = ?', [attributeName, elementId]);
        if (!attributeResult.length) {
          errors.push(`Row ${i + 2}: Invalid Attribute '${attributeName}' for Element '${elementName}'`);
          continue;
        }
        attributeId = attributeResult[0].id;
      }

      const [uomResult] = await db.promise().query('SELECT uom FROM UOMs WHERE element_id = ?', [elementId]);
      if (!uomResult.length || uomResult[0].uom !== uom) {
        errors.push(`Row ${i + 2}: Invalid UOM '${uom}' for Element '${elementName}'. Expected '${uomResult[0]?.uom || 'Unknown'}'`);
        continue;
      }

      rowsToInsert.push([
        row['State'],
        row['Zone'],
        row['Dealer Name'],
        row['Dealer SAP Code'],
        elementId,
        attributeId,
        uom,
        row['Date of Execution']
      ]);
    }

    if (errors.length > 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    for (const values of rowsToInsert) {
      await db.promise().query(
        'INSERT INTO DealerMarketingExecution (state, zone, dealer_name, dealer_sap_code, element_id, attribute_id, uom, date_of_execution) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        values
      );
    }

    fs.unlinkSync(req.file.path);
    res.json({ message: '✅ File uploaded and all data inserted successfully.' });

  } catch (err) {
    console.error('❌ Error during upload:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: '❌ Error processing the file.' });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static('public'));

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('public/annotated')) fs.mkdirSync('public/annotated');

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
    console.error('❌ Database connection failed:', err.stack);
    process.exit(1);
  }
  console.log('✅ Connected to MySQL database');
});

const requiredColumns = [
  'State', 'Zone', 'Dealer Name', 'Dealer SAP Code',
  'Element', 'UOM', 'Attribute', 'Date of Execution'
];

// 🔁 Convert Excel serial date to MySQL-compatible format
function excelDateToString(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

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

    const annotatedData = [];
    const rowsToInsert = [];
    let hasErrors = false;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      let error = '';
      let suggestion = '';

      const elementName = row['Element']?.trim();
      const attributeName = row['Attribute']?.trim();
      const uom = row['UOM']?.trim();
      const formattedDate = excelDateToString(row['Date of Execution']);

      const [elementResult] = await db.promise().query(
        'SELECT id FROM Elements WHERE element_name = ?',
        [elementName]
      );

      if (!elementResult.length) {
        error = `Invalid Element '${elementName}'`;
        suggestion = `Ensure '${elementName}' exists in Elements table`;
      }

      let elementId = elementResult?.[0]?.id || null;
      let attributeId = null;

      if (!error && attributeName) {
        const [attributeResult] = await db.promise().query(
          'SELECT id FROM Attributes WHERE attribute_name = ? AND element_id = ?',
          [attributeName, elementId]
        );
        if (!attributeResult.length) {
          error = `Invalid Attribute '${attributeName}' for '${elementName}'`;
          suggestion = `Ensure '${attributeName}' exists for element '${elementName}'`;
        } else {
          attributeId = attributeResult[0].id;
        }
      }

      if (!error) {
        const [uomResult] = await db.promise().query(
          'SELECT uom FROM UOMs WHERE element_id = ?',
          [elementId]
        );
        if (!uomResult.length || uomResult[0].uom !== uom) {
          error = `Invalid UOM '${uom}' for '${elementName}'`;
          suggestion = `Expected UOM: '${uomResult[0]?.uom || 'Unknown'}'`;
        }
      }

      // 🆕 Use converted date in the returned Excel as well
      const annotatedRow = {
        ...row,
        'Date of Execution': formattedDate,
        Error: error,
        Suggestion: suggestion
      };
      annotatedData.push(annotatedRow);

      if (!error) {
        rowsToInsert.push([
          row['State'],
          row['Zone'],
          row['Dealer Name'],
          row['Dealer SAP Code'],
          elementId,
          attributeId,
          uom,
          formattedDate
        ]);
      } else {
        hasErrors = true;
      }
    }

    // Write annotated Excel file
    const annotatedSheet = xlsx.utils.json_to_sheet(annotatedData);
    const newWorkbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(newWorkbook, annotatedSheet, 'Annotated');

    const annotatedFileName = `annotated_${Date.now()}.xlsx`;
    const annotatedFilePath = path.join(__dirname, 'public', 'annotated', annotatedFileName);
    xlsx.writeFile(newWorkbook, annotatedFilePath);

    // Clean uploaded temp file
    fs.unlinkSync(req.file.path);

    if (hasErrors) {
      return res.status(400).json({
        message: '❌ Upload failed. Errors found. Download annotated file for details.',
        downloadUrl: `/annotated/${annotatedFileName}`
      });
    }

    // If no errors, insert all into DB
    for (const values of rowsToInsert) {
      await db.promise().query(
        `INSERT INTO DealerMarketingExecution 
          (state, zone, dealer_name, dealer_sap_code, element_id, attribute_id, uom, date_of_execution) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        values
      );
    }

    return res.json({
      message: '✅ Upload successful. All rows inserted.',
      downloadUrl: `/annotated/${annotatedFileName}`
    });

  } catch (err) {
    console.error('❌ Server Error:', err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ message: '❌ Error processing the file.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

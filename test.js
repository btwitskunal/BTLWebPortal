const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'kunal@123',
  database: 'btl_portal'
});

db.connect((err) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to MySQL database successfully');

  // Insert test record into DealerMarketingExecution
  const sampleData = {
    state: 'Test State',
    zone: 'Test Zone',
    dealer_name: 'Test Dealer',
    dealer_sap_code: 'T123',
    element_id: 1,  // Make sure this ID exists
    attribute_id: 1, // Make sure this ID exists
    uom: 'Sqft',
    date_of_execution: '2025-06-20'
  };

  const query = `INSERT INTO DealerMarketingExecution 
    (state, zone, dealer_name, dealer_sap_code, element_id, attribute_id, uom, date_of_execution)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(query, [
    sampleData.state,
    sampleData.zone,
    sampleData.dealer_name,
    sampleData.dealer_sap_code,
    sampleData.element_id,
    sampleData.attribute_id,
    sampleData.uom,
    sampleData.date_of_execution
  ], (err, result) => {
    if (err) {
      console.error('❌ Insert failed:', err.message);
    } else {
      console.log('✅ Test data inserted successfully with ID:', result.insertId);
    }
    db.end();
  });
});
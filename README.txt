Web Portal for Excel Upload and Validation

Features:
- Upload .xlsx files via a web interface
- Validate required columns: Dealer Name, Activity Type
- Insert validated data into MySQL database
- Schema includes Elements, Attributes, UOMs, DealerMarketingExecution
- Error handling and security measures included

Frontend:
- index.html
- styles.css
- script.js

Backend:
- server.js (Node.js + Express + Multer + xlsx)

Database:
- schema.sql

Run Instructions:
1. Setup MySQL and import schema.sql
2. Run `npm install express multer xlsx mysql2`
3. Start server with `node server.js`
4. Open index.html in browser

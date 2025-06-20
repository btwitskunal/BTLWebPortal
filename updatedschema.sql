
-- Drop existing tables if they exist (optional for clean start)
DROP TABLE IF EXISTS DealerMarketingExecution, Attributes, UOMs, Elements;

-- 1. Elements Table
CREATE TABLE Elements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    element_name VARCHAR(100) NOT NULL UNIQUE
);

-- 2. Attributes Table
CREATE TABLE Attributes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    element_id INT NOT NULL,
    attribute_name VARCHAR(100) NOT NULL,
    FOREIGN KEY (element_id) REFERENCES Elements(id) ON DELETE CASCADE
);

-- 3. UOMs Table
CREATE TABLE UOMs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    element_id INT NOT NULL,
    uom VARCHAR(50) NOT NULL,
    FOREIGN KEY (element_id) REFERENCES Elements(id) ON DELETE CASCADE
);

-- 4. Main Upload Table
CREATE TABLE DealerMarketingExecution (
    id INT AUTO_INCREMENT PRIMARY KEY,
    state VARCHAR(100),
    zone VARCHAR(100),
    dealer_name VARCHAR(255),
    dealer_sap_code VARCHAR(50),
    element_id INT,
    attribute_id INT,
    uom VARCHAR(50),
    date_of_execution DATE,
    FOREIGN KEY (element_id) REFERENCES Elements(id),
    FOREIGN KEY (attribute_id) REFERENCES Attributes(id)
);

-- Seed Data
INSERT INTO Elements (element_name) VALUES
('Shop Sign'),
('Shop Painting'),
('In Shop Branding'),
('POP / Give Away'),
('Contractor Meet'),
('Van Activity'),
('Other Marketing Activity');

INSERT INTO Attributes (element_id, attribute_name) VALUES
(1, 'GSB'), (1, 'NLB'), (1, 'ACP'), (1, 'Shop Hoarding'),
(4, 'Cap'), (4, 'Key Chain'), (4, 'Pad'), (4, 'Pen'), (4, 'Other');

INSERT INTO UOMs (element_id, uom) VALUES
(1, 'Sqft'),
(2, 'Sqft'),
(3, 'Sqft'),
(4, 'No'),
(5, 'No'),
(6, 'No'),
(7, 'No');

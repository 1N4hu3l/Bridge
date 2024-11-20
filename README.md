Data Base:

USE bridge;
create table users(
user_id INT auto_increment primary key,
user varchar(50) not null,
name varchar(100) not null,
email varchar(100) not null,
address varchar(155) not null,
rol varchar(50) not null,
pass varchar(255) not null
);

CREATE TABLE budgets (
    budget_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    vehicle_make VARCHAR(50) NOT NULL,
    vehicle_model VARCHAR(50) NOT NULL,
    license_plate VARCHAR(20) NOT NULL,
    owner_name VARCHAR(100) NOT NULL,
    owner_surname VARCHAR(100) NOT NULL,
    owner_dni VARCHAR(20) NOT NULL,
    owner_phone VARCHAR(20) NOT NULL,
    insurance_company_id INT NOT NULL,
    repair_parts VARCHAR(255) NOT NULL, -- lista de partes a reparar
    work_description TEXT,
    work_value INT NOT NULL,
    start_date DATE,
    end_date DATE,
    before_photos LONGBLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (insurance_company_id) REFERENCES users(user_id)
);

CREATE TABLE budget_pdfs (
    pdf_id INT AUTO_INCREMENT PRIMARY KEY,
    budget_id INT NOT NULL,
    pdf_data LONGBLOB NOT NULL, -- Almacenará el PDF en binario
    FOREIGN KEY (budget_id) REFERENCES budgets(budget_id) ON DELETE CASCADE
);

CREATE TABLE work_order (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    budget_id INT NOT NULL,
    user_id INT NOT NULL,
    chassis_number VARCHAR(255) NOT NULL,  
    year_car INT NOT NULL,  
    color VARCHAR(50),
    door_count varchar(10),
    air_conditioning ENUM('si', 'no') NOT NULL,  
    status ENUM('en proceso', 'pendiente', 'finalizada', 'rechazada') DEFAULT 'en proceso',  
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (budget_id) REFERENCES budgets(budget_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    completion_date DATE, 
	completed_photos LONGBLOB,  -- Fotos del vehículo terminado
	signed_pdf LONGBLOB,  -- PDF firmado por el cliente
	additional_docs LONGBLOB -- Documentación adicional
);


SELECT * FROM users;
SELECT * FROM budgets;
SELECT * FROM budget_pdfs;
SELECT * FROM work_order;

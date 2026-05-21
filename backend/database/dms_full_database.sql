DROP DATABASE IF EXISTS dentist_management;
CREATE DATABASE dentist_management;
USE dentist_management;


CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(120) NOT NULL UNIQUE,
  role ENUM('OWNER', 'STAFF', 'CUSTOMER') NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE staff_permissions (
  permission_id INT AUTO_INCREMENT PRIMARY KEY,
  staff_user_id INT NOT NULL UNIQUE,
  can_manage_billing BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_reports BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_staff_permissions_user
    FOREIGN KEY (staff_user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE clinic (
  clinic_id INT AUTO_INCREMENT PRIMARY KEY,
  clinic_name VARCHAR(150) NOT NULL,
  address VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(120),
  whatsapp_number VARCHAR(30) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clinic_timings (
  timing_id INT AUTO_INCREMENT PRIMARY KEY,
  clinic_id INT NOT NULL,
  day_of_week ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL,
  opening_time TIME NOT NULL,
  closing_time TIME NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_clinic_day UNIQUE (clinic_id, day_of_week),
  CONSTRAINT chk_clinic_time CHECK (opening_time < closing_time),
  CONSTRAINT fk_clinic_timings_clinic
    FOREIGN KEY (clinic_id)
    REFERENCES clinic(clinic_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE patients (
  patient_id INT AUTO_INCREMENT PRIMARY KEY,
  patient_code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(120),
  gender ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
  date_of_birth DATE,
  address VARCHAR(255),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_patient_phone CHECK (LENGTH(phone) >= 7)
);

CREATE TABLE patient_medical_history (
  history_id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL UNIQUE,
  allergies TEXT,
  current_medications TEXT,
  medical_notes TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_history_patient
    FOREIGN KEY (patient_id)
    REFERENCES patients(patient_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE TABLE dentists (
  dentist_id INT AUTO_INCREMENT PRIMARY KEY,
  dentist_code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(120),
  specialization VARCHAR(120) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE appointments (
  appointment_id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_code VARCHAR(20) NOT NULL UNIQUE,
  patient_id INT NOT NULL,
  dentist_id INT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status ENUM('BOOKED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'BOOKED',
  problem_description TEXT,
  created_by_user_id INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_appointments_patient
    FOREIGN KEY (patient_id)
    REFERENCES patients(patient_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_appointments_dentist
    FOREIGN KEY (dentist_id)
    REFERENCES dentists(dentist_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_appointments_user
    FOREIGN KEY (created_by_user_id)
    REFERENCES users(user_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

CREATE TABLE treatments (
  treatment_id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  dentist_id INT NOT NULL,
  appointment_id INT,
  treatment_name VARCHAR(150) NOT NULL,
  notes TEXT,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  treatment_date DATE NOT NULL,
  status ENUM('PLANNED', 'DONE') NOT NULL DEFAULT 'DONE',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_treatment_cost CHECK (cost >= 0),
  CONSTRAINT fk_treatments_patient
    FOREIGN KEY (patient_id)
    REFERENCES patients(patient_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_treatments_dentist
    FOREIGN KEY (dentist_id)
    REFERENCES dentists(dentist_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_treatments_appointment
    FOREIGN KEY (appointment_id)
    REFERENCES appointments(appointment_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

CREATE TABLE bills (
  bill_id INT AUTO_INCREMENT PRIMARY KEY,
  bill_code VARCHAR(20) NOT NULL UNIQUE,
  patient_id INT NOT NULL,
  treatment_id INT,
  bill_date DATE NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM('UNPAID', 'PARTIAL', 'PAID') NOT NULL DEFAULT 'UNPAID',
  created_by_user_id INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_bill_amounts CHECK (subtotal >= 0 AND discount_amount >= 0 AND total_amount >= 0),
  CONSTRAINT fk_bills_patient
    FOREIGN KEY (patient_id)
    REFERENCES patients(patient_id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_bills_treatment
    FOREIGN KEY (treatment_id)
    REFERENCES treatments(treatment_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_bills_user
    FOREIGN KEY (created_by_user_id)
    REFERENCES users(user_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

CREATE TABLE payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NOT NULL,
  paid_amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method ENUM('CASH', 'CARD', 'BANK_TRANSFER') NOT NULL DEFAULT 'CASH',
  received_by_user_id INT,
  notes VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_payment_amount CHECK (paid_amount > 0),
  CONSTRAINT fk_payments_bill
    FOREIGN KEY (bill_id)
    REFERENCES bills(bill_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_payments_user
    FOREIGN KEY (received_by_user_id)
    REFERENCES users(user_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);

CREATE TABLE medicines (
  medicine_id INT AUTO_INCREMENT PRIMARY KEY,
  medicine_name VARCHAR(120) NOT NULL,
  batch_no VARCHAR(40) NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  low_stock_limit INT NOT NULL DEFAULT 10,
  expiry_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_medicine_quantity CHECK (quantity >= 0 AND low_stock_limit >= 0)
);

CREATE TABLE audit_logs (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  action_type VARCHAR(80) NOT NULL,
  table_name VARCHAR(80) NOT NULL,
  record_id INT,
  old_value TEXT,
  new_value TEXT,
  user_id INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user
    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
);


INSERT INTO users(full_name, phone, email, role) VALUES
('Dr. Sara Malik', '0300-1112233', 'owner@smilecure.test', 'OWNER'),
('Ayesha Khan', '0301-2223344', 'ayesha.staff@smilecure.test', 'STAFF'),
('Bilal Ahmed', '0302-3334455', 'bilal.staff@smilecure.test', 'STAFF'),
('Customer Preview', '0303-4445566', 'customer@smilecure.test', 'CUSTOMER');

INSERT INTO staff_permissions(staff_user_id, can_manage_billing, can_view_reports) VALUES
(2, FALSE, TRUE),
(3, TRUE, TRUE);

INSERT INTO clinic(clinic_name, address, phone, email, whatsapp_number) VALUES
('Smile Cure Dentistry', 'Main Boulevard, Gulberg, Lahore', '03303171725', 'information@smilecure.test', '923001112233');

INSERT INTO clinic_timings(clinic_id, day_of_week, opening_time, closing_time, is_closed) VALUES
(1, 'MONDAY', '09:00:00', '18:00:00', FALSE),
(1, 'TUESDAY', '09:00:00', '18:00:00', FALSE),
(1, 'WEDNESDAY', '09:00:00', '18:00:00', FALSE),
(1, 'THURSDAY', '09:00:00', '18:00:00', FALSE),
(1, 'FRIDAY', '09:00:00', '13:00:00', FALSE),
(1, 'SATURDAY', '10:00:00', '16:00:00', FALSE),
(1, 'SUNDAY', '09:00:00', '18:00:00', TRUE);

INSERT INTO patients(patient_code, name, phone, email, gender, date_of_birth, address) VALUES
('PAT-00001', 'Hassan Raza', '0300-5551001', 'hassan.raza@gmail.com', 'MALE', '1998-02-14', 'Model Town, Lahore'),
('PAT-00002', 'Mina Siddiqui', '0300-5551002', 'mina.siddiqui@gmail.com', 'FEMALE', '2001-07-21', 'Johar Town, Lahore'),
('PAT-00003', 'Usman Tariq', '0300-5551003', 'usman.tariq@gmail.com', 'MALE', '1989-11-09', 'Faisal Town, Lahore'),
('PAT-00004', 'Zoya Ali', '0300-5551004', 'zoya.ali@gmail.com', 'FEMALE', '1995-05-30', 'DHA Phase 5, Lahore'),
('PAT-00005', 'Imran Shah', '0300-5551005', 'imran.shah@gmail.com', 'MALE', '1978-12-04', 'Garden Town, Lahore');

INSERT INTO patient_medical_history(patient_id, allergies, current_medications, medical_notes) VALUES
(1, 'No known allergies', 'None', 'Sensitive gums; prefers morning appointments.'),
(2, 'Penicillin', 'Vitamin D supplement', 'Requires local anesthesia check before extraction.'),
(3, 'No known allergies', 'Blood pressure medicine', 'Blood pressure should be checked before treatment.'),
(4, 'Latex sensitivity', 'None', 'Orthodontic consultation completed last month.'),
(5, 'Aspirin sensitivity', 'Diabetes medicine', 'Needs sugar level check before surgical procedure.');

INSERT INTO dentists(dentist_code, name, phone, email, specialization) VALUES
('DEN-0001', 'Dr. Hamza Qureshi', '0304-2221111', 'hamza@smilecure.test', 'General Dentistry'),
('DEN-0002', 'Dr. Nida Farooq', '0304-2222222', 'nida@smilecure.test', 'Orthodontics'),
('DEN-0003', 'Dr. Omar Saeed', '0304-2223333', 'omar@smilecure.test', 'Oral Surgery');

INSERT INTO appointments(
  appointment_code,
  patient_id,
  dentist_id,
  appointment_date,
  appointment_time,
  status,
  problem_description,
  created_by_user_id
) VALUES
('APT-00001', 1, 1, CURDATE(), '10:00:00', 'COMPLETED', 'Toothache and gum swelling', 2),
('APT-00002', 2, 2, CURDATE(), '11:00:00', 'COMPLETED', 'Braces follow-up', 2),
('APT-00003', 3, 1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '12:00:00', 'BOOKED', 'Routine scaling', 3),
('APT-00004', 4, 3, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:30:00', 'BOOKED', 'Wisdom tooth consultation', 3);

INSERT INTO treatments(patient_id, dentist_id, appointment_id, treatment_name, notes, cost, treatment_date, status) VALUES
(1, 1, 1, 'Dental Filling', 'Composite filling on lower molar.', 4500.00, CURDATE(), 'DONE'),
(2, 2, 2, 'Orthodontic Follow-up', 'Wire adjustment and cleaning.', 3000.00, CURDATE(), 'DONE'),
(3, 1, 3, 'Scaling and Polishing', 'Plaque removal and polishing planned.', 3500.00, DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'PLANNED'),
(4, 3, 4, 'Wisdom Tooth Consultation', 'X-ray review and surgical planning.', 2500.00, DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'PLANNED');

INSERT INTO bills(
  bill_code,
  patient_id,
  treatment_id,
  bill_date,
  subtotal,
  discount_amount,
  total_amount,
  status,
  created_by_user_id
) VALUES
('BIL-00001', 1, 1, CURDATE(), 4500.00, 500.00, 4000.00, 'PAID', 3),
('BIL-00002', 2, 2, CURDATE(), 3000.00, 0.00, 3000.00, 'PARTIAL', 3),
('BIL-00003', 3, 3, CURDATE(), 3500.00, 0.00, 3500.00, 'UNPAID', 3);

INSERT INTO payments(bill_id, paid_amount, payment_date, payment_method, received_by_user_id, notes) VALUES
(1, 4000.00, CURDATE(), 'CASH', 3, 'Full payment received'),
(2, 1500.00, CURDATE(), 'CARD', 3, 'Partial payment received');

INSERT INTO medicines(medicine_name, batch_no, quantity, low_stock_limit, expiry_date) VALUES
('Amoxicillin 500mg', 'AMX-2026-A', 35, 10, '2027-03-31'),
('Ibuprofen 400mg', 'IBU-2026-B', 8, 12, '2026-12-15'),
('Chlorhexidine Mouthwash', 'CHX-2026-C', 22, 8, '2027-01-20'),
('Lidocaine Gel', 'LIDO-2026-D', 5, 10, '2026-10-01'),
('Paracetamol 500mg', 'PCM-2026-E', 60, 15, '2027-06-30');


CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_name ON patients(name);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_dentist ON appointments(dentist_id);
CREATE UNIQUE INDEX idx_unique_dentist_slot ON appointments(dentist_id, appointment_date, appointment_time);
CREATE INDEX idx_bills_status ON bills(status);


CREATE VIEW patient_full_history_view AS
SELECT
  p.patient_id,
  p.patient_code,
  p.name AS patient_name,
  p.phone,
  p.gender,
  TIMESTAMPDIFF(YEAR, p.date_of_birth, CURDATE()) AS age,
  mh.allergies,
  mh.current_medications,
  mh.medical_notes,
  t.treatment_id,
  t.treatment_name,
  t.treatment_date,
  t.cost,
  d.name AS dentist_name,
  a.appointment_code
FROM patients p
LEFT JOIN patient_medical_history mh ON mh.patient_id = p.patient_id
LEFT JOIN treatments t ON t.patient_id = p.patient_id
LEFT JOIN dentists d ON d.dentist_id = t.dentist_id
LEFT JOIN appointments a ON a.appointment_id = t.appointment_id
WHERE p.is_deleted = FALSE;

CREATE VIEW appointment_details_view AS
SELECT
  a.appointment_id,
  a.appointment_code,
  a.patient_id,
  a.dentist_id,
  a.appointment_date,
  a.appointment_time,
  a.status,
  a.problem_description,
  p.patient_code,
  p.name AS patient_name,
  p.phone AS patient_phone,
  d.dentist_code,
  d.name AS dentist_name,
  d.specialization
FROM appointments a
INNER JOIN patients p ON p.patient_id = a.patient_id
INNER JOIN dentists d ON d.dentist_id = a.dentist_id
WHERE p.is_deleted = FALSE;

CREATE VIEW billing_summary_view AS
SELECT
  b.bill_id,
  b.bill_code,
  b.patient_id,
  p.patient_code,
  p.name AS patient_name,
  b.treatment_id,
  b.bill_date,
  b.subtotal,
  b.discount_amount,
  b.total_amount,
  COALESCE(SUM(pay.paid_amount), 0) AS paid_amount,
  b.total_amount - COALESCE(SUM(pay.paid_amount), 0) AS remaining_balance,
  b.status
FROM bills b
INNER JOIN patients p ON p.patient_id = b.patient_id
LEFT JOIN payments pay ON pay.bill_id = b.bill_id
GROUP BY
  b.bill_id,
  b.bill_code,
  b.patient_id,
  p.patient_code,
  p.name,
  b.treatment_id,
  b.bill_date,
  b.subtotal,
  b.discount_amount,
  b.total_amount,
  b.status;

CREATE VIEW daily_appointments_view AS
SELECT *
FROM appointment_details_view
WHERE appointment_date = CURDATE();



DELIMITER //

CREATE TRIGGER trg_staff_permissions_before_update
BEFORE UPDATE ON staff_permissions
FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER trg_patients_before_update
BEFORE UPDATE ON patients
FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER trg_medicines_before_update
BEFORE UPDATE ON medicines
FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER trg_patients_after_insert
AFTER INSERT ON patients
FOR EACH ROW
BEGIN
  INSERT INTO audit_logs(action_type, table_name, record_id, new_value)
  VALUES('PATIENT_ADDED', 'patients', NEW.patient_id, CONCAT(NEW.patient_code, ' - ', NEW.name));
END//

CREATE TRIGGER trg_patients_after_update
AFTER UPDATE ON patients
FOR EACH ROW
BEGIN
  IF OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE THEN
    INSERT INTO audit_logs(action_type, table_name, record_id, old_value, new_value)
    VALUES('PATIENT_SOFT_DELETED', 'patients', NEW.patient_id, OLD.name, NEW.name);
  ELSE
    INSERT INTO audit_logs(action_type, table_name, record_id, old_value, new_value)
    VALUES('PATIENT_UPDATED', 'patients', NEW.patient_id, OLD.name, NEW.name);
  END IF;

END//

CREATE TRIGGER trg_appointments_status_update
AFTER UPDATE ON appointments
FOR EACH ROW
BEGIN
  IF OLD.status <> NEW.status THEN
    INSERT INTO audit_logs(action_type, table_name, record_id, old_value, new_value, user_id)
    VALUES('APPOINTMENT_STATUS_CHANGED', 'appointments', NEW.appointment_id, OLD.status, NEW.status, NEW.created_by_user_id);
  END IF;
END//

CREATE TRIGGER trg_bills_after_insert
AFTER INSERT ON bills
FOR EACH ROW
BEGIN
  INSERT INTO audit_logs(action_type, table_name, record_id, new_value, user_id)
  VALUES('BILL_CREATED', 'bills', NEW.bill_id, CONCAT('Total: ', NEW.total_amount), NEW.created_by_user_id);
END//

CREATE TRIGGER trg_payments_after_insert
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
  UPDATE bills b
  SET b.status =
    CASE
      WHEN (SELECT COALESCE(SUM(paid_amount), 0) FROM payments WHERE bill_id = NEW.bill_id) >= b.total_amount THEN 'PAID'
      WHEN (SELECT COALESCE(SUM(paid_amount), 0) FROM payments WHERE bill_id = NEW.bill_id) > 0 THEN 'PARTIAL'
      ELSE 'UNPAID'
    END
  WHERE b.bill_id = NEW.bill_id;

  INSERT INTO audit_logs(action_type, table_name, record_id, new_value, user_id)
  VALUES('PAYMENT_CREATED', 'payments', NEW.payment_id, CONCAT('Amount: ', NEW.paid_amount), NEW.received_by_user_id);
END//


CREATE PROCEDURE sp_book_appointment(
  IN p_patient_id INT,
  IN p_dentist_id INT,
  IN p_appointment_date DATE,
  IN p_appointment_time TIME,
  IN p_problem_description TEXT,
  IN p_created_by_user_id INT
)
BEGIN
  DECLARE v_appointment_id INT;

  START TRANSACTION;

  INSERT INTO appointments(
    appointment_code,
    patient_id,
    dentist_id,
    appointment_date,
    appointment_time,
    problem_description,
    created_by_user_id
  )
  VALUES(
    'PENDING',
    p_patient_id,
    p_dentist_id,
    p_appointment_date,
    p_appointment_time,
    p_problem_description,
    p_created_by_user_id
  );

  SELECT MAX(appointment_id) INTO v_appointment_id
  FROM appointments;

  UPDATE appointments
  SET appointment_code = CONCAT(
    'APT-',
    CASE
      WHEN v_appointment_id < 10 THEN '0000'
      WHEN v_appointment_id < 100 THEN '000'
      WHEN v_appointment_id < 1000 THEN '00'
      WHEN v_appointment_id < 10000 THEN '0'
      ELSE ''
    END,
    v_appointment_id
  )
  WHERE appointment_id = v_appointment_id;

  COMMIT;

  SELECT v_appointment_id AS appointment_id, 'Appointment booked' AS message;
END//

CREATE PROCEDURE sp_create_bill(
  IN p_patient_id INT,
  IN p_treatment_id INT,
  IN p_subtotal DECIMAL(10,2),
  IN p_discount_amount DECIMAL(10,2),
  IN p_created_by_user_id INT
)
BEGIN
  DECLARE v_bill_id INT;
  DECLARE v_total_amount DECIMAL(10,2);

  SET v_total_amount = p_subtotal - p_discount_amount;

  START TRANSACTION;

  INSERT INTO bills(
    bill_code,
    patient_id,
    treatment_id,
    bill_date,
    subtotal,
    discount_amount,
    total_amount,
    status,
    created_by_user_id
  )
  VALUES(
    'PENDING',
    p_patient_id,
    p_treatment_id,
    CURDATE(),
    p_subtotal,
    p_discount_amount,
    v_total_amount,'UNPAID',
    p_created_by_user_id
  );

  SELECT MAX(bill_id) INTO v_bill_id
  FROM bills;

  UPDATE bills
  SET bill_code = CONCAT(
    'BIL-',
    CASE
      WHEN v_bill_id < 10 THEN '0000'
      WHEN v_bill_id < 100 THEN '000'
      WHEN v_bill_id < 1000 THEN '00'
      WHEN v_bill_id < 10000 THEN '0'
      ELSE ''
    END,
    v_bill_id
  )
  WHERE bill_id = v_bill_id;

  COMMIT;

  SELECT v_bill_id AS bill_id, v_total_amount AS total_amount, 'Bill created' AS message;
END//

CREATE PROCEDURE sp_add_payment(
  IN p_bill_id INT,
  IN p_paid_amount DECIMAL(10,2),
  IN p_payment_method VARCHAR(20),
  IN p_received_by_user_id INT,
  IN p_notes VARCHAR(255)
)
BEGIN
  DECLARE v_payment_id INT;

  START TRANSACTION;

  INSERT INTO payments(
    bill_id,
    paid_amount,
    payment_date,
    payment_method,
    received_by_user_id,
    notes
  )
  VALUES(
    p_bill_id,
    p_paid_amount,
    CURDATE(),
    p_payment_method,
    p_received_by_user_id,
    p_notes
  );

  SELECT MAX(payment_id) INTO v_payment_id
  FROM payments;

  COMMIT;

  SELECT
    v_payment_id AS payment_id,
    status AS new_status,
    'Payment added' AS message
  FROM bills
  WHERE bill_id = p_bill_id;
END//

CREATE PROCEDURE sp_search_patient(IN p_search_text VARCHAR(120))
BEGIN
  SELECT
    patient_id,
    patient_code,
    name,
    phone,
    email,
    gender
  FROM patients
  WHERE is_deleted = FALSE
    AND (
      patient_code LIKE CONCAT('%', p_search_text, '%')
      OR name LIKE CONCAT('%', p_search_text, '%')
      OR phone LIKE CONCAT('%', p_search_text, '%')
    )
  ORDER BY name;
END//

CREATE PROCEDURE sp_daily_appointment_report(IN p_report_date DATE)
BEGIN
  SELECT
    appointment_code,
    patient_name,
    patient_phone,
    dentist_name,
    appointment_time,
    status
  FROM appointment_details_view
  WHERE appointment_date = p_report_date
  ORDER BY appointment_time;
END//

DELIMITER ;

const cors = require("cors");
const express = require("express");
const { pool, query, testConnection } = require("./db");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json());

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function currentUser(req) {
  return {
    role: String(req.header("x-user-role") || "OWNER").toUpperCase(),
    userId: Number(req.header("x-user-id") || 1)
  };
}

function requireOwner(req) {
  const user = currentUser(req);
  if (user.role !== "OWNER") {
    const err = new Error("Only owner can perform this action");
    err.status = 403;
    throw err;
  }
  return user;
}

async function requireBillingAccess(req) {
  const user = currentUser(req);
  if (user.role === "OWNER") return user;
  if (user.role !== "STAFF") {
    const err = new Error("Billing is not available for this role");
    err.status = 403;
    throw err;
  }
  const rows = await query(
    "SELECT can_manage_billing FROM staff_permissions WHERE staff_user_id = ?",
    [user.userId]
  );
  if (!rows[0]?.can_manage_billing) {
    const err = new Error("Staff billing access is disabled");
    err.status = 403;
    throw err;
  }
  return user;
}

function requiredText(value, field, max = 120) {
  const text = String(value || "").trim();
  if (!text) {
    const err = new Error(`${field} is required`);
    err.status = 400;
    throw err;
  }
  return text.slice(0, max);
}

function optionalText(value, max = 255) {
  return String(value || "").trim().slice(0, max);
}

function positiveNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    const err = new Error(`${field} must be a valid non-negative number`);
    err.status = 400;
    throw err;
  }
  return number;
}

function positiveId(value, field) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    const err = new Error(`${field} must be a valid positive id`);
    err.status = 400;
    throw err;
  }
  return number;
}

function requireDate(value, field = "date") {
  const text = requiredText(value, field, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const err = new Error(`${field} must use YYYY-MM-DD format`);
    err.status = 400;
    throw err;
  }
  return text;
}

function requireTime(value, field = "time") {
  const text = requiredText(value, field, 8);
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(text)) {
    const err = new Error(`${field} must use HH:MM format`);
    err.status = 400;
    throw err;
  }
  return text.length === 5 ? `${text}:00` : text;
}

function buildUpdate(body, allowed) {
  const sets = [];
  const values = [];
  for (const [key, column] of allowed) {
    if (body[key] !== undefined) {
      sets.push(`${column} = ?`);
      values.push(body[key]);
    }
  }
  return { sets, values };
}

async function validateClinicTime(date, time) {
  const rows = await query(
    `SELECT day_of_week, opening_time, closing_time, is_closed
     FROM clinic_timings
     WHERE day_of_week = UPPER(DAYNAME(?))
     LIMIT 1`,
    [date]
  );
  const timing = rows[0];
  if (!timing || timing.is_closed) {
    const err = new Error("Clinic is closed on the selected date");
    err.status = 400;
    throw err;
  }
  if (time < timing.opening_time || time >= timing.closing_time) {
    const openingTime = String(timing.opening_time).slice(0, 5);
    const closingTime = String(timing.closing_time).slice(0, 5);
    const err = new Error(`Appointment time must be between ${openingTime} and ${closingTime}`);
    err.status = 400;
    throw err;
  }
}

app.get("/api/health", asyncHandler(async (_req, res) => {
  try {
    const ok = await testConnection();
    res.json({ status: ok ? "ok" : "database unavailable" });
  } catch (error) {
    res.status(503).json({
      status: "database unavailable",
      error: error.message || error.code || "MySQL connection failed"
    });
  }
}));

app.post("/api/login", asyncHandler(async (req, res) => {
  const role = requiredText(req.body.role || "OWNER", "role", 20).toUpperCase();
  if (!["OWNER", "STAFF", "CUSTOMER"].includes(role)) {
    const err = new Error("Invalid role selected");
    err.status = 400;
    throw err;
  }
  const rows = await query(
    `SELECT user_id, full_name, phone, email, role, is_active
     FROM users
     WHERE role = ? AND is_active = TRUE
     ORDER BY user_id
     LIMIT 1`,
    [role]
  );
  if (!rows.length) {
    const err = new Error("No active user found for this role");
    err.status = 404;
    throw err;
  }
  let permissions = null;
  if (role === "STAFF") {
    const perms = await query(
      "SELECT can_manage_billing, can_view_reports FROM staff_permissions WHERE staff_user_id = ?",
      [rows[0].user_id]
    );
    permissions = perms[0] || { can_manage_billing: false, can_view_reports: true };
  }
  res.json({ user: rows[0], permissions });
}));

app.get("/api/dashboard", asyncHandler(async (_req, res) => {
  const [todayAppointments, totalPatients, pendingPayments, monthlyIncome, recentActivity] = await Promise.all([
    query("SELECT COUNT(*) AS count FROM appointments WHERE appointment_date = CURDATE() AND status <> 'CANCELLED'"),
    query("SELECT COUNT(*) AS count FROM patients WHERE is_deleted = FALSE"),
    query("SELECT COALESCE(SUM(remaining_balance), 0) AS amount FROM billing_summary_view WHERE remaining_balance > 0"),
    query("SELECT COALESCE(SUM(paid_amount), 0) AS amount FROM payments WHERE YEAR(payment_date) = YEAR(CURDATE()) AND MONTH(payment_date) = MONTH(CURDATE())"),
    query("SELECT action_type, table_name, record_id, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 8")
  ]);
  res.json({
    todayAppointments: todayAppointments[0].count,
    totalPatients: totalPatients[0].count,
    pendingPayments: pendingPayments[0].amount,
    monthlyIncome: monthlyIncome[0].amount,
    recentActivity
  });
}));

app.get("/api/patients", asyncHandler(async (req, res) => {
  const search = optionalText(req.query.search, 80);
  const params = [];
  let where = "WHERE p.is_deleted = FALSE";
  if (search) {
    where += " AND (p.name LIKE ? OR p.phone LIKE ? OR p.patient_code LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const rows = await query(
    `SELECT p.*, mh.allergies, mh.current_medications, mh.medical_notes
     FROM patients p
     LEFT JOIN patient_medical_history mh ON mh.patient_id = p.patient_id
     ${where}
     ORDER BY p.name`,
    params
  );
  res.json(rows);
}));

app.get("/api/patients/:id", asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT p.*, mh.allergies, mh.current_medications, mh.medical_notes
     FROM patients p
     LEFT JOIN patient_medical_history mh ON mh.patient_id = p.patient_id
     WHERE p.patient_id = ? AND p.is_deleted = FALSE`,
    [req.params.id]
  );
  if (!rows.length) {
    const err = new Error("Patient not found");
    err.status = 404;
    throw err;
  }
  res.json(rows[0]);
}));

app.post("/api/patients", asyncHandler(async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.execute(
      `INSERT INTO patients (patient_code, name, phone, email, gender, date_of_birth, address)
       VALUES ('PENDING', ?, ?, ?, ?, ?, ?)`,
      [
        requiredText(req.body.name, "name"),
        requiredText(req.body.phone, "phone", 30),
        optionalText(req.body.email, 120),
        requiredText(req.body.gender || "OTHER", "gender", 10).toUpperCase(),
        req.body.date_of_birth || null,
        optionalText(req.body.address, 255)
      ]
    );
    const patientId = result.insertId;
    const patientCode = `PAT-${String(patientId).padStart(5, "0")}`;
    await conn.execute("UPDATE patients SET patient_code = ? WHERE patient_id = ?", [patientCode, patientId]);
    await conn.execute(
      `INSERT INTO patient_medical_history (patient_id, allergies, current_medications, medical_notes)
       VALUES (?, ?, ?, ?)`,
      [
        patientId,
        optionalText(req.body.allergies, 500),
        optionalText(req.body.current_medications, 500),
        optionalText(req.body.medical_notes, 1000)
      ]
    );
    await conn.commit();
    res.status(201).json({ patient_id: patientId, patient_code: patientCode });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

app.put("/api/patients/:id", asyncHandler(async (req, res) => {
  const body = {
    name: req.body.name !== undefined ? requiredText(req.body.name, "name") : undefined,
    phone: req.body.phone !== undefined ? requiredText(req.body.phone, "phone", 30) : undefined,
    email: req.body.email !== undefined ? optionalText(req.body.email, 120) : undefined,
    gender: req.body.gender !== undefined ? requiredText(req.body.gender, "gender", 10).toUpperCase() : undefined,
    date_of_birth: req.body.date_of_birth || undefined,
    address: req.body.address !== undefined ? optionalText(req.body.address, 255) : undefined
  };
  const { sets, values } = buildUpdate(body, [
    ["name", "name"],
    ["phone", "phone"],
    ["email", "email"],
    ["gender", "gender"],
    ["date_of_birth", "date_of_birth"],
    ["address", "address"]
  ]);
  if (sets.length) {
    values.push(req.params.id);
    await query(`UPDATE patients SET ${sets.join(", ")}, updated_at = NOW() WHERE patient_id = ?`, values);
  }
  if (
    req.body.allergies !== undefined ||
    req.body.current_medications !== undefined ||
    req.body.medical_notes !== undefined
  ) {
    const historyValues = [
      optionalText(req.body.allergies, 500),
      optionalText(req.body.current_medications, 500),
      optionalText(req.body.medical_notes, 1000)
    ];
    const existingHistory = await query(
      "SELECT history_id FROM patient_medical_history WHERE patient_id = ?",
      [req.params.id]
    );
    if (existingHistory.length) {
      await query(
        `UPDATE patient_medical_history
         SET allergies = ?, current_medications = ?, medical_notes = ?, updated_at = NOW()
         WHERE patient_id = ?`,
        [...historyValues, req.params.id]
      );
    } else {
      await query(
        `INSERT INTO patient_medical_history (patient_id, allergies, current_medications, medical_notes)
         VALUES (?, ?, ?, ?)`,
        [req.params.id, ...historyValues]
      );
    }
  }
  res.json({ message: "Patient updated" });
}));

app.delete("/api/patients/:id", asyncHandler(async (req, res) => {
  await query("UPDATE patients SET is_deleted = TRUE, updated_at = NOW() WHERE patient_id = ?", [req.params.id]);
  res.json({ message: "Patient soft deleted" });
}));

app.get("/api/dentists", asyncHandler(async (_req, res) => {
  const rows = await query("SELECT * FROM dentists ORDER BY is_active DESC, name");
  res.json(rows);
}));

app.post("/api/dentists", asyncHandler(async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.execute(
      `INSERT INTO dentists (dentist_code, name, phone, email, specialization, is_active)
       VALUES ('PENDING', ?, ?, ?, ?, TRUE)`,
      [
        requiredText(req.body.name, "name"),
        requiredText(req.body.phone, "phone", 30),
        optionalText(req.body.email, 120),
        requiredText(req.body.specialization, "specialization")
      ]
    );
    const dentistId = result.insertId;
    const dentistCode = `DEN-${String(dentistId).padStart(4, "0")}`;
    await conn.execute("UPDATE dentists SET dentist_code = ? WHERE dentist_id = ?", [dentistCode, dentistId]);
    await conn.commit();
    res.status(201).json({ dentist_id: dentistId, dentist_code: dentistCode });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}));

app.put("/api/dentists/:id", asyncHandler(async (req, res) => {
  const body = {
    name: req.body.name !== undefined ? requiredText(req.body.name, "name") : undefined,
    phone: req.body.phone !== undefined ? requiredText(req.body.phone, "phone", 30) : undefined,
    email: req.body.email !== undefined ? optionalText(req.body.email, 120) : undefined,
    specialization: req.body.specialization !== undefined ? requiredText(req.body.specialization, "specialization") : undefined,
    is_active: req.body.is_active !== undefined ? Boolean(req.body.is_active) : undefined
  };
  const { sets, values } = buildUpdate(body, [
    ["name", "name"],
    ["phone", "phone"],
    ["email", "email"],
    ["specialization", "specialization"],
    ["is_active", "is_active"]
  ]);
  if (!sets.length) return res.json({ message: "No changes" });
  values.push(req.params.id);
  await query(`UPDATE dentists SET ${sets.join(", ")} WHERE dentist_id = ?`, values);
  res.json({ message: "Dentist updated" });
}));

app.get("/api/appointments", asyncHandler(async (req, res) => {
  const params = [];
  const filters = [];
  if (req.query.date) {
    filters.push("appointment_date = ?");
    params.push(req.query.date);
  }
  if (req.query.status) {
    filters.push("status = ?");
    params.push(String(req.query.status).toUpperCase());
  }
  if (req.query.dentist_id) {
    filters.push("dentist_id = ?");
    params.push(req.query.dentist_id);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const rows = await query(
    `SELECT * FROM appointment_details_view
     ${where}
     ORDER BY appointment_date DESC, appointment_time`,
    params
  );
  res.json(rows);
}));

app.post("/api/appointments", asyncHandler(async (req, res) => {
  const user = currentUser(req);
  const patientId = positiveId(req.body.patient_id, "patient_id");
  const dentistId = positiveId(req.body.dentist_id, "dentist_id");
  const appointmentDate = requireDate(req.body.appointment_date, "appointment_date");
  const appointmentTime = requireTime(req.body.appointment_time, "appointment_time");
  const patient = await query(
    "SELECT patient_id FROM patients WHERE patient_id = ? AND is_deleted = FALSE",
    [patientId]
  );
  if (!patient.length) {
    const err = new Error("Patient not found");
    err.status = 404;
    throw err;
  }
  const dentist = await query(
    "SELECT dentist_id FROM dentists WHERE dentist_id = ? AND is_active = TRUE",
    [dentistId]
  );
  if (!dentist.length) {
    const err = new Error("Dentist not found or inactive");
    err.status = 404;
    throw err;
  }
  await validateClinicTime(appointmentDate, appointmentTime);
  const bookedSlot = await query(
    `SELECT appointment_id
     FROM appointments
     WHERE dentist_id = ?
       AND appointment_date = ?
       AND appointment_time = ?
       AND status <> 'CANCELLED'`,
    [dentistId, appointmentDate, appointmentTime]
  );
  if (bookedSlot.length) {
    const err = new Error("This dentist already has an appointment in this slot");
    err.status = 409;
    throw err;
  }
  const rows = await pool.query(
    "CALL sp_book_appointment(?, ?, ?, ?, ?, ?)",
    [
      patientId,
      dentistId,
      appointmentDate,
      appointmentTime,
      optionalText(req.body.problem_description, 500),
      user.userId
    ]
  );
  const appointmentId = rows[0][0][0].appointment_id;
  res.status(201).json({ appointment_id: appointmentId });
}));

app.put("/api/appointments/:id", asyncHandler(async (req, res) => {
  const existing = await query("SELECT * FROM appointments WHERE appointment_id = ?", [req.params.id]);
  if (!existing.length) {
    const err = new Error("Appointment not found");
    err.status = 404;
    throw err;
  }
  const finalDate = req.body.appointment_date || existing[0].appointment_date;
  const finalTime = req.body.appointment_time ? requireTime(req.body.appointment_time, "appointment_time") : existing[0].appointment_time;
  if (req.body.appointment_date || req.body.appointment_time) {
    await validateClinicTime(finalDate, finalTime);
  }
  const body = {
    patient_id: req.body.patient_id !== undefined ? Number(req.body.patient_id) : undefined,
    dentist_id: req.body.dentist_id !== undefined ? Number(req.body.dentist_id) : undefined,
    appointment_date: req.body.appointment_date !== undefined ? requireDate(req.body.appointment_date, "appointment_date") : undefined,
    appointment_time: req.body.appointment_time !== undefined ? finalTime : undefined,
    status: req.body.status !== undefined ? requiredText(req.body.status, "status", 20).toUpperCase() : undefined,
    problem_description: req.body.problem_description !== undefined ? optionalText(req.body.problem_description, 500) : undefined
  };
  const { sets, values } = buildUpdate(body, [
    ["patient_id", "patient_id"],
    ["dentist_id", "dentist_id"],
    ["appointment_date", "appointment_date"],
    ["appointment_time", "appointment_time"],
    ["status", "status"],
    ["problem_description", "problem_description"]
  ]);
  if (!sets.length) return res.json({ message: "No changes" });
  values.push(req.params.id);
  await query(`UPDATE appointments SET ${sets.join(", ")}, updated_at = NOW() WHERE appointment_id = ?`, values);
  res.json({ message: "Appointment updated" });
}));

app.patch("/api/appointments/:id/cancel", asyncHandler(async (req, res) => {
  await query("UPDATE appointments SET status = 'CANCELLED', updated_at = NOW() WHERE appointment_id = ?", [req.params.id]);
  res.json({ message: "Appointment cancelled" });
}));

app.get("/api/treatments", asyncHandler(async (req, res) => {
  const params = [];
  let where = "";
  if (req.query.patient_id) {
    where = "WHERE t.patient_id = ?";
    params.push(req.query.patient_id);
  }
  const rows = await query(
    `SELECT t.*, p.name AS patient_name, d.name AS dentist_name, a.appointment_code
     FROM treatments t
     INNER JOIN patients p ON p.patient_id = t.patient_id
     INNER JOIN dentists d ON d.dentist_id = t.dentist_id
     LEFT JOIN appointments a ON a.appointment_id = t.appointment_id
     ${where}
     ORDER BY t.treatment_date DESC`,
    params
  );
  res.json(rows);
}));

app.post("/api/treatments", asyncHandler(async (req, res) => {
  const rows = await query(
    `INSERT INTO treatments
     (patient_id, dentist_id, appointment_id, treatment_name, notes, cost, treatment_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      Number(req.body.patient_id),
      Number(req.body.dentist_id),
      req.body.appointment_id || null,
      requiredText(req.body.treatment_name, "treatment_name"),
      optionalText(req.body.notes, 1000),
      positiveNumber(req.body.cost, "cost"),
      requireDate(req.body.treatment_date || new Date().toISOString().slice(0, 10), "treatment_date"),
      requiredText(req.body.status || "DONE", "status", 20).toUpperCase()
    ]
  );
  res.status(201).json({ treatment_id: rows.insertId });
}));

app.put("/api/treatments/:id", asyncHandler(async (req, res) => {
  const body = {
    treatment_name: req.body.treatment_name !== undefined ? requiredText(req.body.treatment_name, "treatment_name") : undefined,
    notes: req.body.notes !== undefined ? optionalText(req.body.notes, 1000) : undefined,
    cost: req.body.cost !== undefined ? positiveNumber(req.body.cost, "cost") : undefined,
    treatment_date: req.body.treatment_date !== undefined ? requireDate(req.body.treatment_date, "treatment_date") : undefined,
    status: req.body.status !== undefined ? requiredText(req.body.status, "status", 20).toUpperCase() : undefined
  };
  const { sets, values } = buildUpdate(body, [
    ["treatment_name", "treatment_name"],
    ["notes", "notes"],
    ["cost", "cost"],
    ["treatment_date", "treatment_date"],
    ["status", "status"]
  ]);
  if (!sets.length) return res.json({ message: "No changes" });
  values.push(req.params.id);
  await query(`UPDATE treatments SET ${sets.join(", ")} WHERE treatment_id = ?`, values);
  res.json({ message: "Treatment updated" });
}));

app.get("/api/billing/bills", asyncHandler(async (req, res) => {
  await requireBillingAccess(req);
  const status = optionalText(req.query.status, 20);
  const params = [];
  let where = "";
  if (status) {
    where = "WHERE status = ?";
    params.push(status.toUpperCase());
  }
  const rows = await query(`SELECT * FROM billing_summary_view ${where} ORDER BY bill_date DESC`, params);
  res.json(rows);
}));

app.post("/api/billing/bills", asyncHandler(async (req, res) => {
  const user = await requireBillingAccess(req);
  const patientId = positiveId(req.body.patient_id, "patient_id");
  const treatmentId = req.body.treatment_id ? positiveId(req.body.treatment_id, "treatment_id") : null;
  const subtotal = positiveNumber(req.body.subtotal, "subtotal");
  const discountAmount = positiveNumber(req.body.discount_amount || 0, "discount_amount");
  if (discountAmount > subtotal) {
    const err = new Error("Discount amount cannot be greater than subtotal");
    err.status = 400;
    throw err;
  }
  const patient = await query(
    "SELECT patient_id FROM patients WHERE patient_id = ? AND is_deleted = FALSE",
    [patientId]
  );
  if (!patient.length) {
    const err = new Error("Patient not found");
    err.status = 404;
    throw err;
  }
  if (treatmentId) {
    const treatment = await query(
      "SELECT treatment_id FROM treatments WHERE treatment_id = ?",
      [treatmentId]
    );
    if (!treatment.length) {
      const err = new Error("Treatment not found");
      err.status = 404;
      throw err;
    }
  }
  const rows = await pool.query(
    "CALL sp_create_bill(?, ?, ?, ?, ?)",
    [
      patientId,
      treatmentId,
      subtotal,
      discountAmount,
      user.userId
    ]
  );
  res.status(201).json({ bill_id: rows[0][0][0].bill_id });
}));

app.post("/api/billing/payments", asyncHandler(async (req, res) => {
  const user = await requireBillingAccess(req);
  const billId = positiveId(req.body.bill_id, "bill_id");
  const paidAmount = positiveNumber(req.body.paid_amount, "paid_amount");
  if (paidAmount <= 0) {
    const err = new Error("paid_amount must be greater than zero");
    err.status = 400;
    throw err;
  }
  const bill = await query(
    "SELECT bill_id, remaining_balance FROM billing_summary_view WHERE bill_id = ?",
    [billId]
  );
  if (!bill.length) {
    const err = new Error("Bill not found");
    err.status = 404;
    throw err;
  }
  if (paidAmount > Number(bill[0].remaining_balance)) {
    const err = new Error("Payment is greater than remaining balance");
    err.status = 400;
    throw err;
  }
  const rows = await pool.query(
    "CALL sp_add_payment(?, ?, ?, ?, ?)",
    [
      billId,
      paidAmount,
      requiredText(req.body.payment_method || "CASH", "payment_method", 20).toUpperCase(),
      user.userId,
      optionalText(req.body.notes, 255)
    ]
  );
  res.status(201).json({ payment_id: rows[0][0][0].payment_id, status: rows[0][0][0].new_status });
}));

app.get("/api/medicines", asyncHandler(async (_req, res) => {
  const rows = await query(
    `SELECT *, CASE WHEN quantity <= low_stock_limit THEN TRUE ELSE FALSE END AS is_low_stock
     FROM medicines
     ORDER BY is_low_stock DESC, medicine_name`
  );
  res.json(rows);
}));

app.post("/api/medicines", asyncHandler(async (req, res) => {
  const rows = await query(
    `INSERT INTO medicines (medicine_name, batch_no, quantity, low_stock_limit, expiry_date)
     VALUES (?, ?, ?, ?, ?)`,
    [
      requiredText(req.body.medicine_name, "medicine_name"),
      requiredText(req.body.batch_no, "batch_no", 40),
      Number(req.body.quantity || 0),
      Number(req.body.low_stock_limit || 10),
      requireDate(req.body.expiry_date, "expiry_date")
    ]
  );
  res.status(201).json({ medicine_id: rows.insertId });
}));

app.put("/api/medicines/:id", asyncHandler(async (req, res) => {
  const body = {
    medicine_name: req.body.medicine_name !== undefined ? requiredText(req.body.medicine_name, "medicine_name") : undefined,
    batch_no: req.body.batch_no !== undefined ? requiredText(req.body.batch_no, "batch_no", 40) : undefined,
    quantity: req.body.quantity !== undefined ? Number(req.body.quantity) : undefined,
    low_stock_limit: req.body.low_stock_limit !== undefined ? Number(req.body.low_stock_limit) : undefined,
    expiry_date: req.body.expiry_date !== undefined ? requireDate(req.body.expiry_date, "expiry_date") : undefined
  };
  const { sets, values } = buildUpdate(body, [
    ["medicine_name", "medicine_name"],
    ["batch_no", "batch_no"],
    ["quantity", "quantity"],
    ["low_stock_limit", "low_stock_limit"],
    ["expiry_date", "expiry_date"]
  ]);
  if (!sets.length) return res.json({ message: "No changes" });
  values.push(req.params.id);
  await query(`UPDATE medicines SET ${sets.join(", ")}, updated_at = NOW() WHERE medicine_id = ?`, values);
  res.json({ message: "Medicine updated" });
}));

app.get("/api/reports/daily-appointments", asyncHandler(async (req, res) => {
  const date = req.query.date ? requireDate(req.query.date, "date") : new Date().toISOString().slice(0, 10);
  const rows = await pool.query("CALL sp_daily_appointment_report(?)", [date]);
  res.json(rows[0][0]);
}));

app.get("/api/reports/monthly-income", asyncHandler(async (req, res) => {
  const year = Number(req.query.year || new Date().getFullYear());
  const rows = await query(
    `SELECT DATE_FORMAT(payment_date, '%Y-%m') AS income_month,
            COUNT(*) AS payment_count,
            SUM(paid_amount) AS total_income
     FROM payments
     WHERE YEAR(payment_date) = ?
     GROUP BY DATE_FORMAT(payment_date, '%Y-%m')
     HAVING total_income >= 0
     ORDER BY income_month`,
    [year]
  );
  res.json(rows);
}));

app.get("/api/reports/pending-payments", asyncHandler(async (_req, res) => {
  const rows = await query(
    `SELECT *
     FROM billing_summary_view
     WHERE remaining_balance > 0
     ORDER BY remaining_balance DESC`
  );
  res.json(rows);
}));

app.get("/api/reports/treatments", asyncHandler(async (_req, res) => {
  const rows = await query(
    `SELECT t.treatment_name,
            COUNT(*) AS treatment_count,
            SUM(t.cost) AS total_value,
            AVG(t.cost) AS average_cost,
            MAX(t.cost) AS highest_cost
     FROM treatments t
     INNER JOIN patients p ON p.patient_id = t.patient_id
     WHERE p.is_deleted = FALSE
     GROUP BY t.treatment_name
     HAVING treatment_count >= 1
     ORDER BY total_value DESC`
  );
  res.json(rows);
}));

app.get("/api/reports/patient-list", asyncHandler(async (_req, res) => {
  const rows = await query(
    `SELECT patient_code, name, phone, gender, TIMESTAMPDIFF(YEAR, date_of_birth, CURDATE()) AS age
     FROM patients
     WHERE is_deleted = FALSE
     ORDER BY name`
  );
  res.json(rows);
}));

app.get("/api/staff", asyncHandler(async (_req, res) => {
  const rows = await query(
    `SELECT u.user_id, u.full_name, u.phone, u.email, u.is_active,
            COALESCE(sp.can_manage_billing, FALSE) AS can_manage_billing,
            COALESCE(sp.can_view_reports, TRUE) AS can_view_reports
     FROM users u
     LEFT JOIN staff_permissions sp ON sp.staff_user_id = u.user_id
     WHERE u.role = 'STAFF'
     ORDER BY u.full_name`
  );
  res.json(rows);
}));

app.put("/api/staff/:id/permissions", asyncHandler(async (req, res) => {
  requireOwner(req);
  const canManageBilling = Boolean(req.body.can_manage_billing);
  const canViewReports = req.body.can_view_reports === undefined ? true : Boolean(req.body.can_view_reports);
  const existingPermission = await query(
    "SELECT permission_id FROM staff_permissions WHERE staff_user_id = ?",
    [req.params.id]
  );
  if (existingPermission.length) {
    await query(
      `UPDATE staff_permissions
       SET can_manage_billing = ?, can_view_reports = ?
       WHERE staff_user_id = ?`,
      [canManageBilling, canViewReports, req.params.id]
    );
  } else {
    await query(
      `INSERT INTO staff_permissions (staff_user_id, can_manage_billing, can_view_reports)
       VALUES (?, ?, ?)`,
      [req.params.id, canManageBilling, canViewReports]
    );
  }
  res.json({ message: "Permissions updated" });
}));

app.get("/api/clinic", asyncHandler(async (_req, res) => {
  const clinic = await query("SELECT * FROM clinic LIMIT 1");
  const timings = await query(
    `SELECT *
     FROM clinic_timings
     ORDER BY CASE day_of_week
       WHEN 'MONDAY' THEN 1
       WHEN 'TUESDAY' THEN 2
       WHEN 'WEDNESDAY' THEN 3
       WHEN 'THURSDAY' THEN 4
       WHEN 'FRIDAY' THEN 5
       WHEN 'SATURDAY' THEN 6
       ELSE 7
     END`
  );
  res.json({ clinic: clinic[0], timings });
}));

app.put("/api/clinic", asyncHandler(async (req, res) => {
  await query(
    `UPDATE clinic
     SET clinic_name = ?, address = ?, phone = ?, email = ?, whatsapp_number = ?
     WHERE clinic_id = 1`,
    [
      requiredText(req.body.clinic_name, "clinic_name"),
      requiredText(req.body.address, "address", 255),
      requiredText(req.body.phone, "phone", 30),
      optionalText(req.body.email, 120),
      requiredText(req.body.whatsapp_number, "whatsapp_number", 30)
    ]
  );
  res.json({ message: "Clinic profile updated" });
}));

app.put("/api/clinic/timings/:id", asyncHandler(async (req, res) => {
  await query(
    `UPDATE clinic_timings
     SET opening_time = ?, closing_time = ?, is_closed = ?
     WHERE timing_id = ?`,
    [
      requireTime(req.body.opening_time || "09:00", "opening_time"),
      requireTime(req.body.closing_time || "18:00", "closing_time"),
      Boolean(req.body.is_closed),
      req.params.id
    ]
  );
  res.json({ message: "Clinic timing updated" });
}));

app.use((error, _req, res, _next) => {
  const duplicate = error.code === "ER_DUP_ENTRY";
  const status = error.status || (duplicate ? 409 : 500);
  const message = duplicate
    ? "Duplicate entry. This record already exists or the appointment slot is booked."
    : error.sqlMessage || error.message || "Server error";
  res.status(status).json({ error: message });
});

app.listen(PORT, async () => {
  try {
    await testConnection();
    console.log(`Backend running at http://localhost:${PORT}`);
  } catch (error) {
    console.log(`Backend started on port ${PORT}, but MySQL connection failed: ${error.message || error.code || "check MySQL service and .env"}`);
  }
});

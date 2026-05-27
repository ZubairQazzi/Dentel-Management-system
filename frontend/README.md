# Smile Cure Dentistry - Dental Management System

Smile Cure Dentistry is a simple Dental Management System made for a university Database Systems Lab project. The project uses a React frontend, a Node.js/Express backend, and MySQL as the only database.

The database work is kept visible and easy to explain for viva. The SQL file contains table creation, constraints, sample data, indexes, views, triggers, stored procedures, transactions, joins, grouping, subqueries, and sample SELECT queries.

## Project Structure

```text
Dentel-Management-system/
  backend/
    src/
      db.js
      server.js
    database/
      dms_full_database.sql
    package.json
    package-lock.json
    .env.example

  frontend/
    src/
      App.jsx
      main.jsx
      styles.css
    assets/
      logo.jpeg
    index.html
    package.json
    package-lock.json

  build/
    run_project.bat
    setup_instructions.txt
    database_import_steps.txt
    final_notes.txt
```

## What Each Folder Contains

`backend/` contains the server-side code and database connection work. It uses Express routes, simple validation, prepared SQL queries, and MySQL connection settings.

`backend/database/` contains the full MySQL database file:

```text
backend/database/dms_full_database.sql
```

This one file creates the database from scratch and inserts sample data.

`frontend/` contains the React user interface. It includes the login screen, dashboard, patients, dentists, appointments, treatments, billing, medicines, reports, staff permissions, clinic profile, and WhatsApp shortcut.

`build/` contains helper files for running and explaining the project. The main file is:

```text
build/run_project.bat
```

Double-clicking this file starts the backend and frontend.

## Technologies Used

Backend:

- Node.js
- Express.js
- mysql2/promise
- dotenv
- cors
- Manual SQL queries
- Prepared statements

Frontend:

- React
- Vite
- Lucide React icons
- Plain CSS

Database:

- MySQL
- XAMPP MySQL can be used locally

No MongoDB, Mongoose, ORM, JWT, OTP, Docker, Redis, OAuth, or advanced authentication system is used.

## Database Setup

1. Start MySQL from XAMPP Control Panel.
2. Open phpMyAdmin or MySQL command line.
3. Import this file:

```text
backend/database/dms_full_database.sql
```

The SQL file will create:

```text
dentist_management
```

Default MySQL settings used by the project:

```text
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=dentist_management
```

If needed, copy:

```text
backend/.env.example
```

to:

```text
backend/.env
```

## How to Run

First install dependencies:

```bash
cd backend
npm install
```

```bash
cd frontend
npm install
```

Then run the project by double-clicking:

```text
build/run_project.bat
```

The app opens at:

```text
http://localhost:5173
```

The backend runs at:

```text
http://localhost:5000
```

## Login

The login is intentionally simple for the lab project.

Available roles:

- Owner
- Staff
- Customer

No password, JWT, OTP, password hashing, refresh token, or OAuth is used.

## Appointment Rules

Appointments can be added only during clinic working hours.

Current sample clinic timings:

| Day | Time |
| --- | --- |
| Monday | 09:00 to 18:00 |
| Tuesday | 09:00 to 18:00 |
| Wednesday | 09:00 to 18:00 |
| Thursday | 09:00 to 18:00 |
| Friday | 09:00 to 13:00 |
| Saturday | 10:00 to 16:00 |
| Sunday | Closed |

The system also prevents duplicate booking for the same dentist, date, and time.

## Main Features

- Dashboard summary
- Patient management
- Medical history
- Dentist management
- Appointment booking and cancellation
- Clinic timing check
- Duplicate appointment prevention
- Treatment management
- Billing and payments
- Partial and full payment status
- Staff billing permission
- Medicine stock management
- Reports
- Clinic profile
- WhatsApp shortcut

## Database Tables

The main MySQL tables are:

- users
- staff_permissions
- clinic
- clinic_timings
- patients
- patient_medical_history
- dentists
- appointments
- treatments
- bills
- payments
- medicines
- audit_logs

## Database Lab Concepts Used

The SQL file demonstrates these Database Systems Lab concepts:

- CREATE DATABASE
- DROP DATABASE
- USE database
- CREATE TABLE
- INSERT
- UPDATE
- DELETE
- SELECT
- WHERE
- ORDER BY
- LIMIT
- OFFSET
- GROUP BY
- HAVING
- COUNT, SUM, AVG, MIN, MAX
- PRIMARY KEY
- FOREIGN KEY
- UNIQUE
- NOT NULL
- CHECK
- DEFAULT
- AUTO_INCREMENT
- ENUM
- INNER JOIN
- LEFT JOIN
- RIGHT JOIN
- SUBQUERY
- VIEW
- INDEX
- TRIGGER
- STORED PROCEDURE
- START TRANSACTION
- COMMIT
- ROLLBACK
- MySQL date and time functions
- Prepared statements in backend routes

## Important Notes

- MySQL is the only database used.


```text
backend/database/dms_full_database.sql
```


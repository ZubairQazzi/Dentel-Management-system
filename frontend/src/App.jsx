import {
  Activity,
  BadgeDollarSign,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Pill,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserRound,
  UsersRound
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import logo from "../assets/logo.jpeg";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";
const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

function todayInputDate() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

const emptyPatient = {
  name: "",
  phone: "",
  email: "",
  gender: "MALE",
  date_of_birth: "",
  address: "",
  allergies: "",
  current_medications: "",
  medical_notes: ""
};

const emptyDentist = {
  name: "",
  phone: "",
  email: "",
  specialization: ""
};

const emptyAppointment = {
  patient_id: "",
  dentist_id: "",
  appointment_date: todayInputDate(),
  appointment_time: "10:00",
  problem_description: "",
  status: "BOOKED"
};

const emptyTreatment = {
  patient_id: "",
  dentist_id: "",
  appointment_id: "",
  treatment_name: "",
  notes: "",
  cost: "",
  treatment_date: todayInputDate(),
  status: "DONE"
};

const emptyMedicine = {
  medicine_name: "",
  batch_no: "",
  quantity: "",
  low_stock_limit: "10",
  expiry_date: ""
};

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
  return value ? String(value).slice(0, 10) : "";
}

function selectedDayName(value) {
  if (!value) return "";
  const [year, month, day] = String(value).split("-").map(Number);
  return dayNames[new Date(year, month - 1, day).getDay()] || "";
}

function timeShort(value) {
  return String(value || "").slice(0, 5);
}

function StatusBadge({ value }) {
  const key = String(value || "").toLowerCase();
  return <span className={`badge ${key}`}>{value}</span>;
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TextInput(props) {
  return <input {...props} autoComplete="off" />;
}

function SelectInput(props) {
  return <select {...props} />;
}

function SectionHeader({ title, action }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {action}
    </div>
  );
}

function tableRowKey(row, index) {
  const keys = [
    "treatment_id",
    "appointment_id",
    "bill_id",
    "payment_id",
    "medicine_id",
    "dentist_id",
    "patient_id",
    "user_id",
    "timing_id",
    "id"
  ];
  const keyName = keys.find((item) => row[item] !== undefined && row[item] !== null);
  return keyName ? `${keyName}-${row[keyName]}` : `row-${index}`;
}

function DataTable({ columns, rows, empty = "No records found.", onRowClick }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="empty-cell">{empty}</td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={tableRowKey(row, index)} onClick={() => onRowClick?.(row)}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Login({ onLogin }) {
  const [role, setRole] = useState("OWNER");
  const [message, setMessage] = useState("");

  async function submit() {
    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Login failed");
      onLogin(data);
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="login-page">
      <div className="login-panel">
        <img src={logo} alt="Smile Cure Dentistry" className="login-logo" />
        <h1>Smile Cure Dentistry</h1>
        <div className="role-grid">
          {["OWNER", "STAFF", "CUSTOMER"].map((item) => (
            <button key={item} className={role === item ? "role-card selected" : "role-card"} onClick={() => setRole(item)}>
              <ShieldCheck size={20} />
              <span>{item.charAt(0) + item.slice(1).toLowerCase()}</span>
            </button>
          ))}
        </div>
        <button className="primary wide" onClick={submit}>
          <UserRound size={18} />
          Login
        </button>
        {message && <p className="form-message error">{message}</p>}
      </div>
    </main>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState("dashboard");
  const [toast, setToast] = useState({ message: "", type: "success" });

  function notify(message, type = "success") {
    const fallback = type === "error" ? "Action failed. Please check the form and try again." : "";
    const text = String(message || fallback).trim();
    setToast({ message: text, type });
  }

  function changeView(nextView) {
    setToast({ message: "", type: "success" });
    setView(nextView);
  }

  const api = useMemo(() => {
    return async (path, options = {}) => {
      const headers = {
        "Content-Type": "application/json",
        "x-user-role": session?.user?.role || "OWNER",
        "x-user-id": session?.user?.user_id || 1,
        ...(options.headers || {})
      };
      const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(data.error || data.message || "Request failed").trim());
      return data;
    };
  }, [session]);

  if (!session) return <Login onLogin={setSession} />;

  const role = session.user.role;
  const canBilling = role === "OWNER" || Boolean(session.permissions?.can_manage_billing);
  const navItems = [
    ["dashboard", "Dashboard", LayoutDashboard],
    ["patients", "Patients", UsersRound],
    ["dentists", "Dentists", Stethoscope],
    ["appointments", "Appointments", CalendarDays],
    ["treatments", "Treatments", ClipboardList],
    ...(canBilling ? [["billing", "Billing", BadgeDollarSign]] : []),
    ["medicines", "Medicines", Pill],
    ...(role !== "CUSTOMER" ? [["reports", "Reports", Activity]] : []),
    ...(role === "OWNER" ? [["staff", "Staff", ShieldCheck]] : []),
    ["clinic", "Clinic", Settings]
  ];

  const activeModule = {
    dashboard: <Dashboard api={api} />,
    patients: <Patients api={api} notify={notify} />,
    dentists: <Dentists api={api} notify={notify} />,
    appointments: <Appointments api={api} notify={notify} />,
    treatments: <Treatments api={api} notify={notify} />,
    billing: <Billing api={api} notify={notify} />,
    medicines: <Medicines api={api} notify={notify} />,
    reports: <Reports api={api} />,
    staff: <Staff api={api} notify={notify} />,
    clinic: <Clinic api={api} notify={notify} />
  }[view];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src={logo} alt="" />
          <div>
            <strong>Smile Cure</strong>
            <span>{role}</span>
          </div>
        </div>
        <nav>
          {navItems.map(([key, label, Icon]) => (
            <button key={key} className={view === key ? "nav-item active" : "nav-item"} onClick={() => changeView(key)}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <button className="nav-item logout" onClick={() => setSession(null)}>
          <LogOut size={18} />
          Logout
        </button>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>
            <h1>{navItems.find(([key]) => key === view)?.[1]}</h1>
            <p>{session.user.full_name}</p>
          </div>
          {toast.message && <span className={`toast ${toast.type}`}>{toast.message}</span>}
        </header>
        {activeModule}
      </main>
    </div>
  );
}

function Dashboard({ api }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api("/dashboard").then(setData).catch(() => setData(null));
  }, [api]);

  if (!data) return <div className="loading">Loading dashboard...</div>;

  return (
    <section className="stack">
      <div className="metrics">
        <Metric title="Today's Appointments" value={data.todayAppointments} />
        <Metric title="Total Patients" value={data.totalPatients} />
        <Metric title="Pending Payments" value={money(data.pendingPayments)} />
        <Metric title="Monthly Income" value={money(data.monthlyIncome)} />
      </div>
      <div className="panel">
        <SectionHeader title="Recent Activity" />
        <DataTable
          rows={data.recentActivity}
          columns={[
            { key: "action_type", label: "Action" },
            { key: "table_name", label: "Table" },
            { key: "record_id", label: "Record" },
            { key: "created_at", label: "Time" }
          ]}
        />
      </div>
    </section>
  );
}

function Metric({ title, value }) {
  return (
    <div className="metric">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Patients({ api, notify }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyPatient);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    setRows(await api(`/patients?search=${encodeURIComponent(search)}`));
  }

  useEffect(() => {
    load().catch((error) => notify(error.message, "error"));
  }, []);

  async function save(event) {
    event.preventDefault();
    try {
      const path = editingId ? `/patients/${editingId}` : "/patients";
      const method = editingId ? "PUT" : "POST";
      await api(path, { method, body: JSON.stringify(form) });
      setForm(emptyPatient);
      setEditingId(null);
      notify(editingId ? "Patient updated" : "Patient added");
      await load();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function removePatient() {
    if (!editingId) return;
    try {
      await api(`/patients/${editingId}`, { method: "DELETE" });
      setForm(emptyPatient);
      setEditingId(null);
      notify("Patient soft deleted");
      await load();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  return (
    <section className="grid-two">
      <div className="panel">
        <SectionHeader
          title="Patient List"
          action={
            <div className="search-box">
              <Search size={16} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Search name, phone, code" />
            </div>
          }
        />
        <DataTable
          rows={rows}
          onRowClick={(row) => {
            setEditingId(row.patient_id);
            setForm({
              name: row.name || "",
              phone: row.phone || "",
              email: row.email || "",
              gender: row.gender || "MALE",
              date_of_birth: formatDate(row.date_of_birth),
              address: row.address || "",
              allergies: row.allergies || "",
              current_medications: row.current_medications || "",
              medical_notes: row.medical_notes || ""
            });
          }}
          columns={[
            { key: "patient_code", label: "ID" },
            { key: "name", label: "Name" },
            { key: "phone", label: "Phone" },
            { key: "gender", label: "Gender" }
          ]}
        />
      </div>
      <form className="panel form-grid" onSubmit={save}>
        <SectionHeader title={editingId ? "Update Patient" : "Add Patient"} />
        <Field label="Name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
        <Field label="Phone"><TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></Field>
        <Field label="Email"><TextInput value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Gender">
          <SelectInput value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option>MALE</option>
            <option>FEMALE</option>
            <option>OTHER</option>
          </SelectInput>
        </Field>
        <Field label="Date of Birth"><TextInput type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></Field>
        <Field label="Address"><TextInput value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
        <Field label="Allergies"><textarea value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} /></Field>
        <Field label="Current Medicines"><textarea value={form.current_medications} onChange={(e) => setForm({ ...form, current_medications: e.target.value })} /></Field>
        <Field label="Medical Notes"><textarea value={form.medical_notes} onChange={(e) => setForm({ ...form, medical_notes: e.target.value })} /></Field>
        <div className="form-actions">
          <button className="primary" type="submit">Save</button>
          {editingId && <button className="danger" type="button" onClick={removePatient}>Soft Delete</button>}
        </div>
      </form>
    </section>
  );
}

function Dentists({ api, notify }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyDentist);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    setRows(await api("/dentists"));
  }

  useEffect(() => {
    load().catch((error) => notify(error.message, "error"));
  }, []);

  async function save(event) {
    event.preventDefault();
    try {
      await api(editingId ? `/dentists/${editingId}` : "/dentists", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      setForm(emptyDentist);
      setEditingId(null);
      notify("Dentist saved");
      await load();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function toggle(row) {
    try {
      await api(`/dentists/${row.dentist_id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !row.is_active })
      });
      notify("Dentist status updated");
      await load();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  return (
    <section className="grid-two">
      <div className="panel">
        <SectionHeader title="Dentists" />
        <DataTable
          rows={rows}
          onRowClick={(row) => {
            setEditingId(row.dentist_id);
            setForm({
              name: row.name || "",
              phone: row.phone || "",
              email: row.email || "",
              specialization: row.specialization || ""
            });
          }}
          columns={[
            { key: "dentist_code", label: "Code" },
            { key: "name", label: "Name" },
            { key: "specialization", label: "Specialization" },
            { key: "is_active", label: "Status", render: (row) => <StatusBadge value={row.is_active ? "ACTIVE" : "INACTIVE"} /> },
            { key: "action", label: "Action", render: (row) => <button className="ghost small" onClick={(e) => { e.stopPropagation(); toggle(row); }}>{row.is_active ? "Inactive" : "Active"}</button> }
          ]}
        />
      </div>
      <form className="panel form-grid" onSubmit={save}>
        <SectionHeader title={editingId ? "Update Dentist" : "Add Dentist"} />
        <Field label="Name"><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
        <Field label="Phone"><TextInput value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></Field>
        <Field label="Email"><TextInput value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Specialization"><TextInput value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} required /></Field>
        <button className="primary" type="submit">Save</button>
      </form>
    </section>
  );
}

function Appointments({ api, notify }) {
  const [rows, setRows] = useState([]);
  const [patients, setPatients] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [clinicTimings, setClinicTimings] = useState([]);
  const [form, setForm] = useState(emptyAppointment);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    const [appointmentRows, patientRows, dentistRows, clinicData] = await Promise.all([
      api("/appointments"),
      api("/patients"),
      api("/dentists"),
      api("/clinic")
    ]);
    setRows(appointmentRows);
    setPatients(patientRows);
    setDentists(dentistRows.filter((dentist) => dentist.is_active));
    setClinicTimings(clinicData.timings || []);
  }

  useEffect(() => {
    load().catch((error) => notify(error.message, "error"));
  }, []);

  function appointmentMessage() {
    const dayName = selectedDayName(form.appointment_date);
    const timing = clinicTimings.find((item) => item.day_of_week === dayName);
    const selectedTime = form.appointment_time ? `${form.appointment_time.slice(0, 5)}:00` : "";
    if (!dayName || !timing || !selectedTime) return "";
    if (timing.is_closed) return "Clinic is closed on the selected date";
    if (selectedTime < timing.opening_time || selectedTime >= timing.closing_time) {
      return `Appointment time must be between ${String(timing.opening_time).slice(0, 5)} and ${String(timing.closing_time).slice(0, 5)}`;
    }
    return "";
  }

  function selectedTiming() {
    const dayName = selectedDayName(form.appointment_date);
    const timing = clinicTimings.find((item) => item.day_of_week === dayName);
    if (!dayName || !timing) return null;
    return { dayName, timing };
  }

  const timingInfo = selectedTiming();

  async function save(event) {
    event.preventDefault();
    const message = appointmentMessage();
    if (message) {
      notify(message, "error");
      return;
    }
    try {
      await api(editingId ? `/appointments/${editingId}` : "/appointments", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      setForm(emptyAppointment);
      setEditingId(null);
      notify("Appointment saved");
      await load();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function cancel(id) {
    try {
      await api(`/appointments/${id}/cancel`, { method: "PATCH" });
      notify("Appointment cancelled");
      await load();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  return (
    <section className="grid-two">
      <div className="panel">
        <SectionHeader title="Appointments" />
        <DataTable
          rows={rows}
          onRowClick={(row) => {
            setEditingId(row.appointment_id);
            setForm({
              patient_id: row.patient_id,
              dentist_id: row.dentist_id,
              appointment_date: formatDate(row.appointment_date),
              appointment_time: String(row.appointment_time).slice(0, 5),
              problem_description: row.problem_description || "",
              status: row.status || "BOOKED"
            });
          }}
          columns={[
            { key: "appointment_code", label: "Code" },
            { key: "patient_name", label: "Patient" },
            { key: "dentist_name", label: "Dentist" },
            { key: "appointment_date", label: "Date", render: (row) => formatDate(row.appointment_date) },
            { key: "appointment_time", label: "Time" },
            { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
            { key: "action", label: "Action", render: (row) => <button className="ghost small" onClick={(e) => { e.stopPropagation(); cancel(row.appointment_id); }}>Cancel</button> }
          ]}
        />
      </div>
      <form className="panel form-grid" onSubmit={save}>
        <SectionHeader title={editingId ? "Update Appointment" : "Book Appointment"} />
        <Field label="Patient">
          <SelectInput value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} required>
            <option value="">Select patient</option>
            {patients.map((patient) => <option key={patient.patient_id} value={patient.patient_id}>{patient.patient_code} - {patient.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Dentist">
          <SelectInput value={form.dentist_id} onChange={(e) => setForm({ ...form, dentist_id: e.target.value })} required>
            <option value="">Select dentist</option>
            {dentists.map((dentist) => <option key={dentist.dentist_id} value={dentist.dentist_id}>{dentist.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Date"><TextInput type="date" value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} required /></Field>
        <Field label="Time"><TextInput type="time" value={form.appointment_time} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })} step="60" required /></Field>
        {timingInfo && (
          <div className={`timing-note ${timingInfo.timing.is_closed ? "closed" : "open"}`}>
            <strong>{timingInfo.dayName}</strong>
            <span>
              {timingInfo.timing.is_closed
                ? "Closed - appointment cannot be added on this day"
                : `Open ${timeShort(timingInfo.timing.opening_time)} to ${timeShort(timingInfo.timing.closing_time)}`}
            </span>
          </div>
        )}
        <div className="timing-list">
          {clinicTimings.map((timing) => (
            <div key={timing.timing_id} className={timing.is_closed ? "closed" : "open"}>
              <span>{timing.day_of_week.slice(0, 3)}</span>
              <strong>{timing.is_closed ? "Closed" : `${timeShort(timing.opening_time)}-${timeShort(timing.closing_time)}`}</strong>
            </div>
          ))}
        </div>
        {editingId && (
          <Field label="Status">
            <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>BOOKED</option>
              <option>COMPLETED</option>
              <option>CANCELLED</option>
            </SelectInput>
          </Field>
        )}
        <Field label="Problem"><textarea value={form.problem_description} onChange={(e) => setForm({ ...form, problem_description: e.target.value })} /></Field>
        {appointmentMessage() && <p className="form-message error">{appointmentMessage()}</p>}
        <button className="primary" type="submit">Save</button>
      </form>
    </section>
  );
}

function Treatments({ api, notify }) {
  const [rows, setRows] = useState([]);
  const [patients, setPatients] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState(emptyTreatment);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    const [treatmentRows, patientRows, dentistRows, appointmentRows] = await Promise.all([
      api("/treatments"),
      api("/patients"),
      api("/dentists"),
      api("/appointments")
    ]);
    setRows(treatmentRows);
    setPatients(patientRows);
    setDentists(dentistRows);
    setAppointments(appointmentRows);
  }

  useEffect(() => {
    load().catch((error) => notify(error.message, "error"));
  }, []);

  async function save(event) {
    event.preventDefault();
    try {
      await api(editingId ? `/treatments/${editingId}` : "/treatments", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      setForm(emptyTreatment);
      setEditingId(null);
      notify("Treatment saved");
      await load();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  return (
    <section className="grid-two">
      <div className="panel">
        <SectionHeader title="Treatment History" />
        <DataTable
          rows={rows}
          onRowClick={(row) => {
            setEditingId(row.treatment_id);
            setForm({
              patient_id: row.patient_id,
              dentist_id: row.dentist_id,
              appointment_id: row.appointment_id || "",
              treatment_name: row.treatment_name || "",
              notes: row.notes || "",
              cost: row.cost || "",
              treatment_date: formatDate(row.treatment_date),
              status: row.status || "DONE"
            });
          }}
          columns={[
            { key: "patient_name", label: "Patient" },
            { key: "dentist_name", label: "Dentist" },
            { key: "treatment_name", label: "Treatment" },
            { key: "cost", label: "Cost", render: (row) => money(row.cost) },
            { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> }
          ]}
        />
      </div>
      <form className="panel form-grid" onSubmit={save}>
        <SectionHeader title={editingId ? "Update Treatment" : "Add Treatment"} />
        <Field label="Patient">
          <SelectInput value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} required>
            <option value="">Select patient</option>
            {patients.map((patient) => <option key={patient.patient_id} value={patient.patient_id}>{patient.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Dentist">
          <SelectInput value={form.dentist_id} onChange={(e) => setForm({ ...form, dentist_id: e.target.value })} required>
            <option value="">Select dentist</option>
            {dentists.map((dentist) => <option key={dentist.dentist_id} value={dentist.dentist_id}>{dentist.name}</option>)}
          </SelectInput>
        </Field>
        <Field label="Appointment">
          <SelectInput value={form.appointment_id} onChange={(e) => setForm({ ...form, appointment_id: e.target.value })}>
            <option value="">None</option>
            {appointments.map((appointment) => <option key={appointment.appointment_id} value={appointment.appointment_id}>{appointment.appointment_code}</option>)}
          </SelectInput>
        </Field>
        <Field label="Treatment"><TextInput value={form.treatment_name} onChange={(e) => setForm({ ...form, treatment_name: e.target.value })} required /></Field>
        <Field label="Cost"><TextInput type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} required /></Field>
        <Field label="Date"><TextInput type="date" value={form.treatment_date} onChange={(e) => setForm({ ...form, treatment_date: e.target.value })} required /></Field>
        <Field label="Status">
          <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option>DONE</option>
            <option>PLANNED</option>
          </SelectInput>
        </Field>
        <Field label="Notes"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        <button className="primary" type="submit">Save</button>
      </form>
    </section>
  );
}

function Billing({ api, notify }) {
  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [billForm, setBillForm] = useState({ patient_id: "", treatment_id: "", subtotal: "", discount_amount: "0" });
  const [paymentForm, setPaymentForm] = useState({ bill_id: "", paid_amount: "", payment_method: "CASH", notes: "" });

  async function load() {
    const [billRows, patientRows, treatmentRows] = await Promise.all([
      api("/billing/bills"),
      api("/patients"),
      api("/treatments")
    ]);
    setBills(billRows);
    setPatients(patientRows);
    setTreatments(treatmentRows);
  }

  useEffect(() => {
    load().catch((error) => notify(error.message, "error"));
  }, []);

  async function createBill(event) {
    event.preventDefault();
    try {
      await api("/billing/bills", { method: "POST", body: JSON.stringify(billForm) });
      setBillForm({ patient_id: "", treatment_id: "", subtotal: "", discount_amount: "0" });
      notify("Bill created");
      await load();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function addPayment(event) {
    event.preventDefault();
    try {
      await api("/billing/payments", { method: "POST", body: JSON.stringify(paymentForm) });
      setPaymentForm({ bill_id: "", paid_amount: "", payment_method: "CASH", notes: "" });
      notify("Payment added");
      await load();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  return (
    <section className="stack">
      <div className="panel">
        <SectionHeader title="Bills and Payments" />
        <DataTable
          rows={bills}
          columns={[
            { key: "bill_code", label: "Bill" },
            { key: "patient_name", label: "Patient" },
            { key: "total_amount", label: "Total", render: (row) => money(row.total_amount) },
            { key: "paid_amount", label: "Paid", render: (row) => money(row.paid_amount) },
            { key: "remaining_balance", label: "Balance", render: (row) => money(row.remaining_balance) },
            { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> }
          ]}
        />
      </div>
      <div className="grid-two">
        <form className="panel form-grid" onSubmit={createBill}>
          <SectionHeader title="Create Bill" />
          <Field label="Patient">
            <SelectInput value={billForm.patient_id} onChange={(e) => setBillForm({ ...billForm, patient_id: e.target.value })} required>
              <option value="">Select patient</option>
              {patients.map((patient) => <option key={patient.patient_id} value={patient.patient_id}>{patient.name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Treatment">
            <SelectInput value={billForm.treatment_id} onChange={(e) => setBillForm({ ...billForm, treatment_id: e.target.value })}>
              <option value="">None</option>
              {treatments.map((treatment) => <option key={treatment.treatment_id} value={treatment.treatment_id}>{treatment.treatment_name} - {treatment.patient_name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Subtotal"><TextInput type="number" value={billForm.subtotal} onChange={(e) => setBillForm({ ...billForm, subtotal: e.target.value })} required /></Field>
          <Field label="Discount"><TextInput type="number" value={billForm.discount_amount} onChange={(e) => setBillForm({ ...billForm, discount_amount: e.target.value })} /></Field>
          <button className="primary" type="submit">Create Bill</button>
        </form>
        <form className="panel form-grid" onSubmit={addPayment}>
          <SectionHeader title="Add Payment" />
          <Field label="Bill">
            <SelectInput value={paymentForm.bill_id} onChange={(e) => setPaymentForm({ ...paymentForm, bill_id: e.target.value })} required>
              <option value="">Select bill</option>
              {bills.filter((bill) => bill.remaining_balance > 0).map((bill) => <option key={bill.bill_id} value={bill.bill_id}>{bill.bill_code} - {bill.patient_name}</option>)}
            </SelectInput>
          </Field>
          <Field label="Amount"><TextInput type="number" value={paymentForm.paid_amount} onChange={(e) => setPaymentForm({ ...paymentForm, paid_amount: e.target.value })} required /></Field>
          <Field label="Method">
            <SelectInput value={paymentForm.payment_method} onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}>
              <option>CASH</option>
              <option>CARD</option>
              <option>BANK_TRANSFER</option>
            </SelectInput>
          </Field>
          <Field label="Notes"><TextInput value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} /></Field>
          <button className="primary" type="submit">Add Payment</button>
        </form>
      </div>
    </section>
  );
}

function Medicines({ api, notify }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyMedicine);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    setRows(await api("/medicines"));
  }

  useEffect(() => {
    load().catch((error) => notify(error.message, "error"));
  }, []);

  async function save(event) {
    event.preventDefault();
    try {
      await api(editingId ? `/medicines/${editingId}` : "/medicines", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      setForm(emptyMedicine);
      setEditingId(null);
      notify("Medicine saved");
      await load();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  return (
    <section className="grid-two">
      <div className="panel">
        <SectionHeader title="Medicines" />
        <DataTable
          rows={rows}
          onRowClick={(row) => {
            setEditingId(row.medicine_id);
            setForm({
              medicine_name: row.medicine_name,
              batch_no: row.batch_no,
              quantity: row.quantity,
              low_stock_limit: row.low_stock_limit,
              expiry_date: formatDate(row.expiry_date)
            });
          }}
          columns={[
            { key: "medicine_name", label: "Medicine" },
            { key: "batch_no", label: "Batch" },
            { key: "quantity", label: "Qty" },
            { key: "expiry_date", label: "Expiry", render: (row) => formatDate(row.expiry_date) },
            { key: "is_low_stock", label: "Stock", render: (row) => <StatusBadge value={row.is_low_stock ? "LOW" : "OK"} /> }
          ]}
        />
      </div>
      <form className="panel form-grid" onSubmit={save}>
        <SectionHeader title={editingId ? "Update Medicine" : "Add Medicine"} />
        <Field label="Name"><TextInput value={form.medicine_name} onChange={(e) => setForm({ ...form, medicine_name: e.target.value })} required /></Field>
        <Field label="Batch No"><TextInput value={form.batch_no} onChange={(e) => setForm({ ...form, batch_no: e.target.value })} required /></Field>
        <Field label="Quantity"><TextInput type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required /></Field>
        <Field label="Low Stock Limit"><TextInput type="number" value={form.low_stock_limit} onChange={(e) => setForm({ ...form, low_stock_limit: e.target.value })} required /></Field>
        <Field label="Expiry Date"><TextInput type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} required /></Field>
        <button className="primary" type="submit">Save</button>
      </form>
    </section>
  );
}

function Reports({ api }) {
  const [daily, setDaily] = useState([]);
  const [income, setIncome] = useState([]);
  const [pending, setPending] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [patients, setPatients] = useState([]);
  const today = todayInputDate();

  useEffect(() => {
    Promise.all([
      api(`/reports/daily-appointments?date=${today}`).then(setDaily),
      api(`/reports/monthly-income?year=${new Date().getFullYear()}`).then(setIncome),
      api("/reports/pending-payments").then(setPending),
      api("/reports/treatments").then(setTreatments),
      api("/reports/patient-list").then(setPatients)
    ]).catch(() => {});
  }, [api]);

  return (
    <section className="stack">
      <div className="panel">
        <SectionHeader title="Daily Appointments" />
        <DataTable rows={daily} columns={[
          { key: "appointment_code", label: "Code" },
          { key: "patient_name", label: "Patient" },
          { key: "dentist_name", label: "Dentist" },
          { key: "appointment_time", label: "Time" },
          { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> }
        ]} />
      </div>
      <div className="grid-two">
        <div className="panel">
          <SectionHeader title="Monthly Income" />
          <DataTable rows={income} columns={[
            { key: "income_month", label: "Month" },
            { key: "payment_count", label: "Payments" },
            { key: "total_income", label: "Income", render: (row) => money(row.total_income) }
          ]} />
        </div>
        <div className="panel">
          <SectionHeader title="Pending Payments" />
          <DataTable rows={pending} columns={[
            { key: "patient_name", label: "Patient" },
            { key: "bill_code", label: "Bill" },
            { key: "remaining_balance", label: "Balance", render: (row) => money(row.remaining_balance) },
            { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> }
          ]} />
        </div>
      </div>
      <div className="grid-two">
        <div className="panel">
          <SectionHeader title="Treatment Report" />
          <DataTable rows={treatments} columns={[
            { key: "treatment_name", label: "Treatment" },
            { key: "treatment_count", label: "Count" },
            { key: "total_value", label: "Value", render: (row) => money(row.total_value) },
            { key: "average_cost", label: "Average", render: (row) => money(row.average_cost) }
          ]} />
        </div>
        <div className="panel">
          <SectionHeader title="Patient List Report" />
          <DataTable rows={patients} columns={[
            { key: "patient_code", label: "Code" },
            { key: "name", label: "Name" },
            { key: "phone", label: "Phone" },
            { key: "age", label: "Age" }
          ]} />
        </div>
      </div>
    </section>
  );
}

function Staff({ api, notify }) {
  const [rows, setRows] = useState([]);

  async function load() {
    setRows(await api("/staff"));
  }

  useEffect(() => {
    load().catch((error) => notify(error.message, "error"));
  }, []);

  async function toggle(row, key) {
    try {
      await api(`/staff/${row.user_id}/permissions`, {
        method: "PUT",
        body: JSON.stringify({
          can_manage_billing: key === "billing" ? !row.can_manage_billing : row.can_manage_billing,
          can_view_reports: key === "reports" ? !row.can_view_reports : row.can_view_reports
        })
      });
      notify("Staff permission updated");
      await load();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  return (
    <section className="panel">
      <SectionHeader title="Staff Permissions" />
      <DataTable
        rows={rows}
        columns={[
          { key: "full_name", label: "Staff" },
          { key: "email", label: "Email" },
          { key: "billing", label: "Billing Access", render: (row) => <button className="ghost small" onClick={() => toggle(row, "billing")}>{row.can_manage_billing ? "Enabled" : "Disabled"}</button> },
          { key: "reports", label: "Reports", render: (row) => <button className="ghost small" onClick={() => toggle(row, "reports")}>{row.can_view_reports ? "Enabled" : "Disabled"}</button> }
        ]}
      />
    </section>
  );
}

function Clinic({ api, notify }) {
  const [clinic, setClinic] = useState(null);
  const [timings, setTimings] = useState([]);

  async function load() {
    const data = await api("/clinic");
    setClinic(data.clinic);
    setTimings(data.timings);
  }

  useEffect(() => {
    load().catch((error) => notify(error.message, "error"));
  }, []);

  async function saveClinic(event) {
    event.preventDefault();
    try {
      await api("/clinic", { method: "PUT", body: JSON.stringify(clinic) });
      notify("Clinic profile updated");
      await load();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function saveTiming(timing) {
    try {
      await api(`/clinic/timings/${timing.timing_id}`, { method: "PUT", body: JSON.stringify(timing) });
      notify("Clinic timing updated");
      await load();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  if (!clinic) return <div className="loading">Loading clinic...</div>;

  return (
    <section className="grid-two">
      <form className="panel form-grid" onSubmit={saveClinic}>
        <SectionHeader
          title="Clinic Profile"
          action={
            <a className="whatsapp" href={`https://wa.me/${clinic.whatsapp_number}`} target="_blank" rel="noreferrer">
              <MessageCircle size={17} />
              WhatsApp
            </a>
          }
        />
        <Field label="Clinic Name"><TextInput value={clinic.clinic_name} onChange={(e) => setClinic({ ...clinic, clinic_name: e.target.value })} /></Field>
        <Field label="Address"><TextInput value={clinic.address} onChange={(e) => setClinic({ ...clinic, address: e.target.value })} /></Field>
        <Field label="Phone"><TextInput value={clinic.phone} onChange={(e) => setClinic({ ...clinic, phone: e.target.value })} /></Field>
        <Field label="Email"><TextInput value={clinic.email || ""} onChange={(e) => setClinic({ ...clinic, email: e.target.value })} /></Field>
        <Field label="WhatsApp"><TextInput value={clinic.whatsapp_number} onChange={(e) => setClinic({ ...clinic, whatsapp_number: e.target.value })} /></Field>
        <button className="primary" type="submit">Save Profile</button>
      </form>
      <div className="panel timings">
        <SectionHeader title="Clinic Timings" />
        {timings.map((timing) => (
          <div className="timing-row" key={timing.timing_id}>
            <strong>{timing.day_of_week}</strong>
            <input type="time" value={String(timing.opening_time).slice(0, 5)} onChange={(e) => setTimings(timings.map((item) => item.timing_id === timing.timing_id ? { ...item, opening_time: e.target.value } : item))} />
            <input type="time" value={String(timing.closing_time).slice(0, 5)} onChange={(e) => setTimings(timings.map((item) => item.timing_id === timing.timing_id ? { ...item, closing_time: e.target.value } : item))} />
            <label className="check">
              <input type="checkbox" checked={Boolean(timing.is_closed)} onChange={(e) => setTimings(timings.map((item) => item.timing_id === timing.timing_id ? { ...item, is_closed: e.target.checked } : item))} />
              Closed
            </label>
            <button className="ghost small" onClick={() => saveTiming(timing)}>Save</button>
          </div>
        ))}
      </div>
    </section>
  );
}

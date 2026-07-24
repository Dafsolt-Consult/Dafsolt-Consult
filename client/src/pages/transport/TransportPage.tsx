import { FormEvent, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, Label, PageHeader, Select, Spinner, Table } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";

type Tab = "routes" | "vehicles" | "drivers" | "assignments";

interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  isActive: boolean;
}

interface Vehicle {
  id: string;
  plateNumber: string;
  model?: string | null;
  capacity: number;
  driver?: Driver | null;
  lastLat?: number | null;
  lastLng?: number | null;
  lastLocatedAt?: string | null;
}

interface Route {
  id: string;
  name: string;
  description?: string | null;
  stops: string[];
  vehicle?: Vehicle | null;
  driver?: Driver | null;
  _count?: { assignments: number };
}

interface Assignment {
  id: string;
  stopName: string;
  isActive: boolean;
  student: { user: { firstName: string; lastName: string } };
  route: { name: string };
}

interface StudentOption {
  id: string;
  admissionNumber: string;
  user: { firstName: string; lastName: string };
}

export function TransportPage() {
  const { user } = useAuth();
  if (user?.role === "STUDENT" || user?.role === "PARENT") return <MyTransportView />;

  const [tab, setTab] = useState<Tab>("routes");
  const tabs: { id: Tab; label: string }[] = [
    { id: "routes", label: "Routes" },
    { id: "vehicles", label: "Vehicles" },
    { id: "drivers", label: "Drivers" },
    { id: "assignments", label: "Student assignments" },
  ];

  return (
    <div>
      <PageHeader title="Transport" subtitle="Bus routes, vehicles, drivers and student assignments" />
      <div className="mb-4 flex gap-2 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-medium ${
              tab === t.id ? "border-b-2 border-brand-600 text-brand-700" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "routes" && <RoutesTab />}
      {tab === "vehicles" && <VehiclesTab />}
      {tab === "drivers" && <DriversTab />}
      {tab === "assignments" && <AssignmentsTab />}
    </div>
  );
}

function DriversTab() {
  const { data: drivers, refetch } = useFetch<Driver[]>("/transport/drivers");
  const [form, setForm] = useState({ name: "", phone: "", licenseNumber: "" });
  const [error, setError] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/transport/drivers", form);
      setForm({ name: "", phone: "", licenseNumber: "" });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function toggleActive(d: Driver) {
    await api.patch(`/transport/drivers/${d.id}`, { isActive: !d.isActive });
    refetch();
  }

  return (
    <Card>
      <h3 className="mb-3 font-medium text-slate-800">Drivers</h3>
      {error && (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      )}
      {!drivers?.length ? (
        <p className="mb-4 text-sm text-slate-500">No drivers yet.</p>
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">License</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {drivers.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3 font-medium text-slate-800">{d.name}</td>
                <td className="px-4 py-3 text-slate-600">{d.phone}</td>
                <td className="px-4 py-3 text-slate-600">{d.licenseNumber}</td>
                <td className="px-4 py-3">
                  <Badge tone={d.isActive ? "success" : "default"}>{d.isActive ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Button variant="ghost" onClick={() => toggleActive(d)}>
                    {d.isActive ? "Deactivate" : "Reactivate"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <form onSubmit={create} className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
        <Input placeholder="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <Input
          placeholder="License number"
          required
          value={form.licenseNumber}
          onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
        />
        <Button type="submit">+ Add driver</Button>
      </form>
    </Card>
  );
}

function VehiclesTab() {
  const { data: vehicles, refetch } = useFetch<Vehicle[]>("/transport/vehicles");
  const { data: drivers } = useFetch<Driver[]>("/transport/drivers");
  const [form, setForm] = useState({ plateNumber: "", model: "", capacity: "30", driverId: "" });
  const [error, setError] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/transport/vehicles", {
        ...form,
        capacity: Number(form.capacity),
        driverId: form.driverId || undefined,
        model: form.model || undefined,
      });
      setForm({ plateNumber: "", model: "", capacity: "30", driverId: "" });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card>
      <h3 className="mb-3 font-medium text-slate-800">Vehicles</h3>
      {error && (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      )}
      {!vehicles?.length ? (
        <p className="mb-4 text-sm text-slate-500">No vehicles yet.</p>
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Plate</th>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Capacity</th>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Last seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vehicles.map((v) => (
              <tr key={v.id}>
                <td className="px-4 py-3 font-medium text-slate-800">{v.plateNumber}</td>
                <td className="px-4 py-3 text-slate-600">{v.model ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{v.capacity}</td>
                <td className="px-4 py-3 text-slate-600">{v.driver?.name ?? "Unassigned"}</td>
                <td className="px-4 py-3 text-slate-500">
                  {v.lastLocatedAt ? new Date(v.lastLocatedAt).toLocaleString() : "No location reported"}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <form onSubmit={create} className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-5">
        <Input
          placeholder="Plate number"
          required
          value={form.plateNumber}
          onChange={(e) => setForm({ ...form, plateNumber: e.target.value })}
        />
        <Input placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
        <Input
          type="number"
          min={1}
          placeholder="Capacity"
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: e.target.value })}
        />
        <Select value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}>
          <option value="">No driver</option>
          {drivers?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Button type="submit">+ Add vehicle</Button>
      </form>
    </Card>
  );
}

function RoutesTab() {
  const { data: routes, refetch } = useFetch<Route[]>("/transport/routes");
  const { data: vehicles } = useFetch<Vehicle[]>("/transport/vehicles");
  const { data: drivers } = useFetch<Driver[]>("/transport/drivers");
  const [form, setForm] = useState({ name: "", stops: "", vehicleId: "", driverId: "" });
  const [error, setError] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/transport/routes", {
        name: form.name,
        stops: form.stops.split(",").map((s) => s.trim()).filter(Boolean),
        vehicleId: form.vehicleId || undefined,
        driverId: form.driverId || undefined,
      });
      setForm({ name: "", stops: "", vehicleId: "", driverId: "" });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card>
      <h3 className="mb-3 font-medium text-slate-800">Bus routes</h3>
      {error && (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      )}
      {!routes?.length ? (
        <p className="mb-4 text-sm text-slate-500">No routes yet.</p>
      ) : (
        <div className="mb-4 space-y-2">
          {routes.map((r) => (
            <Card key={r.id} className="p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-800">{r.name}</p>
                <Badge>{r._count?.assignments ?? 0} students</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">Stops: {r.stops.join(" → ")}</p>
              <p className="text-xs text-slate-500">
                {r.vehicle?.plateNumber ?? "No vehicle"} · {r.driver?.name ?? "No driver"}
              </p>
            </Card>
          ))}
        </div>
      )}
      <form onSubmit={create} className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-5">
        <Input placeholder="Route name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input
          className="sm:col-span-2"
          placeholder="Stops, comma-separated"
          required
          value={form.stops}
          onChange={(e) => setForm({ ...form, stops: e.target.value })}
        />
        <Select value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
          <option value="">No vehicle</option>
          {vehicles?.map((v) => (
            <option key={v.id} value={v.id}>
              {v.plateNumber}
            </option>
          ))}
        </Select>
        <Select value={form.driverId} onChange={(e) => setForm({ ...form, driverId: e.target.value })}>
          <option value="">No driver</option>
          {drivers?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Button type="submit" className="sm:col-span-5">
          + Add route
        </Button>
      </form>
    </Card>
  );
}

function AssignmentsTab() {
  const { data: routes } = useFetch<Route[]>("/transport/routes");
  const [routeId, setRouteId] = useState("");
  const query = routeId ? `?routeId=${routeId}` : "";
  const { data: assignments, refetch } = useFetch<Assignment[]>(`/transport/assignments${query}`, [routeId]);

  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<StudentOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [stopName, setStopName] = useState("");
  const [assignRouteId, setAssignRouteId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function runSearch(value: string) {
    setSearch(value);
    setSelectedStudent(null);
    if (!value) {
      setOptions([]);
      return;
    }
    const { data } = await api.get<{ items: StudentOption[] }>(`/students?search=${encodeURIComponent(value)}`);
    setOptions(data.items);
  }

  async function assign(e: FormEvent) {
    e.preventDefault();
    if (!selectedStudent || !assignRouteId) return;
    setError(null);
    try {
      await api.post("/transport/assignments", { studentId: selectedStudent.id, routeId: assignRouteId, stopName });
      setSelectedStudent(null);
      setSearch("");
      setStopName("");
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card>
      <div className="mb-4 max-w-xs">
        <Select value={routeId} onChange={(e) => setRouteId(e.target.value)}>
          <option value="">All routes</option>
          {routes?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </div>

      {error && (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      )}

      {!assignments?.length ? (
        <EmptyState message="No students assigned yet." />
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Stop</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assignments.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3">
                  {a.student.user.firstName} {a.student.user.lastName}
                </td>
                <td className="px-4 py-3 text-slate-600">{a.route.name}</td>
                <td className="px-4 py-3 text-slate-600">{a.stopName}</td>
                <td className="px-4 py-3">
                  <Badge tone={a.isActive ? "success" : "default"}>{a.isActive ? "Active" : "Inactive"}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <form onSubmit={assign} className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
        <div className="relative">
          <Input
            placeholder="Search student..."
            value={selectedStudent ? `${selectedStudent.user.firstName} ${selectedStudent.user.lastName}` : search}
            onChange={(e) => runSearch(e.target.value)}
          />
          {options.length > 0 && !selectedStudent && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
              {options.map((o) => (
                <button
                  type="button"
                  key={o.id}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    setSelectedStudent(o);
                    setOptions([]);
                  }}
                >
                  {o.user.firstName} {o.user.lastName} ({o.admissionNumber})
                </button>
              ))}
            </div>
          )}
        </div>
        <Select required value={assignRouteId} onChange={(e) => setAssignRouteId(e.target.value)}>
          <option value="">Select route</option>
          {routes?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
        <Input placeholder="Stop name" required value={stopName} onChange={(e) => setStopName(e.target.value)} />
        <Button type="submit" disabled={!selectedStudent}>
          + Assign
        </Button>
      </form>
    </Card>
  );
}

interface MyAssignment {
  stopName: string;
  route: { name: string; vehicle?: Vehicle | null; driver?: Driver | null };
}

function MyTransportView() {
  const { data, loading, error } = useFetch<MyAssignment | null>("/transport/assignments/students/me");

  return (
    <div>
      <PageHeader title="My Transport" subtitle="Bus route, stop and driver details" />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <Spinner />
      ) : !data ? (
        <EmptyState message="No transport assignment on file." />
      ) : (
        <Card>
          <p className="font-medium text-slate-800">{data.route.name}</p>
          <p className="text-sm text-slate-600">Pickup/drop-off stop: {data.stopName}</p>
          {data.route.vehicle && (
            <p className="mt-2 text-sm text-slate-600">
              Vehicle: {data.route.vehicle.plateNumber} {data.route.vehicle.model ? `(${data.route.vehicle.model})` : ""}
            </p>
          )}
          {data.route.driver && (
            <p className="text-sm text-slate-600">
              Driver: {data.route.driver.name} · {data.route.driver.phone}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

import { FormEvent, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, PageHeader, Select, Spinner, Table } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";
import { pickCurrentSession, useSessions } from "../../hooks/useAcademics";

type Tab = "hostels" | "rooms" | "allocations";

interface Hostel {
  id: string;
  name: string;
  type: "BOYS" | "GIRLS" | "MIXED";
  address?: string | null;
  warden?: { firstName: string; lastName: string } | null;
  _count?: { rooms: number };
}

interface Room {
  id: string;
  number: string;
  capacity: number;
  occupancy: number;
  available: number;
  hostel: Hostel;
}

interface Allocation {
  id: string;
  feeAmount: number;
  amountPaid: number;
  balance: number;
  isActive: boolean;
  checkInDate: string;
  student: { user: { firstName: string; lastName: string } };
  room: { number: string; hostel: Hostel };
}

interface StudentOption {
  id: string;
  admissionNumber: string;
  user: { firstName: string; lastName: string };
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export function HostelPage() {
  const { user } = useAuth();
  if (user?.role === "STUDENT" || user?.role === "PARENT") return <MyRoomView />;

  const [tab, setTab] = useState<Tab>("hostels");
  const tabs: { id: Tab; label: string }[] = [
    { id: "hostels", label: "Hostels" },
    { id: "rooms", label: "Rooms" },
    { id: "allocations", label: "Allocations & fees" },
  ];

  return (
    <div>
      <PageHeader title="Hostel / Boarding" subtitle="Rooms, occupancy and hostel fees" />
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
      {tab === "hostels" && <HostelsTab />}
      {tab === "rooms" && <RoomsTab />}
      {tab === "allocations" && <AllocationsTab />}
    </div>
  );
}

function HostelsTab() {
  const { data: hostels, refetch } = useFetch<Hostel[]>("/hostel/hostels");
  const [form, setForm] = useState({ name: "", type: "MIXED", address: "" });
  const [error, setError] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/hostel/hostels", { ...form, address: form.address || undefined });
      setForm({ name: "", type: "MIXED", address: "" });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card>
      <h3 className="mb-3 font-medium text-slate-800">Hostels</h3>
      {error && (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      )}
      {!hostels?.length ? (
        <p className="mb-4 text-sm text-slate-500">No hostels yet.</p>
      ) : (
        <div className="mb-4 flex flex-wrap gap-2">
          {hostels.map((h) => (
            <Badge key={h.id}>
              {h.name} ({h.type}) — {h._count?.rooms ?? 0} rooms{h.warden ? ` · Warden: ${h.warden.firstName} ${h.warden.lastName}` : ""}
            </Badge>
          ))}
        </div>
      )}
      <form onSubmit={create} className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
        <Input placeholder="Name e.g. Block A" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="MIXED">Mixed</option>
          <option value="BOYS">Boys</option>
          <option value="GIRLS">Girls</option>
        </Select>
        <Input placeholder="Address (optional)" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <Button type="submit">+ Add hostel</Button>
      </form>
    </Card>
  );
}

function RoomsTab() {
  const { data: hostels } = useFetch<Hostel[]>("/hostel/hostels");
  const [hostelId, setHostelId] = useState("");
  const query = hostelId ? `?hostelId=${hostelId}` : "";
  const { data: rooms, refetch } = useFetch<Room[]>(`/hostel/rooms${query}`, [hostelId]);
  const [form, setForm] = useState({ hostelId: "", number: "", capacity: "4" });
  const [error, setError] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/hostel/rooms", { ...form, capacity: Number(form.capacity) });
      setForm({ hostelId: "", number: "", capacity: "4" });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card>
      <div className="mb-4 max-w-xs">
        <Select value={hostelId} onChange={(e) => setHostelId(e.target.value)}>
          <option value="">All hostels</option>
          {hostels?.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </Select>
      </div>
      {error && (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      )}
      {!rooms?.length ? (
        <p className="mb-4 text-sm text-slate-500">No rooms yet.</p>
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Hostel</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Occupancy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rooms.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">{r.hostel.name}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{r.number}</td>
                <td className="px-4 py-3">
                  <Badge tone={r.available === 0 ? "danger" : r.available <= 1 ? "warning" : "success"}>
                    {r.occupancy} / {r.capacity}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <form onSubmit={create} className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
        <Select required value={form.hostelId} onChange={(e) => setForm({ ...form, hostelId: e.target.value })}>
          <option value="">Select hostel</option>
          {hostels?.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </Select>
        <Input placeholder="Room number" required value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
        <Input
          type="number"
          min={1}
          placeholder="Capacity"
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: e.target.value })}
        />
        <Button type="submit">+ Add room</Button>
      </form>
    </Card>
  );
}

function AllocationsTab() {
  const { data: sessions } = useSessions();
  const currentSession = pickCurrentSession(sessions);
  const { data: hostels } = useFetch<Hostel[]>("/hostel/hostels");
  const [hostelId, setHostelId] = useState("");
  const query = hostelId ? `?hostelId=${hostelId}&isActive=true` : "?isActive=true";
  const { data: allocations, refetch } = useFetch<Allocation[]>(`/hostel/allocations${query}`, [hostelId]);
  const { data: rooms } = useFetch<Room[]>(hostelId ? `/hostel/rooms?hostelId=${hostelId}` : "/hostel/rooms", [hostelId]);

  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<StudentOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [roomId, setRoomId] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [payDrafts, setPayDrafts] = useState<Record<string, string>>({});

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

  async function allocate(e: FormEvent) {
    e.preventDefault();
    if (!selectedStudent || !roomId || !currentSession) return;
    setError(null);
    try {
      await api.post("/hostel/allocations", {
        studentId: selectedStudent.id,
        roomId,
        sessionId: currentSession.id,
        feeAmount: Math.round(Number(feeAmount || 0) * 100),
      });
      setSelectedStudent(null);
      setSearch("");
      setRoomId("");
      setFeeAmount("");
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function checkOut(id: string) {
    if (!confirm("Check this student out of their room?")) return;
    await api.post(`/hostel/allocations/${id}/checkout`, {});
    refetch();
  }

  async function pay(allocationId: string) {
    const amount = Math.round(Number(payDrafts[allocationId] || 0) * 100);
    if (!amount) return;
    try {
      await api.post("/hostel/payments", { allocationId, amount, method: "CASH" });
      setPayDrafts((d) => ({ ...d, [allocationId]: "" }));
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card>
      <div className="mb-4 max-w-xs">
        <Select value={hostelId} onChange={(e) => setHostelId(e.target.value)}>
          <option value="">All hostels</option>
          {hostels?.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </Select>
      </div>

      {error && (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      )}

      {!allocations?.length ? (
        <EmptyState message="No active room allocations." />
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Room</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {allocations.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3">
                  {a.student.user.firstName} {a.student.user.lastName}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {a.room.hostel.name} — {a.room.number}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={a.balance > 0 ? "warning" : "success"}>{naira(a.balance)}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      className="w-24"
                      placeholder="₦ paid"
                      value={payDrafts[a.id] ?? ""}
                      onChange={(e) => setPayDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                    />
                    <Button variant="secondary" onClick={() => pay(a.id)}>
                      Record payment
                    </Button>
                    <Button variant="ghost" onClick={() => checkOut(a.id)}>
                      Check out
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <form onSubmit={allocate} className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-5">
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
        <Select required value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          <option value="">Select room</option>
          {rooms?.map((r) => (
            <option key={r.id} value={r.id} disabled={r.available <= 0}>
              {r.hostel.name} — {r.number} ({r.available} free)
            </option>
          ))}
        </Select>
        <Input
          type="number"
          min={0}
          placeholder="Hostel fee (₦)"
          value={feeAmount}
          onChange={(e) => setFeeAmount(e.target.value)}
        />
        <Button type="submit" disabled={!selectedStudent || !roomId} className="sm:col-span-2">
          + Allocate room
        </Button>
      </form>
    </Card>
  );
}

interface MyAllocation {
  balance: number;
  feeAmount: number;
  amountPaid: number;
  room: { number: string; hostel: Hostel };
}

function MyRoomView() {
  const { data, loading, error } = useFetch<MyAllocation | null>("/hostel/allocations/students/me");

  return (
    <div>
      <PageHeader title="My Room" subtitle="Hostel room and fee balance" />
      {error && <ErrorBanner message={error} />}
      {loading ? (
        <Spinner />
      ) : !data ? (
        <EmptyState message="No hostel allocation on file." />
      ) : (
        <Card>
          <p className="font-medium text-slate-800">
            {data.room.hostel.name} — Room {data.room.number}
          </p>
          <p className="mt-2 text-sm text-slate-600">Fee: {naira(data.feeAmount)}</p>
          <p className="text-sm text-slate-600">Paid: {naira(data.amountPaid)}</p>
          <p className="text-sm font-medium text-slate-800">Balance: {naira(data.balance)}</p>
        </Card>
      )}
    </div>
  );
}

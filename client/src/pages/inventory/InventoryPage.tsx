import { FormEvent, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { api, apiErrorMessage } from "../../api/client";
import { Badge, Button, Card, EmptyState, ErrorBanner, Input, PageHeader, Select, Table } from "../../components/ui";
import { useFetch } from "../../hooks/useFetch";

type Tab = "assets" | "supplies" | "procurement";

interface AssetCategory {
  id: string;
  name: string;
}

interface Asset {
  id: string;
  name: string;
  assetTag: string;
  location?: string | null;
  condition: string;
  status: string;
  category?: AssetCategory | null;
  _count?: { maintenanceLogs: number };
}

interface MaintenanceLog {
  id: string;
  description: string;
  cost: number;
  vendor?: string | null;
  performedAt: string;
}

interface Supply {
  id: string;
  name: string;
  unit: string;
  quantityOnHand: number;
  reorderLevel: number;
  lowStock: boolean;
}

interface ProcurementRequest {
  id: string;
  itemName: string;
  quantity: number;
  estimatedCost?: number | null;
  reason?: string | null;
  status: string;
  requestedBy: { firstName: string; lastName: string };
}

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

const CONDITION_TONE: Record<string, "default" | "warning" | "danger" | "success"> = {
  NEW: "success",
  GOOD: "success",
  FAIR: "default",
  POOR: "warning",
  DAMAGED: "danger",
};

export function InventoryPage() {
  const [tab, setTab] = useState<Tab>("assets");
  const tabs: { id: Tab; label: string }[] = [
    { id: "assets", label: "Assets" },
    { id: "supplies", label: "Supplies" },
    { id: "procurement", label: "Procurement" },
  ];

  return (
    <div>
      <PageHeader title="Inventory & Assets" subtitle="Assets, consumable supplies, procurement and maintenance" />
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
      {tab === "assets" && <AssetsTab />}
      {tab === "supplies" && <SuppliesTab />}
      {tab === "procurement" && <ProcurementTab />}
    </div>
  );
}

function AssetsTab() {
  const { data: categories, refetch: refetchCategories } = useFetch<AssetCategory[]>("/inventory/categories");
  const { data: assets, refetch } = useFetch<Asset[]>("/inventory/assets");
  const [selected, setSelected] = useState<Asset | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [form, setForm] = useState({ name: "", assetTag: "", categoryId: "", location: "" });
  const [error, setError] = useState<string | null>(null);

  async function addCategory(e: FormEvent) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    await api.post("/inventory/categories", { name: newCategory });
    setNewCategory("");
    refetchCategories();
  }

  async function createAsset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/inventory/assets", { ...form, categoryId: form.categoryId || undefined, location: form.location || undefined });
      setForm({ name: "", assetTag: "", categoryId: "", location: "" });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function updateStatus(asset: Asset, status: string) {
    await api.patch(`/inventory/assets/${asset.id}`, { status });
    refetch();
  }

  if (selected) return <AssetDetail asset={selected} onBack={() => setSelected(null)} onChanged={refetch} />;

  return (
    <Card>
      {error && <ErrorBanner message={error} />}
      {!assets?.length ? (
        <EmptyState message="No assets recorded yet." />
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Asset</th>
              <th className="px-4 py-3">Tag</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Condition</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assets.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-medium text-slate-800">{a.name}</td>
                <td className="px-4 py-3 text-slate-600">{a.assetTag}</td>
                <td className="px-4 py-3 text-slate-600">{a.category?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge tone={CONDITION_TONE[a.condition]}>{a.condition}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Select className="w-40" value={a.status} onChange={(e) => updateStatus(a, e.target.value)}>
                    <option value="IN_USE">In use</option>
                    <option value="IN_STORAGE">In storage</option>
                    <option value="UNDER_MAINTENANCE">Under maintenance</option>
                    <option value="DISPOSED">Disposed</option>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <Button variant="ghost" onClick={() => setSelected(a)}>
                    Maintenance ({a._count?.maintenanceLogs ?? 0})
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <div className="mt-4 border-t border-slate-100 pt-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase text-slate-500">Categories:</span>
          {categories?.map((c) => (
            <Badge key={c.id}>{c.name}</Badge>
          ))}
          <form onSubmit={addCategory} className="flex gap-2">
            <Input className="w-32" placeholder="New category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
            <Button type="submit" variant="secondary">
              Add
            </Button>
          </form>
        </div>

        <form onSubmit={createAsset} className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          <Input placeholder="Asset name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input
            placeholder="Asset tag / code"
            required
            value={form.assetTag}
            onChange={(e) => setForm({ ...form, assetTag: e.target.value })}
          />
          <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">No category</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <Button type="submit">+ Add asset</Button>
        </form>
      </div>
    </Card>
  );
}

function AssetDetail({ asset, onBack, onChanged }: { asset: Asset; onBack: () => void; onChanged: () => void }) {
  const { data: logs, refetch } = useFetch<MaintenanceLog[]>(`/inventory/assets/${asset.id}/maintenance`);
  const [form, setForm] = useState({ description: "", cost: "", vendor: "" });
  const [error, setError] = useState<string | null>(null);

  async function logMaintenance(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/inventory/assets/${asset.id}/maintenance`, {
        description: form.description,
        cost: Math.round(Number(form.cost || 0) * 100),
        vendor: form.vendor || undefined,
      });
      setForm({ description: "", cost: "", vendor: "" });
      refetch();
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card>
      <button className="mb-3 text-sm text-brand-700 hover:underline" onClick={onBack}>
        ← All assets
      </button>
      <h3 className="mb-3 font-medium text-slate-800">
        {asset.name} ({asset.assetTag})
      </h3>

      {error && <ErrorBanner message={error} />}
      {!logs?.length ? (
        <p className="mb-4 text-sm text-slate-500">No maintenance history.</p>
      ) : (
        <div className="mb-4 space-y-2">
          {logs.map((l) => (
            <Card key={l.id} className="p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-800">{l.description}</p>
                <span className="text-slate-500">{new Date(l.performedAt).toLocaleDateString()}</span>
              </div>
              <p className="text-slate-600">
                {naira(l.cost)}
                {l.vendor ? ` · ${l.vendor}` : ""}
              </p>
            </Card>
          ))}
        </div>
      )}

      <form onSubmit={logMaintenance} className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
        <Input
          className="sm:col-span-2"
          placeholder="Description"
          required
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <Input type="number" min={0} placeholder="Cost (₦)" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
        <Input placeholder="Vendor (optional)" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
        <Button type="submit" className="sm:col-span-4">
          + Log maintenance (marks asset as under maintenance)
        </Button>
      </form>
    </Card>
  );
}

function SuppliesTab() {
  const { data: supplies, refetch } = useFetch<Supply[]>("/inventory/supplies");
  const [form, setForm] = useState({ name: "", unit: "", reorderLevel: "0" });
  const [drafts, setDrafts] = useState<Record<string, { type: string; quantity: string }>>({});
  const [error, setError] = useState<string | null>(null);

  async function createSupply(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/inventory/supplies", { ...form, reorderLevel: Number(form.reorderLevel) });
      setForm({ name: "", unit: "", reorderLevel: "0" });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function move(supply: Supply) {
    const d = drafts[supply.id] ?? { type: "RECEIVED", quantity: "" };
    if (!d.quantity) return;
    setError(null);
    try {
      await api.post(`/inventory/supplies/${supply.id}/movements`, { type: d.type, quantity: Number(d.quantity) });
      setDrafts((cur) => ({ ...cur, [supply.id]: { ...d, quantity: "" } }));
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <Card>
      {error && <ErrorBanner message={error} />}
      {!supplies?.length ? (
        <EmptyState message="No supplies tracked yet." />
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Supply</th>
              <th className="px-4 py-3">On hand</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {supplies.map((s) => {
              const d = drafts[s.id] ?? { type: "RECEIVED", quantity: "" };
              return (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                  <td className="px-4 py-3">
                    <Badge tone={s.lowStock ? "danger" : "success"}>
                      {s.quantityOnHand} {s.unit}
                    </Badge>
                    {s.lowStock && <span className="ml-2 text-xs text-red-600">below reorder level ({s.reorderLevel})</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Select
                        className="w-28"
                        value={d.type}
                        onChange={(e) => setDrafts((cur) => ({ ...cur, [s.id]: { ...d, type: e.target.value } }))}
                      >
                        <option value="RECEIVED">Receive</option>
                        <option value="ISSUED">Issue</option>
                        <option value="ADJUSTED">Adjust</option>
                      </Select>
                      <Input
                        type="number"
                        className="w-20"
                        placeholder="Qty"
                        value={d.quantity}
                        onChange={(e) => setDrafts((cur) => ({ ...cur, [s.id]: { ...d, quantity: e.target.value } }))}
                      />
                      <Button variant="secondary" onClick={() => move(s)}>
                        Save
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      <form onSubmit={createSupply} className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
        <Input placeholder="Supply name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Unit e.g. boxes" required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
        <Input
          type="number"
          min={0}
          placeholder="Reorder level"
          value={form.reorderLevel}
          onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
        />
        <Button type="submit">+ Add supply</Button>
      </form>
    </Card>
  );
}

function ProcurementTab() {
  const { user } = useAuth();
  const isAdmin = user?.role === "SCHOOL_ADMIN";
  const { data: requests, refetch } = useFetch<ProcurementRequest[]>("/inventory/procurement");
  const [form, setForm] = useState({ itemName: "", quantity: "1", estimatedCost: "", reason: "" });
  const [error, setError] = useState<string | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/inventory/procurement", {
        itemName: form.itemName,
        quantity: Number(form.quantity),
        estimatedCost: form.estimatedCost ? Math.round(Number(form.estimatedCost) * 100) : undefined,
        reason: form.reason || undefined,
      });
      setForm({ itemName: "", quantity: "1", estimatedCost: "", reason: "" });
      refetch();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function review(id: string, status: string) {
    await api.patch(`/inventory/procurement/${id}`, { status });
    refetch();
  }

  return (
    <Card>
      {error && <ErrorBanner message={error} />}
      {!requests?.length ? (
        <EmptyState message="No procurement requests yet." />
      ) : (
        <Table>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Est. cost</th>
              <th className="px-4 py-3">Requested by</th>
              <th className="px-4 py-3">Status</th>
              {isAdmin && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-medium text-slate-800">{r.itemName}</td>
                <td className="px-4 py-3 text-slate-600">{r.quantity}</td>
                <td className="px-4 py-3 text-slate-600">{r.estimatedCost ? naira(r.estimatedCost) : "—"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {r.requestedBy.firstName} {r.requestedBy.lastName}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    tone={
                      r.status === "REJECTED"
                        ? "danger"
                        : r.status === "RECEIVED"
                          ? "success"
                          : r.status === "REQUESTED"
                            ? "warning"
                            : "default"
                    }
                  >
                    {r.status}
                  </Badge>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <Select value={r.status} onChange={(e) => review(r.id, e.target.value)} className="w-32">
                      <option value="REQUESTED">Requested</option>
                      <option value="APPROVED">Approved</option>
                      <option value="ORDERED">Ordered</option>
                      <option value="RECEIVED">Received</option>
                      <option value="REJECTED">Rejected</option>
                    </Select>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <form onSubmit={create} className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
        <Input placeholder="Item name" required value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} />
        <Input
          type="number"
          min={1}
          placeholder="Quantity"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value })}
        />
        <Input
          type="number"
          min={0}
          placeholder="Est. cost (₦, optional)"
          value={form.estimatedCost}
          onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })}
        />
        <Button type="submit">+ Request</Button>
        <Input
          className="sm:col-span-4"
          placeholder="Reason (optional)"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />
      </form>
    </Card>
  );
}

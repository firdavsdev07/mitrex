"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { adminApi, type Plan } from "@/lib/api/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const EMPTY: Partial<Plan> = {
  name: "", slug: "", price: "0", currency: "USD",
  maxWebsites: 1, maxPlatforms: 2, maxMonthlyViews: 5000,
  hasAiInsights: false, hasWeeklyReport: false, hasCustomAlerts: false,
  isActive: true, sortOrder: 0,
};

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; plan: Partial<Plan> } | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    adminApi.getPlans().then(setPlans).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    setSaving(true);
    try {
      if (modal?.mode === "create") {
        await adminApi.createPlan(modal.plan);
      } else if (modal?.plan.id) {
        await adminApi.updatePlan(modal.plan.id, modal.plan);
      }
      setModal(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await adminApi.deletePlan(id);
    load();
  }

  function setField(key: keyof Plan, value: unknown) {
    setModal((m) => m ? { ...m, plan: { ...m.plan, [key]: value } } : m);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-zinc-600 uppercase tracking-wider mb-0.5">Admin</p>
          <h1 className="text-lg font-semibold text-zinc-100">Planlar</h1>
        </div>
        <Button onClick={() => setModal({ mode: "create", plan: { ...EMPTY } })} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Yangi plan
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl border border-zinc-800 bg-zinc-900/60 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-zinc-100">{plan.name}</p>
                      <Badge variant="default" className="font-mono text-xs">{plan.slug}</Badge>
                      {!plan.isActive && <Badge variant="default">Nofaol</Badge>}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500 flex-wrap">
                      <span className="text-zinc-300 font-semibold">
                        ${plan.price}/{" "}
                        <span className="text-zinc-500 font-normal">oy</span>
                      </span>
                      <span>{plan.maxWebsites === -1 ? "∞" : plan.maxWebsites} sayt</span>
                      <span>{plan.maxPlatforms === -1 ? "∞" : plan.maxPlatforms} platforma</span>
                      <span>{plan.maxMonthlyViews === -1 ? "∞" : plan.maxMonthlyViews.toLocaleString()} views/oy</span>
                      {plan.hasAiInsights && <span className="text-orange-400">AI insights</span>}
                      {plan.hasWeeklyReport && <span className="text-blue-400">Haftalik hisobot</span>}
                      {plan.hasCustomAlerts && <span className="text-green-400">Custom alerts</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setModal({ mode: "edit", plan: { ...plan } })}
                      className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="p-1.5 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-100">
                {modal.mode === "create" ? "Yangi plan" : "Planni tahrirlash"}
              </h3>
              <button onClick={() => setModal(null)} className="text-zinc-600 hover:text-zinc-300">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Nomi"
                  value={modal.plan.name ?? ""}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Pro"
                />
                <Input
                  label="Slug"
                  value={modal.plan.slug ?? ""}
                  onChange={(e) => setField("slug", e.target.value)}
                  placeholder="pro"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Narxi ($)"
                  type="number"
                  value={modal.plan.price ?? "0"}
                  onChange={(e) => setField("price", e.target.value)}
                />
                <Input
                  label="Tartib raqami"
                  type="number"
                  value={modal.plan.sortOrder ?? 0}
                  onChange={(e) => setField("sortOrder", parseInt(e.target.value))}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Max saytlar (-1=∞)"
                  type="number"
                  value={modal.plan.maxWebsites ?? 1}
                  onChange={(e) => setField("maxWebsites", parseInt(e.target.value))}
                />
                <Input
                  label="Max platformalar"
                  type="number"
                  value={modal.plan.maxPlatforms ?? 2}
                  onChange={(e) => setField("maxPlatforms", parseInt(e.target.value))}
                />
                <Input
                  label="Max views/oy"
                  type="number"
                  value={modal.plan.maxMonthlyViews ?? 5000}
                  onChange={(e) => setField("maxMonthlyViews", parseInt(e.target.value))}
                />
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-2 pt-1">
                {[
                  { key: "hasAiInsights" as const, label: "AI Insights" },
                  { key: "hasWeeklyReport" as const, label: "Haftalik hisobot" },
                  { key: "hasCustomAlerts" as const, label: "Custom alertlar" },
                  { key: "isActive" as const, label: "Faol" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer">
                    <button
                      type="button"
                      onClick={() => setField(key, !modal.plan[key])}
                      className={`w-9 h-5 rounded-full border transition-colors flex items-center px-0.5 ${
                        modal.plan[key]
                          ? "bg-orange-500 border-orange-500"
                          : "bg-zinc-800 border-zinc-700"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full bg-white transition-transform ${modal.plan[key] ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                    <span className="text-sm text-zinc-300">{label}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-2 mt-2">
                <Button variant="secondary" className="flex-1" onClick={() => setModal(null)}>
                  Bekor
                </Button>
                <Button className="flex-1" loading={saving} onClick={handleSave}>
                  <Check className="w-4 h-4" />
                  Saqlash
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

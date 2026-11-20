"use client";

import { useState } from "react";
import {
    Save,
    Plus,
    Tag,
    Clock,
    Wallet,
    Sparkles,
    CheckCircle2,
    Eye,
    EyeOff,
} from "lucide-react";

export interface ServiceItem {
    id: string;
    name: string;
    category: string;
    description: string;
    durationMin: number;
    bufferMin: number;
    price: number;
    discountPrice?: number | null;
    depositPrice?: number | null;
    isActive: boolean;
}

interface ServicesManagerProps {
    services: ServiceItem[];
    onRefresh: () => Promise<void> | void;
}

interface ServiceDraft {
    name: string;
    category: string;
    description: string;
    durationMin: string;
    price: string;
    discountPrice: string;
    depositPrice: string;
}

export default function ServicesManager({
    services,
    onRefresh,
}: ServicesManagerProps) {
    const [drafts, setDrafts] = useState<Record<string, ServiceDraft>>(() => {
        const initial: Record<string, ServiceDraft> = {};
        services.forEach((s) => {
            initial[s.id] = {
                name: s.name,
                category: s.category,
                description: s.description || "",
                durationMin: String(s.durationMin),
                price: String(s.price),
                discountPrice: s.discountPrice != null ? String(s.discountPrice) : "",
                depositPrice: s.depositPrice != null ? String(s.depositPrice) : "",
            };
        });
        return initial;
    });

    const [savingId, setSavingId] = useState<string | null>(null);
    const [savedId, setSavedId] = useState<string | null>(null);

    // Estado para crear un nuevo servicio
    const [showNewForm, setShowNewForm] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newService, setNewService] = useState<ServiceDraft>({
        name: "",
        category: "Cejas",
        description: "",
        durationMin: "45",
        price: "",
        discountPrice: "",
        depositPrice: "",
    });

    const getDraft = (srv: ServiceItem): ServiceDraft => {
        return (
            drafts[srv.id] || {
                name: srv.name,
                category: srv.category,
                description: srv.description || "",
                durationMin: String(srv.durationMin),
                price: String(srv.price),
                discountPrice: srv.discountPrice != null ? String(srv.discountPrice) : "",
                depositPrice: srv.depositPrice != null ? String(srv.depositPrice) : "",
            }
        );
    };

    const updateField = (
        srv: ServiceItem,
        field: keyof ServiceDraft,
        value: string
    ) => {
        const current = getDraft(srv);
        setDrafts({
            ...drafts,
            [srv.id]: {
                ...current,
                [field]: value,
            },
        });
    };

    const handleSaveService = async (srv: ServiceItem) => {
        const d = getDraft(srv);
        if (!d.name.trim() || !d.price || !d.durationMin) return;

        setSavingId(srv.id);
        const res = await fetch(`/api/services/${srv.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: d.name.trim(),
                category: d.category,
                description: d.description.trim(),
                durationMin: Number(d.durationMin),
                price: Number(d.price),
                discountPrice: d.discountPrice.trim() ? Number(d.discountPrice) : null,
                depositPrice: d.depositPrice.trim() ? Number(d.depositPrice) : null,
            }),
        });
        setSavingId(null);

        if (res.ok) {
            setSavedId(srv.id);
            setTimeout(() => setSavedId(null), 2500);
            await onRefresh();
        }
    };

    const handleToggleActive = async (srv: ServiceItem) => {
        setSavingId(srv.id);
        await fetch(`/api/services/${srv.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: !srv.isActive }),
        });
        setSavingId(null);
        await onRefresh();
    };

    const handleCreateService = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newService.name.trim() || !newService.price) return;

        setCreating(true);
        const res = await fetch("/api/services", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: newService.name.trim(),
                category: newService.category,
                description: newService.description.trim(),
                durationMin: Number(newService.durationMin || 45),
                price: Number(newService.price),
                discountPrice: newService.discountPrice.trim()
                    ? Number(newService.discountPrice)
                    : null,
                depositPrice: newService.depositPrice.trim()
                    ? Number(newService.depositPrice)
                    : null,
            }),
        });
        setCreating(false);

        if (res.ok) {
            setShowNewForm(false);
            setNewService({
                name: "",
                category: "Cejas",
                description: "",
                durationMin: "45",
                price: "",
                discountPrice: "",
                depositPrice: "",
            });
            await onRefresh();
        }
    };

    const formatARS = (val: number) =>
        new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
            maximumFractionDigits: 0,
        }).format(val);

    return (
        <div className="space-y-5">
            {/* Cabecera de sección */}
            <div className="bg-white border border-lino rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                <div>
                    <h2 className="font-serif text-2xl font-semibold text-musgo">
                        Catálogo de Tratamientos y Tarifas
                    </h2>
                    <p className="text-xs text-musgo/70">
                        Editá títulos, descripciones, tiempos, señas fijas y promociones vigentes
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowNewForm(!showNewForm)}
                    className="bg-oliva-dark hover:bg-musgo text-white text-xs font-medium px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    {showNewForm ? "Cerrar formulario" : "Nuevo tratamiento"}
                </button>
            </div>

            {/* Formulario para agregar nuevo servicio */}
            {showNewForm && (
                <form
                    onSubmit={handleCreateService}
                    className="bg-white border border-oliva/50 rounded-3xl p-5 space-y-4 shadow-sm"
                >
                    <h3 className="font-serif text-xl font-semibold text-musgo flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-oliva-dark" /> Agregar Tratamiento
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-musgo mb-1">
                                Título del tratamiento *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Ej: Lifting + Botox + Tinte de Pestañas"
                                value={newService.name}
                                onChange={(e) =>
                                    setNewService({ ...newService, name: e.target.value })
                                }
                                className="w-full bg-crema border border-oliva/40 rounded-xl px-3 py-2 text-sm text-musgo focus:outline-none focus:border-oliva-dark"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-musgo mb-1">
                                Categoría
                            </label>
                            <select
                                value={newService.category}
                                onChange={(e) =>
                                    setNewService({ ...newService, category: e.target.value })
                                }
                                className="w-full bg-crema border border-oliva/40 rounded-xl px-3 py-2 text-sm text-musgo focus:outline-none focus:border-oliva-dark"
                            >
                                <option value="Pestañas">Pestañas</option>
                                <option value="Cejas">Cejas</option>
                                <option value="Combos">Combos</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-musgo mb-1">
                            Descripción breve (visible para la clienta)
                        </label>
                        <textarea
                            rows={2}
                            placeholder="Detallá qué incluye el tratamiento y sus beneficios..."
                            value={newService.description}
                            onChange={(e) =>
                                setNewService({ ...newService, description: e.target.value })
                            }
                            className="w-full bg-crema border border-oliva/40 rounded-xl px-3 py-2 text-xs text-musgo focus:outline-none focus:border-oliva-dark"
                        />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-musgo mb-1">
                                Duración (min) *
                            </label>
                            <input
                                type="number"
                                min={10}
                                step={5}
                                required
                                value={newService.durationMin}
                                onChange={(e) =>
                                    setNewService({ ...newService, durationMin: e.target.value })
                                }
                                className="w-full bg-crema border border-oliva/40 rounded-xl px-3 py-2 text-sm text-musgo"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-musgo mb-1">
                                Precio regular ($) *
                            </label>
                            <input
                                type="number"
                                min={0}
                                required
                                placeholder="24000"
                                value={newService.price}
                                onChange={(e) =>
                                    setNewService({ ...newService, price: e.target.value })
                                }
                                className="w-full bg-crema border border-oliva/40 rounded-xl px-3 py-2 text-sm text-musgo"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-musgo mb-1">
                                Precio con descuento ($)
                            </label>
                            <input
                                type="number"
                                min={0}
                                placeholder="Opcional (Promo)"
                                value={newService.discountPrice}
                                onChange={(e) =>
                                    setNewService({
                                        ...newService,
                                        discountPrice: e.target.value,
                                    })
                                }
                                className="w-full bg-crema border border-oliva/40 rounded-xl px-3 py-2 text-sm text-musgo"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-musgo mb-1">
                                Seña fija requerida ($)
                            </label>
                            <input
                                type="number"
                                min={0}
                                placeholder="Ej: 7000"
                                value={newService.depositPrice}
                                onChange={(e) =>
                                    setNewService({ ...newService, depositPrice: e.target.value })
                                }
                                className="w-full bg-crema border border-oliva/40 rounded-xl px-3 py-2 text-sm text-musgo"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowNewForm(false)}
                            className="px-4 py-2 rounded-xl text-xs font-medium bg-lino/60 text-musgo hover:bg-lino transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={creating}
                            className="px-5 py-2 rounded-xl text-xs font-medium bg-oliva-dark hover:bg-musgo text-white transition disabled:opacity-50"
                        >
                            {creating ? "Creando..." : "Crear Tratamiento"}
                        </button>
                    </div>
                </form>
            )}

            {/* Listado de Servicios Editables */}
            <div className="space-y-4">
                {services.map((srv) => {
                    const d = getDraft(srv);
                    const regularNum = Number(d.price) || 0;
                    const discountNum = d.discountPrice.trim()
                        ? Number(d.discountPrice)
                        : null;
                    const hasValidPromo =
                        discountNum !== null && discountNum > 0 && discountNum < regularNum;
                    const depositNum = d.depositPrice.trim()
                        ? Number(d.depositPrice)
                        : null;

                    return (
                        <div
                            key={srv.id}
                            className={`bg-white border rounded-3xl p-5 space-y-4 shadow-sm transition ${srv.isActive
                                    ? "border-lino"
                                    : "border-gray-200 bg-gray-50/70 opacity-80"
                                }`}
                        >
                            {/* Fila 1: Título, Categoría y Vista Previa de Precio */}
                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-lino/70 pb-4">
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-musgo/60 mb-1">
                                            Título del tratamiento
                                        </label>
                                        <input
                                            type="text"
                                            value={d.name}
                                            onChange={(e) => updateField(srv, "name", e.target.value)}
                                            className="w-full bg-crema border border-oliva/40 rounded-xl px-3 py-2 text-sm font-semibold text-musgo focus:outline-none focus:border-oliva-dark"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-musgo/60 mb-1">
                                            Categoría
                                        </label>
                                        <select
                                            value={d.category}
                                            onChange={(e) =>
                                                updateField(srv, "category", e.target.value)
                                            }
                                            className="w-full bg-crema border border-oliva/40 rounded-xl px-3 py-2 text-sm text-musgo focus:outline-none focus:border-oliva-dark"
                                        >
                                            <option value="Pestañas">Pestañas</option>
                                            <option value="Cejas">Cejas</option>
                                            <option value="Combos">Combos</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Vista previa en vivo de cómo lo ve la clienta */}
                                <div className="bg-lino/55 border border-oliva/30 rounded-2xl px-4 py-2.5 shrink-0 flex flex-col justify-center min-w-[190px]">
                                    <span className="text-[10px] uppercase tracking-wider text-musgo/60 font-semibold">
                                        Vista previa tarifa
                                    </span>
                                    {hasValidPromo && discountNum !== null ? (
                                        <div className="flex items-baseline gap-2 mt-0.5">
                                            <span className="text-xs line-through text-musgo/50">
                                                {formatARS(regularNum)}
                                            </span>
                                            <span className="text-base font-bold text-oliva-dark">
                                                {formatARS(discountNum)}
                                            </span>
                                            <span className="text-[10px] font-bold bg-oliva-dark text-white px-1.5 py-0.5 rounded-full">
                                                PROMO
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-base font-bold text-musgo mt-0.5">
                                            {formatARS(regularNum)}
                                        </span>
                                    )}
                                    <span className="text-[11px] text-musgo/70 mt-0.5">
                                        Seña:{" "}
                                        <strong>
                                            {depositNum && depositNum > 0
                                                ? `${formatARS(depositNum)} (fija)`
                                                : `${formatARS(
                                                    Math.round((hasValidPromo && discountNum ? discountNum : regularNum) * 0.3)
                                                )} (30%)`}
                                        </strong>
                                    </span>
                                </div>
                            </div>

                            {/* Fila 2: Descripción */}
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-wider text-musgo/60 mb-1">
                                    Descripción del servicio
                                </label>
                                <textarea
                                    rows={2}
                                    value={d.description}
                                    onChange={(e) =>
                                        updateField(srv, "description", e.target.value)
                                    }
                                    placeholder="Descripción breve que verá la clienta al elegir el servicio..."
                                    className="w-full bg-crema border border-oliva/40 rounded-xl px-3 py-2 text-xs text-musgo focus:outline-none focus:border-oliva-dark leading-relaxed"
                                />
                            </div>

                            {/* Fila 3: Duración, Precio Regular, Precio con Descuento, Seña Fija */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <div>
                                    <label className="text-[11px] font-semibold text-musgo/75 flex items-center gap-1 mb-1">
                                        <Clock className="w-3.5 h-3.5 text-oliva-dark" /> Duración (min)
                                    </label>
                                    <input
                                        type="number"
                                        min={10}
                                        step={5}
                                        value={d.durationMin}
                                        onChange={(e) =>
                                            updateField(srv, "durationMin", e.target.value)
                                        }
                                        className="w-full bg-crema border border-oliva/40 rounded-xl px-3 py-2 text-sm text-musgo focus:outline-none focus:border-oliva-dark"
                                    />
                                    <span className="text-[10px] text-musgo/55 block mt-0.5">
                                        +{srv.bufferMin} min limpieza estudio
                                    </span>
                                </div>

                                <div>
                                    <label className="text-[11px] font-semibold text-musgo/75 flex items-center gap-1 mb-1">
                                        <Wallet className="w-3.5 h-3.5 text-oliva-dark" /> Precio regular ($)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={d.price}
                                        onChange={(e) => updateField(srv, "price", e.target.value)}
                                        className="w-full bg-crema border border-oliva/40 rounded-xl px-3 py-2 text-sm text-musgo focus:outline-none focus:border-oliva-dark"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-semibold text-oliva-dark flex items-center gap-1 mb-1">
                                        <Tag className="w-3.5 h-3.5" /> Precio c/ descuento ($)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        placeholder="Vacío = sin promo"
                                        value={d.discountPrice}
                                        onChange={(e) =>
                                            updateField(srv, "discountPrice", e.target.value)
                                        }
                                        className="w-full bg-crema border border-oliva/40 rounded-xl px-3 py-2 text-sm text-musgo focus:outline-none focus:border-oliva-dark"
                                    />
                                    <span className="text-[10px] text-musgo/55 block mt-0.5">
                                        Tacha el precio regular
                                    </span>
                                </div>

                                <div>
                                    <label className="text-[11px] font-semibold text-musgo/75 flex items-center gap-1 mb-1">
                                        Seña fija requerida ($)
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        placeholder="Vacío = 30% auto"
                                        value={d.depositPrice}
                                        onChange={(e) =>
                                            updateField(srv, "depositPrice", e.target.value)
                                        }
                                        className="w-full bg-crema border border-oliva/40 rounded-xl px-3 py-2 text-sm text-musgo focus:outline-none focus:border-oliva-dark"
                                    />
                                    <span className="text-[10px] text-musgo/55 block mt-0.5">
                                        Monto fijo en ARS
                                    </span>
                                </div>
                            </div>

                            {/* Fila 4: Acciones */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-lino/70">
                                <button
                                    type="button"
                                    disabled={savingId === srv.id}
                                    onClick={() => handleToggleActive(srv)}
                                    className={`text-xs px-3 py-2 rounded-xl border flex items-center gap-1.5 font-medium transition ${srv.isActive
                                            ? "border-oliva text-oliva-dark bg-oliva/10 hover:bg-oliva/20"
                                            : "border-gray-300 text-gray-500 bg-white hover:bg-gray-100"
                                        }`}
                                >
                                    {srv.isActive ? (
                                        <>
                                            <Eye className="w-3.5 h-3.5" /> Visible en la web
                                        </>
                                    ) : (
                                        <>
                                            <EyeOff className="w-3.5 h-3.5" /> Oculto en la web
                                        </>
                                    )}
                                </button>

                                <div className="flex items-center gap-2">
                                    {savedId === srv.id && (
                                        <span className="text-xs text-emerald-700 flex items-center gap-1 font-medium">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> ¡Guardado!
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        disabled={savingId === srv.id}
                                        onClick={() => handleSaveService(srv)}
                                        className="bg-oliva-dark hover:bg-musgo text-white text-xs font-medium px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        {savingId === srv.id ? "Guardando..." : "Guardar cambios"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
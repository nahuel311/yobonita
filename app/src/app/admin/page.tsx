"use client";

import { useEffect, useState } from "react";
import {
  Lock,
  Check,
  X,
  MessageCircle,
  Save,
  Calendar,
  Sparkles,
  FileText,
} from "lucide-react";

export default function AdminPage() {
  const [auth, setAuth] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [tab, setTab] = useState<"agenda" | "servicios">("agenda");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [techNotesMap, setTechNotesMap] = useState<Record<string, string>>({});
  const [priceMap, setPriceMap] = useState<Record<string, string>>({});

  // Personalizá acá la dirección exacta que se envía solo cuando confirmás la seña
  const EXACT_ADDRESS_MSG =
    "📍 Dirección exacta: Av. Santa Fe XXXX, Piso X, Depto X (Recoleta). Recordá venir sin maquillaje en los ojos. ¡Te espero!";

  const checkAuth = async () => {
    const res = await fetch("/api/admin/login");
    const data = await res.json();
    setAuth(data.authenticated);
    if (data.authenticated) loadData();
  };

  const loadData = async () => {
    const [appRes, srvRes] = await Promise.all([
      fetch("/api/appointments"),
      fetch("/api/services?all=true"),
    ]);
    if (appRes.ok) {
      const apps = await appRes.json();
      setAppointments(apps);
      const notes: Record<string, string> = {};
      apps.forEach((a: any) => (notes[a.id] = a.techNotes || ""));
      setTechNotesMap(notes);
    }
    if (srvRes.ok) {
      const srvs = await srvRes.json();
      setServices(srvs);
      const prices: Record<string, string> = {};
      srvs.forEach((s: any) => (prices[s.id] = String(s.price)));
      setPriceMap(prices);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuth(true);
      loadData();
    } else {
      setLoginError("Contraseña incorrecta");
    }
  };

  const updateAppointment = async (id: string, payload: any) => {
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    loadData();
  };

  const updateService = async (id: string, payload: any) => {
    await fetch(`/api/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    loadData();
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getWhatsAppConfirmLink = (app: any) => {
    const msg = `¡Hola ${app.clientName}! Recibí tu seña, tu turno para *${app.service.name}* (${formatDateTime(
      app.startTime
    )} hs) está *CONFIRMADO* ✨\n\n${EXACT_ADDRESS_MSG}`;
    return `https://wa.me/${app.clientPhone}?text=${encodeURIComponent(msg)}`;
  };

  if (auth === null) return <div className="p-8 text-center text-sm">Cargando...</div>;

  if (!auth) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-white border border-lino rounded-3xl p-6 space-y-4 shadow-sm"
        >
          <div className="text-center">
            <Lock className="w-8 h-8 text-oliva-dark mx-auto mb-2" />
            <h1 className="font-serif text-3xl font-semibold text-musgo">
              Yo Bonita • Admin
            </h1>
          </div>
          <input
            type="password"
            placeholder="Contraseña de administración"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-crema border border-oliva/40 rounded-xl px-3.5 py-2.5 text-sm"
          />
          {loginError && <p className="text-xs text-red-600">{loginError}</p>}
          <button
            type="submit"
            className="w-full bg-oliva-dark text-white py-2.5 rounded-xl text-sm font-medium"
          >
            Ingresar
          </button>
        </form>
      </div>
    );
  }

  const activeAppointments = appointments.filter((a) => a.status !== "CANCELLED");

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-lino pb-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-musgo">
            Gestión Yo Bonita
          </h1>
          <p className="text-xs text-musgo/70">Panel de turnos y catálogo</p>
        </div>
        <div className="flex gap-2 bg-lino/60 p-1 rounded-xl">
          <button
            onClick={() => setTab("agenda")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
              tab === "agenda" ? "bg-white text-musgo shadow-sm" : "text-musgo/70"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Agenda ({activeAppointments.length})
          </button>
          <button
            onClick={() => setTab("servicios")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
              tab === "servicios" ? "bg-white text-musgo shadow-sm" : "text-musgo/70"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Servicios y Precios
          </button>
        </div>
      </header>

      {tab === "agenda" ? (
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <p className="text-sm text-musgo/70 text-center py-8">
              Todavía no hay turnos registrados.
            </p>
          ) : (
            appointments.map((app) => (
              <div
                key={app.id}
                className="bg-white border border-lino rounded-2xl p-4 space-y-3 shadow-sm"
              >
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div>
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase mb-1 ${
                        app.status === "CONFIRMED"
                          ? "bg-oliva/30 text-oliva-dark"
                          : app.status === "PENDING"
                          ? "bg-amber-100 text-amber-800"
                          : app.status === "COMPLETED"
                          ? "bg-musgo text-white"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {app.status === "PENDING"
                        ? "Esperando Seña"
                        : app.status === "CONFIRMED"
                        ? "Confirmado"
                        : app.status === "COMPLETED"
                        ? "Realizado"
                        : "Cancelado"}
                    </span>
                    <h3 className="font-semibold text-musgo">
                      {app.clientName} — {app.service.name}
                    </h3>
                    <p className="text-xs text-musgo/80 font-medium">
                      📅 {formatDateTime(app.startTime)} hs
                    </p>
                  </div>

                  {/* Acciones de Estado */}
                  <div className="flex flex-wrap gap-1.5">
                    {app.status === "PENDING" && (
                      <button
                        onClick={() => updateAppointment(app.id, { status: "CONFIRMED" })}
                        className="bg-oliva-dark text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Confirmar Seña
                      </button>
                    )}
                    {app.status === "CONFIRMED" && (
                      <>
                        <a
                          href={getWhatsAppConfirmLink(app)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Enviar Dirección
                        </a>
                        <button
                          onClick={() => updateAppointment(app.id, { status: "COMPLETED" })}
                          className="bg-musgo text-white text-xs px-3 py-1.5 rounded-lg"
                        >
                          Marcar Realizado
                        </button>

                        <button
                          onClick={async () => {
                            const res = await fetch(`/api/appointments/${app.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ action: "SEND_REMINDER" }),
                            });
                            if (res.ok) alert("Recordatorio enviado por WhatsApp ✨");
                          }}
                          className="bg-oliva text-musgo text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Recordatorio
                        </button>
                      </>
                    )}
                    {app.status !== "CANCELLED" && app.status !== "COMPLETED" && (
                      <button
                        onClick={() => updateAppointment(app.id, { status: "CANCELLED" })}
                        className="border border-red-200 text-red-700 text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Cancelar
                      </button>
                    )}
                  </div>
                </div>

                {app.clientNotes && (
                  <p className="text-xs bg-lino/60 p-2.5 rounded-xl text-musgo">
                    <strong>Nota de la clienta:</strong> {app.clientNotes}
                  </p>
                )}

                {/* Ficha Técnica Privada */}
                <div className="pt-2 border-t border-lino/70 flex gap-2">
                  <div className="flex-1 flex items-center gap-1.5 bg-crema rounded-xl px-3 py-1.5">
                    <FileText className="w-3.5 h-3.5 text-oliva-dark shrink-0" />
                    <input
                      type="text"
                      placeholder="Ficha técnica: molde bigudí, tiempos, pigmento..."
                      value={techNotesMap[app.id] ?? ""}
                      onChange={(e) =>
                        setTechNotesMap({ ...techNotesMap, [app.id]: e.target.value })
                      }
                      className="w-full bg-transparent text-xs focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() =>
                      updateAppointment(app.id, { techNotes: techNotesMap[app.id] })
                    }
                    className="bg-lino hover:bg-oliva text-musgo text-xs px-3 py-1.5 rounded-xl flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" /> Guardar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((srv) => (
            <div
              key={srv.id}
              className="bg-white border border-lino rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <h3 className="font-medium text-musgo text-sm">{srv.name}</h3>
                <p className="text-xs text-musgo/65">
                  {srv.category} • {srv.durationMin} min (+{srv.bufferMin} min limpieza)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={priceMap[srv.id] ?? srv.price}
                  onChange={(e) =>
                    setPriceMap({ ...priceMap, [srv.id]: e.target.value })
                  }
                  className="w-28 bg-crema border border-oliva/40 rounded-lg px-2.5 py-1.5 text-sm"
                />
                <button
                  onClick={() =>
                    updateService(srv.id, { price: Number(priceMap[srv.id]) })
                  }
                  className="bg-oliva-dark text-white text-xs px-3 py-2 rounded-lg"
                >
                  Actualizar
                </button>
                <button
                  onClick={() =>
                    updateService(srv.id, { isActive: !srv.isActive })
                  }
                  className={`text-xs px-3 py-2 rounded-lg border ${
                    srv.isActive
                      ? "border-oliva text-oliva-dark"
                      : "border-gray-300 text-gray-500"
                  }`}
                >
                  {srv.isActive ? "Activo" : "Oculto"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import DayAgendaView from "@/components/admin/DayAgendaView";
import {
  Lock,
  Check,
  X,
  MessageCircle,
  Save,
  Calendar,
  Sparkles,
  FileText,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Ban,
  CheckCircle2,
} from "lucide-react";

export default function AdminPage() {
  const [auth, setAuth] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [tab, setTab] = useState<"agenda" | "horarios" | "servicios">("agenda");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [workingHours, setWorkingHours] = useState<any[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
  const [savingHours, setSavingHours] = useState(false);
  const [hoursSuccess, setHoursSuccess] = useState("");

  const [techNotesMap, setTechNotesMap] = useState<Record<string, string>>({});
  const [priceMap, setPriceMap] = useState<Record<string, string>>({});

  // Control de semana seleccionada
  const [currentWeekMonday, setCurrentWeekMonday] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(now);
    mon.setDate(diff);
    mon.setHours(0, 0, 0, 0);
    return mon;
  });

  // Modal para bloqueo puntual de franja
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockDate, setBlockDate] = useState("");
  const [blockStartTime, setBlockStartTime] = useState("13:00");
  const [blockEndTime, setBlockEndTime] = useState("15:00");
  const [blockReason, setBlockReason] = useState("");
  const [savingBlock, setSavingBlock] = useState(false);

  // Personalizá acá la dirección exacta que se envía solo cuando confirmás la seña
  const EXACT_ADDRESS_MSG =
    "📍 Dirección exacta: Av. Santa Fe XXXX, Piso X, Depto X (Recoleta). Recordá venir sin maquillaje en los ojos. ¡Te espero!";

  const DAY_NAMES = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];

  const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Lunes a Domingo

  const toISODate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatTimeOnly = (iso: string | Date) => {
    const d = typeof iso === "string" ? new Date(iso) : iso;
    return d.toLocaleTimeString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getDaysOfSelectedWeek = () => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentWeekMonday);
      d.setDate(currentWeekMonday.getDate() + i);
      return d;
    });
  };

  const navigateWeek = (offsetDays: number) => {
    const next = new Date(currentWeekMonday);
    next.setDate(currentWeekMonday.getDate() + offsetDays);
    setCurrentWeekMonday(next);
  };

  const checkAuth = async () => {
    const res = await fetch("/api/admin/login");
    const data = await res.json();
    setAuth(data.authenticated);
    if (data.authenticated) loadData();
  };

  const loadData = async () => {
    const [appRes, srvRes, whRes, blkRes] = await Promise.all([
      fetch("/api/appointments"),
      fetch("/api/services?all=true"),
      fetch("/api/working-hours"),
      fetch("/api/blocked-slots"),
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
    if (whRes.ok) {
      const wh = await whRes.json();
      setWorkingHours(wh);
    }
    if (blkRes.ok) {
      const blk = await blkRes.json();
      setBlockedSlots(blk);
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

  const handleSaveWorkingHours = async () => {
    setSavingHours(true);
    setHoursSuccess("");
    const res = await fetch("/api/working-hours", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workingHours }),
    });
    setSavingHours(false);
    if (res.ok) {
      setHoursSuccess("¡Horarios de atención guardados exitosamente!");
      setTimeout(() => setHoursSuccess(""), 4000);
      loadData();
    }
  };

  const handleToggleFullDayBlock = async (dateISO: string, existingBlockId?: string) => {
    if (existingBlockId) {
      await fetch(`/api/blocked-slots/${existingBlockId}`, { method: "DELETE" });
    } else {
      await fetch("/api/blocked-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: `${dateISO}T00:00:00-03:00`,
          endTime: `${dateISO}T23:59:59-03:00`,
          reason: "Día completo bloqueado",
        }),
      });
    }
    loadData();
  };

  const handleCreatePartialBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDate || !blockStartTime || !blockEndTime) return;
    setSavingBlock(true);
    const res = await fetch("/api/blocked-slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startTime: `${blockDate}T${blockStartTime}:00-03:00`,
        endTime: `${blockDate}T${blockEndTime}:00-03:00`,
        reason: blockReason || "Horario no disponible",
      }),
    });
    setSavingBlock(false);
    if (res.ok) {
      setShowBlockModal(false);
      setBlockReason("");
      loadData();
    }
  };

  const handleDeleteBlock = async (id: string) => {
    await fetch(`/api/blocked-slots/${id}`, { method: "DELETE" });
    loadData();
  };

  const getFullDayBlock = (dateISO: string) => {
    return blockedSlots.find((b) => {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      const startISO = toISODate(bStart);
      const diffHours = (bEnd.getTime() - bStart.getTime()) / (1000 * 60 * 60);
      return (
        startISO === dateISO &&
        (diffHours >= 14 || b.reason?.toLowerCase().includes("completo"))
      );
    });
  };

  const getPartialBlocksForDay = (dateISO: string) => {
    return blockedSlots.filter((b) => {
      const bStart = new Date(b.startTime);
      const bEnd = new Date(b.endTime);
      const startISO = toISODate(bStart);
      const diffHours = (bEnd.getTime() - bStart.getTime()) / (1000 * 60 * 60);
      return (
        startISO === dateISO &&
        !(diffHours >= 14 || b.reason?.toLowerCase().includes("completo"))
      );
    });
  };

  const getAppointmentsForDay = (dateISO: string) => {
    return appointments.filter((a) => {
      if (a.status === "CANCELLED") return false;
      const aStart = new Date(a.startTime);
      return toISODate(aStart) === dateISO;
    });
  };

  const formatDateTime = (iso: string | Date) => {
    const d = typeof iso === "string" ? new Date(iso) : iso;
    return d.toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
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
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-lino pb-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-musgo">
            Gestión Yo Bonita
          </h1>
          <p className="text-xs text-musgo/70">Panel de turnos, horarios y catálogo</p>
        </div>
        <div className="flex flex-wrap gap-2 bg-lino/60 p-1 rounded-xl">
          <button
            onClick={() => setTab("agenda")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
              tab === "agenda" ? <DayAgendaView (
                appointments={appointments}
                blockedSlots={blockedSlots} // Si ya los cargás en loadData(), sino podés omitirlo
                onUpdateAppointment={updateAppointment}
                onSendReminder={async (id) => {
                  const res = await fetch(`/api/appointments/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "SEND_REMINDER" }),
                  });
                  if (res.ok) alert("Recordatorio enviado por WhatsApp ✨");
                }}
              />
              ) : (
                  /* ... resto de pestañas existentes (Servicios / Horarios) ... */
                  )
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Agenda ({activeAppointments.length})
          </button>
          <button
            onClick={() => setTab("horarios")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
              tab === "horarios" ? "bg-white text-musgo shadow-sm" : "text-musgo/70"
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Días y Horarios
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
      ) : tab === "horarios" ? (
        <div className="space-y-8">
          {/* Vista Semanal Interactiva */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-lino rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigateWeek(-7)}
                  className="p-1.5 rounded-lg hover:bg-lino/60 text-musgo transition"
                  title="Semana anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-sm font-medium text-musgo">
                  Semana del{" "}
                  <strong>
                    {currentWeekMonday.toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </strong>{" "}
                  al{" "}
                  <strong>
                    {new Date(
                      currentWeekMonday.getTime() + 6 * 24 * 60 * 60 * 1000
                    ).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => navigateWeek(7)}
                  className="p-1.5 rounded-lg hover:bg-lino/60 text-musgo transition"
                  title="Semana siguiente"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const day = now.getDay();
                    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                    const mon = new Date(now);
                    mon.setDate(diff);
                    mon.setHours(0, 0, 0, 0);
                    setCurrentWeekMonday(mon);
                  }}
                  className="text-xs bg-lino/60 hover:bg-lino px-3 py-2 rounded-xl text-musgo font-medium transition"
                >
                  Esta semana
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBlockDate(toISODate(new Date()));
                    setBlockStartTime("13:00");
                    setBlockEndTime("15:00");
                    setBlockReason("");
                    setShowBlockModal(true);
                  }}
                  className="text-xs bg-oliva-dark hover:bg-musgo text-white px-3.5 py-2 rounded-xl font-medium flex items-center gap-1.5 transition shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Bloquear franja
                </button>
              </div>
            </div>

            {/* Cuadrícula de 7 Días de la Semana */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
              {getDaysOfSelectedWeek().map((dayDate) => {
                const dateISO = toISODate(dayDate);
                const dayNum = dayDate.getDay();
                const isToday = toISODate(new Date()) === dateISO;
                const fullDayBlock = getFullDayBlock(dateISO);
                const regularHours = workingHours.find((w) => w.dayOfWeek === dayNum);
                const isRegularOpen = regularHours?.isOpen ?? (dayNum !== 0 && dayNum !== 6);
                const partialBlocks = getPartialBlocksForDay(dateISO);
                const dayAppointments = getAppointmentsForDay(dateISO);

                return (
                  <div
                    key={dateISO}
                    className={`rounded-2xl p-3 border flex flex-col justify-between transition-all ${
                      fullDayBlock
                        ? "bg-red-50/60 border-red-200"
                        : isToday
                        ? "bg-white border-oliva shadow-sm ring-1 ring-oliva/40"
                        : "bg-white border-lino hover:border-oliva/50"
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Cabecera del Día */}
                      <div className="border-b border-lino/70 pb-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-musgo">
                            {DAY_NAMES[dayNum].slice(0, 3)}
                          </span>
                          {isToday && (
                            <span className="text-[10px] bg-oliva/30 text-oliva-dark font-bold px-1.5 py-0.2 rounded-full">
                              Hoy
                            </span>
                          )}
                        </div>
                        <div className="text-base font-serif font-bold text-musgo">
                          {dayDate.getDate()}{" "}
                          <span className="text-[11px] font-sans font-normal text-musgo/60">
                            {dayDate.toLocaleDateString("es-AR", { month: "short" })}
                          </span>
                        </div>
                        <div className="mt-1">
                          {fullDayBlock ? (
                            <span className="inline-block text-[10px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                              🚫 Día bloqueado
                            </span>
                          ) : isRegularOpen ? (
                            <span className="inline-block text-[10px] font-medium text-oliva-dark bg-oliva/20 px-2 py-0.5 rounded-full">
                              ✓ {regularHours?.startTime || "08:00"} - {regularHours?.endTime || "19:30"}
                            </span>
                          ) : (
                            <span className="inline-block text-[10px] font-medium text-musgo/50 bg-gray-100 px-2 py-0.5 rounded-full">
                              Cerrado habitual
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Eventos del Día */}
                      <div className="space-y-1.5 min-h-[70px]">
                        {fullDayBlock ? (
                          <div className="p-2 rounded-xl bg-red-100/70 text-red-800 text-[11px] leading-tight">
                            <strong>No se atiende este día.</strong>
                            <p className="text-[10px] text-red-700/80 mt-0.5">
                              {fullDayBlock.reason || "Día completo bloqueado"}
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Franja fija de almuerzo por default en días hábiles */}
                            {dayNum >= 1 && dayNum <= 5 && isRegularOpen && (
                              <div className="bg-amber-50/80 border border-amber-200/70 rounded-lg px-2 py-1 text-[10px] text-amber-900 flex items-center justify-between">
                                <span className="font-semibold flex items-center gap-1">
                                  🥪 13:30 - 15:00
                                </span>
                                <span className="text-[9px] text-amber-700 bg-amber-100/90 px-1.5 py-0.2 rounded font-medium">
                                  Almuerzo
                                </span>
                              </div>
                            )}

                            {partialBlocks.map((blk) => (
                              <div
                                key={blk.id}
                                className="bg-amber-50 border border-amber-200/80 rounded-lg p-1.5 text-[10px] text-amber-900 flex items-center justify-between gap-1"
                              >
                                <div>
                                  <span className="font-semibold">
                                    ⏱️ {formatTimeOnly(blk.startTime)} a{" "}
                                    {formatTimeOnly(blk.endTime)}
                                  </span>
                                  {blk.reason && (
                                    <p className="text-[9px] text-amber-800/80 truncate max-w-[90px]">
                                      {blk.reason}
                                    </p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBlock(blk.id)}
                                  className="text-red-500 hover:text-red-700 p-0.5"
                                  title="Quitar bloqueo"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}

                            {dayAppointments.map((app) => (
                              <div
                                key={app.id}
                                className="bg-lino/40 border border-oliva/20 rounded-lg p-1.5 text-[10px] text-musgo leading-tight"
                              >
                                <span className="font-semibold text-oliva-dark">
                                  {formatTimeOnly(app.startTime)} hs
                                </span>{" "}
                                <span className="truncate block font-medium">
                                  {app.clientName}
                                </span>
                                <span className="text-[9px] text-musgo/60 block truncate">
                                  {app.service?.name}
                                </span>
                              </div>
                            ))}

                            {partialBlocks.length === 0 && dayAppointments.length === 0 && (
                              <p className="text-[10px] text-musgo/40 italic py-2 text-center">
                                Sin turnos ni bloqueos
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Botones de Acción Rápida para el Día */}
                    <div className="pt-2 border-t border-lino/60 space-y-1 mt-2">
                      {fullDayBlock ? (
                        <button
                          type="button"
                          onClick={() => handleToggleFullDayBlock(dateISO, fullDayBlock.id)}
                          className="w-full py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-[11px] font-medium transition flex items-center justify-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Desbloquear día
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleFullDayBlock(dateISO)}
                            className="w-full py-1 px-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[10px] font-medium transition flex items-center justify-center gap-1"
                          >
                            <Ban className="w-3 h-3" /> Bloquear día
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBlockDate(dateISO);
                              setBlockStartTime("13:00");
                              setBlockEndTime("15:00");
                              setBlockReason("");
                              setShowBlockModal(true);
                            }}
                            className="w-full py-1 px-1.5 bg-crema hover:bg-lino text-musgo/80 border border-oliva/30 rounded-lg text-[10px] transition flex items-center justify-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Franja
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Configuración Habitual Semanal (Base) */}
          <section className="bg-white border border-lino rounded-3xl p-6 space-y-5 shadow-sm">
            <div className="border-b border-lino pb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-musgo">
                  Horarios Semanales Habituales
                </h2>
                <p className="text-xs text-musgo/70 mt-0.5">
                  Definí qué días de la semana atendés de forma regular y tu rango horario general:
                </p>
              </div>

              {hoursSuccess && (
                <span className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {hoursSuccess}
                </span>
              )}
            </div>

            <div className="space-y-3">
              {ORDERED_DAYS.map((dayOfWeekNum) => {
                const wh = workingHours.find((w) => w.dayOfWeek === dayOfWeekNum) || {
                  dayOfWeek: dayOfWeekNum,
                  startTime: "08:00",
                  endTime: "19:30",
                  isOpen: dayOfWeekNum !== 0 && dayOfWeekNum !== 6,
                };

                const updateDayProperty = (property: string, value: any) => {
                  const existingIdx = workingHours.findIndex(
                    (w) => w.dayOfWeek === dayOfWeekNum
                  );
                  if (existingIdx >= 0) {
                    const clone = [...workingHours];
                    clone[existingIdx] = { ...clone[existingIdx], [property]: value };
                    setWorkingHours(clone);
                  } else {
                    setWorkingHours([
                      ...workingHours,
                      { ...wh, [property]: value },
                    ]);
                  }
                };

                return (
                  <div
                    key={dayOfWeekNum}
                    className={`p-3.5 rounded-2xl border transition flex flex-wrap items-center justify-between gap-3 ${
                      wh.isOpen
                        ? "bg-crema/40 border-oliva/30"
                        : "bg-gray-50 border-gray-200 opacity-75"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateDayProperty("isOpen", !wh.isOpen)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-medium border transition ${
                          wh.isOpen
                            ? "bg-oliva-dark text-white border-oliva-dark shadow-sm"
                            : "bg-white text-gray-500 border-gray-300"
                        }`}
                      >
                        {wh.isOpen ? "✓ Atiende" : "Cerrado"}
                      </button>
                      <div>
                        <span className="font-semibold text-sm text-musgo">
                          {DAY_NAMES[dayOfWeekNum]}
                        </span>
                        <span className="text-xs text-musgo/60 block">
                          {wh.isOpen ? "Día laboral habilitado" : "No atiende este día"}
                        </span>
                      </div>
                    </div>

                    {wh.isOpen && (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-musgo/70">Horario (24 hs):</span>
                        <input
                          type="time"
                          value={wh.startTime || "08:00"}
                          onChange={(e) => updateDayProperty("startTime", e.target.value)}
                          className="bg-white border border-oliva/40 rounded-xl px-2.5 py-1.5 text-xs text-musgo focus:outline-none focus:border-oliva-dark font-medium"
                        />
                        <span className="text-musgo/70">a</span>
                        <input
                          type="time"
                          value={wh.endTime || "19:30"}
                          onChange={(e) => updateDayProperty("endTime", e.target.value)}
                          className="bg-white border border-oliva/40 rounded-xl px-2.5 py-1.5 text-xs text-musgo focus:outline-none focus:border-oliva-dark font-medium"
                        />
                        {dayOfWeekNum >= 1 && dayOfWeekNum <= 5 && (
                          <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-1 rounded-lg font-medium ml-1">
                            🥪 Almuerzo: 13:30 - 15:00
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              disabled={savingHours}
              onClick={handleSaveWorkingHours}
              className="w-full bg-oliva-dark hover:bg-musgo text-white font-medium py-3 rounded-2xl transition flex items-center justify-center gap-2 text-sm shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingHours ? "Guardando cambios..." : "Guardar Configuración Habitual"}
            </button>
          </section>

          {/* Modal para Bloqueo Puntual de Franja Horaria */}
          {showBlockModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <form
                onSubmit={handleCreatePartialBlock}
                className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-lino animate-in fade-in zoom-in-95"
              >
                <div className="flex justify-between items-center border-b border-lino pb-2">
                  <h3 className="font-serif text-xl font-semibold text-musgo flex items-center gap-2">
                    <Clock className="w-5 h-5 text-oliva-dark" /> Bloquear Horario
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowBlockModal(false)}
                    className="text-musgo/60 hover:text-musgo p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-musgo mb-1">
                    Fecha a bloquear
                  </label>
                  <input
                    type="date"
                    required
                    value={blockDate}
                    onChange={(e) => setBlockDate(e.target.value)}
                    className="w-full bg-crema border border-oliva/40 rounded-xl px-3 py-2 text-sm text-musgo focus:outline-none focus:border-oliva-dark"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-musgo mb-1">
                      Desde
                    </label>
                    <input
                      type="time"
                      required
                      value={blockStartTime}
                      onChange={(e) => setBlockStartTime(e.target.value)}
                      className="w-full bg-crema border border-oliva/40 rounded-xl px-3 py-2 text-sm text-musgo focus:outline-none focus:border-oliva-dark"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-musgo mb-1">
                      Hasta
                    </label>
                    <input
                      type="time"
                      required
                      value={blockEndTime}
                      onChange={(e) => setBlockEndTime(e.target.value)}
                      className="w-full bg-crema border border-oliva/40 rounded-xl px-3 py-2 text-sm text-musgo focus:outline-none focus:border-oliva-dark"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-musgo mb-1">
                    Motivo (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Trámites, médico, almuerzo..."
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    className="w-full bg-crema border border-oliva/40 rounded-xl px-3 py-2 text-sm text-musgo focus:outline-none focus:border-oliva-dark"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBlockModal(false)}
                    className="flex-1 bg-lino/60 hover:bg-lino text-musgo font-medium py-2.5 rounded-xl text-xs transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingBlock}
                    className="flex-1 bg-oliva-dark hover:bg-musgo text-white font-medium py-2.5 rounded-xl text-xs transition disabled:opacity-50"
                  >
                    {savingBlock ? "Guardando..." : "Confirmar Bloqueo"}
                  </button>
                </div>
              </form>
            </div>
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

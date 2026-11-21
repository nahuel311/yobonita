"use client";

import { useMemo, useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    Check,
    X,
    MessageCircle,
    Save,
    FileText,
    User,
    Phone,
    Sparkles,
    AlertCircle,
    Link2,
    ExternalLink,
    Copy,
    Coffee,
} from "lucide-react";

export interface AppointmentItem {
    id: string;
    manageToken?: string | null;
    clientName: string;
    clientPhone: string;
    clientNotes?: string | null;
    techNotes?: string | null;
    startTime: string;
    endTime: string;
    status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | string;
    client?: {
        id: string;
        phone: string;
        name: string;
        techNotes?: string | null;
        _count?: {
            appointments: number;
        };
    } | null;
    service: {
        id: string;
        name: string;
        category: string;
        durationMin: number;
        bufferMin: number;
        price: number;
    };
}

export interface BlockedSlotItem {
    id: string;
    startTime: string;
    endTime: string;
    reason?: string | null;
}

interface DayAgendaViewProps {
    appointments: AppointmentItem[];
    blockedSlots?: BlockedSlotItem[];
    onUpdateAppointment: (id: string, payload: Record<string, unknown>) => Promise<void>;
    onDeleteAppointment: (id: string) => Promise<void>;
    onSendReminder: (id: string) => Promise<void>;
}

// Configuración de la grilla: 08:00 a 20:00 hs en bloques de 30 min
const START_HOUR = 8;
const END_HOUR = 20;
const SLOT_MINUTES = 30;
const ROW_HEIGHT_PX = 56; // 56px por cada 30 min (112px por hora)
const TOTAL_SLOTS = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;

function getArgDateStr(date: Date): string {
    return date.toLocaleDateString("en-CA", {
        timeZone: "America/Argentina/Buenos_Aires",
    });
}

function getArgMinutesFromMidnight(isoString: string): number {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Argentina/Buenos_Aires",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(new Date(isoString));

    const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    return hour * 60 + minute;
}

function formatArgTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

export default function DayAgendaView({
    appointments,
    blockedSlots = [],
    onUpdateAppointment,
    onDeleteAppointment,
    onSendReminder,
}: DayAgendaViewProps) {
    const todayStr = useMemo(() => getArgDateStr(new Date()), []);
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);
    const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
    const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
    const [busyAction, setBusyAction] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    const getManageUrl = (token: string) => {
        const baseUrl =
            typeof window !== "undefined"
                ? window.location.origin
                : process.env.NEXT_PUBLIC_SITE_URL || "https://yobonita.com.ar";
        return `${baseUrl}/turno/${token}`;
    };

    const handleCopyManageLink = async (token: string) => {
        const url = getManageUrl(token);
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const selectedAppointment = useMemo(
        () => appointments.find((a) => a.id === selectedAppId) || null,
        [appointments, selectedAppId]
    );

    // Navegación entre días
    const shiftDate = (days: number) => {
        const base = new Date(`${selectedDate}T12:00:00-03:00`);
        base.setDate(base.getDate() + days);
        setSelectedDate(getArgDateStr(base));
        setSelectedAppId(null);
    };

    // Generar renglones cada 30 minutos
    const timeRows = useMemo(() => {
        return Array.from({ length: TOTAL_SLOTS }, (_, idx) => {
            const totalMin = START_HOUR * 60 + idx * SLOT_MINUTES;
            const hh = String(Math.floor(totalMin / 60)).padStart(2, "0");
            const mm = String(totalMin % 60).padStart(2, "0");
            const isLunch = totalMin >= 13 * 60 + 30 && totalMin < 15 * 60; // 13:30 a 15:00
            return {
                index: idx,
                totalMin,
                label: `${hh}:${mm}`,
                isHourStart: mm === "00",
                isLunch,
            };
        });
    }, []);

    // Filtrar turnos activos del día seleccionado (excluye cancelados de la grilla)
    const dayAppointments = useMemo(() => {
        return appointments.filter((app) => {
            return getArgDateStr(new Date(app.startTime)) === selectedDate;
        });
    }, [appointments, selectedDate]);

    // Filtrar bloqueos del día seleccionado
    const dayBlocks = useMemo(() => {
        return blockedSlots.filter((blk) => {
            const dayStart = new Date(`${selectedDate}T00:00:00-03:00`);
            const dayEnd = new Date(`${selectedDate}T23:59:59-03:00`);
            return new Date(blk.startTime) <= dayEnd && new Date(blk.endTime) >= dayStart;
        });
    }, [blockedSlots, selectedDate]);

    const handleSelectAppointment = (app: AppointmentItem) => {
        setSelectedAppId(app.id);
        const persistentNotes = getPersistentTechNotes(app);
        setNotesDraft((prev) => ({
            ...prev,
            [app.id]: prev[app.id] !== undefined ? prev[app.id] : persistentNotes,
        }));
    };

    const handleStatusChange = async (id: string, status: string) => {
        setBusyAction(true);
        await onUpdateAppointment(id, { status });
        setBusyAction(false);
        if (status === "CANCELLED") {
            setSelectedAppId(null);
        }
    };

    const handleSaveNotes = async (id: string) => {
        setBusyAction(true);
        await onUpdateAppointment(id, { techNotes: notesDraft[id] ?? "" });
        setBusyAction(false);
    };

    const formatDateTitle = (dateStr: string) => {
        const d = new Date(`${dateStr}T12:00:00-03:00`);
        return d.toLocaleDateString("es-AR", {
            timeZone: "America/Argentina/Buenos_Aires",
            weekday: "long",
            day: "numeric",
            month: "long",
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "CONFIRMED":
                return {
                    label: "Confirmado",
                    cardStyle: "bg-oliva/25 border-oliva-dark text-musgo",
                    badgeStyle: "bg-oliva-dark text-white",
                };
            case "PENDING":
                return {
                    label: "Esperando Seña",
                    cardStyle: "bg-amber-50 border-amber-400 text-musgo",
                    badgeStyle: "bg-amber-500 text-white",
                };
            case "COMPLETED":
                return {
                    label: "Realizado",
                    cardStyle: "bg-musgo/10 border-musgo/50 text-musgo",
                    badgeStyle: "bg-musgo text-white",
                };
            case "CANCELLED":
                return {
                    label: "Cancelado",
                    cardStyle: "bg-red-50/85 border-red-300 text-musgo/70",
                    badgeStyle: "bg-red-600 text-white",
                };
            default:
                return {
                    label: status,
                    cardStyle: "bg-lino border-oliva text-musgo",
                    badgeStyle: "bg-musgo text-white",
                };
        }
    };

    const getPersistentTechNotes = (app: AppointmentItem): string => {
        if (app.client?.techNotes !== undefined && app.client?.techNotes !== null) {
            return app.client.techNotes;
        }
        // Respaldo para turnos creados antes de activar el modelo Client
        const matchWithNotes = appointments.find(
            (other) => other.clientPhone === app.clientPhone && other.techNotes
        );
        return matchWithNotes?.techNotes || app.techNotes || "";
    };

    const getClientVisitCount = (app: AppointmentItem): number => {
        if (app.client?._count?.appointments) {
            return app.client._count.appointments;
        }
        return appointments.filter(
            (other) =>
                other.clientPhone === app.clientPhone && other.status !== "CANCELLED"
        ).length;
    };

    return (
        <div className="relative">
            {/* Barra superior de navegación por día */}
            <div className="bg-white border border-lino rounded-2xl p-3.5 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => shiftDate(-1)}
                        className="p-2 rounded-xl bg-crema hover:bg-lino text-musgo transition"
                        title="Día anterior"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedDate(todayStr);
                            setSelectedAppId(null);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${selectedDate === todayStr
                                ? "bg-oliva-dark text-white"
                                : "bg-crema text-musgo hover:bg-lino"
                            }`}
                    >
                        Hoy
                    </button>
                    <button
                        type="button"
                        onClick={() => shiftDate(1)}
                        className="p-2 rounded-xl bg-crema hover:bg-lino text-musgo transition"
                        title="Día siguiente"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <span className="ml-2 font-serif text-xl font-semibold text-musgo capitalize">
                        {formatDateTitle(selectedDate)}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs text-musgo/70">
                        {dayAppointments.length}{" "}
                        {dayAppointments.length === 1 ? "turno activo" : "turnos activos"}
                    </span>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                            if (e.target.value) {
                                setSelectedDate(e.target.value);
                                setSelectedAppId(null);
                            }
                        }}
                        className="bg-crema border border-oliva/40 rounded-xl px-3 py-1.5 text-xs text-musgo focus:outline-none focus:border-oliva-dark"
                    />
                </div>
            </div>

            {/* Contenedor Principal: Grilla Horaria + Panel Lateral */}
            <div className="flex flex-col lg:flex-row gap-5 items-start">
                {/* Columna Izquierda: Agenda con bloques de 30 minutos */}
                <div className="w-full flex-1 bg-white border border-lino rounded-3xl overflow-hidden shadow-sm">
                    <div className="relative flex">
                        {/* Eje vertical de horarios */}
                        <div className="w-16 sm:w-20 shrink-0 bg-crema/60 border-r border-lino select-none">
                            {timeRows.map((row) => (
                                <div
                                    key={row.label}
                                    style={{ height: `${ROW_HEIGHT_PX}px` }}
                                    className={`pr-2.5 pt-1 text-right text-xs ${row.isHourStart
                                            ? "font-semibold text-musgo border-t border-lino"
                                            : "text-musgo/45 border-t border-dashed border-lino/70"
                                        }`}
                                >
                                    {row.label}
                                </div>
                            ))}
                        </div>

                        {/* Área de renglones y bloques de turnos */}
                        <div
                            className="relative flex-1"
                            style={{ height: `${TOTAL_SLOTS * ROW_HEIGHT_PX}px` }}
                        >
                            {/* Renglones base cada 30 min */}
                            {timeRows.map((row) => (
                                <div
                                    key={row.label}
                                    style={{ height: `${ROW_HEIGHT_PX}px` }}
                                    className={`w-full px-3 flex items-center justify-end ${row.isHourStart
                                            ? "border-t border-lino"
                                            : "border-t border-dashed border-lino/70"
                                        } ${row.isLunch ? "bg-lino/35" : ""}`}
                                >
                                    {row.label === "13:30" && (
                                        <span className="inline-flex items-center gap-1 text-[11px] text-musgo/55 italic">
                                            <Coffee className="w-3 h-3" /> Receso / Almuerzo (13:30 - 15:00)
                                        </span>
                                    )}
                                </div>
                            ))}

                            {/* Bloqueos manuales del día */}
                            {dayBlocks.map((blk) => {
                                const startMin = Math.max(
                                    START_HOUR * 60,
                                    getArgMinutesFromMidnight(blk.startTime)
                                );
                                const endMin = Math.min(
                                    END_HOUR * 60,
                                    getArgMinutesFromMidnight(blk.endTime)
                                );
                                const duration = Math.max(30, endMin - startMin);
                                const topPx = ((startMin - START_HOUR * 60) / SLOT_MINUTES) * ROW_HEIGHT_PX;
                                const heightPx = (duration / SLOT_MINUTES) * ROW_HEIGHT_PX;

                                return (
                                    <div
                                        key={blk.id}
                                        style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                                        className="absolute left-2 right-2 rounded-xl bg-gray-100/90 border border-dashed border-gray-300 px-3 py-1.5 flex items-center justify-between text-xs text-gray-500 pointer-events-none"
                                    >
                                        <span>🚫 Bloqueado {blk.reason ? `• ${blk.reason}` : ""}</span>
                                        <span>
                                            {formatArgTime(blk.startTime)} - {formatArgTime(blk.endTime)}
                                        </span>
                                    </div>
                                );
                            })}

                            {/* Tarjetas de Turnos Reservados (Altura variable según duración) */}
                            {dayAppointments.map((app) => {
                                const startMin = getArgMinutesFromMidnight(app.startTime);
                                const serviceDuration = app.service.durationMin;
                                const bufferDuration = app.service.bufferMin || 0;
                                const totalDuration = serviceDuration + bufferDuration;

                                const topPx = ((startMin - START_HOUR * 60) / SLOT_MINUTES) * ROW_HEIGHT_PX;
                                const totalHeightPx = Math.max(
                                    ROW_HEIGHT_PX - 4,
                                    (totalDuration / SLOT_MINUTES) * ROW_HEIGHT_PX - 3
                                );
                                const serviceRatioPct = Math.round(
                                    (serviceDuration / totalDuration) * 100
                                );

                                const styleInfo = getStatusBadge(app.status);
                                const isSelected = selectedAppId === app.id;
                                const serviceEndIso = new Date(
                                    new Date(app.startTime).getTime() + serviceDuration * 60000
                                ).toISOString();

                                return (
                                    <div
                                        key={app.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleSelectAppointment(app)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") handleSelectAppointment(app);
                                        }}
                                        style={{
                                            top: `${topPx + 1}px`,
                                            height: `${totalHeightPx}px`,
                                        }}
                                        className={`group absolute left-2 right-2 rounded-2xl border-l-4 border text-left transition-all overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md cursor-pointer ${styleInfo.cardStyle
                                            } ${isSelected
                                                ? "ring-2 ring-musgo z-20 scale-[1.005]"
                                                : "z-10 opacity-95 hover:opacity-100"
                                            }`}
                                    >
                                        {/* Botón X en la esquina superior derecha para eliminar turnos cancelados */}
                                        {app.status === "CANCELLED" && (
                                            <button
                                                type="button"
                                                title="Eliminar turno cancelado de la agenda"
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (
                                                        window.confirm(
                                                            `¿Eliminar definitivamente el turno cancelado de ${app.clientName}?`
                                                        )
                                                    ) {
                                                        if (selectedAppId === app.id) setSelectedAppId(null);
                                                        await onDeleteAppointment(app.id);
                                                    }
                                                }}
                                                className="absolute top-1.5 right-1.5 z-30 w-5 h-5 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-sm transition"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}

                                        {/* Bloque principal de atención */}
                                        <div
                                            style={{ height: `${serviceRatioPct}%` }}
                                            className={`px-3 py-1.5 flex flex-col justify-between min-h-0 ${app.status === "CANCELLED" ? "pr-8" : ""
                                                }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className="text-xs font-bold text-musgo whitespace-nowrap">
                                                        {formatArgTime(app.startTime)} - {formatArgTime(serviceEndIso)}
                                                    </span>
                                                    <span
                                                        className={`font-semibold text-sm truncate ${app.status === "CANCELLED"
                                                                ? "line-through text-musgo/60"
                                                                : "text-musgo"
                                                            }`}
                                                    >
                                                        {app.clientName}
                                                    </span>
                                                </div>
                                                <span
                                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${styleInfo.badgeStyle}`}
                                                >
                                                    {styleInfo.label}
                                                </span>
                                            </div>

                                            {serviceDuration >= 45 && (
                                                <p className="text-xs text-musgo/80 truncate">
                                                    {app.service.name} ({serviceDuration} min)
                                                </p>
                                            )}
                                        </div>

                                        {/* Franja visual de Buffer Time (limpieza y preparación) */}
                                        {bufferDuration > 0 && (
                                            <div
                                                style={{ height: `${100 - serviceRatioPct}%` }}
                                                className="w-full bg-white/55 border-t border-dashed border-musgo/20 px-3 flex items-center text-[10px] text-musgo/60"
                                            >
                                                ✨ +{bufferDuration} min preparación estudio
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Panel Lateral de Información Detallada */}
                {selectedAppointment && (
                    <aside className="w-full lg:w-96 shrink-0 bg-white border border-oliva/50 rounded-3xl p-5 shadow-md space-y-5 lg:sticky lg:top-6">
                        {/* Cabecera del panel */}
                        <div className="flex items-start justify-between gap-2 border-b border-lino pb-3.5">
                            <div>
                                <span
                                    className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase mb-1.5 ${getStatusBadge(selectedAppointment.status).badgeStyle
                                        }`}
                                >
                                    {getStatusBadge(selectedAppointment.status).label}
                                </span>
                                <h3 className="font-serif text-2xl font-semibold text-musgo leading-tight">
                                    {selectedAppointment.clientName}
                                </h3>
                                <p className="text-xs text-musgo/70 flex items-center gap-1 mt-1">
                                    <Phone className="w-3.5 h-3.5 text-oliva-dark" />+
                                    {selectedAppointment.clientPhone}
                                </p>
                                {getClientVisitCount(selectedAppointment) > 1 && (
                                    <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold bg-oliva/25 text-oliva-dark px-2.5 py-0.5 rounded-full">
                                        🌿 Clienta frecuente ({getClientVisitCount(selectedAppointment)} visitas)
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedAppId(null)}
                                className="p-1.5 rounded-xl text-musgo/60 hover:bg-lino hover:text-musgo transition"
                                title="Cerrar panel"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Detalle del Servicio y Horario */}
                        <div className="bg-crema rounded-2xl p-3.5 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-musgo/70 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-oliva-dark" /> Servicio
                                </span>
                                <span className="font-semibold text-musgo text-right">
                                    {selectedAppointment.service.name}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-musgo/70 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-oliva-dark" /> Horario
                                </span>
                                <span className="font-medium text-musgo">
                                    {formatArgTime(selectedAppointment.startTime)} a{" "}
                                    {formatArgTime(
                                        new Date(
                                            new Date(selectedAppointment.startTime).getTime() +
                                            selectedAppointment.service.durationMin * 60000
                                        ).toISOString()
                                    )}{" "}
                                    hs ({selectedAppointment.service.durationMin} min)
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-musgo/70">Preparación estudio</span>
                                <span className="text-musgo/80">
                                    +{selectedAppointment.service.bufferMin} min (hasta{" "}
                                    {formatArgTime(selectedAppointment.endTime)} hs)
                                </span>
                            </div>
                            <div className="flex items-center justify-between pt-1.5 border-t border-lino">
                                <span className="text-musgo/70">Valor del servicio</span>
                                <span className="font-semibold text-musgo text-sm">
                                    {new Intl.NumberFormat("es-AR", {
                                        style: "currency",
                                        currency: "ARS",
                                        maximumFractionDigits: 0,
                                    }).format(selectedAppointment.service.price)}
                                </span>
                            </div>
                        </div>

                        {/* Observaciones de la clienta */}
                        {selectedAppointment.clientNotes && (
                            <div className="bg-lino/65 rounded-2xl p-3.5 text-xs space-y-1">
                                <p className="font-semibold text-musgo flex items-center gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5 text-oliva-dark" />
                                    Observaciones de la clienta
                                </p>
                                <p className="text-musgo/85 leading-relaxed">
                                    {selectedAppointment.clientNotes}
                                </p>
                            </div>
                        )}

                        {/* Acciones rápidas de estado y WhatsApp */}
                        <div className="space-y-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-musgo/60">
                                Gestión del Turno
                            </p>

                            {selectedAppointment.status === "PENDING" && (
                                <button
                                    type="button"
                                    disabled={busyAction}
                                    onClick={() =>
                                        handleStatusChange(selectedAppointment.id, "CONFIRMED")
                                    }
                                    className="w-full bg-oliva-dark hover:bg-musgo text-white text-xs font-medium py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                                >
                                    <Check className="w-4 h-4" /> Confirmar Seña y Enviar Dirección
                                </button>
                            )}

                            {selectedAppointment.status === "CONFIRMED" && (
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        disabled={busyAction}
                                        onClick={() => onSendReminder(selectedAppointment.id)}
                                        className="bg-oliva/30 hover:bg-oliva/50 text-musgo text-xs font-medium py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition"
                                    >
                                        <MessageCircle className="w-3.5 h-3.5 text-oliva-dark" />{" "}
                                        Recordatorio
                                    </button>
                                    <button
                                        type="button"
                                        disabled={busyAction}
                                        onClick={() =>
                                            handleStatusChange(selectedAppointment.id, "COMPLETED")
                                        }
                                        className="bg-musgo hover:bg-musgo/90 text-white text-xs font-medium py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition"
                                    >
                                        <Check className="w-3.5 h-3.5" /> Realizado
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <a
                                    href={`https://wa.me/${selectedAppointment.clientPhone}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 bg-crema hover:bg-lino text-musgo text-xs font-medium py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 border border-lino transition"
                                >
                                    <User className="w-3.5 h-3.5 text-oliva-dark" /> Abrir Chat WA
                                </a>

                                {selectedAppointment.status !== "CANCELLED" &&
                                    selectedAppointment.status !== "COMPLETED" && (
                                        <button
                                            type="button"
                                            disabled={busyAction}
                                            onClick={() =>
                                                handleStatusChange(selectedAppointment.id, "CANCELLED")
                                            }
                                            className="border border-red-200 hover:bg-red-50 text-red-700 text-xs font-medium py-2 px-3 rounded-xl flex items-center justify-center gap-1 transition"
                                        >
                                            <X className="w-3.5 h-3.5" /> Cancelar
                                        </button>
                                    )}
                            </div>
                        </div>

                        {/* Enlace único de autogestión para la clienta */}
                        {selectedAppointment.manageToken && (
                            <div className="bg-crema/90 border border-oliva/35 rounded-2xl p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-musgo/70 flex items-center gap-1.5">
                                        <Link2 className="w-3.5 h-3.5 text-oliva-dark" />
                                        Link de autogestión
                                    </span>
                                    <a
                                        href={getManageUrl(selectedAppointment.manageToken)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] text-oliva-dark hover:underline flex items-center gap-1 font-medium"
                                        title="Abrir vista de la clienta"
                                    >
                                        Abrir <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="text"
                                        readOnly
                                        value={getManageUrl(selectedAppointment.manageToken)}
                                        onClick={(e) => e.currentTarget.select()}
                                        className="flex-1 bg-white border border-lino rounded-xl px-2.5 py-1.5 text-[11px] text-musgo/85 font-mono truncate focus:outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleCopyManageLink(selectedAppointment.manageToken!)
                                        }
                                        className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 shrink-0 transition ${copiedLink
                                                ? "bg-emerald-700 text-white"
                                                : "bg-oliva-dark hover:bg-musgo text-white"
                                            }`}
                                    >
                                        {copiedLink ? (
                                            <>
                                                <Check className="w-3.5 h-3.5" /> Copiado
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3.5 h-3.5" /> Copiar
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}


                        {/* Ficha Técnica Privada */}
                        <div className="space-y-2 pt-2 border-t border-lino">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-semibold uppercase tracking-wider text-musgo/60 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-oliva-dark" />
                                    Ficha Técnica de Clienta
                                </label>
                            </div>
                            <textarea
                                rows={4}
                                placeholder="Ej: Bigudí M, tiempos 10'+8', tinte negro azulado, sensibilidad leve, prefiere té verde..."
                                value={
                                    notesDraft[selectedAppointment.id] ??
                                    getPersistentTechNotes(selectedAppointment)
                                }
                                onChange={(e) =>
                                    setNotesDraft({
                                        ...notesDraft,
                                        [selectedAppointment.id]: e.target.value,
                                    })
                                }
                                className="w-full bg-crema border border-oliva/40 rounded-xl p-2.5 text-xs text-musgo focus:outline-none focus:border-oliva-dark leading-relaxed"
                            />
                            <button
                                type="button"
                                disabled={busyAction}
                                onClick={() => handleSaveNotes(selectedAppointment.id)}
                                className="w-full bg-lino hover:bg-oliva/40 text-musgo text-xs font-medium py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition"
                            >
                                <Save className="w-3.5 h-3.5 text-oliva-dark" /> Guardar Ficha de Clienta
                            </button>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
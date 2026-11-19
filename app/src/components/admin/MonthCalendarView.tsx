"use client";

import { useMemo, useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    Check,
    MessageCircle,
    Sparkles,
    Calendar as CalendarIcon,
    Phone,
} from "lucide-react";
import { AppointmentItem } from "./DayAgendaView";

interface MonthCalendarViewProps {
    appointments: AppointmentItem[];
    onUpdateAppointment: (id: string, payload: Record<string, unknown>) => Promise<void>;
    onSendReminder: (id: string) => Promise<void>;
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getArgDateStr(date: Date): string {
    return date.toLocaleDateString("en-CA", {
        timeZone: "America/Argentina/Buenos_Aires",
    });
}

function formatArgTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

export default function MonthCalendarView({
    appointments,
    onUpdateAppointment,
    onSendReminder,
}: MonthCalendarViewProps) {
    const todayStr = useMemo(() => getArgDateStr(new Date()), []);
    const [selectedDate, setSelectedDate] = useState<string>(todayStr);

    // Mes visible (año y mes 0-11)
    const [viewYear, setViewYear] = useState<number>(() =>
        Number(todayStr.slice(0, 4))
    );
    const [viewMonth, setViewMonth] = useState<number>(
        () => Number(todayStr.slice(5, 7)) - 1
    );
    const [busyId, setBusyId] = useState<string | null>(null);

    // Agrupar turnos activos (no cancelados) por fecha YYYY-MM-DD en hora Argentina
    const appointmentsByDate = useMemo(() => {
        const map: Record<string, AppointmentItem[]> = {};
        appointments.forEach((app) => {
            if (app.status === "CANCELLED") return;
            const dateKey = getArgDateStr(new Date(app.startTime));
            if (!map[dateKey]) map[dateKey] = [];
            map[dateKey].push(app);
        });

        // Ordenar cronológicamente dentro de cada día
        Object.keys(map).forEach((key) => {
            map[key].sort(
                (a, b) =>
                    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
            );
        });

        return map;
    }, [appointments]);

    // Calcular celdas del calendario mensual (semana empieza en Lunes)
    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

        // getDay(): 0 = Dom, 1 = Lun ... 6 = Sáb -> convertimos a 0 = Lun ... 6 = Dom
        const startOffset = (firstDayOfMonth.getDay() + 6) % 7;

        const cells: Array<{ dateStr: string | null; dayNumber: number | null }> = [];

        for (let i = 0; i < startOffset; i++) {
            cells.push({ dateStr: null, dayNumber: null });
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const mm = String(viewMonth + 1).padStart(2, "0");
            const dd = String(day).padStart(2, "0");
            cells.push({
                dateStr: `${viewYear}-${mm}-${dd}`,
                dayNumber: day,
            });
        }

        // Completar última fila para mantener grilla pareja de 7 columnas
        while (cells.length % 7 !== 0) {
            cells.push({ dateStr: null, dayNumber: null });
        }

        return cells;
    }, [viewYear, viewMonth]);

    const changeMonth = (delta: number) => {
        const next = new Date(viewYear, viewMonth + delta, 1);
        setViewYear(next.getFullYear());
        setViewMonth(next.getMonth());
    };

    const goToToday = () => {
        setViewYear(Number(todayStr.slice(0, 4)));
        setViewMonth(Number(todayStr.slice(5, 7)) - 1);
        setSelectedDate(todayStr);
    };

    const monthTitle = useMemo(() => {
        return new Date(viewYear, viewMonth, 15).toLocaleDateString("es-AR", {
            month: "long",
            year: "numeric",
        });
    }, [viewYear, viewMonth]);

    const selectedDayTitle = useMemo(() => {
        const d = new Date(`${selectedDate}T12:00:00-03:00`);
        return d.toLocaleDateString("es-AR", {
            timeZone: "America/Argentina/Buenos_Aires",
            weekday: "long",
            day: "numeric",
            month: "long",
        });
    }, [selectedDate]);

    const selectedDayAppointments = appointmentsByDate[selectedDate] || [];

    const handleQuickStatus = async (id: string, status: string) => {
        setBusyId(id);
        await onUpdateAppointment(id, { status });
        setBusyId(null);
    };

    const getStatusMeta = (status: string) => {
        switch (status) {
            case "CONFIRMED":
                return {
                    label: "Confirmado",
                    badge: "bg-oliva-dark text-white",
                    border: "border-l-oliva-dark",
                };
            case "PENDING":
                return {
                    label: "Esperando Seña",
                    badge: "bg-amber-500 text-white",
                    border: "border-l-amber-400",
                };
            case "COMPLETED":
                return {
                    label: "Realizado",
                    badge: "bg-musgo text-white",
                    border: "border-l-musgo",
                };
            default:
                return {
                    label: status,
                    badge: "bg-musgo text-white",
                    border: "border-l-oliva",
                };
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-5 items-start">
            {/* Columna Izquierda: Calendario Mensual */}
            <div className="w-full flex-1 bg-white border border-lino rounded-3xl p-4 sm:p-6 shadow-sm">
                {/* Cabecera del mes */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => changeMonth(-1)}
                            className="p-2 rounded-xl bg-crema hover:bg-lino text-musgo transition"
                            title="Mes anterior"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={goToToday}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-crema hover:bg-lino text-musgo transition"
                        >
                            Hoy
                        </button>
                        <button
                            type="button"
                            onClick={() => changeMonth(1)}
                            className="p-2 rounded-xl bg-crema hover:bg-lino text-musgo transition"
                            title="Mes siguiente"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                        <h2 className="ml-2 font-serif text-2xl font-semibold text-musgo capitalize">
                            {monthTitle}
                        </h2>
                    </div>

                    {/* Leyenda de indicadores */}
                    <div className="flex items-center gap-3 text-[11px] text-musgo/75">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-oliva-dark inline-block" />
                            Confirmado
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                            Seña pendiente
                        </span>
                    </div>
                </div>

                {/* Nombres de los días de la semana */}
                <div className="grid grid-cols-7 gap-1.5 mb-2">
                    {WEEKDAYS.map((dayName) => (
                        <div
                            key={dayName}
                            className="text-center text-xs font-semibold text-musgo/60 py-1.5"
                        >
                            {dayName}
                        </div>
                    ))}
                </div>

                {/* Grilla de días del mes */}
                <div className="grid grid-cols-7 gap-1.5">
                    {calendarDays.map((cell, idx) => {
                        if (!cell.dateStr || !cell.dayNumber) {
                            return (
                                <div
                                    key={`empty-${idx}`}
                                    className="h-20 sm:h-24 rounded-2xl bg-crema/35 border border-transparent"
                                />
                            );
                        }

                        const dayApps = appointmentsByDate[cell.dateStr] || [];
                        const hasAppointments = dayApps.length > 0;
                        const isSelected = selectedDate === cell.dateStr;
                        const isToday = todayStr === cell.dateStr;

                        const confirmedCount = dayApps.filter(
                            (a) => a.status === "CONFIRMED" || a.status === "COMPLETED"
                        ).length;
                        const pendingCount = dayApps.filter(
                            (a) => a.status === "PENDING"
                        ).length;

                        return (
                            <button
                                key={cell.dateStr}
                                type="button"
                                onClick={() => setSelectedDate(cell.dateStr!)}
                                className={`h-20 sm:h-24 rounded-2xl p-2 border text-left flex flex-col justify-between transition-all ${isSelected
                                        ? "bg-lino border-oliva-dark ring-2 ring-oliva-dark/40 shadow-sm"
                                        : hasAppointments
                                            ? "bg-crema/70 border-oliva/40 hover:border-oliva-dark"
                                            : "bg-white border-lino/80 hover:bg-crema/40"
                                    }`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span
                                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${isToday
                                                ? "bg-oliva-dark text-white"
                                                : isSelected
                                                    ? "text-musgo font-bold"
                                                    : "text-musgo/85"
                                            }`}
                                    >
                                        {cell.dayNumber}
                                    </span>

                                    {hasAppointments && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-oliva/30 text-musgo">
                                            {dayApps.length}
                                        </span>
                                    )}
                                </div>

                                {/* Indicadores visuales de turnos activos */}
                                {hasAppointments ? (
                                    <div className="space-y-1 w-full">
                                        <div className="flex items-center gap-1 flex-wrap">
                                            {Array.from({ length: Math.min(confirmedCount, 4) }).map(
                                                (_, i) => (
                                                    <span
                                                        key={`c-${i}`}
                                                        className="w-2 h-2 rounded-full bg-oliva-dark"
                                                    />
                                                )
                                            )}
                                            {Array.from({ length: Math.min(pendingCount, 4) }).map(
                                                (_, i) => (
                                                    <span
                                                        key={`p-${i}`}
                                                        className="w-2 h-2 rounded-full bg-amber-400"
                                                    />
                                                )
                                            )}
                                        </div>
                                        <p className="hidden sm:block text-[10px] text-musgo/75 truncate">
                                            {formatArgTime(dayApps[0].startTime)} {dayApps[0].clientName}
                                        </p>
                                    </div>
                                ) : (
                                    <span className="text-[10px] text-musgo/30 hidden sm:inline">
                                        Libre
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Columna Derecha: Listado de turnos del día seleccionado */}
            <aside className="w-full lg:w-96 shrink-0 bg-white border border-oliva/50 rounded-3xl p-5 shadow-md space-y-4 lg:sticky lg:top-6">
                <div className="border-b border-lino pb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-oliva-dark flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5" /> Turnos del día
                    </span>
                    <h3 className="font-serif text-2xl font-semibold text-musgo capitalize mt-0.5">
                        {selectedDayTitle}
                    </h3>
                    <p className="text-xs text-musgo/65 mt-0.5">
                        {selectedDayAppointments.length === 0
                            ? "No hay turnos activos para esta fecha"
                            : `${selectedDayAppointments.length} ${selectedDayAppointments.length === 1
                                ? "turno agendado"
                                : "turnos agendados"
                            }`}
                    </p>
                </div>

                {selectedDayAppointments.length === 0 ? (
                    <div className="bg-crema/70 rounded-2xl p-6 text-center space-y-1.5">
                        <Sparkles className="w-6 h-6 text-oliva-dark/60 mx-auto" />
                        <p className="text-xs font-medium text-musgo/80">
                            Agenda libre este día
                        </p>
                        <p className="text-[11px] text-musgo/60">
                            Seleccioná otro día con indicadores en el calendario para ver su detalle.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                        {selectedDayAppointments.map((app) => {
                            const meta = getStatusMeta(app.status);
                            const serviceEndIso = new Date(
                                new Date(app.startTime).getTime() +
                                app.service.durationMin * 60000
                            ).toISOString();

                            return (
                                <div
                                    key={app.id}
                                    className={`bg-crema/75 border border-lino border-l-4 ${meta.border} rounded-2xl p-3.5 space-y-2.5`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-musgo">
                                                <Clock className="w-3.5 h-3.5 text-oliva-dark" />
                                                {formatArgTime(app.startTime)} - {formatArgTime(serviceEndIso)} hs
                                            </span>
                                            <h4 className="font-semibold text-sm text-musgo mt-0.5">
                                                {app.clientName}
                                            </h4>
                                            <p className="text-xs text-musgo/80">
                                                {app.service.name} ({app.service.durationMin} min)
                                            </p>
                                        </div>

                                        <span
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${meta.badge}`}
                                        >
                                            {meta.label}
                                        </span>
                                    </div>

                                    {app.clientNotes && (
                                        <p className="text-[11px] bg-white/80 rounded-xl px-2.5 py-1.5 text-musgo/85">
                                            <strong>Nota:</strong> {app.clientNotes}
                                        </p>
                                    )}

                                    {/* Acciones rápidas */}
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-lino/80">
                                        <a
                                            href={`https://wa.me/${app.clientPhone}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[11px] bg-white hover:bg-lino text-musgo border border-lino px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                                        >
                                            <Phone className="w-3 h-3 text-oliva-dark" /> WhatsApp
                                        </a>

                                        {app.status === "PENDING" && (
                                            <button
                                                type="button"
                                                disabled={busyId === app.id}
                                                onClick={() => handleQuickStatus(app.id, "CONFIRMED")}
                                                className="text-[11px] bg-oliva-dark hover:bg-musgo text-white px-2.5 py-1 rounded-lg flex items-center gap-1 transition disabled:opacity-50"
                                            >
                                                <Check className="w-3 h-3" /> Confirmar Seña
                                            </button>
                                        )}

                                        {app.status === "CONFIRMED" && (
                                            <>
                                                <button
                                                    type="button"
                                                    disabled={busyId === app.id}
                                                    onClick={() => onSendReminder(app.id)}
                                                    className="text-[11px] bg-oliva/35 hover:bg-oliva/55 text-musgo px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                                                >
                                                    <MessageCircle className="w-3 h-3 text-oliva-dark" />{" "}
                                                    Recordatorio
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={busyId === app.id}
                                                    onClick={() => handleQuickStatus(app.id, "COMPLETED")}
                                                    className="text-[11px] bg-musgo hover:bg-musgo/90 text-white px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                                                >
                                                    <Check className="w-3 h-3" /> Realizado
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </aside>
        </div>
    );
}
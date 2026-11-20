"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BookingCalendarProps {
    serviceId: string;
    selectedDate: string;
    onSelectDate: (dateStr: string) => void;
}

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

export default function BookingCalendar({
    serviceId,
    selectedDate,
    onSelectDate,
}: BookingCalendarProps) {
    const todayStr = useMemo(
        () =>
            new Date().toLocaleDateString("en-CA", {
                timeZone: "America/Argentina/Buenos_Aires",
            }),
        []
    );

    const [viewYear, setViewYear] = useState<number>(() =>
        Number((selectedDate || todayStr).slice(0, 4))
    );
    const [viewMonth, setViewMonth] = useState<number>(
        () => Number((selectedDate || todayStr).slice(5, 7)) - 1
    );

    const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
    const [loadingMonth, setLoadingMonth] = useState<boolean>(false);

    const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;

    // Consultar qué días del mes visible tienen al menos 1 horario libre
    useEffect(() => {
        if (!serviceId) return;
        let active = true;
        setLoadingMonth(true);

        fetch(`/api/availability?month=${monthKey}&serviceId=${serviceId}`)
            .then((res) => res.json())
            .then((data) => {
                if (!active) return;
                setAvailableDates(new Set(data.availableDates || []));
                setLoadingMonth(false);
            })
            .catch(() => {
                if (active) setLoadingMonth(false);
            });

        return () => {
            active = false;
        };
    }, [monthKey, serviceId]);

    const calendarCells = useMemo(() => {
        const firstDay = new Date(viewYear, viewMonth, 1);
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const startOffset = (firstDay.getDay() + 6) % 7; // Lunes = 0 ... Domingo = 6

        const cells: Array<{ dateStr: string | null; dayNumber: number | null }> = [];
        for (let i = 0; i < startOffset; i++) {
            cells.push({ dateStr: null, dayNumber: null });
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const dd = String(d).padStart(2, "0");
            cells.push({
                dateStr: `${monthKey}-${dd}`,
                dayNumber: d,
            });
        }
        return cells;
    }, [viewYear, viewMonth, monthKey]);

    const currentYear = Number(todayStr.slice(0, 4));
    const currentMonth = Number(todayStr.slice(5, 7)) - 1;
    const canGoPrev =
        viewYear > currentYear ||
        (viewYear === currentYear && viewMonth > currentMonth);

    const changeMonth = (delta: number) => {
        const next = new Date(viewYear, viewMonth + delta, 1);
        setViewYear(next.getFullYear());
        setViewMonth(next.getMonth());
    };

    const monthTitle = new Date(viewYear, viewMonth, 15).toLocaleDateString(
        "es-AR",
        {
            month: "long",
            year: "numeric",
        }
    );

    return (
        <div className="bg-crema/80 border border-oliva/35 rounded-2xl p-3.5 sm:p-4 space-y-3">
            {/* Navegación del mes */}
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    disabled={!canGoPrev}
                    onClick={() => changeMonth(-1)}
                    className="p-1.5 rounded-xl bg-white border border-lino text-musgo hover:bg-lino/60 disabled:opacity-30 disabled:pointer-events-none transition"
                    title="Mes anterior"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="font-serif text-lg font-semibold text-musgo capitalize">
                    {monthTitle}
                </span>

                <button
                    type="button"
                    onClick={() => changeMonth(1)}
                    className="p-1.5 rounded-xl bg-white border border-lino text-musgo hover:bg-lino/60 transition"
                    title="Mes siguiente"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Cabecera de días de la semana */}
            <div className="grid grid-cols-7 gap-1 text-center">
                {WEEKDAYS.map((day) => (
                    <span
                        key={day}
                        className="text-[11px] font-semibold text-musgo/55 py-1"
                    >
                        {day}
                    </span>
                ))}
            </div>

            {/* Grilla de días */}
            <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((cell, idx) => {
                    if (!cell.dateStr || !cell.dayNumber) {
                        return <div key={`empty-${idx}`} className="h-10" />;
                    }

                    const isPast = cell.dateStr < todayStr;
                    const isAvailable = !isPast && availableDates.has(cell.dateStr);
                    const isSelected = selectedDate === cell.dateStr;
                    const isToday = cell.dateStr === todayStr;

                    return (
                        <button
                            key={cell.dateStr}
                            type="button"
                            disabled={isPast}
                            onClick={() => onSelectDate(cell.dateStr!)}
                            className={`h-10 rounded-xl flex flex-col items-center justify-center relative transition-all ${isSelected
                                    ? "bg-oliva-dark text-white font-semibold shadow-sm"
                                    : isAvailable
                                        ? "bg-white text-musgo font-medium border border-oliva/30 hover:border-oliva-dark"
                                        : isPast
                                            ? "text-musgo/25 cursor-not-allowed"
                                            : "text-musgo/45 hover:bg-white/60"
                                }`}
                        >
                            <span
                                className={`text-xs leading-none ${isToday && !isSelected ? "underline font-bold" : ""
                                    }`}
                            >
                                {cell.dayNumber}
                            </span>

                            {/* Punto verde debajo del número cuando el día tiene turnos disponibles */}
                            <span
                                className={`mt-1 w-1.5 h-1.5 rounded-full transition-opacity ${isAvailable
                                        ? isSelected
                                            ? "bg-white"
                                            : "bg-oliva-dark"
                                        : "opacity-0"
                                    }`}
                            />
                        </button>
                    );
                })}
            </div>

            {/* Leyenda inferior */}
            <div className="flex items-center justify-between pt-1 border-t border-lino/80 text-[11px] text-musgo/70">
                <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-oliva-dark inline-block" />
                    Días con turnos disponibles
                </span>
                {loadingMonth && (
                    <span className="text-[10px] text-musgo/50">Actualizando...</span>
                )}
            </div>
        </div>
    );
}
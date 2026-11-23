"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BookingCalendar from "@/components/BookingCalendar";
import {
    Calendar,
    Clock,
    MapPin,
    Sparkles,
    RefreshCw,
    XCircle,
    CheckCircle2,
    Info,
    MessageCircle,
    ArrowLeft,
    Wallet,
} from "lucide-react";

interface PublicAppointment {
    id: string;
    manageToken: string;
    clientName: string;
    startTime: string;
    endTime: string;
    status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | string;
    isRefundEligible: boolean;
    address: string | null;
    payment: {
        totalPrice: number;
        depositAmount: number;
        remainingBalance: number;
    };
    service: {
        id: string;
        name: string;
        category: string;
        durationMin: number;
        price: number;
    };
}

export default function ManageAppointmentPage() {
    const params = useParams<{ token: string }>();
    const token = params?.token;

    const [appointment, setAppointment] = useState<PublicAppointment | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    // Modos de interacción: vista principal | reprogramar | confirmar cancelación
    const [mode, setMode] = useState<"view" | "reschedule" | "cancel">("view");

    // Estados para reprogramación
    const [newDate, setNewDate] = useState("");
    const [slots, setSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [newTime, setNewTime] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [feedbackMsg, setFeedbackMsg] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5491100000000";

    const loadAppointment = async () => {
        if (!token) return;
        setLoading(true);
        const res = await fetch(`/api/turno/${token}`);
        if (!res.ok) {
            setNotFound(true);
            setLoading(false);
            return;
        }
        const data = await res.json();
        setAppointment(data);
        setLoading(false);
    };

    useEffect(() => {
        loadAppointment();
    }, [token]);

    // Cargar horarios disponibles al elegir fecha para reprogramar
    useEffect(() => {
        if (mode !== "reschedule" || !newDate || !appointment) return;
        setLoadingSlots(true);
        setNewTime("");
        fetch(
            `/api/availability?date=${newDate}&serviceId=${appointment.service.id}`
        )
            .then((r) => r.json())
            .then((data) => {
                setSlots(data.slots || []);
                setLoadingSlots(false);
            });
    }, [mode, newDate, appointment]);

    const handleConfirmReschedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDate || !newTime || !token) return;
        setSubmitting(true);
        setFeedbackMsg(null);

        const res = await fetch(`/api/turno/${token}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "RESCHEDULE",
                date: newDate,
                time: newTime,
            }),
        });

        const data = await res.json();
        setSubmitting(false);

        if (!res.ok) {
            setFeedbackMsg({
                type: "error",
                text: data.error || "No se pudo reprogramar el turno.",
            });
            return;
        }

        setMode("view");
        setNewDate("");
        setNewTime("");
        setFeedbackMsg({
            type: "success",
            text: "¡Listo! Tu turno fue reprogramado y tu seña sigue vigente ✨",
        });
        await loadAppointment();
    };

    const handleConfirmCancel = async () => {
        if (!token) return;
        setSubmitting(true);
        setFeedbackMsg(null);

        const res = await fetch(`/api/turno/${token}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "CANCEL" }),
        });

        const data = await res.json();
        setSubmitting(false);

        if (!res.ok) {
            setFeedbackMsg({
                type: "error",
                text: data.error || "No se pudo cancelar el turno.",
            });
            return;
        }

        setMode("view");
        setFeedbackMsg({
            type: "success",
            text: data.isRefundEligible
                ? "Tu turno fue cancelado con más de 12 hs de anticipación. Escribinos por WhatsApp para gestionar el reintegro de la seña 🌿"
                : "Tu turno fue cancelado. Como faltaban menos de 12 hs, la seña no tiene devolución.",
        });
        await loadAppointment();
    };

    const formatArgFullDate = (iso: string) =>
        new Date(iso).toLocaleDateString("es-AR", {
            timeZone: "America/Argentina/Buenos_Aires",
            weekday: "long",
            day: "numeric",
            month: "long",
        });

    const formatArgTime = (iso: string) =>
        new Date(iso).toLocaleTimeString("es-AR", {
            timeZone: "America/Argentina/Buenos_Aires",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });

    const formatARS = (val: number) =>
        new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
            maximumFractionDigits: 0,
        }).format(val);

    const todayISO = new Date().toLocaleDateString("en-CA", {
        timeZone: "America/Argentina/Buenos_Aires",
    });

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center px-4">
                <p className="text-sm text-musgo/70">Cargando detalles de tu turno...</p>
            </main>
        );
    }

    if (notFound || !appointment) {
        return (
            <main className="min-h-screen max-w-md mx-auto px-4 py-16 text-center space-y-4">
                <h1 className="font-serif text-4xl font-semibold text-musgo">
                    Yo Bonita
                </h1>
                <div className="bg-white border border-lino rounded-3xl p-6 space-y-3 shadow-sm">
                    <p className="text-sm text-musgo/80">
                        No encontramos un turno asociado a este enlace.
                    </p>
                    <a
                        href="/"
                        className="inline-block bg-oliva-dark text-white text-xs font-medium px-4 py-2.5 rounded-xl"
                    >
                        Ir a reservar un turno
                    </a>
                </div>
            </main>
        );
    }

    const isActionable =
        (appointment.status === "CONFIRMED" || appointment.status === "PENDING") &&
        new Date(appointment.startTime).getTime() > Date.now();

    return (
        <main className="min-h-screen max-w-lg mx-auto px-4 py-8 pb-16 space-y-6">
            {/* Cabecera */}
            <header className="text-center space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lino text-musgo text-xs">
                    <MapPin className="w-3.5 h-3.5 text-oliva-dark" />
                    Home Studio • Recoleta
                </span>
                <h1 className="font-serif text-4xl font-semibold text-musgo pt-1">
                    Yo Bonita
                </h1>
                <p className="text-xs text-musgo/70">Gestión de tu reserva</p>
            </header>

            {/* Mensaje de confirmación tras reprogramar o cancelar */}
            {feedbackMsg && (
                <div
                    className={`rounded-2xl p-4 text-xs leading-relaxed border ${feedbackMsg.type === "success"
                            ? "bg-oliva/20 border-oliva-dark text-musgo"
                            : "bg-red-50 border-red-200 text-red-800"
                        }`}
                >
                    {feedbackMsg.text}
                </div>
            )}

            {/* Tarjeta Principal con Detalles del Turno */}
            <section className="bg-white border border-lino rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex items-start justify-between gap-2 border-b border-lino pb-4">
                    <div>
                        <p className="text-xs text-musgo/65">Hola,</p>
                        <h2 className="font-serif text-3xl font-semibold text-musgo">
                            {appointment.clientName}
                        </h2>
                    </div>

                    <span
                        className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase ${appointment.status === "CONFIRMED"
                                ? "bg-oliva-dark text-white"
                                : appointment.status === "PENDING"
                                    ? "bg-amber-100 text-amber-800"
                                    : appointment.status === "COMPLETED"
                                        ? "bg-musgo text-white"
                                        : "bg-red-100 text-red-700"
                            }`}
                    >
                        {appointment.status === "CONFIRMED"
                            ? "Confirmado"
                            : appointment.status === "PENDING"
                                ? "Seña Pendiente"
                                : appointment.status === "COMPLETED"
                                    ? "Realizado"
                                    : "Cancelado"}
                    </span>
                </div>

                {/* Detalles del servicio */}
                <div className="bg-crema rounded-2xl p-4 space-y-3 text-sm">
                    <div className="flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-oliva-dark shrink-0 mt-0.5" />
                        <div>
                            <span className="text-[11px] uppercase tracking-wider text-musgo/60 block">
                                Tratamiento
                            </span>
                            <span className="font-semibold text-musgo">
                                {appointment.service.name}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                        <Calendar className="w-4 h-4 text-oliva-dark shrink-0 mt-0.5" />
                        <div>
                            <span className="text-[11px] uppercase tracking-wider text-musgo/60 block">
                                Fecha
                            </span>
                            <span className="font-medium text-musgo capitalize">
                                {formatArgFullDate(appointment.startTime)}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                        <Clock className="w-4 h-4 text-oliva-dark shrink-0 mt-0.5" />
                        <div>
                            <span className="text-[11px] uppercase tracking-wider text-musgo/60 block">
                                Horario y duración
                            </span>
                            <span className="font-medium text-musgo">
                                {formatArgTime(appointment.startTime)} hs (
                                {appointment.service.durationMin} min aprox.)
                            </span>
                        </div>
                    </div>

                    {appointment.payment && appointment.status !== "CANCELLED" && (
                        <div className="flex items-start gap-2.5 pt-2 border-t border-lino">
                            <Wallet className="w-4 h-4 text-oliva-dark shrink-0 mt-0.5" />
                            <div className="w-full space-y-1">
                                <span className="text-[11px] uppercase tracking-wider text-musgo/60 block">
                                    Detalle de pago
                                </span>
                                <div className="flex justify-between text-xs text-musgo/80">
                                    <span>Valor del tratamiento:</span>
                                    <span>{formatARS(appointment.payment.totalPrice)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-musgo/80">
                                    <span>
                                        {appointment.status === "PENDING"
                                            ? "Seña requerida para reservar:"
                                            : "Seña abonada:"}
                                    </span>
                                    <span>
                                        {appointment.status === "PENDING"
                                            ? formatARS(appointment.payment.depositAmount)
                                            : `-${formatARS(appointment.payment.depositAmount)}`}
                                    </span>
                                </div>
                                <div className="flex justify-between items-baseline pt-1.5 mt-1 border-t border-lino/80">
                                    <span className="text-xs font-semibold text-musgo">
                                        Saldo a abonar al finalizar:
                                    </span>
                                    <span className="text-base font-bold text-oliva-dark">
                                        {formatARS(appointment.payment.remainingBalance)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {appointment.address && (
                        <div className="flex items-start gap-2.5 pt-2 border-t border-lino">
                            <MapPin className="w-4 h-4 text-oliva-dark shrink-0 mt-0.5" />
                            <div>
                                <span className="text-[11px] uppercase tracking-wider text-musgo/60 block">
                                    Dirección del estudio
                                </span>
                                <span className="font-medium text-musgo text-xs">
                                    {appointment.address}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Aviso claro de política de devolución de seña (12 hs) */}
                {isActionable && (
                    <div className="bg-lino/70 border border-oliva/30 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-musgo/90 leading-relaxed">
                        <Info className="w-4 h-4 text-oliva-dark shrink-0 mt-0.5" />
                        <p>
                            <strong>Política de reserva:</strong> No perdes tu seña 
                            si cancelás con al menos <strong>12 horas de anticipación</strong>.
                            También podés reprogramar tu turno sin perder la seña.
                        </p>
                    </div>
                )}

                {/* MODO VISTA: Dos botones claros (Reprogramar o Cancelar) */}
                {isActionable && mode === "view" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <button
                            type="button"
                            onClick={() => {
                                setFeedbackMsg(null);
                                setMode("reschedule");
                            }}
                            className="w-full bg-oliva-dark hover:bg-musgo text-white font-medium text-sm py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition shadow-sm"
                        >
                            <RefreshCw className="w-4 h-4" /> Reprogramar
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setFeedbackMsg(null);
                                setMode("cancel");
                            }}
                            className="w-full bg-white hover:bg-red-50 text-red-700 border border-red-200 font-medium text-sm py-3 px-4 rounded-2xl flex items-center justify-center gap-2 transition"
                        >
                            <XCircle className="w-4 h-4" /> Cancelar turno
                        </button>
                    </div>
                )}

                {/* MODO REPROGRAMAR */}
                {isActionable && mode === "reschedule" && (
                    <form
                        onSubmit={handleConfirmReschedule}
                        className="bg-crema/80 border border-oliva/40 rounded-2xl p-4 space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="font-serif text-xl font-semibold text-musgo">
                                Elegí nueva fecha y hora
                            </h3>
                            <button
                                type="button"
                                onClick={() => setMode("view")}
                                className="text-xs text-musgo/70 hover:text-musgo flex items-center gap-1"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" /> Volver
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-musgo/80 mb-1">
                                Nueva fecha
                            </label>
                            <div>
                                <label className="block text-xs font-medium text-musgo/80 mb-1.5">
                                    Seleccioná una fecha
                                </label>
                                <BookingCalendar
                                    serviceId={appointment.service.id}
                                    selectedDate={selectedDate}
                                    onSelectDate={(dateStr) => setSelectedDate(dateStr)}
                                />
                            </div>
                        </div>

                        {newDate && (
                            <div>
                                <label className="block text-xs font-medium text-musgo/80 mb-2">
                                    Horarios disponibles
                                </label>
                                {loadingSlots ? (
                                    <p className="text-xs text-musgo/60">Buscando horarios...</p>
                                ) : slots.length === 0 ? (
                                    <p className="text-xs bg-lino/60 p-3 rounded-xl text-musgo/80">
                                        No quedan lugares libres ese día. Probá con otra fecha.
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2">
                                        {slots.map((slot) => (
                                            <button
                                                key={slot}
                                                type="button"
                                                onClick={() => setNewTime(slot)}
                                                className={`py-2 px-2.5 rounded-xl text-xs font-medium border transition ${newTime === slot
                                                        ? "bg-oliva-dark text-white border-oliva-dark"
                                                        : "bg-white text-musgo border-oliva/30 hover:border-oliva-dark"
                                                    }`}
                                            >
                                                {slot} hs
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={!newDate || !newTime || submitting}
                            className="w-full bg-oliva-dark hover:bg-musgo text-white font-medium text-sm py-3 rounded-2xl flex items-center justify-center gap-2 transition disabled:opacity-50"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {submitting ? "Reprogramando..." : "Confirmar nuevo horario"}
                        </button>
                    </form>
                )}

                {/* MODO CONFIRMAR CANCELACIÓN */}
                {isActionable && mode === "cancel" && (
                    <div className="bg-red-50/80 border border-red-200 rounded-2xl p-4 space-y-3">
                        <h3 className="font-serif text-xl font-semibold text-red-900">
                            ¿Confirmás la cancelación?
                        </h3>

                        {appointment.isRefundEligible ? (
                            <p className="text-xs text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-xl p-3 leading-relaxed">
                                ✅ Estás cancelando con <strong>más de 12 horas</strong> de
                                anticipación. Tu reserva aplica para la{" "}
                                <strong>devolución total de la seña</strong>.
                            </p>
                        ) : (
                            <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3 leading-relaxed">
                                ⚠️ Faltan <strong>menos de 12 horas</strong> para tu turno. Según
                                nuestra política, la seña no es reembolsable en cancelaciones de
                                último momento (si preferís, podés volver atrás y{" "}
                                <strong>reprogramar</strong>).
                            </p>
                        )}

                        <div className="flex gap-2 pt-1">
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={() => setMode("view")}
                                className="flex-1 bg-white border border-lino text-musgo text-xs font-medium py-2.5 rounded-xl"
                            >
                                Mantener turno
                            </button>
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={handleConfirmCancel}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium py-2.5 rounded-xl disabled:opacity-50"
                            >
                                {submitting ? "Cancelando..." : "Sí, cancelar turno"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Estado si ya fue cancelado */}
                {appointment.status === "CANCELLED" && (
                    <div className="text-center pt-2 space-y-3">
                        <p className="text-xs text-musgo/75">
                            Este turno se encuentra cancelado.
                        </p>
                        <a
                            href="/"
                            className="inline-block bg-oliva-dark hover:bg-musgo text-white text-xs font-medium px-5 py-2.5 rounded-xl transition"
                        >
                            Sacar un nuevo turno
                        </a>
                    </div>
                )}
            </section>

            {/* Pie con acceso directo a WhatsApp */}
            <footer className="text-center">
                <a
                    href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                        `¡Hola Tami! Soy ${appointment.clientName}, te escribo por mi turno de ${appointment.service.name} ✨`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-oliva-dark hover:underline"
                >
                    <MessageCircle className="w-4 h-4" /> ¿Necesitás ayuda? Escribinos por WhatsApp
                </a>
            </footer>
        </main>
    );
}
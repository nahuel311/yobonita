"use client";

import { useEffect, useState, useRef } from "react";
import {
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  Calendar,
  MessageCircle,
  Coffee,
  Music,
  Wind,
  ChevronRight,
} from "lucide-react";

type Service = {
  id: string;
  name: string;
  category: string;
  description: string;
  durationMin: number;
  price: number;
};

export default function HomePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string>("");

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [hasAllergies, setHasAllergies] = useState(false);
  const [hasContactLenses, setHasContactLenses] = useState(false);
  const [lastTreatment, setLastTreatment] = useState("");
  const [rememberData, setRememberData] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [bookedData, setBookedData] = useState<any>(null);

  const dateSectionRef = useRef<HTMLElement | null>(null);
  const formSectionRef = useRef<HTMLFormElement | null>(null);

  const [waNumber, setWaNumber] = useState(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5491100000000"
  );

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((data) => setServices(data));

    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.whatsappNumber) setWaNumber(data.whatsappNumber);
      })
      .catch(() => {});

    // Cargar datos recordados de la clienta si existen
    try {
      const saved = localStorage.getItem("yobonita_client_info");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) setClientName(parsed.name);
        if (parsed.phone) setClientPhone(parsed.phone);
        if (typeof parsed.hasAllergies === "boolean") setHasAllergies(parsed.hasAllergies);
        if (typeof parsed.hasContactLenses === "boolean") setHasContactLenses(parsed.hasContactLenses);
        setRememberData(true);
      }
    } catch {
      // Ignorar restricciones de almacenamiento local
    }
  }, []);

  // Autoscroll a la sección de fecha al seleccionar turno/tratamiento
  useEffect(() => {
    if (selectedService && dateSectionRef.current) {
      const timer = setTimeout(() => {
        dateSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedService]);

  // Autoscroll a la sección del formulario al seleccionar horario
  useEffect(() => {
    if (selectedTime && formSectionRef.current) {
      const timer = setTimeout(() => {
        formSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedTime]);

  const isWeekend = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(`${dateStr}T00:00:00-03:00`);
    const day = d.getUTCDay();
    return day === 0 || day === 6;
  };

  useEffect(() => {
    if (!selectedService || !selectedDate) return;
    if (isWeekend(selectedDate)) {
      setSlots([]);
      setSelectedTime("");
      return;
    }
    setLoadingSlots(true);
    setSelectedTime("");
    fetch(`/api/availability?date=${selectedDate}&serviceId=${selectedService.id}`)
      .then((r) => r.json())
      .then((data) => {
        setSlots(data.slots || []);
        setLoadingSlots(false);
      });
  }, [selectedService, selectedDate]);

  const handleRememberToggle = (checked: boolean) => {
    setRememberData(checked);
    if (!checked) {
      try {
        localStorage.removeItem("yobonita_client_info");
      } catch {}
    } else {
      try {
        localStorage.setItem(
          "yobonita_client_info",
          JSON.stringify({
            name: clientName,
            phone: clientPhone,
            hasAllergies,
            hasContactLenses,
          })
        );
      } catch {}
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    setErrorMsg("");

    // Guardar o eliminar datos recordados según preferencia
    if (rememberData) {
      try {
        localStorage.setItem(
          "yobonita_client_info",
          JSON.stringify({
            name: clientName,
            phone: clientPhone,
            hasAllergies,
            hasContactLenses,
          })
        );
      } catch {}
    } else {
      try {
        localStorage.removeItem("yobonita_client_info");
      } catch {}
    }

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: selectedService.id,
        date: selectedDate,
        time: selectedTime,
        clientName,
        clientPhone,
        clientNotes,
        hasAllergies,
        hasContactLenses,
        lastTreatment,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setErrorMsg(data.error || "No se pudo registrar el turno.");
      return;
    }
    setBookedData(data);
  };

  const todayISO = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });

  const formatARS = (val: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(val);

  const getWhatsAppReceiptUrl = () => {
    if (!bookedData || !selectedService) return "#";
    const sena = Math.round(selectedService.price * 0.3);
    const text = `¡Hola Tami! Soy ${clientName}. Reservé turno para *${selectedService.name}* el día *${selectedDate}* a las *${selectedTime} hs*. Te adjunto el comprobante de la seña (${formatARS(sena)}) para confirmar ✨`;
    return `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
  };

  return (
    <main className="min-h-screen max-w-xl mx-auto px-4 pb-16 pt-8">
      {/* Header Minimalista */}
      <header className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lino text-musgo text-xs tracking-wide mb-3">
          <MapPin className="w-3.5 h-3.5 text-oliva-dark" />
          <span>Home Studio • Recoleta, CABA</span>
        </div>
        <h1 className="font-serif text-5xl font-semibold tracking-tight text-musgo">
          Yo Bonita
        </h1>
        <p className="text-sm text-musgo/80 mt-2 max-w-sm mx-auto leading-relaxed">
          Estética de la mirada en un espacio íntimo y relajado. Potenciá tu belleza natural sin apuros.
        </p>

        {/* Pill Experiencia Sensorial */}
        <div className="flex justify-center gap-4 mt-5 text-xs text-musgo/75">
          <span className="flex items-center gap-1">
            <Wind className="w-3.5 h-3.5 text-oliva-dark" /> Aromaterapia
          </span>
          <span className="flex items-center gap-1">
            <Music className="w-3.5 h-3.5 text-oliva-dark" /> Tu música
          </span>
          <span className="flex items-center gap-1">
            <Coffee className="w-3.5 h-3.5 text-oliva-dark" /> Café / Té
          </span>
        </div>
      </header>

      {/* Confirmación Final + Pantalla de Seña */}
      {bookedData && selectedService ? (
        <section className="bg-white/90 border border-oliva/40 rounded-3xl p-6 shadow-sm text-center space-y-5">
          <CheckCircle2 className="w-12 h-12 text-oliva-dark mx-auto" />
          <div>
            <h2 className="font-serif text-3xl font-semibold text-musgo">
              ¡Tu lugar está pre-reservado!
            </h2>
            <p className="text-sm text-musgo/80 mt-1">
              {selectedService.name} • {selectedDate} a las {selectedTime} hs
            </p>
          </div>

          <div className="bg-lino/70 rounded-2xl p-4 text-left text-sm space-y-2">
            <p className="font-medium text-musgo">
              Último paso para confirmar tu turno:
            </p>
            <p className="text-musgo/80 text-xs leading-relaxed">
              Para proteger la agenda del estudio privado, pedimos una seña del{" "}
              <strong>30% ({formatARS(Math.round(selectedService.price * 0.3))})</strong>{" "}
              dentro de las próximas 2 horas. Una vez acreditada, te enviamos la dirección exacta en Recoleta.
            </p>
            <div className="pt-1 text-xs font-mono bg-crema p-2.5 rounded-xl border border-oliva/20">
              Alias: <strong>yobonita.studio</strong>
            </div>
          </div>

          <a
            href={getWhatsAppReceiptUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-oliva-dark hover:bg-musgo text-white font-medium py-3.5 px-5 rounded-2xl transition"
          >
            <MessageCircle className="w-5 h-5" />
            Enviar comprobante por WhatsApp
          </a>

          <button
            onClick={() => {
              setBookedData(null);
              setSelectedTime("");
              if (!rememberData) {
                setClientName("");
                setClientPhone("");
                setHasAllergies(false);
                setHasContactLenses(false);
              }
              setLastTreatment("");
              setClientNotes("");
            }}
            className="text-xs text-musgo/60 underline"
          >
            Reservar otro turno
          </button>
        </section>
      ) : (
        <div className="space-y-8">
          {/* Paso 1: Selección de Servicio */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-semibold text-musgo">
                1. Elegí tu tratamiento
              </h2>
              <span className="text-xs text-musgo/60">{services.length} opciones</span>
            </div>

            <div className="space-y-2.5">
              {services.map((srv) => {
                const isSelected = selectedService?.id === srv.id;
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => setSelectedService(srv)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? "bg-lino border-oliva-dark shadow-sm"
                        : "bg-white/75 border-lino hover:border-oliva"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-oliva-dark font-semibold">
                          {srv.category}
                        </span>
                        <h3 className="font-medium text-musgo text-base">
                          {srv.name}
                        </h3>
                      </div>
                      <span className="font-semibold text-musgo whitespace-nowrap">
                        {formatARS(srv.price)}
                      </span>
                    </div>
                    <p className="text-xs text-musgo/75 mt-1 leading-relaxed">
                      {srv.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2.5 text-xs text-musgo/65">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {srv.durationMin} min
                      </span>
                      {isSelected && (
                        <span className="ml-auto text-oliva-dark font-medium flex items-center">
                          Seleccionado <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Paso 2: Día y Horario */}
          {selectedService && (
            <section
              ref={dateSectionRef}
              className="bg-white/80 border border-lino rounded-3xl p-5 space-y-4 scroll-mt-6"
            >
              <h2 className="font-serif text-2xl font-semibold text-musgo">
                2. Día y horario disponible
              </h2>

              <div>
                <div className="flex justify-between items-baseline mb-1.5">
                  <label className="block text-xs font-medium text-musgo/80">
                    Seleccioná una fecha
                  </label>
                  <span className="text-[11px] text-musgo/60">
                    Lun a Vie • 08:00 a 19:30 (Almuerzo 13:30 a 15:00)
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="date"
                    min={todayISO}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-crema border border-oliva/40 rounded-xl px-3.5 py-2.5 text-sm text-musgo focus:outline-none focus:border-oliva-dark"
                  />
                </div>
              </div>

              {selectedDate && (
                <div>
                  {isWeekend(selectedDate) ? (
                    <div className="p-3.5 rounded-2xl bg-lino/60 border border-oliva/30 text-xs text-musgo space-y-1">
                      <p className="font-medium text-musgo">Estudio cerrado los fines de semana</p>
                      <p className="text-musgo/75 leading-relaxed">
                        Atendemos de lunes a viernes a partir de las 08:00 hs. Por favor elegí un día hábil en el calendario.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-baseline mb-2">
                        <label className="block text-xs font-medium text-musgo/80">
                          Horarios disponibles (24 hs)
                        </label>
                        <span className="text-[11px] text-musgo/50">
                          {slots.length} turnos libres
                        </span>
                      </div>
                      {loadingSlots ? (
                        <p className="text-xs text-musgo/60">Buscando turnos...</p>
                      ) : slots.length === 0 ? (
                        <p className="text-xs bg-lino/60 p-3 rounded-xl text-musgo/80">
                          No hay horarios disponibles para esta fecha. Probá otro día o escribinos por WhatsApp.
                        </p>
                      ) : (
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {slots.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setSelectedTime(slot)}
                              className={`py-2 px-1 rounded-xl text-xs font-semibold border transition text-center tracking-tight ${
                                selectedTime === slot
                                  ? "bg-oliva-dark text-white border-oliva-dark shadow-sm"
                                  : "bg-crema text-musgo border-oliva/30 hover:border-oliva-dark"
                              }`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Paso 3: Datos de la Clienta */}
          {selectedService && selectedDate && selectedTime && (
            <form
              ref={formSectionRef}
              onSubmit={handleBooking}
              className="bg-white/85 border border-oliva/40 rounded-3xl p-5 space-y-4 scroll-mt-6"
            >
              <h2 className="font-serif text-2xl font-semibold text-musgo">
                3. Tus datos
              </h2>

              <div>
                <label className="block text-xs font-medium text-musgo/80 mb-1">
                  Nombre y Apellido *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: María Pérez"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-crema border border-oliva/40 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-oliva-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-musgo/80 mb-1">
                  WhatsApp (sin 0 ni 15) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ej: 11 2345 6789"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full bg-crema border border-oliva/40 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-oliva-dark"
                />
              </div>

              {/* Checkboxes de salud / condiciones */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-medium text-musgo/80">
                  Condiciones previas (opcional)
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-crema/60 border border-oliva/30 cursor-pointer hover:border-oliva transition-colors">
                    <input
                      type="checkbox"
                      checked={hasAllergies}
                      onChange={(e) => setHasAllergies(e.target.checked)}
                      className="w-4 h-4 rounded text-oliva-dark accent-oliva-dark focus:ring-oliva"
                    />
                    <span className="text-sm text-musgo">
                      Alergias o sensibilidad en ojos / piel
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-crema/60 border border-oliva/30 cursor-pointer hover:border-oliva transition-colors">
                    <input
                      type="checkbox"
                      checked={hasContactLenses}
                      onChange={(e) => setHasContactLenses(e.target.checked)}
                      className="w-4 h-4 rounded text-oliva-dark accent-oliva-dark focus:ring-oliva"
                    />
                    <span className="text-sm text-musgo">
                      Uso de lentes de contacto
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-musgo/80 mb-1">
                  ¿Cuándo fue tu último tratamiento de pestañas o cejas? (opcional)
                </label>
                <select
                  value={lastTreatment}
                  onChange={(e) => setLastTreatment(e.target.value)}
                  className="w-full bg-crema border border-oliva/40 rounded-xl px-3.5 py-2.5 text-sm text-musgo focus:outline-none focus:border-oliva-dark"
                >
                  <option value="">Seleccioná una opción...</option>
                  <option value="Primera vez (nunca me hice)">Es mi primera vez / Nunca me hice</option>
                  <option value="Hace menos de 1 mes">Hace menos de 1 mes</option>
                  <option value="Hace 1 a 2 meses">Hace 1 a 2 meses</option>
                  <option value="Hace más de 2 meses">Hace más de 2 meses</option>
                  <option value="Otro">Otro (especificar en comentarios)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-musgo/80 mb-1">
                  Otros comentarios u observaciones (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="¿Algún detalle o consulta adicional que quieras dejarnos?..."
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  className="w-full bg-crema border border-oliva/40 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-oliva-dark"
                />
              </div>

              {/* Checkbox Recordar datos */}
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-musgo/80 select-none pt-0.5">
                <input
                  type="checkbox"
                  checked={rememberData}
                  onChange={(e) => handleRememberToggle(e.target.checked)}
                  className="w-4 h-4 rounded text-oliva-dark accent-oliva-dark focus:ring-oliva"
                />
                <span>Recordar mis datos en este dispositivo</span>
              </label>

              {errorMsg && (
                <p className="text-xs text-red-700 bg-red-50 p-2.5 rounded-xl">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-oliva-dark hover:bg-musgo text-white font-medium py-3.5 rounded-2xl transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {submitting ? "Reservando..." : "Reservar Turno"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Footer de consulta directa */}
      <footer className="mt-12 pt-6 border-t border-lino text-center space-y-2">
        <p className="text-xs text-musgo/70">
          ¿Tenés dudas sobre qué tratamiento elegir?
        </p>
        <a
          href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
            "¡Hola Tami! Estuve viendo la web de Yo Bonita y quería hacerte una consulta ✨"
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-oliva-dark hover:underline"
        >
          <MessageCircle className="w-4 h-4" /> Escribinos por WhatsApp
        </a>
      </footer>
    </main>
  );
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { sendWhatsAppText, formatArgDateTime } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const appointments = await prisma.appointment.findMany({
    include: { service: true },
    orderBy: { startTime: "asc" },
  });
  return NextResponse.json(appointments);
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    serviceId,
    date,
    time,
    clientName,
    clientPhone,
    clientNotes,
    hasAllergies,
    hasContactLenses,
    lastTreatment,
  } = body;

  if (!serviceId || !date || !time || !clientName || !clientPhone) {
    return NextResponse.json({ error: "Completá todos los campos obligatorios" }, { status: 400 });
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    return NextResponse.json({ error: "Servicio inválido" }, { status: 404 });
  }

  const bufferMin = service.bufferMin ?? 15;
  const startTime = new Date(`${date}T${time}:00-03:00`);
  const endTime = new Date(
    startTime.getTime() + (service.durationMin + bufferMin) * 60000
  );

  const dayOfWeek = startTime.getUTCDay();
  const workingHours = await prisma.workingHours.findUnique({
    where: { dayOfWeek },
  });
  if (!workingHours || !workingHours.isOpen) {
    return NextResponse.json(
      { error: "El estudio permanece cerrado en la fecha seleccionada. Por favor elegí otro día." },
      { status: 400 }
    );
  }

  // Validar franja fija de almuerzo (13:30 a 15:00 hs) en días hábiles
  const isBusinessDay = dayOfWeek >= 1 && dayOfWeek <= 5;
  if (isBusinessDay) {
    const [h, m] = time.split(":").map(Number);
    const startMin = h * 60 + m;
    const endMin = startMin + service.durationMin + bufferMin;
    const lunchStartMin = 13 * 60 + 30; // 13:30
    const lunchEndMin = 15 * 60;        // 15:00
    if (startMin < lunchEndMin && endMin > lunchStartMin) {
      return NextResponse.json(
        { error: "El horario seleccionado coincide con el almuerzo del estudio (13:30 a 15:00 hs)." },
        { status: 400 }
      );
    }
  }

  // Verificar que nadie haya reservado ese bloque segundos antes
  const conflict = await prisma.appointment.findFirst({
    where: {
      status: { in: ["PENDING", "CONFIRMED"] },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });

  if (conflict) {
    return NextResponse.json(
      { error: "Ese horario acaba de ser reservado. Por favor elegí otro." },
      { status: 409 }
    );
  }

  const notesParts: string[] = [];
  if (lastTreatment && lastTreatment.trim()) notesParts.push(`🗓️ Último tratamiento: ${lastTreatment.trim()}`);
  if (hasAllergies) notesParts.push("⚠️ Alergias/sensibilidad");
  if (hasContactLenses) notesParts.push("👁️ Lentes de contacto");
  if (clientNotes && clientNotes.trim()) notesParts.push(clientNotes.trim());

  const finalClientNotes = notesParts.length > 0 ? notesParts.join(" | ") : null;

  const cleanPhone = clientPhone.replace(/\D/g, "");
  const normalizedPhone = cleanPhone.startsWith("54")
    ? cleanPhone
    : `549${cleanPhone}`;

  const appointment = await prisma.appointment.create({
    data: {
      serviceId,
      clientName: clientName.trim(),
      clientPhone: normalizedPhone,
      clientNotes: finalClientNotes,
      startTime,
      endTime,
      status: "PENDING",
    },
    include: { service: true },
  });

  // Envío automático de instrucciones de seña por WhatsApp
  const effectivePrice = service.discountPrice ?? service.price;
  const sena =
    service.depositPrice && service.depositPrice > 0
      ? service.depositPrice
      : Math.round(effectivePrice * 0.3);
  const senaFormatted = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(sena);

  const welcomeMsg =
    `¡Hola ${appointment.clientName}! ✨ Soy Tami de *Yo Bonita*.\n\n` +
    `Recibimos tu solicitud de turno:\n` +
    `• *Servicio:* ${service.name}\n` +
    `• *Fecha y hora:* ${formatArgDateTime(startTime)} hs\n\n` +
    `Para confirmar tu lugar en nuestro Home Studio de Recoleta, aboná la seña del 30% (*${senaFormatted}*) dentro de las próximas 2 horas al alias:\n` +
    `👉 *yobonita.studio*\n\n` +
    `Respondeme este mensaje con el comprobante y te envío la dirección exacta 🌿`;

  // Disparo en segundo plano para no demorar la respuesta web
  sendWhatsAppText(normalizedPhone, welcomeMsg);

  return NextResponse.json(appointment);
}

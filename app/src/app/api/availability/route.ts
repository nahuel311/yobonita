import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await ensureSeeded();
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date"); // YYYY-MM-DD
  const serviceId = searchParams.get("serviceId");

  if (!dateStr || !serviceId) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
  }

  // Interpretar fecha en zona horaria Argentina (-03:00)
  const dayStart = new Date(`${dateStr}T00:00:00-03:00`);
  const dayEnd = new Date(`${dateStr}T23:59:59-03:00`);
  const dayOfWeek = dayStart.getUTCDay();

  const workingHours = await prisma.workingHours.findUnique({
    where: { dayOfWeek },
  });

  if (!workingHours || !workingHours.isOpen) {
    return NextResponse.json({ slots: [], isClosed: true });
  }

  const [openH, openM] = workingHours.startTime.split(":").map(Number);
  const [closeH, closeM] = workingHours.endTime.split(":").map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  const bufferMin = service.bufferMin ?? 15;
  const totalBlockMin = service.durationMin + bufferMin;

  // Buscar turnos activos y bloqueos de ese día
  const [appointments, blockedSlots] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        status: { in: ["PENDING", "CONFIRMED"] },
        startTime: { gte: dayStart, lte: dayEnd },
      },
      include: { service: true },
    }),
    prisma.blockedSlot.findMany({
      where: {
        startTime: { lte: dayEnd },
        endTime: { gte: dayStart },
      },
    }),
  ]);

  const now = new Date();
  const minBookingTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Mínimo 2hs de anticipación
  const slots: string[] = [];

  for (let m = openMinutes; m + service.durationMin <= closeMinutes; m += 30) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    const timeLabel = `${hh}:${mm}`;

    const candidateStart = new Date(`${dateStr}T${timeLabel}:00-03:00`);
    const candidateEnd = new Date(candidateStart.getTime() + totalBlockMin * 60000);

    if (candidateStart < minBookingTime) continue;

    const overlapsApp = appointments.some((app) => {
      // Bloque ocupado: duración del tratamiento + 15 min de margen para acondicionar el lugar
      const appBuffer = app.service?.bufferMin ?? 15;
      const effectiveAppEnd = app.service
        ? new Date(app.startTime.getTime() + (app.service.durationMin + appBuffer) * 60000)
        : app.endTime;
      return candidateStart < effectiveAppEnd && candidateEnd > app.startTime;
    });
    const overlapsBlock = blockedSlots.some(
      (blk) => candidateStart < blk.endTime && candidateEnd > blk.startTime
    );

    if (!overlapsApp && !overlapsBlock) {
      slots.push(timeLabel);
    }
  }

  return NextResponse.json({ slots });
}

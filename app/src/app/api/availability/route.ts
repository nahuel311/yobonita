import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

function computeSlotsForDate(
  dateStr: string,
  service: { durationMin: number; bufferMin: number },
  workingHoursMap: Map<number, { startTime: string; endTime: string; isOpen: boolean }>,
  appointments: Array<{ startTime: Date; endTime: Date }>,
  blockedSlots: Array<{ startTime: Date; endTime: Date }>,
  minBookingTime: Date
): string[] {
  const dayStart = new Date(`${dateStr}T00:00:00-03:00`);
  const dayOfWeek = dayStart.getUTCDay();
  const workingHours = workingHoursMap.get(dayOfWeek);

  if (!workingHours || !workingHours.isOpen) return [];

  const [openH, openM] = workingHours.startTime.split(":").map(Number);
  const [closeH, closeM] = workingHours.endTime.split(":").map(Number);

  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  const totalBlockMin = service.durationMin + service.bufferMin;

  // Franja habitual de almuerzo Lun-Vie (13:30 a 15:00)
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const lunchStart = new Date(`${dateStr}T13:30:00-03:00`);
  const lunchEnd = new Date(`${dateStr}T15:00:00-03:00`);

  const slots: string[] = [];

  for (let m = openMinutes; m + service.durationMin <= closeMinutes; m += 30) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    const timeLabel = `${hh}:${mm}`;

    const candidateStart = new Date(`${dateStr}T${timeLabel}:00-03:00`);
    const candidateEnd = new Date(candidateStart.getTime() + totalBlockMin * 60000);

    if (candidateStart < minBookingTime) continue;

    if (isWeekday && candidateStart < lunchEnd && candidateEnd > lunchStart) {
      continue;
    }

    const overlapsApp = appointments.some(
      (app) => candidateStart < app.endTime && candidateEnd > app.startTime
    );
    const overlapsBlock = blockedSlots.some(
      (blk) => candidateStart < blk.endTime && candidateEnd > blk.startTime
    );

    if (!overlapsApp && !overlapsBlock) {
      slots.push(timeLabel);
    }
  }

  return slots;
}

export async function GET(req: Request) {
  await ensureSeeded();
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date"); // YYYY-MM-DD
  const monthStr = searchParams.get("month"); // YYYY-MM
  const serviceId = searchParams.get("serviceId");

  if (!serviceId || (!dateStr && !monthStr)) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
  }

  const allWorkingHours = await prisma.workingHours.findMany();
  const workingHoursMap = new Map(
    allWorkingHours.map((wh) => [wh.dayOfWeek, wh])
  );
  const minBookingTime = new Date(Date.now() + 2 * 60 * 60 * 1000);

  // MODO 1: Consulta mensual para marcar días disponibles con punto verde
  if (monthStr) {
    const [yearStr, monStr] = monthStr.split("-");
    const year = Number(yearStr);
    const month = Number(monStr); // 1..12
    const daysInMonth = new Date(year, month, 0).getDate();

    const rangeStart = new Date(`${monthStr}-01T00:00:00-03:00`);
    const rangeEnd = new Date(
      `${monthStr}-${String(daysInMonth).padStart(2, "0")}T23:59:59-03:00`
    );

    const [appointments, blockedSlots] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          status: { in: ["PENDING", "CONFIRMED"] },
          startTime: { lte: rangeEnd },
          endTime: { gte: rangeStart },
        },
        select: { startTime: true, endTime: true },
      }),
      prisma.blockedSlot.findMany({
        where: {
          startTime: { lte: rangeEnd },
          endTime: { gte: rangeStart },
        },
        select: { startTime: true, endTime: true },
      }),
    ]);

    const availableDates: string[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDateStr = `${monthStr}-${String(day).padStart(2, "0")}`;
      const daySlots = computeSlotsForDate(
        currentDateStr,
        service,
        workingHoursMap,
        appointments,
        blockedSlots,
        minBookingTime
      );
      if (daySlots.length > 0) {
        availableDates.push(currentDateStr);
      }
    }

    return NextResponse.json({ availableDates });
  }

  // MODO 2: Consulta puntual de horarios de un día (dateStr)
  const dayStart = new Date(`${dateStr}T00:00:00-03:00`);
  const dayEnd = new Date(`${dateStr}T23:59:59-03:00`);

  const [appointments, blockedSlots] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        status: { in: ["PENDING", "CONFIRMED"] },
        startTime: { lte: dayEnd },
        endTime: { gte: dayStart },
      },
      select: { startTime: true, endTime: true },
    }),
    prisma.blockedSlot.findMany({
      where: {
        startTime: { lte: dayEnd },
        endTime: { gte: dayStart },
      },
      select: { startTime: true, endTime: true },
    }),
  ]);

  const slots = computeSlotsForDate(
    dateStr!,
    service,
    workingHoursMap,
    appointments,
    blockedSlots,
    minBookingTime
  );

  return NextResponse.json({ slots });
}
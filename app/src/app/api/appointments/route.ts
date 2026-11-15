import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";

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
  const { serviceId, date, time, clientName, clientPhone, clientNotes } = body;

  if (!serviceId || !date || !time || !clientName || !clientPhone) {
    return NextResponse.json({ error: "Completá todos los campos obligatorios" }, { status: 400 });
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) {
    return NextResponse.json({ error: "Servicio inválido" }, { status: 404 });
  }

  const startTime = new Date(`${date}T${time}:00-03:00`);
  const endTime = new Date(
    startTime.getTime() + (service.durationMin + service.bufferMin) * 60000
  );

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

  const cleanPhone = clientPhone.replace(/\D/g, "");
  const appointment = await prisma.appointment.create({
    data: {
      serviceId,
      clientName: clientName.trim(),
      clientPhone: cleanPhone.startsWith("54") ? cleanPhone : `549${cleanPhone}`,
      clientNotes: clientNotes?.trim() || null,
      startTime,
      endTime,
      status: "PENDING",
    },
    include: { service: true },
  });

  return NextResponse.json(appointment);
}

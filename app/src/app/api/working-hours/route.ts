import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSeeded } from "@/lib/seed";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const hours = await prisma.workingHours.findMany({
    orderBy: { dayOfWeek: "asc" },
  });
  return NextResponse.json(hours);
}

export async function PUT(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { workingHours } = body;

  if (!Array.isArray(workingHours)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  for (const item of workingHours) {
    if (typeof item.dayOfWeek !== "number") continue;
    await prisma.workingHours.upsert({
      where: { dayOfWeek: item.dayOfWeek },
      update: {
        startTime: item.startTime || "08:00",
        endTime: item.endTime || "19:30",
        isOpen: Boolean(item.isOpen),
      },
      create: {
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime || "08:00",
        endTime: item.endTime || "19:30",
        isOpen: Boolean(item.isOpen),
      },
    });
  }

  const updated = await prisma.workingHours.findMany({
    orderBy: { dayOfWeek: "asc" },
  });
  return NextResponse.json(updated);
}

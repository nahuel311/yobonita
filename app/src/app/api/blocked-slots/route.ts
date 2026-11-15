import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const startStr = searchParams.get("start");
  const endStr = searchParams.get("end");

  const where: any = {};
  if (startStr || endStr) {
    if (startStr) where.endTime = { gte: new Date(startStr) };
    if (endStr) where.startTime = { lte: new Date(endStr) };
  }

  const slots = await prisma.blockedSlot.findMany({
    where,
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(slots);
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const { startTime, endTime, reason } = body;

  if (!startTime || !endTime) {
    return NextResponse.json({ error: "Faltan fechas de inicio o fin" }, { status: 400 });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
    return NextResponse.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }

  const blocked = await prisma.blockedSlot.create({
    data: {
      startTime: start,
      endTime: end,
      reason: reason?.trim() || null,
    },
  });

  return NextResponse.json(blocked);
}

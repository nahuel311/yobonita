import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSeeded } from "@/lib/seed";
import { isAdminAuthenticated } from "@/lib/auth";

export async function GET(req: Request) {
  await ensureSeeded();
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";

  const services = await prisma.service.findMany({
    where: all ? {} : { isActive: true },
    orderBy: [{ category: "asc" }, { price: "asc" }],
  });
  return NextResponse.json(services);
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json();
  const service = await prisma.service.create({
    data: {
      name: body.name,
      category: body.category || "Cejas",
      description: body.description || "",
      durationMin: Number(body.durationMin),
      bufferMin: Number(body.bufferMin ?? 15),
      price: Number(body.price),
      discountPrice:
        body.discountPrice !== "" && body.discountPrice != null
          ? Number(body.discountPrice)
          : null,
      depositPrice:
        body.depositPrice !== "" && body.depositPrice != null
          ? Number(body.depositPrice)
          : null,
      isActive: true,
    },
  });
  return NextResponse.json(service);
}
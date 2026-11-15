import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json();
  const updated = await prisma.service.update({
    where: { id: params.id },
    data: {
      ...(body.price !== undefined && { price: Number(body.price) }),
      ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
      ...(body.durationMin !== undefined && { durationMin: Number(body.durationMin) }),
    },
  });
  return NextResponse.json(updated);
}

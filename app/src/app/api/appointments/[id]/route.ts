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
  const updated = await prisma.appointment.update({
    where: { id: params.id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.techNotes !== undefined && { techNotes: body.techNotes }),
    },
    include: { service: true },
  });
  return NextResponse.json(updated);
}

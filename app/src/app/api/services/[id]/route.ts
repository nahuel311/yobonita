import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();

  const data: any = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.category !== undefined) data.category = String(body.category).trim();
  if (body.description !== undefined) data.description = String(body.description).trim();
  if (body.durationMin !== undefined) data.durationMin = Number(body.durationMin);
  if (body.bufferMin !== undefined) data.bufferMin = Number(body.bufferMin);
  if (body.price !== undefined) data.price = Number(body.price);
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

  if (body.discountPrice !== undefined) {
    data.discountPrice =
      body.discountPrice !== "" &&
      body.discountPrice !== null &&
      !isNaN(Number(body.discountPrice))
        ? Number(body.discountPrice)
        : null;
  }

  if (body.depositPrice !== undefined) {
    data.depositPrice =
      body.depositPrice !== "" &&
      body.depositPrice !== null &&
      !isNaN(Number(body.depositPrice))
        ? Number(body.depositPrice)
        : null;
  }

  try {
    const updated = await prisma.service.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error al actualizar servicio:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el servicio" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = params;

  try {
    // Si el servicio tiene turnos asociados, eliminamos primero los turnos en una transacción
    await prisma.$transaction([
      prisma.appointment.deleteMany({ where: { serviceId: id } }),
      prisma.service.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error al eliminar servicio:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar el tratamiento" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { sendWhatsAppText, formatArgDateTime } from "@/lib/whatsapp";

// Dirección exacta
const EXACT_ADDRESS =
  "Rodriguez Peña 1334. Piso 8, Depto A (Recoleta, CABA)";


export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json();
  
  // Acción manual: enviar recordatorio 24h antes
  if (body.action === "SEND_REMINDER") {
    const app = await prisma.appointment.findUnique({
      where: { id: params.id },
      include: { service: true },
    });
    if (!app) {
      return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
    }
  
    const reminderMsg =
      `¡Hola ${app.clientName}! 🌿 Te recuerdo tu turno en *Yo Bonita*:\n\n` +
      `• *Servicio:* ${app.service.name}\n` +
      `• *Cuándo:* ${formatArgDateTime(app.startTime)} hs\n` +
      `• *Dirección:* ${EXACT_ADDRESS}\n\n` +
      `Recordá asistir sin maquillaje ni cremas oleosas en la zona de los ojos. ¡Te espero! ✨`;
  
    const sent = await sendWhatsAppText(app.clientPhone, reminderMsg);
    return NextResponse.json({ ok: sent });
  }

  const updated = await prisma.appointment.update({
    where: { id: params.id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.techNotes !== undefined && { techNotes: body.techNotes }),
      ...(body.name !== undefined && { name: String(body.name).trim() }),
      ...(body.category !== undefined && { category: String(body.category) }),
      ...(body.description !== undefined && {
        description: String(body.description).trim(),
      }),
      ...(body.durationMin !== undefined && {
        durationMin: Number(body.durationMin),
      }),
      ...(body.price !== undefined && { price: Number(body.price) }),
      ...(body.discountPrice !== undefined && {
        discountPrice:
          body.discountPrice === null || body.discountPrice === ""
            ? null
            : Number(body.discountPrice),
      }),
      ...(body.depositPrice !== undefined && {
        depositPrice:
          body.depositPrice === null || body.depositPrice === ""
            ? null
            : Number(body.depositPrice),
      }),
      ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
    },
    include: { service: true },
  });
  
    // Si pasa a CONFIRMED, enviar confirmación + dirección exacta automáticamente
    if (body.status === "CONFIRMED") {
      const confirmMsg =
        `¡Hola ${updated.clientName}! Recibí tu seña ✨\n\n` +
        `Tu turno para *${updated.service.name}* el *${formatArgDateTime(
          updated.startTime
        )} hs* está *CONFIRMADO*.\n\n` +
        `📍 *Dirección:* ${EXACT_ADDRESS}\n` +
        `Recordá asistir sin maquillaje en los ojos. ¡Nos vemos pronto en el estudio! 🌿`;
  
      await sendWhatsAppText(updated.clientPhone, confirmMsg);
    }

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    await prisma.appointment.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error al eliminar turno:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar el turno" },
      { status: 500 }
    );
  }
}
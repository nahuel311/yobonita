import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthenticated } from "@/lib/auth";
import { sendWhatsAppText, formatArgDateTime } from "@/lib/whatsapp";
import crypto from "crypto";

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
      `¡Hola ${app.clientName}! 🌿\nTe recuerdo tu turno en *Yo Bonita*:\n\n` +
      `• *Servicio:* ${app.service.name}\n` +
      `• *Cuándo:* ${formatArgDateTime(app.startTime)} \n` +
      `• *Dirección:* ${EXACT_ADDRESS}\n\n` +
      `Recordá asistir sin maquillaje ni cremas en la zona.\n ¡Te espero! ✨`;
  
    const sent = await sendWhatsAppText(app.clientPhone, reminderMsg);
    return NextResponse.json({ ok: sent });
  }

  const existingApp = await prisma.appointment.findUnique({
    where: { id: params.id },
  });

  if (!existingApp) {
    return NextResponse.json({ error: "Turno no encontrado" }, { status: 404 });
  }

  let linkedClientId = existingApp.clientId;

  // Si se edita la ficha técnica, guardarla de forma persistente por teléfono
  if (body.techNotes !== undefined) {
    const upsertedClient = await prisma.client.upsert({
      where: { phone: existingApp.clientPhone },
      update: {
        techNotes: body.techNotes,
      },
      create: {
        phone: existingApp.clientPhone,
        name: existingApp.clientName,
        techNotes: body.techNotes,
      },
    });
    linkedClientId = upsertedClient.id;
  }

  const updated = await prisma.appointment.update({
    where: { id: params.id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.techNotes !== undefined && { techNotes: body.techNotes }),
      ...(linkedClientId && { clientId: linkedClientId }),
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
    include: { service: true, client: true },
  });
  
    // Si pasa a CONFIRMED, enviar confirmación + dirección exacta automáticamente
    if (body.status === "CONFIRMED") {
      let token = updated.manageToken;
      if (!token) {
        token = crypto.randomUUID();
        await prisma.appointment.update({
          where: { id: updated.id },
          data: { manageToken: token },
        });
      }

      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "https://yobonita.com.ar";

      const manageUrl = updated.manageToken
        ? `${siteUrl}/t/${updated.manageToken}\n_`
        : "";

      const confirmMsg =
        `¡Hola ${updated.clientName}! Recibí tu seña ✨\n\n` +
        `Tu turno para *${updated.service.name}* el *${formatArgDateTime(
          updated.startTime
        )}* está *CONFIRMADO*.\n\n` +
        `📍 *Dirección:* ${EXACT_ADDRESS}\n` +
        `Recordá asistir sin maquillaje.\n\n` +
        `🔗 *Gestioná tu turno (reprogramar o cancelar):*\n${manageUrl}\n` +
        `_(La seña se reintegra cancelando con al menos 12 hs de anticipación)_ 🌿`;
      
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
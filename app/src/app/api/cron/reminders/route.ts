import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppText, formatArgDateTime } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const EXACT_ADDRESS = "Rodriguez Peña 1334, Piso 8, Depto A (Recoleta, CABA)";

export async function GET(req: Request) {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const now = new Date();
    // Ventana: turnos que empiezan entre dentro de 1 hora y dentro de 24 horas
    const windowStart = new Date(now.getTime() + 1 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingAppointments = await prisma.appointment.findMany({
        where: {
            status: "CONFIRMED",
            reminderSentAt: null,
            startTime: {
                gte: windowStart,
                lte: windowEnd,
            },
        },
        include: { service: true },
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://yobonita.com.ar";
    let sentCount = 0;

    for (const app of upcomingAppointments) {
        const reminderMsg =
            `¡Hola ${app.clientName}! 🌿 \nTe recuerdo tu turno de mañana en *Yo Bonita*:\n\n` +
            `• *Servicio:* ${app.service.name}\n` +
            `• *Cuándo:* ${formatArgDateTime(app.startTime)}\n` +
            `• *Dirección:* ${EXACT_ADDRESS}\n\n` +
            `Recordá asistir sin maquillaje ni cremas en la zona. \n¡Te espero! ✨`;

        const ok = await sendWhatsAppText(app.clientPhone, reminderMsg);

        if (ok) {
            await prisma.appointment.update({
                where: { id: app.id },
                data: { reminderSentAt: new Date() },
            });
            sentCount++;
        }
    }

    return NextResponse.json({
        checked: upcomingAppointments.length,
        sent: sentCount,
    });
}
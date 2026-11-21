import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppText, formatArgDateTime } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const EXACT_ADDRESS = "Av. Santa Fe XXXX, Piso X, Depto X (Recoleta, CABA)";

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
        const manageLine = app.manageToken
            ? `\n\nSi necesitás reprogramar o cancelar, podés gestionarlo desde acá:\n${siteUrl}/turno/${app.manageToken}`
            : "";

        const reminderMsg =
            `¡Hola ${app.clientName}! 🌿 Te recuerdo tu turno de mañana en *Yo Bonita*:\n\n` +
            `• *Servicio:* ${app.service.name}\n` +
            `• *Cuándo:* ${formatArgDateTime(app.startTime)} hs\n` +
            `• *Dirección:* ${EXACT_ADDRESS}\n\n` +
            `Recordá asistir sin maquillaje ni cremas oleosas en la zona de los ojos. ¡Te espero! ✨` +
            manageLine;

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
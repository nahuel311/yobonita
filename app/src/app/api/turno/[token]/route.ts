import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppText, formatArgDateTime } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const EXACT_ADDRESS =
    "Rodriguez Peña 1334, Piso 8, Depto A (Recoleta, CABA)";

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export async function GET(
    _req: Request,
    { params }: { params: { token: string } }
) {
    const appointment = await prisma.appointment.findUnique({
        where: { manageToken: params.token },
        include: { service: true },
    });

    if (!appointment) {
        return NextResponse.json(
            { error: "Turno no encontrado o enlace inválido." },
            { status: 404 }
        );
    }

    const now = Date.now();
    const startMs = new Date(appointment.startTime).getTime();
    const isRefundEligible = startMs - now >= TWELVE_HOURS_MS;

    // Nunca exponemos techNotes en la vista pública y solo mostramos dirección si está CONFIRMED
    const effectivePrice =
        appointment.service.discountPrice &&
            appointment.service.discountPrice > 0 &&
            appointment.service.discountPrice < appointment.service.price
            ? appointment.service.discountPrice
            : appointment.service.price;

    const depositAmount =
        appointment.service.depositPrice && appointment.service.depositPrice > 0
            ? appointment.service.depositPrice
            : Math.round(effectivePrice * 0.3);

    const remainingBalance = Math.max(0, effectivePrice - depositAmount);

    // Nunca exponemos techNotes en la vista pública y solo mostramos dirección si está CONFIRMED
    return NextResponse.json({
        id: appointment.id,
        manageToken: appointment.manageToken,
        clientName: appointment.clientName,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        isRefundEligible,
        address: appointment.status === "CONFIRMED" ? EXACT_ADDRESS : null,
        payment: {
            totalPrice: effectivePrice,
            depositAmount,
            remainingBalance,
        },
        service: {
            id: appointment.service.id,
            name: appointment.service.name,
            category: appointment.service.category,
            durationMin: appointment.service.durationMin,
            price: effectivePrice,
        },
    });
}

export async function PATCH(
    req: Request,
    { params }: { params: { token: string } }
) {
    const appointment = await prisma.appointment.findUnique({
        where: { manageToken: params.token },
        include: { service: true },
    });

    if (!appointment) {
        return NextResponse.json(
            { error: "Turno no encontrado." },
            { status: 404 }
        );
    }

    if (appointment.status === "CANCELLED" || appointment.status === "COMPLETED") {
        return NextResponse.json(
            { error: "Este turno ya no puede modificarse." },
            { status: 400 }
        );
    }

    const body = await req.json();
    const adminPhone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
    const now = Date.now();
    const oldStartMs = new Date(appointment.startTime).getTime();
    const isRefundEligible = oldStartMs - now >= TWELVE_HOURS_MS;

    // 1. CANCELACIÓN POR PARTE DE LA CLIENTA
    if (body.action === "CANCEL") {
        const updated = await prisma.appointment.update({
            where: { id: appointment.id },
            data: { status: "CANCELLED" },
            include: { service: true },
        });

        // Notificar a Tami por WhatsApp
        if (adminPhone) {
            const refundText = isRefundEligible
                ? "✅ Canceló con MÁS de 12 hs de anticipación (corresponde devolución de seña)."
                : "⚠️ Canceló con MENOS de 12 hs de anticipación (sin devolución de seña).";

            const adminMsg =
                `❌ *Turno Cancelado desde la Web*\n\n` +
                `• *Clienta:* ${updated.clientName} (+${updated.clientPhone})\n` +
                `• *Servicio:* ${updated.service.name}\n` +
                `• *Fecha original:* ${formatArgDateTime(updated.startTime)} hs\n\n` +
                `${refundText}`;

            sendWhatsAppText(adminPhone, adminMsg);
        }

        return NextResponse.json({
            ok: true,
            status: updated.status,
            isRefundEligible,
        });
    }

    // 2. REPROGRAMACIÓN POR PARTE DE LA CLIENTA
    if (body.action === "RESCHEDULE") {
        const { date, time } = body;
        if (!date || !time) {
            return NextResponse.json(
                { error: "Seleccioná un nuevo día y horario." },
                { status: 400 }
            );
        }

        const newStartTime = new Date(`${date}T${time}:00-03:00`);
        const totalBlockMin =
            appointment.service.durationMin + appointment.service.bufferMin;
        const newEndTime = new Date(newStartTime.getTime() + totalBlockMin * 60000);

        if (newStartTime.getTime() < now + 2 * 60 * 60 * 1000) {
            return NextResponse.json(
                { error: "El nuevo horario debe tener al menos 2 horas de anticipación." },
                { status: 400 }
            );
        }

        // Verificar colisiones con otros turnos (excluyendo este mismo turno) y bloqueos
        const [conflictApp, conflictBlock] = await Promise.all([
            prisma.appointment.findFirst({
                where: {
                    id: { not: appointment.id },
                    status: { in: ["PENDING", "CONFIRMED"] },
                    startTime: { lt: newEndTime },
                    endTime: { gt: newStartTime },
                },
            }),
            prisma.blockedSlot.findFirst({
                where: {
                    startTime: { lt: newEndTime },
                    endTime: { gt: newStartTime },
                },
            }),
        ]);

        if (conflictApp || conflictBlock) {
            return NextResponse.json(
                { error: "Ese horario acaba de ocuparse. Por favor elegí otro." },
                { status: 409 }
            );
        }

        const updated = await prisma.appointment.update({
            where: { id: appointment.id },
            data: {
                startTime: newStartTime,
                endTime: newEndTime,
            },
            include: { service: true },
        });

        // Confirmar por WhatsApp a la clienta y avisar a Tami
        const clientMsg =
            `¡Hola ${updated.clientName}! ✨ \nTu turno en *Yo Bonita* fue *REPROGRAMADO* con éxito:\n\n` +
            `• *Servicio:* ${updated.service.name}\n` +
            `• *Nueva fecha y hora:* ${formatArgDateTime(newStartTime)} hs\n` +
            (updated.status === "CONFIRMED"
                ? `• *Dirección:* ${EXACT_ADDRESS}\n\n`
                : `\n`) +
            `Tu seña sigue vigente. ¡Te espero! 🌿`;

        sendWhatsAppText(updated.clientPhone, clientMsg);

        if (adminPhone) {
            const adminMsg =
                `🔄 *Turno Reprogramado por la Clienta*\n\n` +
                `• *Clienta:* ${updated.clientName}\n` +
                `• *Servicio:* ${updated.service.name}\n` +
                `• *Antes:* ${formatArgDateTime(appointment.startTime)} hs\n` +
                `• *Ahora:* ${formatArgDateTime(newStartTime)} hs`;

            sendWhatsAppText(adminPhone, adminMsg);
        }

        return NextResponse.json({
            ok: true,
            startTime: updated.startTime,
            endTime: updated.endTime,
        });
    }

    return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
}
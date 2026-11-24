export async function sendWhatsAppText(phone: string, text: string) {
    const apiUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instance = process.env.EVOLUTION_INSTANCE || "yobonita";

    if (!apiUrl || !apiKey) {
        console.warn("Evolution API no configurada en .env");
        return false;
    }

    // Asegurar formato limpio solo dígitos (ej: 54911XXXXXXXX)
    const cleanNumber = phone.replace(/\D/g, "");

    try {
        const res = await fetch(`${apiUrl}/message/sendText/${instance}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                apikey: apiKey,
            },
            body: JSON.stringify({
                number: cleanNumber,
                delay: 1200, // Simula escritura humana natural
                text,
            }),
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error("Error enviando WhatsApp:", errText);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Fallo de conexión con Evolution API:", error);
        return false;
    }
}

export function formatArgDateTime(date: Date) {
    return date.toLocaleString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}
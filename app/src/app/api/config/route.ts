import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const whatsappNumber =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
    process.env.WHATSAPP_NUMBER ||
    "5491100000000";

  return NextResponse.json({
    whatsappNumber: whatsappNumber.replace(/\D/g, ""),
  });
}

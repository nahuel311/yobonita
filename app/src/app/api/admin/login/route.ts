import { NextResponse } from "next/server";
import { createAdminToken, isAdminAuthenticated } from "@/lib/auth";

export async function GET() {
  const authenticated = await isAdminAuthenticated();
  return NextResponse.json({ authenticated });
}

export async function POST(req: Request) {
  const { password } = await req.json();
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
  }
  const token = await createAdminToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set("yb_admin", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

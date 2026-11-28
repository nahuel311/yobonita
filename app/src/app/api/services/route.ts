import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSeeded } from "@/lib/seed";
import { isAdminAuthenticated } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  await ensureSeeded();
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";

  const services = await prisma.service.findMany({
    where: all ? {} : { isActive: true },
  });

  const getPriority = (category: string) => {
    const norm = (category || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
    if (norm.includes("pestan")) return 1;
    if (norm.includes("ceja")) return 2;
    if (norm.includes("combo")) return 3;
    return 4;
  };

  services.sort((a, b) => {
    const pA = getPriority(a.category);
    const pB = getPriority(b.category);
    if (pA !== pB) return pA - pB;

    const priceA =
      a.discountPrice && a.discountPrice > 0 && a.discountPrice < a.price
        ? a.discountPrice
        : a.price;
    const priceB =
      b.discountPrice && b.discountPrice > 0 && b.discountPrice < b.price
        ? b.discountPrice
        : b.price;
    if (priceA !== priceB) return priceA - priceB;
    if (a.price !== b.price) return a.price - b.price;
    return a.name.localeCompare(b.name, "es");
  });

  return NextResponse.json(services);
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const body = await req.json();
  const service = await prisma.service.create({
    data: {
      name: body.name,
      category: body.category || "Cejas",
      description: body.description || "",
      durationMin: Number(body.durationMin),
      bufferMin: Number(body.bufferMin ?? 15),
      price: Number(body.price),
      discountPrice:
        body.discountPrice !== "" && body.discountPrice != null
          ? Number(body.discountPrice)
          : null,
      depositPrice:
        body.depositPrice !== "" && body.depositPrice != null
          ? Number(body.depositPrice)
          : null,
      isActive: true,
    },
  });
  return NextResponse.json(service);
}
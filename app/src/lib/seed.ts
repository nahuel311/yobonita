import { prisma } from "./prisma";

let seeded = false;

export async function ensureSeeded() {
  if (seeded) return;
  const serviceCount = await prisma.service.count();
  if (serviceCount === 0) {
    await prisma.service.createMany({
      data: [
        {
          name: "Lifting & Botox de Pestañas",
          category: "Pestañas",
          description: "Curvatura natural, nutrición profunda con botox y tinte para mayor intensidad.",
          durationMin: 60,
          bufferMin: 15,
          price: 24000,
        },
        {
          name: "Brow Lamination (Laminado)",
          category: "Cejas",
          description: "Alineación, peinado y fijación de cejas para un efecto poblado y definido.",
          durationMin: 50,
          bufferMin: 15,
          price: 22000,
        },
        {
          name: "Perfilado y Diseño de Cejas",
          category: "Cejas",
          description: "Diseño personalizado según la morfología de tu rostro y depilación de precisión.",
          durationMin: 30,
          bufferMin: 15,
          price: 14000,
        },
        {
          name: "Combo Mirada Completa Yo Bonita",
          category: "Combos",
          description: "Lifting + Botox + Tinte de pestañas + Perfilado y Tinte de cejas.",
          durationMin: 90,
          bufferMin: 15,
          price: 34000,
        },
        {
          name: "Combo Brow Restoration",
          category: "Combos",
          description: "Brow Lamination + Perfilado + Tinte nutricional de cejas.",
          durationMin: 65,
          bufferMin: 15,
          price: 28000,
        },
      ],
    });
  }

  // Asegurar que todos los servicios tengan bufferMin = 15 para acondicionamiento
  await prisma.service.updateMany({
    data: { bufferMin: 15 },
  });

  // 0 = Dom (Cerrado), 6 = Sáb (Cerrado), 1..5 = Lun a Vie (08:00 a 19:30)
  for (let day = 0; day <= 6; day++) {
    const isWeekend = day === 0 || day === 6;
    await prisma.workingHours.upsert({
      where: { dayOfWeek: day },
      update: {
        startTime: "08:00",
        endTime: "19:30",
        isOpen: !isWeekend,
      },
      create: {
        dayOfWeek: day,
        startTime: "08:00",
        endTime: "19:30",
        isOpen: !isWeekend,
      },
    });
  }

  seeded = true;
}

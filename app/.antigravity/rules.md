# Contexto del Proyecto: Yo Bonita (`yobonita.com.ar`)

## 1. Visión del Negocio y Reglas de Dominio
- **Marca:** Yo Bonita (`@yobonitaa` en Instagram).
- **Rubro:** Estética de la mirada — servicios profesionales de cejas y pestañas (Lifting & Botox, Brow Lamination, Perfilado y Diseño, Tinte/Henna y Combos Signature)[cite: 4, 5].
- **Modalidad y Ubicación:** Home Studio privado ubicado en Recoleta, CABA, gestionado por su dueña, Tami[cite: 3, 4].
- **Experiencia Sensorial:** Atención personalizada sin apuros con aromaterapia, música a elección de la clienta y café o té de cortesía[cite: 3, 5].
- **Reglas Críticas de Operación (Lógica de Negocio):**
  1. **Privacidad de dirección:** La web pública solo muestra *"Home Studio Privado • Recoleta, CABA"*. La dirección exacta y timbre se envían únicamente por WhatsApp desde `/admin` una vez que Tami confirma el pago de la seña.
  2. **Buffer Time (Tiempo de preparación):** Cada servicio tiene un `durationMin` (atención) + `bufferMin` (15 a 20 min de limpieza, esterilización y ventilación). El motor de disponibilidad bloquea `durationMin + bufferMin` para evitar superposiciones.
  3. **Flujo de Seña y WhatsApp sin API paga:** La reserva web crea un turno en estado `PENDING` y redirige a WhatsApp (`https://wa.me/...`) con un mensaje prearmado para enviar el comprobante de la seña (30%). Todas las notificaciones operativas usan deep links de WhatsApp.
  4. **Zona Horaria:** Toda la lógica de fechas y disponibilidad opera estrictamente en hora de Argentina (`America/Argentina/Buenos_Aires` / `-03:00`) con un mínimo de 2 horas de anticipación para turnos en el mismo día[cite: 3].

## 2. Identidad Visual y Diseño UI ("Naturaleza Minimalista")
- **Enfoque:** 100% *mobile-first* (tráfico principal proveniente de la bio de Instagram)[cite: 3].
- **Paleta de Colores (configurada en `tailwind.config.ts`):**
  - `oliva` (`#A3B18A`) / `oliva-dark` (`#708238`) / `oliva-light` (`#C5D1B2`) — Color principal y acentos[cite: 3].
  - `lino` (`#EAE2D6`) — Fondos secundarios y tarjetas seleccionadas[cite: 3].
  - `crema` (`#F4F1EA`) — Fondo general (`body`)[cite: 3].
  - `musgo` (`#2F3E46`) — Tipografía principal y contrastes oscuros (evitar negro puro)[cite: 3, 6].
- **Tipografías (`next/font/google`):**
  - `font-serif`: *Cormorant Garamond* (títulos editoriales)[cite: 3, 6].
  - `font-sans`: *Inter* (textos, formularios y panel admin)[cite: 3, 6].

## 3. Infraestructura y Despliegue en VPS
- **Dominio:** `https://yobonita.com.ar` (y `www.yobonita.com.ar`)[cite: 3].
- **Reverse Proxy & SSL:** Nginx en el host redirige el tráfico HTTPS (certificados gestionados por Certbot) hacia `http://127.0.0.1:3000`[cite: 3].
- **Contenedorización:** Docker + Docker Compose corriendo en `/opt/yobonita`[cite: 3].
  - Imagen multi-stage basada en `node:20-alpine` con `output: 'standalone'` en `next.config.mjs`[cite: 3].
  - El contenedor corre bajo el usuario sin privilegios `nextjs` (`UID 1001` / `GID 1001`)[cite: 3].
  - Al iniciar, ejecuta `node ./node_modules/prisma/build/index.js db push --skip-generate && node server.js`[cite: 3].
- **Persistencia y Backups:**
  - Base de datos SQLite en `/opt/yobonita/data/prod.db` (montada como volumen `./data:/app/data`, con propietario `1001:1001`)[cite: 3].
  - Cronjob diario a las 03:00 AM copia `prod.db` a `/opt/yobonita/backups/` con retención de 14 días[cite: 3].
- **Variables de Entorno (`/opt/yobonita/.env`):**
  - `DATABASE_URL="file:/app/data/prod.db"`[cite: 3]
  - `ADMIN_PASSWORD` (clave maestra de acceso a `/admin`)[cite: 3]
  - `JWT_SECRET` (firma de tokens de sesión)[cite: 3]
  - `NEXT_PUBLIC_SITE_URL="https://yobonita.com.ar"`[cite: 3]
  - `NEXT_PUBLIC_WHATSAPP_NUMBER` (formato `54911XXXXXXXX`)[cite: 3]

## 4. Stack Tecnológico y Estructura de Código
- **Framework:** Next.js 14.2.15 (App Router) + React 18 + TypeScript[cite: 3].
- **Estilos e Iconos:** Tailwind CSS 3.4 + `lucide-react`[cite: 3].
- **ORM y Base de Datos:** Prisma 5.20.0 + SQLite[cite: 3].
- **Autenticación:** JWT con librería `jose` almacenado en cookie HTTP-only (`yb_admin`, duración 7 días)[cite: 3].

### Árbol de Archivos Principal (`/opt/yobonita`)
```text
/opt/yobonita/
├── .env                          # Variables de entorno en producción (ignorado en git)[cite: 3]
├── .gitignore                    # Excluye node_modules, .next, .env, data/*.db y backups[cite: 3]
├── docker-compose.yml            # Orquestación del servicio yobonita-web (127.0.0.1:3000)[cite: 3]
├── data/prod.db                  # Base de datos SQLite persistente[cite: 3]
├── backups/                      # Respaldos automáticos diarios[cite: 3]
└── app/                          # Código fuente de la aplicación Next.js[cite: 3]
    ├── Dockerfile                # Build multi-stage standalone + binarios de Prisma[cite: 3]
    ├── next.config.mjs           # output: 'standalone', ignoreDuringBuilds/BuildErrors[cite: 3]
    ├── tailwind.config.ts        # Tokens de color (oliva, lino, crema, musgo) y fuentes[cite: 3]
    ├── prisma/
    │   └── schema.prisma         # Modelos: Service, Appointment, WorkingHours, BlockedSlot[cite: 3]
    └── src/
        ├── lib/
        │   ├── prisma.ts         # Instancia singleton de PrismaClient[cite: 3]
        │   ├── seed.ts           # ensureSeeded(): carga servicios iniciales y horarios Lun-Sáb[cite: 3]
        │   └── auth.ts           # Creación y verificación de JWT para /admin[cite: 3]
        └── app/
            ├── layout.tsx        # Configuración de fuentes Google y metadata SEO[cite: 3]
            ├── globals.css       # Estilos base Tailwind[cite: 3]
            ├── page.tsx          # Landing page pública + flujo de reserva en 3 pasos[cite: 3]
            ├── admin/
            │   └── page.tsx      # Panel privado: agenda, estados, ficha técnica y precios[cite: 3]
            └── api/
                ├── admin/login/route.ts      # GET (check auth) / POST (login con cookie)[cite: 3]
                ├── services/route.ts         # GET (catálogo) / POST (crear servicio)[cite: 3]
                ├── services/[id]/route.ts    # PATCH (actualizar precio, duración o estado)[cite: 3]
                ├── availability/route.ts     # GET (calcula slots libres según fecha y servicio)[cite: 3]
                ├── appointments/route.ts     # GET (lista admin) / POST (nueva reserva web)[cite: 3]
                └── appointments/[id]/route.ts # PATCH (cambiar estado o guardar techNotes)[cite: 3]

5. Modelo de Datos (prisma/schema.prisma)
Service: id, name, category ("Pestañas" | "Cejas" | "Combos"), description, durationMin, bufferMin (default 15), price (Int en ARS), isActive[cite: 3].

Appointment: id, clientName, clientPhone (normalizado a 549...), clientNotes (alergias/observaciones clienta), techNotes (ficha técnica interna: molde, tiempos, pigmento), startTime, endTime (startTime + durationMin + bufferMin), status (PENDING | CONFIRMED | COMPLETED | CANCELLED), serviceId[cite: 3].

WorkingHours: dayOfWeek (0 Dom a 6 Sáb), startTime ("10:00"), endTime ("19:30"), isOpen[cite: 3].

BlockedSlot: id, startTime, endTime, reason[cite: 3].

6. Convenciones para Nuevas Funcionalidades
Mantener la estética minimalista y el tono cálido/profesional de la marca.

Cualquier nueva ruta administrativa bajo /api/... que modifique datos o lea información sensible de clientas debe validar await isAdminAuthenticated()[cite: 3].

Evitar dependencias pesadas que incrementen el consumo de RAM durante npm run build en el VPS[cite: 3].

Recordar que tras cambios en el código en el VPS, el despliegue se actualiza con docker compose up -d --build desde /opt/yobonita[cite: 3].
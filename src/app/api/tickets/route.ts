import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { createNotification } from "@/lib/audit";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const isAdmin = isAdminRole(auth.user.role);
  const tickets = await prisma.supportTicket.findMany({
    where: isAdmin ? {} : { userId: auth.user.id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      replies: {
        where: isAdmin ? {} : { isInternal: false },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, role: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ tickets });
}

const CreateTicketSchema = z.object({
  subject: z.string().trim().min(3, "Subject is required"),
  category: z.string().trim().default("Distribution"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  message: z.string().trim().min(5, "Message is required"),
});

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    if (body?.action === "reply") {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: String(body.ticketId || "") },
      });
      if (!ticket) {
        return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
      }
      const isAdmin = isAdminRole(auth.user.role);
      if (!isAdmin && ticket.userId !== auth.user.id) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }

      const msg = String(body.message || "").trim();
      if (!msg) {
        return NextResponse.json({ error: "Reply cannot be empty." }, { status: 400 });
      }

      const reply = await prisma.ticketReply.create({
        data: {
          ticketId: ticket.id,
          userId: auth.user.id,
          message: msg,
          isInternal: Boolean(body.isInternal && isAdmin),
        },
        include: { user: { select: { id: true, name: true, role: true } } },
      });

      const nextStatus =
        isAdmin && body.status
          ? body.status
          : isAdmin
          ? "WAITING_USER"
          : "IN_PROGRESS";

      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: nextStatus },
      });

      if (isAdmin && ticket.userId !== auth.user.id && !reply.isInternal) {
        await createNotification({
          userId: ticket.userId,
          type: "SUPPORT",
          title: `Reply on Ticket: ${ticket.subject}`,
          message: msg.slice(0, 120),
          link: "/dashboard/support",
        });
      }

      return NextResponse.json({ ok: true, reply }, { status: 201 });
    }

    const parsed = CreateTicketSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid ticket input." },
        { status: 400 }
      );
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: auth.user.id,
        subject: parsed.data.subject,
        category: parsed.data.category,
        priority: parsed.data.priority,
        replies: {
          create: {
            userId: auth.user.id,
            message: parsed.data.message,
          },
        },
      },
      include: {
        replies: { include: { user: { select: { id: true, name: true, role: true } } } },
      },
    });

    return NextResponse.json({ ok: true, ticket }, { status: 201 });
  } catch (err) {
    console.error("Ticket error:", err);
    return NextResponse.json({ error: "Ticket request failed." }, { status: 500 });
  }
}

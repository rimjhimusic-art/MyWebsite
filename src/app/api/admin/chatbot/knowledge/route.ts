import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { userHasAnyPermission } from "@/lib/permissions";
import { putObject } from "@/lib/storage";
import { recordAuditLog } from "@/lib/audit";

const CreateKbSchema = z.object({
  title: z.string().trim().min(2).max(200),
  category: z
    .enum(["FAQ", "BUSINESS_INFO", "SERVICE", "PRICING", "POLICY", "DOCUMENT"])
    .default("FAQ"),
  question: z.string().trim().max(500).optional().nullable(),
  content: z.string().trim().min(5).max(30_000),
  tags: z.string().trim().max(400).optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const UpdateKbSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(2).max(200).optional(),
  category: z
    .enum(["FAQ", "BUSINESS_INFO", "SERVICE", "PRICING", "POLICY", "DOCUMENT"])
    .optional(),
  question: z.string().trim().max(500).optional().nullable(),
  content: z.string().trim().min(2).max(30_000).optional(),
  tags: z.string().trim().max(400).optional(),
  enabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!userHasAnyPermission(auth.user, ["chatbot:view", "chatbot:manage", "tickets:manage_all"])) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const category = (searchParams.get("category") || "").trim();

  const [entries, faqCount] = await Promise.all([
    prisma.knowledgeBaseEntry.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.faqItem.count({ where: { published: true } }),
  ]);

  const filtered = q
    ? entries.filter((e) =>
        `${e.title} ${e.question || ""} ${e.content} ${e.tags}`.toLowerCase().includes(q)
      )
    : entries;

  return NextResponse.json({ entries: filtered, publishedWebsiteFaqCount: faqCount });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!userHasAnyPermission(auth.user, ["chatbot:manage", "cms:manage"])) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = String(formData.get("title") || file?.name || "").trim();
    const category = String(formData.get("category") || "DOCUMENT").trim();
    const tags = String(formData.get("tags") || "").trim();

    if (!file) {
      return NextResponse.json({ error: "Support document file is required." }, { status: 400 });
    }
    const allowedExt = /\.(txt|md|markdown|csv|json)$/i;
    if (!allowedExt.test(file.name)) {
      return NextResponse.json(
        { error: "Supported document formats: .txt, .md, .csv, .json" },
        { status: 400 }
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Document size must be <= 2 MB." }, { status: 400 });
    }
    const textContent = buf.toString("utf8").trim();
    if (!textContent) {
      return NextResponse.json({ error: "Uploaded document is empty." }, { status: 400 });
    }

    const storageKey = `kb-docs/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await putObject(storageKey, buf, file.type || "text/plain");

    const entry = await prisma.knowledgeBaseEntry.create({
      data: {
        title: title || file.name,
        category: ["FAQ", "BUSINESS_INFO", "SERVICE", "PRICING", "POLICY", "DOCUMENT"].includes(
          category
        )
          ? category
          : "DOCUMENT",
        content: textContent.slice(0, 30_000),
        tags,
        documentFileName: file.name,
        documentStorageKey: storageKey,
        enabled: true,
        createdById: auth.user.id,
      },
    });

    await recordAuditLog({
      actorUserId: auth.user.id,
      action: "CHATBOT_KB_DOCUMENT_UPLOADED",
      entityType: "KnowledgeBaseEntry",
      entityId: entry.id,
      metadata: { fileName: file.name },
    });

    return NextResponse.json({ ok: true, entry }, { status: 201 });
  }

  const body = await request.json().catch(() => null);
  const parsed = CreateKbSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid knowledge base entry." },
      { status: 400 }
    );
  }

  const entry = await prisma.knowledgeBaseEntry.create({
    data: {
      title: parsed.data.title,
      category: parsed.data.category,
      question: parsed.data.question || null,
      content: parsed.data.content,
      tags: parsed.data.tags || "",
      enabled: parsed.data.enabled ?? true,
      sortOrder: parsed.data.sortOrder ?? 0,
      createdById: auth.user.id,
    },
  });

  await recordAuditLog({
    actorUserId: auth.user.id,
    action: "CHATBOT_KB_CREATED",
    entityType: "KnowledgeBaseEntry",
    entityId: entry.id,
  });

  return NextResponse.json({ ok: true, entry }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!userHasAnyPermission(auth.user, ["chatbot:manage", "cms:manage"])) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = UpdateKbSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid update payload." },
      { status: 400 }
    );
  }

  const { id, ...rest } = parsed.data;
  const entry = await prisma.knowledgeBaseEntry.update({
    where: { id },
    data: rest,
  });

  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!userHasAnyPermission(auth.user, ["chatbot:manage", "cms:manage"])) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = (searchParams.get("id") || "").trim();
  if (!id) {
    return NextResponse.json({ error: "Entry id is required." }, { status: 400 });
  }

  await prisma.knowledgeBaseEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

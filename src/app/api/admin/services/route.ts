import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";
import { getProviderCredentialStatus, type ProviderKey } from "@/lib/integrations";
import { recordAuditLog } from "@/lib/audit";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!isAdminRole(auth.user.role)) {
    return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  }

  const [
    youtubeRequests,
    vevoSubmissions,
    rightsClaims,
    integrations,
    sitePages,
    faqs,
    contactInquiries,
    brandInquiries,
    careerApplications,
    auditLogs,
    dspStores,
  ] = await Promise.all([
    prisma.youtubeRequest.findMany({
      include: {
        owner: { select: { name: true, email: true } },
        channel: { select: { channelName: true, channelId: true } },
        release: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.vevoSubmission.findMany({
      include: {
        owner: { select: { name: true, email: true } },
        artist: { select: { stageName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.rightsClaim.findMany({
      include: {
        claimant: { select: { name: true, email: true } },
        rightsAsset: {
          include: {
            release: { select: { title: true } },
            track: { select: { title: true, isrc: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.integrationConfig.findMany({ orderBy: { provider: "asc" } }),
    prisma.sitePage.findMany({ orderBy: { slug: "asc" } }),
    prisma.faqItem.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.contactInquiry.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.brandInquiry.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.careerApplication.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.auditLog.findMany({
      include: { actor: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.dspStore.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const enrichedIntegrations = integrations.map((cfg) => ({
    ...cfg,
    envStatus: getProviderCredentialStatus(cfg.provider as ProviderKey),
  }));

  return NextResponse.json({
    youtubeRequests,
    vevoSubmissions,
    rightsClaims,
    integrations: enrichedIntegrations,
    sitePages,
    faqs,
    contactInquiries,
    brandInquiries,
    careerApplications,
    auditLogs,
    dspStores,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  if (!isAdminRole(auth.user.role)) {
    return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { module } = body;

    if (module === "youtube") {
      const updated = await prisma.youtubeRequest.update({
        where: { id: body.id },
        data: {
          status: body.status,
          adminNotes: body.adminNotes || null,
          reviewedById: auth.user.id,
        },
      });
      return NextResponse.json({ ok: true, item: updated });
    }

    if (module === "vevo") {
      const updated = await prisma.vevoSubmission.update({
        where: { id: body.id },
        data: {
          status: body.status,
          rejectionReason: body.rejectionReason || null,
          internalNotes: body.internalNotes || null,
          reviewedById: auth.user.id,
        },
      });
      return NextResponse.json({ ok: true, item: updated });
    }

    if (module === "rights") {
      const updated = await prisma.rightsClaim.update({
        where: { id: body.id },
        data: {
          status: body.status,
          resolutionNotes: body.resolutionNotes || null,
          resolvedById: auth.user.id,
        },
      });
      return NextResponse.json({ ok: true, item: updated });
    }

    if (module === "store") {
      const updated = await prisma.dspStore.update({
        where: { id: body.id },
        data: { active: Boolean(body.active) },
      });
      return NextResponse.json({ ok: true, item: updated });
    }

    if (module === "integration") {
      const updated = await prisma.integrationConfig.update({
        where: { id: body.id },
        data: {
          enabled: Boolean(body.enabled),
          statusMessage: body.statusMessage || undefined,
          lastCheckedAt: new Date(),
        },
      });
      await recordAuditLog({
        actorUserId: auth.user.id,
        action: "INTEGRATION_UPDATED",
        entityType: "IntegrationConfig",
        entityId: updated.id,
      });
      return NextResponse.json({ ok: true, item: updated });
    }

    if (module === "cms") {
      const updated = await prisma.sitePage.update({
        where: { id: body.id },
        data: {
          title: body.title,
          subtitle: body.subtitle || null,
          updatedById: auth.user.id,
        },
      });
      return NextResponse.json({ ok: true, item: updated });
    }

    if (module === "faq") {
      if (body.create) {
        const created = await prisma.faqItem.create({
          data: {
            question: body.question,
            answer: body.answer,
            category: body.category || "General",
            keywords: body.keywords || "",
          },
        });
        return NextResponse.json({ ok: true, item: created });
      }
      const updated = await prisma.faqItem.update({
        where: { id: body.id },
        data: {
          published: Boolean(body.published),
          question: body.question,
          answer: body.answer,
        },
      });
      return NextResponse.json({ ok: true, item: updated });
    }

    return NextResponse.json({ error: "Unknown admin module." }, { status: 400 });
  } catch (err) {
    console.error("Admin services PATCH error:", err);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}

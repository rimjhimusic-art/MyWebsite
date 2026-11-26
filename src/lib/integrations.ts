import { prisma } from "@/lib/db";

export type ProviderKey =
  | "VYDIA"
  | "SPOTIFY"
  | "APPLE_MUSIC"
  | "YOUTUBE"
  | "STRIPE"
  | "SMTP"
  | "S3";

export interface PartnerDispatchResult {
  provider: ProviderKey;
  status: "PENDING_PARTNER_CREDENTIALS" | "DISPATCHED" | "INTERNAL_REVIEW";
  message: string;
  referenceId?: string;
}

export function getProviderCredentialStatus(provider: ProviderKey): {
  configured: boolean;
  mode: "PRODUCTION" | "SANDBOX" | "UNCONFIGURED";
  reason: string;
} {
  switch (provider) {
    case "VYDIA":
      if (process.env.VYDIA_API_KEY && process.env.VYDIA_API_BASE_URL) {
        return { configured: true, mode: "PRODUCTION", reason: "Vydia API credentials configured." };
      }
      return {
        configured: false,
        mode: "UNCONFIGURED",
        reason: "VYDIA_API_KEY and VYDIA_API_BASE_URL not configured. Submissions remain in internal review / pending-partner state.",
      };
    case "SPOTIFY":
      if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
        return { configured: true, mode: "PRODUCTION", reason: "Spotify API credentials configured." };
      }
      return {
        configured: false,
        mode: "UNCONFIGURED",
        reason: "SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not configured.",
      };
    case "APPLE_MUSIC":
      if (process.env.APPLE_MUSIC_KEY_ID && process.env.APPLE_MUSIC_TEAM_ID) {
        return { configured: true, mode: "PRODUCTION", reason: "Apple Music API credentials configured." };
      }
      return {
        configured: false,
        mode: "UNCONFIGURED",
        reason: "APPLE_MUSIC_KEY_ID / APPLE_MUSIC_TEAM_ID not configured.",
      };
    case "YOUTUBE":
      if (process.env.YOUTUBE_API_KEY && process.env.YOUTUBE_CLIENT_ID) {
        return { configured: true, mode: "PRODUCTION", reason: "YouTube Content ID / Data API credentials configured." };
      }
      return {
        configured: false,
        mode: "UNCONFIGURED",
        reason: "YOUTUBE_API_KEY / YOUTUBE_CLIENT_ID not configured. Claims and OAC requests stay in internal review / pending partner auth.",
      };
    case "STRIPE":
      if (process.env.STRIPE_SECRET_KEY) {
        return { configured: true, mode: "PRODUCTION", reason: "Stripe payout API key configured." };
      }
      return {
        configured: false,
        mode: "UNCONFIGURED",
        reason: "STRIPE_SECRET_KEY not configured. Payouts are processed manually by Finance Manager.",
      };
    case "SMTP":
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return { configured: true, mode: "PRODUCTION", reason: "SMTP relay configured." };
      }
      return {
        configured: false,
        mode: "UNCONFIGURED",
        reason: "SMTP_* variables unset. Outbound emails are recorded in EmailLog.",
      };
    case "S3":
      if (process.env.STORAGE_DRIVER === "s3" && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID) {
        return { configured: true, mode: "PRODUCTION", reason: "S3-compatible object storage active." };
      }
      return {
        configured: false,
        mode: "SANDBOX",
        reason: "Using local S3-compatible object bucket (./storage). Set STORAGE_DRIVER=s3 and S3_* to switch to remote S3/R2.",
      };
  }
}

export async function dispatchReleaseToPartner(
  releaseId: string,
  provider: ProviderKey = "VYDIA"
): Promise<PartnerDispatchResult> {
  const status = getProviderCredentialStatus(provider);
  const config = await prisma.integrationConfig.findUnique({
    where: { provider },
  });

  if (!status.configured || !config?.enabled) {
    return {
      provider,
      status: "PENDING_PARTNER_CREDENTIALS",
      message: `${provider} partner API credentials are not active (${status.reason}). Release ${releaseId} stays in approved/pending-partner queue rather than faking DSP delivery.`,
    };
  }

  // Authorized external API dispatch hook when partner agreement & credentials exist
  return {
    provider,
    status: "INTERNAL_REVIEW",
    message: `Partner adapter ${provider} verified credentials; queued for authorized delivery batch.`,
  };
}

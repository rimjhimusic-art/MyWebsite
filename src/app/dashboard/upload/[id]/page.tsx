import React from "react";
import { ReleaseWizard } from "@/components/ReleaseWizard";

export default async function EditReleaseDraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ReleaseWizard releaseId={id} />;
}

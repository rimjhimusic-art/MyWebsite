import { prisma } from "@/lib/db";

export async function getAccessibleLabelIds(userId: string): Promise<string[]> {
  const labels = await prisma.label.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true },
  });
  return labels.map((l) => l.id);
}

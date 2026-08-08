import { prisma } from "../config/prisma";

export const RiderMasterRepository = {
  async findByRiderId(riderId: string) {
    return prisma.riderMaster.findUnique({ where: { riderId } });
  },

  async findOrCreate(riderId: string, riderName?: string | null) {
    const existing = await this.findByRiderId(riderId);
    if (existing) return existing;
    return prisma.riderMaster.create({
      data: { riderId, riderName: riderName?.trim() || riderId },
    });
  },

  /** Batch find-or-create, so the calculation orchestrator isn't making one
   * round trip per rider for a step that's purely bookkeeping. */
  async findOrCreateMany(riders: { riderId: string; riderName?: string | null }[]) {
    const existing = await prisma.riderMaster.findMany({
      where: { riderId: { in: riders.map((r) => r.riderId) } },
    });
    const existingIds = new Set(existing.map((r) => r.riderId));
    const toCreate = riders.filter((r) => !existingIds.has(r.riderId));

    if (toCreate.length > 0) {
      await prisma.riderMaster.createMany({
        data: toCreate.map((r) => ({ riderId: r.riderId, riderName: r.riderName?.trim() || r.riderId })),
        skipDuplicates: true,
      });
    }

    return prisma.riderMaster.findMany({ where: { riderId: { in: riders.map((r) => r.riderId) } } });
  },
};

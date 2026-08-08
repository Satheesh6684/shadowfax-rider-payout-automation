import { prisma } from "../config/prisma";

const SINGLETON_ID = "singleton";

export const SettingsRepository = {
  async get() {
    const existing = await prisma.appSettings.findUnique({ where: { id: SINGLETON_ID } });
    if (existing) return existing;
    return prisma.appSettings.create({ data: { id: SINGLETON_ID } });
  },

  async update(data: Record<string, unknown>, updatedBy: string) {
    // Upsert so the very first save works even if the singleton row was
    // never lazily created by a GET yet.
    return prisma.appSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data, updatedBy },
      update: { ...data, updatedBy },
    });
  },
};

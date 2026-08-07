import { prisma } from "../config/prisma";

export const CityRepository = {
  async findByName(name: string) {
    return prisma.city.findUnique({ where: { name } });
  },

  async findOrCreate(name: string) {
    const existing = await this.findByName(name);
    if (existing) return existing;
    return prisma.city.create({ data: { name } });
  },

  async listAll() {
    return prisma.city.findMany({ orderBy: { name: "asc" } });
  },
};

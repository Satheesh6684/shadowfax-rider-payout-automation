import { prisma } from "../config/prisma";
import { ConflictError } from "../utils/AppError";

export const StoreRepository = {
  async findByCode(storeCode: string) {
    return prisma.store.findUnique({ where: { storeCode }, include: { city: true } });
  },

  async listAll(cityName?: string) {
    return prisma.store.findMany({
      where: cityName ? { city: { name: cityName } } : undefined,
      include: { city: true },
      orderBy: { storeName: "asc" },
    });
  },

  /** Looks up multiple stores by id at once — used wherever a table stores
   * a plain storeId string without a formal Prisma relation (e.g.
   * RiderCalculation) and needs to display store details. */
  async findByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return prisma.store.findMany({ where: { id: { in: Array.from(new Set(ids)) } }, include: { city: true } });
  },

  /**
   * Rate Card create/edit works with plain city/store-name/store-code text
   * fields; this is what turns that into the normalized Store row the rest
   * of the schema (Orders, Login Hours, future modules) expects.
   *
   * If the code already exists under a *different* store name or city, that
   * is a real data conflict (the same code can't refer to two stores) and
   * gets surfaced rather than silently overwritten.
   */
  async findOrCreateForRateCard(params: { cityId: string; storeCode: string; storeName: string }) {
    const existing = await this.findByCode(params.storeCode);

    if (existing) {
      if (existing.cityId !== params.cityId || existing.storeName !== params.storeName) {
        throw new ConflictError(
          `Store Code "${params.storeCode}" is already registered as "${existing.storeName}". ` +
            "Use the existing store name/city, or choose a different store code."
        );
      }
      return existing;
    }

    return prisma.store.create({
      data: {
        storeCode: params.storeCode,
        storeName: params.storeName,
        cityId: params.cityId,
      },
    });
  },
};

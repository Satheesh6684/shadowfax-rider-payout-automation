/**
 * Minimal contract every module repository follows. Repositories are the
 * only layer allowed to talk to Prisma directly — services call
 * repositories, controllers call services. Keeping this thin on purpose:
 * concrete repositories (RateCardRepository, StoreRepository, ...) added in
 * later phases implement this against their own Prisma delegate and add
 * whatever query methods their module actually needs.
 */
export interface BaseRepository<TEntity, TId = string> {
  findById(id: TId): Promise<TEntity | null>;
  findMany(params?: Record<string, unknown>): Promise<TEntity[]>;
  create(data: Partial<TEntity>): Promise<TEntity>;
  update(id: TId, data: Partial<TEntity>): Promise<TEntity>;
  delete(id: TId): Promise<void>;
}

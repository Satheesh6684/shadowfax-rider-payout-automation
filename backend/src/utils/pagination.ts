export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;

export function normalizePagination(params: PaginationParams): { page: number; pageSize: number; skip: number } {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function toPaginatedResult<T>(items: T[], total: number, page: number, pageSize: number): PaginatedResult<T> {
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

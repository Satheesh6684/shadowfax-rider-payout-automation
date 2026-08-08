import { RiderRepository } from "../repositories/rider.repository";
import { StoreRepository } from "../repositories/store.repository";
import { CalculationRepository } from "../repositories/calculation.repository";
import { parseWeekStart } from "../utils/week";
import { NotFoundError } from "../utils/AppError";

export const RiderService = {
  async search(
    filters: { query?: string; weekStartDate?: string; storeCode?: string },
    pagination: { page?: number; pageSize?: number }
  ) {
    let storeId: string | undefined;
    if (filters.storeCode) {
      const store = await StoreRepository.findByCode(filters.storeCode);
      storeId = store?.id;
    }

    return RiderRepository.search(
      {
        query: filters.query,
        weekStartDate: filters.weekStartDate ? parseWeekStart(filters.weekStartDate) : undefined,
        storeId,
      },
      pagination
    );
  },

  async getProfile(riderId: string) {
    const rider = await RiderRepository.findByRiderId(riderId);
    if (!rider) throw new NotFoundError("Rider");
    const activeWeeks = await RiderRepository.getActiveWeeks(riderId);
    return { rider, activeWeeks };
  },

  async getCalculationHistory(riderId: string, pagination: { page?: number; pageSize?: number }) {
    await this.assertExists(riderId);
    return RiderRepository.getCalculationHistory(riderId, pagination);
  },

  async getExceptionHistory(riderId: string, pagination: { page?: number; pageSize?: number }) {
    await this.assertExists(riderId);
    return RiderRepository.getExceptionHistory(riderId, pagination);
  },

  async getWeekDetail(riderId: string, weekStartDateInput: string) {
    await this.assertExists(riderId);
    const weekStartDate = parseWeekStart(weekStartDateInput);
    const [orders, loginHours, calculationLogs] = await Promise.all([
      RiderRepository.getOrdersForWeek(riderId, weekStartDate),
      RiderRepository.getLoginHoursForWeek(riderId, weekStartDate),
      CalculationRepository.listLogsForRider(weekStartDate, riderId).catch(() => []),
    ]);
    return { orders, loginHours, calculationLogs };
  },

  async assertExists(riderId: string) {
    const rider = await RiderRepository.findByRiderId(riderId);
    if (!rider) throw new NotFoundError("Rider");
    return rider;
  },
};

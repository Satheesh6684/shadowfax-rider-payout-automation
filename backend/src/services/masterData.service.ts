import { CityRepository } from "../repositories/city.repository";
import { StoreRepository } from "../repositories/store.repository";

export const MasterDataService = {
  async listCities() {
    return CityRepository.listAll();
  },

  async listStores(cityName?: string) {
    return StoreRepository.listAll(cityName);
  },

  async resolveStore(params: { cityName: string; storeCode: string; storeName: string }) {
    const city = await CityRepository.findOrCreate(params.cityName.trim());
    return StoreRepository.findOrCreateForRateCard({
      cityId: city.id,
      storeCode: params.storeCode.trim(),
      storeName: params.storeName.trim(),
    });
  },
};

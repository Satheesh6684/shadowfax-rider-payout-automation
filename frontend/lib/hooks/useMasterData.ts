"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { rateCardsApi } from "@/lib/api/rateCards";
import { City, Store } from "@/lib/types";

export function useMasterData() {
  const { token } = useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    Promise.all([rateCardsApi.listCities(token), rateCardsApi.listStores(undefined, token)])
      .then(([cityList, storeList]) => {
        if (cancelled) return;
        setCities(cityList);
        setStores(storeList);
      })
      .catch(() => {
        // Non-fatal — the form still works with free-text entry if this fails.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return { cities, stores, isLoading };
}

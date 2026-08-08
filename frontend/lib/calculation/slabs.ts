import { RateCard, SlabRow } from "@/lib/types";

const SLAB_KEYS = ["1", "2", "3", "4", "5", "6", "7"] as const;

/** Converts the form's dynamic slab rows into the rate card's flat
 * o1-o7/mg1-mg7/var1-var7 fields, in order, leaving unused slots null. */
export function slabsToFields(slabs: SlabRow[]): Record<string, number | undefined> {
  const fields: Record<string, number | undefined> = {};
  SLAB_KEYS.forEach((key, i) => {
    const row = slabs[i];
    fields[`o${key}`] = row?.maxOrders;
    fields[`mg${key}`] = row?.mgAmount;
    fields[`var${key}`] = row?.variableAmount;
  });
  return fields;
}

/** Converts an existing rate card's flat o1-o7/mg1-mg7/var1-var7 fields
 * back into rows for the editor, skipping fully-empty slots. */
export function fieldsToSlabRows(rateCard: RateCard): SlabRow[] {
  const o = [rateCard.o1, rateCard.o2, rateCard.o3, rateCard.o4, rateCard.o5, rateCard.o6, rateCard.o7];
  const mg = [rateCard.mg1, rateCard.mg2, rateCard.mg3, rateCard.mg4, rateCard.mg5, rateCard.mg6, rateCard.mg7];
  const v = [rateCard.var1, rateCard.var2, rateCard.var3, rateCard.var4, rateCard.var5, rateCard.var6, rateCard.var7];

  const rows: SlabRow[] = [];
  for (let i = 0; i < 7; i++) {
    if (o[i] === null && mg[i] === null && v[i] === null) continue;
    rows.push({
      maxOrders: o[i] ?? undefined,
      mgAmount: mg[i] ? Number(mg[i]) : undefined,
      variableAmount: v[i] ? Number(v[i]) : undefined,
    });
  }
  return rows;
}

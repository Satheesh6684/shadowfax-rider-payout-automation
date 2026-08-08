import { issue, OrderRow, RawIssue } from "./types";

export function validateOrders(rows: OrderRow[]): RawIssue[] {
  const issues: RawIssue[] = [];

  for (const row of rows) {
    if (!row.riderId.trim()) {
      issues.push(issue("ORDERS", "BLANK_RIDER_ID", "ERROR", "Order has a blank Rider ID.", { orderId: row.orderId }));
    }
    if (!row.status.trim()) {
      issues.push(issue("ORDERS", "BLANK_STATUS", "ERROR", "Order has a blank Status.", { orderId: row.orderId }));
    }
    if (!row.storeCode.trim()) {
      issues.push(issue("ORDERS", "BLANK_STORE_CODE", "ERROR", "Order has a blank Store Code.", { orderId: row.orderId }));
    } else if (row.storeId === null) {
      issues.push(
        issue("ORDERS", "UNKNOWN_STORE_CODE", "ERROR", `Store code "${row.storeCode}" is not a recognized store.`, {
          orderId: row.orderId,
          storeCode: row.storeCode,
        })
      );
    }
  }

  // Duplicate Order IDs — the database's own unique constraint
  // (orderId + weekStartDate) already makes this structurally impossible
  // within a single upload, so this will realistically never fire. Kept for
  // defensive completeness and honest reporting if that constraint ever
  // changes.
  const byOrderId = new Map<string, OrderRow[]>();
  for (const row of rows) {
    const list = byOrderId.get(row.orderId) ?? [];
    list.push(row);
    byOrderId.set(row.orderId, list);
  }
  for (const [orderId, group] of byOrderId) {
    if (group.length > 1) {
      issues.push(issue("ORDERS", "DUPLICATE_ORDER_ID", "ERROR", `Order ID "${orderId}" appears ${group.length} times.`, { orderId }));
    }
  }

  // Duplicate AWB numbers — not database-constrained, a genuine data-quality
  // signal worth surfacing (same AWB used across different orders).
  const byAwb = new Map<string, OrderRow[]>();
  for (const row of rows) {
    if (!row.awbNumber) continue;
    const list = byAwb.get(row.awbNumber) ?? [];
    list.push(row);
    byAwb.set(row.awbNumber, list);
  }
  for (const [awb, group] of byAwb) {
    if (group.length > 1) {
      issues.push(
        issue(
          "ORDERS",
          "DUPLICATE_AWB",
          "WARNING",
          `AWB number "${awb}" is used by ${group.length} different orders.`,
          { awbNumber: awb, orderIds: group.map((r) => r.orderId) }
        )
      );
    }
  }

  return issues;
}

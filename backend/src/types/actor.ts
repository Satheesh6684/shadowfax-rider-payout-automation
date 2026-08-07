/** Who performed an action — threaded through to a record's own
 * createdBy/changedBy field (human-readable) and the audit log's userId
 * (a real FK back to users). Shared across every module's service layer. */
export interface Actor {
  userId: string;
  email: string;
}

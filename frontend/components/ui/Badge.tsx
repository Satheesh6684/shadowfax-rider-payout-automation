import { RateCardStatus } from "@/lib/types";

interface BadgeProps {
  children: React.ReactNode;
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
}

const TONE_CLASSES: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-background text-muted border-border",
  primary: "bg-primary-soft text-primary border-primary/20",
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning border-warning/20",
  danger: "bg-danger-soft text-danger border-danger/20",
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<RateCardStatus, BadgeProps["tone"]> = {
  ACTIVE: "success",
  LOCKED: "warning",
  DELETED: "danger",
};

export function StatusBadge({ status }: { status: RateCardStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{status[0] + status.slice(1).toLowerCase()}</Badge>;
}

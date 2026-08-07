import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "border border-border bg-surface text-foreground hover:bg-background",
  ghost: "text-foreground hover:bg-background",
  danger: "bg-danger text-white hover:bg-danger/90",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", isLoading, disabled, className = "", children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      ].join(" ")}
      {...props}
    >
      {isLoading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = "Button";

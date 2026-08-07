"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.replace("/rate-card");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-soft">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
            S
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight">Shadowfax</p>
            <p className="text-xs text-muted leading-tight">Rider Payout Arrears</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium text-muted">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="admin@shadowfax.local"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-medium text-muted">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}

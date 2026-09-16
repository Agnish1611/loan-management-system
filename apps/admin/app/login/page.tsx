"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, ApiError } from "@repo/ui";
import { authApi } from "@/lib/api/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      // Borrowers cannot log in to ops portal
      if (res.user.role === "BORROWER") {
        setError(
          "Access Denied: This portal is strictly for operations staff.",
        );
        return;
      }
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? "Invalid ops credentials." : err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-black/50 border border-slate-200/90 p-8 sm:p-10">
        <header className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-lg mb-3 shadow-md">
            ⚙
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            CreditSea
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Operations Portal
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sign in with your staff account
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="email" required>
              Staff Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ops@creditsea.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <Label htmlFor="password" required>
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {error}
            </p>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              fullWidth
              loading={loading}
              id="ops-login-submit"
            >
              Sign in to Ops
            </Button>
          </div>
        </form>

        <footer className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
          <p>Strictly restricted to authorized CreditSea personnel.</p>
        </footer>
      </div>
    </main>
  );
}

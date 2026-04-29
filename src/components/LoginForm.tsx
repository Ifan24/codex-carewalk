"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

const users = [
  "worker@carewalk.local",
  "supervisor@carewalk.local",
  "family@carewalk.local",
  "admin@carewalk.local",
];

const routeByRole: Record<string, string> = {
  worker: "/dashboard",
  supervisor: "/supervisor",
  family: "/family/demo",
  admin: "/admin/reset",
};

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState(users[0]);
  const [password, setPassword] = useState("carewalk");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/auth/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json();
    if (!payload.ok) {
      setError(payload.error ?? "Login failed.");
      return;
    }
    localStorage.setItem("carewalk_user", JSON.stringify(payload.user));
    router.push(routeByRole[payload.user.role] ?? "/dashboard");
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-stone-800">Role</span>
        <select
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm"
        >
          {users.map((user) => (
            <option key={user}>{user}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-stone-800">Password</span>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm"
          type="password"
        />
      </label>
      {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">
        <LogIn className="h-4 w-4" />
        Enter CareWalk
      </button>
    </form>
  );
}

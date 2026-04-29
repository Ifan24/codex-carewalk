"use client";

import { useEffect, useState } from "react";

type DemoUser = {
  displayName: string;
  role: string;
};

export function RoleIndicator() {
  const [user, setUser] = useState<DemoUser | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const stored = localStorage.getItem("carewalk_user");
      setUser(stored ? (JSON.parse(stored) as DemoUser) : null);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  if (!user) {
    return null;
  }

  return (
    <span className="hidden max-w-full rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 sm:inline-flex">
      {user.displayName} | {user.role}
    </span>
  );
}

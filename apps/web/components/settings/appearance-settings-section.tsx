"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function AppearanceSettingsSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section
      aria-labelledby="appearance-settings-title"
      className="space-y-4 rounded-xl border bg-card p-5 sm:p-6"
    >
      <div className="space-y-2">
        <h2 id="appearance-settings-title" className="text-lg font-semibold">
          Appearance
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Choose a theme for this browser. System follows your device’s
          appearance.
        </p>
      </div>
      <fieldset disabled={!mounted}>
        <legend className="sr-only">Colour theme</legend>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
            { value: "system", label: "System" },
          ].map((option) => (
            <label
              key={option.value}
              className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 py-3 text-sm has-checked:border-foreground has-checked:bg-muted has-focus-visible:outline has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
            >
              <input
                type="radio"
                name="appearance-theme"
                value={option.value}
                checked={mounted && theme === option.value}
                onChange={() => setTheme(option.value)}
                className="size-3.5 accent-foreground"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}

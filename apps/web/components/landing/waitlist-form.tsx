"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@flowmoney/ui/components/button";
import { ArrowRight } from "lucide-react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreviewMessage("");

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setError("");
    setPreviewMessage("Waitlist registration is not connected yet.");
  }

  return (
    <section id="waitlist" className="mt-7 w-full max-w-md">
      <h2 className="text-sm font-semibold text-slate-900">
        Be the first to try FlowMoney
      </h2>
      <form className="mt-2" noValidate onSubmit={handleSubmit}>
        <label
          htmlFor="waitlist-email"
          className="mb-1 block text-sm font-medium text-slate-800"
        >
          Email address
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="waitlist-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setError("");
              setPreviewMessage("");
            }}
            placeholder="you@example.com"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "waitlist-error waitlist-helper" : "waitlist-helper"}
            className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-4 text-sm text-slate-900 [color-scheme:light] autofill:[-webkit-text-fill-color:#0f172a] autofill:shadow-[inset_0_0_0_1000px_white] focus-visible:border-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          />
          <Button
            type="submit"
            className="h-11 gap-2 rounded-md bg-[#147c68] px-4 text-sm text-white hover:bg-[#0e6657] focus-visible:ring-emerald-700 sm:w-auto"
          >
            Join the waitlist
            <ArrowRight aria-hidden="true" focusable="false" size={18} />
          </Button>
        </div>
        {error ? (
          <p id="waitlist-error" role="alert" className="mt-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <p id="waitlist-helper" className="mt-2 text-xs text-slate-600">
          Get an email when early access opens.
        </p>
        {previewMessage ? (
          <p role="status" className="mt-2 text-sm text-slate-700">
            {previewMessage}
          </p>
        ) : null}
      </form>
    </section>
  );
}
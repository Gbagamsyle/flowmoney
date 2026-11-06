"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@flowmoney/ui/components/button";
import { ReplayProductTour } from "@/components/layout/product-tour";

export function SupportSettingsSection() {
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setError("");
    setSent(false);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message ?? "Feedback could not be sent. Please try again.");
      }

      setMessage("");
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Feedback could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      aria-labelledby="support-settings-title"
      className="rounded-xl border bg-card p-5 sm:p-6"
    >
      <h2 id="support-settings-title" className="text-lg font-semibold">
        Help &amp; feedback
      </h2>
      <div className="mt-5 space-y-3">
        <h3 className="text-sm font-medium">Product tour</h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Take a guided look around FlowMoney and learn what each section does.
        </p>
        <ReplayProductTour />
      </div>
      <div className="mt-6 space-y-3 border-t pt-6">
        <h3 className="text-sm font-medium">Send feedback</h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Share a suggestion or report a problem. Your message will be emailed to our team.
          Please do not include passwords, bank details, account numbers, or statements.
        </p>
        <form className="space-y-4" onSubmit={submitFeedback}>
          <div className="space-y-3">
            <label htmlFor="feedback-category" className="text-sm font-medium">What is this about?</label>
            <select
              id="feedback-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full max-w-xs rounded-lg border bg-background px-3 py-2.5 text-sm outline-none focus-visible:border-foreground/50 focus-visible:ring-2 focus-visible:ring-foreground/20"
            >
              <option value="general">General feedback</option>
              <option value="suggestion">Feature suggestion</option>
              <option value="problem">Report a problem</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="feedback-message" className="text-sm font-medium">Your message</label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
              minLength={10}
              maxLength={5000}
              rows={5}
              placeholder="What were you trying to do, and how could we improve it?"
              className="w-full resize-y rounded-lg border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-foreground/50 focus-visible:ring-2 focus-visible:ring-foreground/20"
            />
            <p className="text-xs text-muted-foreground">10–5,000 characters. We’ll reply to your account email if needed.</p>
          </div>
          <Button type="submit" disabled={sending || message.trim().length < 10}>
            {sending ? "Sending…" : "Send feedback"}
          </Button>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          {sent && <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">Thanks — your feedback has been sent.</p>}
        </form>
        <p className="text-xs text-muted-foreground">
          Prefer email? <a href="mailto:ogabasyle@gmail.com?subject=FlowMoney%20feedback" className="underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">ogabasyle@gmail.com</a>
        </p>
      </div>
    </section>
  );
}

"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowLeft, ArrowRight, CalendarDays, Calculator, CircleDollarSign,
  FileText, House, Landmark, ListChecks, Settings, WalletCards, X,
} from "lucide-react";
import styles from "./product-tour.module.css";

const steps = [
  { href: "/dashboard", label: "Overview", icon: House, chapter: "The big picture", title: "See where you stand.", description: "Your available funds and upcoming commitments, together in one view.", detail: "Safe to spend uses recorded funds, unpaid obligations and a buffer. Money you are still expecting stays separate." },
  { href: "/accounts", label: "Current Funds", icon: WalletCards, chapter: "Your foundations", title: "Begin with what you have.", description: "Record the balances you have available today, across your accounts or cash.", detail: "Keep these balances up to date as your money changes. FlowMoney never holds or moves your money." },
  { href: "/income", label: "Expected Income", icon: CircleDollarSign, chapter: "Your foundations", title: "Look ahead with clarity.", description: "Keep track of money you expect to receive and when it should arrive.", detail: "An expected payment is separate from available funds. Record it here without treating it as money you already have." },
  { href: "/obligations", label: "Obligations", icon: ListChecks, chapter: "Your foundations", title: "Give commitments a place.", description: "Add rent, bills and other commitments with their due dates.", detail: "Mark a commitment paid after you have paid it, so your view reflects what still needs attention." },
  { href: "/statements", label: "Statements", icon: FileText, chapter: "Understand your money", title: "Find the story in your spending.", description: "Upload a digital PDF, CSV or XLSX statement to see your transactions and spending patterns.", detail: "Review categories before approving an import. Imported transactions do not automatically change your funds, income or obligations." },
  { href: "/planning", label: "Planning", icon: CalendarDays, chapter: "Make a plan", title: "Decide what comes next.", description: "Give your month a plan with spending categories and savings goals.", detail: "Connect recorded money and approved transactions, or create a standalone plan with its own starting amount." },
  { href: "/scenarios", label: "Scenarios", icon: Landmark, chapter: "Explore your options", title: "Try the idea before the expense.", description: "See how a possible expense or change could affect your money.", detail: "Explore a what-if without changing your recorded balances. Use it to compare a decision before acting." },
  { href: "/calculator", label: "Calculator", icon: Calculator, chapter: "Everyday tools", title: "Work out the details.", description: "A simple place for quick calculations while working on your money.", detail: "Calculations stay separate from your financial records. Use the result wherever you need it." },
  { href: "/settings", label: "Settings", icon: Settings, chapter: "Make it yours", title: "Your workspace. Your preferences.", description: "Choose your appearance and currency, manage privacy preferences, and find help.", detail: "Need a reminder later? Replay this walkthrough from Help & feedback in Settings." },
] as const;

export function ProductTour() {
  const { userId } = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  // -1 is the welcome screen; a null step closes the walkthrough.
  const [step, setStep] = useState<number | null>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [panelHeight, setPanelHeight] = useState(400);
  const key = userId ? `flowmoney:product-tour:v1:${userId}` : null;
  const open = step !== null;
  const welcome = step === -1;

  useEffect(() => {
    setStep(null);
    if (!key) return;
    try {
      if (!localStorage.getItem(key)) setStep(-1);
    } catch {
      // Settings can still launch the walkthrough when storage is blocked.
    }
    const replay = () => setStep(-1);
    window.addEventListener("flowmoney:replay-tour", replay);
    return () => window.removeEventListener("flowmoney:replay-tour", replay);
  }, [key]);

  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (step === null) return;
    const position = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      if (step < 0) { setAnchor(null); return; }
      const target = Array.from(document.querySelectorAll<HTMLElement>(
        `[data-tour-href="${steps[step].href}"]`,
      )).find((item) => item.getClientRects().length > 0);
      target?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
      setAnchor(target?.getBoundingClientRect() ?? null);
    };
    position();
    window.addEventListener("resize", position);
    const observer = new ResizeObserver(() => {
      if (panel.current) setPanelHeight(panel.current.getBoundingClientRect().height);
    });
    if (panel.current) observer.observe(panel.current);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
    };
  }, [step]);

  function finish() {
    if (key) {
      try { localStorage.setItem(key, "done"); } catch { /* Storage is optional. */ }
    }
    setStep(null);
  }

  if (step === null) return null;
  const current = step >= 0 ? steps[step] : null;
  const Icon = current?.icon ?? House;
  const placement = {
    "--tour-left": `${anchor ? Math.max(16, Math.min(anchor.right + 24, viewport.width - 416)) : Math.max(16, (viewport.width - 400) / 2)}px`,
    "--tour-top": `${anchor ? Math.max(16, Math.min(anchor.top + anchor.height / 2 - panelHeight / 2, viewport.height - panelHeight - 16)) : Math.max(16, (viewport.height - panelHeight) / 2)}px`,
  } as CSSProperties;

  return (
    <dialog
      ref={dialog}
      aria-labelledby="product-tour-title"
      aria-describedby="product-tour-description"
      onCancel={(event) => { event.preventDefault(); finish(); }}
      className={styles.dialog}
    >
      {welcome || !anchor ? <div className={styles.shade} aria-hidden="true" /> : (
        <div aria-hidden="true" className={styles.spotlight} style={{
          left: anchor.left - 3, top: anchor.top - 3,
          width: anchor.width + 6, height: anchor.height + 6,
        }} />
      )}
      <section
        ref={panel}
        className={`${styles.panel} ${welcome ? styles.welcome : styles.walkthrough}`}
        style={placement}
      >
        <header className={styles.header}>
          <span className={styles.eyebrow}>{welcome ? "Welcome to FlowMoney" : current?.chapter}</span>
          <button type="button" aria-label="Close tour" onClick={finish} className={styles.iconButton}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        {welcome ? (
          <div className={styles.enter}>
            <h2 id="product-tour-title" className={styles.welcomeTitle}>A clearer view<br />of your money.</h2>
            <p id="product-tour-description" className={styles.description}>Take a quick look around. See where everything lives and how it fits together.</p>
            <div className={styles.overview}>
              {[
                { icon: WalletCards, title: "Start with the essentials", text: "What you have, expect and need to pay." },
                { icon: FileText, title: "Understand your spending", text: "Turn statement history into a clearer picture." },
                { icon: CalendarDays, title: "Plan with intention", text: "Give your money direction, month by month." },
              ].map(({ icon: ItemIcon, title, text }) => (
                <div key={title} className={styles.overviewRow}>
                  <span className={styles.smallIcon}><ItemIcon size={19} aria-hidden="true" /></span>
                  <div><p className={styles.rowTitle}>{title}</p><p className={styles.rowText}>{text}</p></div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setStep(0)} className={`${styles.primary} ${styles.start}`}>
              Show me around <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={finish} className={styles.later}>I’ll explore on my own</button>
          </div>
        ) : current && (
          <>
            <div key={step} className={styles.enter} aria-live="polite" aria-atomic="true">
              <div className={styles.sectionLabel}><span className={styles.smallIcon}><Icon size={19} aria-hidden="true" /></span><span>{current.label}</span><span className={styles.count}>{String(step + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}</span></div>
              <h2 id="product-tour-title" className={styles.title}>{current.title}</h2>
              <p id="product-tour-description" className={styles.description}>{current.description}</p>
              <p className={styles.detail}>{current.detail}</p>
            </div>
            <div className={styles.progress} role="progressbar" aria-label="Walkthrough progress" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={step + 1}>
              {steps.map((item, index) => <span key={item.href} className={index <= step ? styles.filled : undefined} />)}
            </div>
            <footer className={styles.footer}>
              <button type="button" onClick={finish} className={styles.skip}>Skip tour</button>
              <div className={styles.actions}>
                <button type="button" aria-label="Back" onClick={() => setStep(step - 1)} className={styles.iconButton}><ArrowLeft size={17} aria-hidden="true" /></button>
                <button type="button" onClick={() => step === steps.length - 1 ? finish() : setStep(step + 1)} className={styles.primary}>{step === steps.length - 1 ? "Get started" : "Next"}<ArrowRight size={16} aria-hidden="true" /></button>
              </div>
            </footer>
          </>
        )}
      </section>
    </dialog>
  );
}

export function ReplayProductTour() {
  return <button type="button" onClick={() => window.dispatchEvent(new Event("flowmoney:replay-tour"))} className="inline-flex min-h-10 items-center justify-center rounded-lg border bg-background px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Take the product tour</button>;
}

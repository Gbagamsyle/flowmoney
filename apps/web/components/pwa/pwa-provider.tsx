"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type PwaState = {
  installed: boolean;
  canInstall: boolean;
  install: () => Promise<void>;
  updateReady: boolean;
  update: () => void;
  error: string;
};
const Context = createContext<PwaState | null>(null);
export function PwaProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null),
    [installed, setInstalled] = useState(false),
    [waiting, setWaiting] = useState<ServiceWorker | null>(null),
    [error, setError] = useState("");
  const requestedUpdate = useRef(false);
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const check = () =>
      setInstalled(
        standalone.matches ||
          Boolean(
            (navigator as Navigator & { standalone?: boolean }).standalone,
          ),
      );
    const capture = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const done = () => {
      setPrompt(null);
      setInstalled(true);
    };
    check();
    standalone.addEventListener("change", check);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", done);
    let active = true;
    let registration: ServiceWorkerRegistration | undefined;
    let worker: ServiceWorker | null = null;
    const changed = () => {
      if (
        worker?.state === "installed" &&
        navigator.serviceWorker.controller &&
        active
      )
        setWaiting(registration?.waiting ?? worker);
    };
    const found = () => {
      worker = registration?.installing ?? null;
      worker?.addEventListener("statechange", changed);
    };
    const controller = () => {
      if (requestedUpdate.current) window.location.reload();
    };
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator &&
      window.isSecureContext
    ) {
      navigator.serviceWorker.addEventListener("controllerchange", controller);
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((value) => {
          if (!active) return;
          registration = value;
          setWaiting(value.waiting);
          value.addEventListener("updatefound", found);
          found();
        })
        .catch(() => {
          if (active)
            setError(
              "App installation is temporarily unavailable. You can keep using FlowMoney in your browser.",
            );
        });
    }
    return () => {
      active = false;
      standalone.removeEventListener("change", check);
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", done);
      registration?.removeEventListener("updatefound", found);
      worker?.removeEventListener("statechange", changed);
      if ("serviceWorker" in navigator)
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          controller,
        );
    };
  }, []);
  const install = async () => {
    if (!prompt) return;
    try {
      await prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
      setError("");
    } catch {
      setPrompt(null);
      setError("Use your browser menu to install FlowMoney.");
    }
  };
  const update = () => {
    if (waiting) {
      requestedUpdate.current = true;
      waiting.postMessage({ type: "ACTIVATE_UPDATE" });
    }
  };
  return (
    <Context.Provider
      value={{
        installed,
        canInstall: !!prompt,
        install,
        updateReady: !!waiting,
        update,
        error,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePwa() {
  const state = useContext(Context);
  if (!state) throw new Error("PWA controls need their provider.");
  return state;
}

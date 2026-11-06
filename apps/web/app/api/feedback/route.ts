import { auth, currentUser } from "@clerk/nextjs/server";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 5000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;
const allowedCategories = new Set(["general", "suggestion", "problem"]);
const recentSubmissions = new Map<string, number[]>();

type FeedbackPayload = {
  category?: unknown;
  message?: unknown;
};

function limitSubmissions(userId: string, now: number): boolean {
  const recent = (recentSubmissions.get(userId) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    recentSubmissions.set(userId, recent);
    return false;
  }

  recent.push(now);
  recentSubmissions.set(userId, recent);

  if (recentSubmissions.size > 1000) {
    for (const [id, timestamps] of recentSubmissions) {
      if (timestamps.every((timestamp) => now - timestamp >= RATE_LIMIT_WINDOW_MS)) {
        recentSubmissions.delete(id);
      }
    }
  }

  return true;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ message: "Sign in to send feedback." }, { status: 401 });
  }

  try {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== new URL(request.url).host) {
      return Response.json({ message: "Feedback could not be sent." }, { status: 403 });
    }
  } catch {
    return Response.json({ message: "Feedback could not be sent." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 12_000) {
    return Response.json({ message: "Feedback message is too large." }, { status: 413 });
  }

  let payload: FeedbackPayload;
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("Invalid feedback payload");
    }
    payload = body as FeedbackPayload;
  } catch {
    return Response.json({ message: "Enter a valid feedback message." }, { status: 400 });
  }

  const category = typeof payload.category === "string" ? payload.category : "";
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  if (!allowedCategories.has(category) || message.length < 10 || message.length > MAX_MESSAGE_LENGTH) {
    return Response.json({ message: "Choose a topic and enter a message between 10 and 5,000 characters." }, { status: 400 });
  }

  const now = Date.now();
  if (!limitSubmissions(userId, now)) {
    return Response.json({ message: "You’ve sent several messages recently. Please try again in a few minutes." }, { status: 429 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FEEDBACK_FROM_EMAIL;
  const to = process.env.FEEDBACK_TO_EMAIL ?? "ogabasyle@gmail.com";
  if (!apiKey || !from || from.includes("your-verified-domain.com")) {
    console.error("Feedback email is not configured: set RESEND_API_KEY and FEEDBACK_FROM_EMAIL.");
    return Response.json({ message: "Feedback is temporarily unavailable. Please email ogabasyle@gmail.com instead." }, { status: 503 });
  }

  try {
    const user = await currentUser();
    const replyTo = user?.primaryEmailAddress?.emailAddress;
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject: `FlowMoney feedback: ${category}`,
        text: [
          `Topic: ${category}`,
          `Account email: ${replyTo ?? "Not available"}`,
          "",
          message,
        ].join("\n"),
      }),
    });

    if (!emailResponse.ok) {
      const errorBody = await emailResponse.json().catch(() => null) as
        | { name?: unknown; message?: unknown }
        | null;
      console.error("Feedback email delivery failed", {
        status: emailResponse.status,
        name: typeof errorBody?.name === "string" ? errorBody.name : undefined,
        message: typeof errorBody?.message === "string" ? errorBody.message : undefined,
      });
      return Response.json({ message: "Feedback could not be delivered. Please try again or email ogabasyle@gmail.com." }, { status: 502 });
    }
  } catch (error) {
    console.error("Feedback email delivery failed", error);
    return Response.json({ message: "Feedback could not be delivered. Please try again or email ogabasyle@gmail.com." }, { status: 502 });
  }

  return Response.json({ sent: true });
}
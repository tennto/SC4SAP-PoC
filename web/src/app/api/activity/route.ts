import { isMonthKey, monthKey, readMonthSpend } from "@/lib/chat-store";
import { apiError, apiSignedIn } from "@/lib/auth/api-guard";

/**
 * `GET /api/activity?month=YYYY-MM` — one month of this account's spend.
 *
 * The home screen's month arrows. Fetched from the panel itself rather than
 * by reloading the page: the page also asks the backend and the SAP profile
 * list, and a month step waited seconds on both for a number that lives in
 * one Mongo row.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const auth = await apiSignedIn();
  if ("response" in auth) return auth.response;

  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!isMonthKey(month) || month > monthKey(new Date())) {
    return apiError(400, "month must be a YYYY-MM no later than this month.");
  }
  return Response.json(await readMonthSpend(auth.account.id, month));
}

import { ObjectId } from "mongodb";
import { users } from "@/lib/mongo";
import { getAccount } from "@/lib/auth/session";
import { findSkill } from "@/lib/skills";

/**
 * `POST /api/favorites` — star or unstar one skill for the signed-in user.
 *
 * One slug per request rather than a PUT of the whole list, and `$addToSet` /
 * `$pull` rather than a read-modify-write. Two tabs starring different skills
 * at the same moment then both land, where writing the array back whole would
 * let the slower request undo the faster one.
 *
 * `$addToSet` appends, so the array stays in the order things were starred.
 *
 * The answer carries the list as the database now holds it, and the client
 * adopts it — so a client whose optimistic guess was wrong is corrected by the
 * same round trip rather than needing a reload.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const account = await getAccount();
  // `proxy.ts` already turned away anything with no cookie; this is the check
  // that the cookie still resolves to somebody.
  if (!account) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON object." }, { status: 400 });
  }

  const { slug, favorite } = (body ?? {}) as {
    slug?: unknown;
    favorite?: unknown;
  };

  // Checked against the catalog, not merely for being a string: this value is
  // going into the user's row, and an unbounded one would make that row a
  // place to park arbitrary text.
  if (typeof slug !== "string" || !findSkill(slug)) {
    return Response.json({ error: "Unknown skill." }, { status: 400 });
  }
  if (typeof favorite !== "boolean") {
    return Response.json(
      { error: "body.favorite must be a boolean." },
      { status: 400 },
    );
  }

  try {
    const updated = await (await users()).findOneAndUpdate(
      { _id: new ObjectId(account.id) },
      favorite
        ? { $addToSet: { favorites: slug } }
        : { $pull: { favorites: slug } },
      { returnDocument: "after" },
    );
    if (!updated) {
      return Response.json({ error: "Not signed in." }, { status: 401 });
    }
    return Response.json({ favorites: updated.favorites ?? [] });
  } catch (err) {
    return Response.json(
      { error: `Could not reach the user store: ${(err as Error).message}` },
      { status: 503 },
    );
  }
}

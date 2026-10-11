import { HttpError, readSession } from "@/lib/auth";
import { discordAvatarUrl } from "@/lib/session";
import { characterPortrait } from "@/lib/account-menu";
import { DEFAULT_APPEARANCE, type Appearance } from "@/lib/appearance";
import { accountName, db, sameOrigin } from "@/lib/storage";
import { requestJson, RequestError } from "@/lib/request-body";
import {
  DEFAULT_DETAILS,
  parseDetails,
  validVisibility,
} from "@/lib/profile-privacy";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
function failure(e: unknown) {
  return Response.json(
    {
      error:
        e instanceof HttpError || e instanceof RequestError
          ? e.message
          : "Account settings are unavailable.",
    },
    {
      status:
        e instanceof HttpError || e instanceof RequestError ? e.status : 503,
      headers,
    },
  );
}
/** Saved character head for the account card; an unreadable appearance falls back to the default head. */
function portrait(body: string | null, hair: string | null, skin: string | null) {
  try {
    return characterPortrait({ body: body ?? "male", hair: hair ?? "brown", skin: skin ?? "default" } as Appearance);
  } catch {
    return characterPortrait(DEFAULT_APPEARANCE);
  }
}
export async function GET(req: Request) {
  try {
    const user = await readSession(req);
    if (!user) throw new HttpError(401, "Sign in to manage your accounts.");
    const rows = await db()
      .prepare(
        `SELECT c.display_name AS name,c.claimed_at AS claimedAt,r.linked_at AS linkedAt,COALESCE(v.visibility,'public') AS visibility,o.details,COALESCE(p.show_donation,1) AS showDonation,a.body_type AS body,a.hair_color AS hair,o.skin FROM claimed_names c LEFT JOIN profile_link_owners r ON r.rsn=c.rsn AND r.discord_id=c.discord_id LEFT JOIN profile_visibility v ON v.rsn=c.rsn LEFT JOIN profile_options o ON o.rsn=c.rsn LEFT JOIN profile_presentation p ON p.rsn=c.rsn LEFT JOIN profile_appearance a ON a.rsn=c.rsn WHERE c.discord_id=? ORDER BY c.display_name`,
      )
      .bind(user.id)
      .all<{
        name: string;
        claimedAt: number;
        linkedAt: number | null;
        visibility: string;
        details: string | null;
        showDonation: number;
        body: string | null;
        hair: string | null;
        skin: string | null;
      }>();
    return Response.json(
      {
        user: {
          name: user.globalName || user.username,
          username: user.username,
          avatarUrl: discordAvatarUrl(user.discordId, user.avatar),
        },
        accounts: rows.results.map(({ body, hair, skin, ...r }) => ({
          ...r,
          portrait: portrait(body, hair, skin),
          showDonation: !!r.showDonation,
          details: r.details
            ? parseDetails(JSON.parse(r.details))
            : DEFAULT_DETAILS,
        })),
      },
      { headers },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    try {
      sameOrigin(req);
    } catch {
      throw new HttpError(403, "Use account settings to make changes.");
    }
    const user = await readSession(req);
    if (!user) throw new HttpError(401, "Sign in to manage your accounts.");
    const body = await requestJson(req, 4000);
    let name: string, details;
    try {
      name = accountName(body.username);
      details = parseDetails(body.details);
    } catch {
      throw new HttpError(400, "Choose a valid account and privacy settings.");
    }
    if (
      !validVisibility(body.visibility) ||
      typeof body.showDonation !== "boolean"
    )
      throw new HttpError(400, "Choose valid visibility settings.");
    const owned = await db()
      .prepare("SELECT rsn FROM claimed_names WHERE rsn=? AND discord_id=?")
      .bind(name.toLowerCase(), user.id)
      .first();
    if (!owned) throw new HttpError(403, "This account is not linked to you.");
    // Only privacy columns are changed. Appearance and title choices remain independent.
    await db().batch([
      db()
        .prepare(
          "INSERT INTO profile_visibility(rsn,visibility) SELECT rsn,? FROM claimed_names WHERE rsn=? AND discord_id=? ON CONFLICT(rsn) DO UPDATE SET visibility=excluded.visibility",
        )
        .bind(body.visibility, name.toLowerCase(), user.id),
      db()
        .prepare(
          "INSERT INTO profile_options(rsn,details) SELECT rsn,? FROM claimed_names WHERE rsn=? AND discord_id=? ON CONFLICT(rsn) DO UPDATE SET details=excluded.details",
        )
        .bind(JSON.stringify(details), name.toLowerCase(), user.id),
      db()
        .prepare(
          "INSERT INTO profile_presentation(rsn,show_donation) SELECT rsn,? FROM claimed_names WHERE rsn=? AND discord_id=? ON CONFLICT(rsn) DO UPDATE SET show_donation=excluded.show_donation",
        )
        .bind(body.showDonation ? 1 : 0, name.toLowerCase(), user.id),
    ]);
    return Response.json({ ok: true }, { headers });
  } catch (e) {
    return failure(e);
  }
}

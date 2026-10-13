"use client";
import { useEffect, useId, useState } from "react";
import { Check, ChevronDown, ExternalLink, RefreshCw } from "lucide-react";
import {DiscordSyncPreferences} from './DiscordSyncPreferences';
import {DiscordAvatar} from './DiscordAvatar';
import { PublicHeader } from "./Community";
import { DETAIL_LABELS, type ProfileDetails } from "@/lib/profile-privacy";
import "./account-settings.css";
type Account = {
  name: string;
  claimedAt: number;
  linkedAt: number | null;
  visibility: "public" | "private";
  details: ProfileDetails;
  showDonation: boolean;
  portrait?: string;
};
const DEFAULT_PORTRAIT = "/portraits/male-brown-default.svg";
function date(value: number | null) {
  return value
    ? new Date(value < 1e12 ? value * 1000 : value).toLocaleDateString(
        undefined,
        { year: "numeric", month: "short", day: "numeric" },
      )
    : "Not recorded";
}
export function AccountSettings() {
  const [data, setData] = useState<{
      user: { name: string; username: string; avatarUrl?: string };
      accounts: Account[];
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/account-settings", { signal: controller.signal })
      .then(async (r) => {
        const b = (await r.json()) as {
          user: { name: string; username: string; avatarUrl?: string };
          accounts: Account[];
          error?: string;
        };
        if (!r.ok) throw Error(b.error);
        setData(b);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, []);
  return (
    <div className="site">
      <PublicHeader onError={setError} />
      <main className="community-page account-settings-page">
        <span className="kicker">Your Spooned account</span>
        <h1>
          <img className="account-title-icon" src="/icons/community/settings-icon.png" alt="" width={23} height={23} /> Account settings
        </h1>
        <p>
          One Discord sign-in. Separate appearance and privacy for each
          RuneScape profile.
        </p>
        {error && (
          <p role="alert" className="community-notice">
            {error}
          </p>
        )}
        {!data && !error && <p role="status">Loading your accounts…</p>}
        {data && (
          <>
            <section className="community-panel account-summary">
              <DiscordAvatar src={data.user.avatarUrl} name={data.user.name} className="account-summary-avatar" />
              <div>
                <h2>{data.user.name}</h2>
                <span>Discord · {data.user.username}</span>
              </div>
              <b>{data.accounts.length} linked {data.accounts.length === 1 ? "profile" : "profiles"}</b>
            </section>
            <DiscordSyncPreferences />
            <h2 className="account-section-title">Profile privacy</h2>
            <div className="account-settings-list">
              {data.accounts.map((a, i) => (
                <AccountPrivacy key={a.name} initial={a} open={i === 0} />
              ))}
              {!data.accounts.length && (
                <p>Use the account menu above to link your RuneScape name.</p>
              )}
            </div>
            <SignOutEverywhere />
          </>
        )}
      </main>
    </div>
  );
}
/** Log out everywhere: ends every signed-in session for this Discord account, on all devices including this one. */
function SignOutEverywhere() {
  const [confirming, setConfirming] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function run() {
    setBusy(true);setError("");
    try {
      const r = await fetch("/api/auth/logout-everywhere", {method: "POST"});
      if (!r.ok) throw Error(((await r.json().catch(() => ({}))) as {error?: string}).error || "Could not log out everywhere.");
      window.location.assign("/");
    } catch (e) {setError((e as Error).message);setBusy(false);}
  }
  return <section className="community-panel account-signout">
    <div><h2>Log out everywhere</h2><p>Ends every signed-in session for this Discord account, on all your devices, including this one. Sign in again with Discord afterwards.</p></div>
    {error && <p role="alert" className="community-notice">{error}</p>}
    {confirming ? <div className="row gap"><button type="button" className="btn danger" disabled={busy} onClick={() => void run()}>Log out on every device</button><button type="button" className="btn ghost" disabled={busy} onClick={() => setConfirming(false)}>Cancel</button></div>
      : <button type="button" className="btn" onClick={() => setConfirming(true)}>Log out everywhere</button>}
  </section>;
}
type Privacy = Pick<Account, "visibility" | "details" | "showDonation">;
function samePrivacy(a: Privacy, b: Privacy) {
  return a.visibility === b.visibility && a.showDonation === b.showDonation && (Object.keys(DETAIL_LABELS) as (keyof ProfileDetails)[]).every((key) => a.details[key] === b.details[key]);
}
function AccountPrivacy({ initial, open }: { initial: Account; open: boolean }) {
  const [account, setAccount] = useState(initial),
    [saved, setSaved] = useState<Privacy>(initial),
    [justSaved, setJustSaved] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [failed, setFailed] = useState(false);
  const shareId = useId();
  const dirty = !samePrivacy(account, saved);
  async function save() {
    const sent: Privacy = { visibility: account.visibility, details: account.details, showDonation: account.showDonation };
    setBusy(true);
    setNotice("");
    setFailed(false);
    try {
      const r = await fetch("/api/account-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: account.name,
          visibility: account.visibility,
          details: account.details,
          showDonation: account.showDonation,
        }),
      });
      const b = (await r.json()) as { error?: string };
      if (!r.ok) throw Error(b.error);
      setSaved(sent);
      setJustSaved(true);
      setNotice("Privacy saved for " + account.name + ".");
    } catch (e) {
      setFailed(true);
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const update = (change: Partial<Privacy>) => {
    setAccount((a) => ({ ...a, ...change }));
    setJustSaved(false);
    setNotice("");
  };
  const isPrivate = account.visibility === "private";
  return (
    <details className="community-panel account-privacy-card" open={open}>
      <summary>
        <img className="account-card-portrait" src={account.portrait ?? DEFAULT_PORTRAIT} alt="" width={30} height={35} />
        <span className="account-card-name">
          <b>{account.name}</b>
          <small>
            <span className={"account-visibility-dot" + (saved.visibility === "private" ? " is-private" : "")} aria-hidden="true" />
            {saved.visibility === "public"
              ? "Public profile"
              : "Private collection"}
          </small>
        </span>
        <span className="account-disclosure"><span>Privacy &amp; details</span><ChevronDown size={16} aria-hidden="true" /></span>
      </summary>
      <fieldset className="account-privacy-body" disabled={busy}>
        <legend className="sr-only">Privacy for {account.name}</legend>
        <div className="account-privacy-top">
          <div className="account-visibility" role="radiogroup" aria-label={`Profile visibility for ${account.name}`}>
            <span className="account-field-label" aria-hidden="true">Visibility</span>
            {(["public", "private"] as const).map((value) => (
              <label key={value} className="account-choice">
                <input
                  type="radio"
                  name={"visibility-" + account.name}
                  value={value}
                  checked={account.visibility === value}
                  onChange={() => update({ visibility: value })}
                />
                {value === "public" ? "Public" : "Private"}
              </label>
            ))}
          </div>
          <div className="account-details">
            <span>
              First linked <b>{date(account.linkedAt)}</b>
            </span>
            <span>
              Current link <b>{date(account.claimedAt)}</b>
            </span>
            <a
              className="btn ghost sm"
              href={
                "/player/" +
                encodeURIComponent(account.name) +
                "?settings=profile"
              }
            >
              Profile settings <ExternalLink size={13} />
            </a>
          </div>
        </div>
        <div className="account-share">
          <span className="account-field-label" id={shareId}>Shown on your profile</span>
          <div className="account-privacy-toggles" role="group" aria-labelledby={shareId}>
            {(Object.entries(DETAIL_LABELS) as [keyof ProfileDetails, string][]).map(([key, label]) => (
              <label key={key} className="account-choice">
                <input
                  type="checkbox"
                  checked={isPrivate && key !== "skills" ? false : account.details[key]}
                  disabled={isPrivate && key !== "skills"}
                  onChange={(e) => update({ details: { ...account.details, [key]: e.target.checked } })}
                />
                {label}
              </label>
            ))}
            <label className="account-choice">
              <input
                type="checkbox"
                checked={account.showDonation}
                onChange={(e) => update({ showDonation: e.target.checked })}
              />
              Show donation amount, if applicable
            </label>
          </div>
        </div>
        <div className="account-privacy-footer">
          <p className="fine">
            Private collections keep your character visible. Skills remain
            visible only if enabled. Notes and personal planning stay private.
          </p>
          <span className={"account-save-notice" + (failed ? " is-error" : dirty ? " is-dirty" : "")} role="status">
            {notice || (dirty ? "Unsaved changes" : "")}
          </span>
          <button type="button" className={"btn primary save-button" + (justSaved && !dirty ? " is-saved" : "")} onClick={() => void save()}>
            {busy ? <RefreshCw size={15} className="spin" aria-hidden="true" /> : justSaved && !dirty ? <Check size={15} aria-hidden="true" /> : null}
            {busy ? "Saving…" : justSaved && !dirty ? "Saved" : "Save privacy"}
          </button>
        </div>
      </fieldset>
    </details>
  );
}

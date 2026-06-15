import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { LogOut } from "lucide-react";
import { useGatewaySession } from "@/contexts/GatewaySession";
import {
  BUILTIN_ENCRYPTION_SCHEMES,
  blobUrl,
  messengerApi,
  socialApi,
  uploadMedia,
  type ChatMessage,
  type Conversation,
  type UserProfile,
} from "@/lib/gatewayApi";
import { decryptBodyFixed, encryptBody, extractUrls, EMOJI_QUICK } from "@/lib/chatEncryption";
import { loadContactPrefs, loadUserSettings, saveContactPrefs } from "@/lib/chatStorage";
import { GhostLogo } from "./GhostLogo";
import "./telegramTheme.css";

function displayName(did: string, profile?: UserProfile): string {
  return profile?.displayName?.trim() || `${did.slice(0, 12)}…`;
}

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60_000) return "now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`;
  return new Date(iso).toLocaleDateString();
}

function peerParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("peer");
}

export default function GhostMessagesPage() {
  const { session, api, logout } = useGatewaySession();
  const [, setLocation] = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [profileCache, setProfileCache] = useState<Record<string, UserProfile>>({});
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [linkPreview, setLinkPreview] = useState<ChatMessage["linkPreview"] | null>(null);
  const [displayBodies, setDisplayBodies] = useState<Record<string, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const settings = loadUserSettings();
  const peerInit = useRef(false);

  const activeConv = conversations.find((c) => c.id === activeId) ?? null;
  const peerDid = activeConv?.participantDids.find((d) => d !== session?.did) ?? null;
  const contactPrefs = peerDid ? loadContactPrefs(peerDid) : null;
  const schemeId = contactPrefs?.schemeId ?? activeConv?.encryptionSchemeId ?? settings.defaultEncryptionScheme;

  const onProfileNeeded = useCallback(
    (did: string) => {
      if (!api || profileCache[did]) return;
      void socialApi.profile(api, did).then((r) => {
        setProfileCache((m) => ({ ...m, [did]: r.profile }));
      });
    },
    [api, profileCache],
  );

  const loadConversations = useCallback(async () => {
    if (!api || !session) return;
    try {
      const r = await messengerApi.conversations(api);
      setConversations(r.conversations ?? []);
    } catch {
      /* ignore */
    }
  }, [api, session]);

  const loadMessages = useCallback(async () => {
    if (!api || !activeId) return;
    try {
      const r = await messengerApi.messages(api, activeId);
      setMessages(r.messages ?? []);
    } catch {
      /* ignore */
    }
  }, [api, activeId]);

  useEffect(() => {
    void loadConversations();
    const t = setInterval(() => void loadConversations(), 8000);
    return () => clearInterval(t);
  }, [loadConversations]);

  useEffect(() => {
    void loadMessages();
    const t = setInterval(() => void loadMessages(), 4000);
    return () => clearInterval(t);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const peer = peerParam();
    if (!peer || !api || !session || peerInit.current) return;
    peerInit.current = true;
    void (async () => {
      const r = await messengerApi.createConversation(api, peer, schemeId);
      setActiveId(r.conversation.id);
      await loadConversations();
      window.history.replaceState({}, "", "/messages");
    })();
  }, [api, session, schemeId, loadConversations]);

  useEffect(() => {
    const url = extractUrls(draft)[0];
    if (!url || !settings.showLinkPreviews || !api) {
      setLinkPreview(null);
      return;
    }
    const timer = setTimeout(() => {
      void socialApi.linkPreview(api, url).then((r) => setLinkPreview(r.preview ?? { url }));
    }, 500);
    return () => clearTimeout(timer);
  }, [draft, api, settings.showLinkPreviews]);

  useEffect(() => {
    void (async () => {
      const secret = passphrase || contactPrefs?.config?.passphraseHint || "";
      const next: Record<string, string> = {};
      for (const m of messages) {
        if (!m.encrypted) next[m.id] = m.body;
        else next[m.id] = await decryptBodyFixed(m.encryptionSchemeId ?? schemeId, m.body, secret);
      }
      setDisplayBodies(next);
    })();
  }, [messages, passphrase, schemeId, contactPrefs]);

  useEffect(() => {
    for (const c of conversations) {
      for (const d of c.participantDids) {
        if (d !== session?.did) onProfileNeeded(d);
      }
    }
  }, [conversations, session, onProfileNeeded]);

  async function send() {
    if (!session || !api || !activeId || !draft.trim()) return;
    setBusy(true);
    try {
      const secret = passphrase || contactPrefs?.config?.passphraseHint || "";
      const encrypted = schemeId !== "none";
      const body = encrypted ? await encryptBody(schemeId, draft.trim(), secret) : draft.trim();
      const urls = extractUrls(draft);
      const contentType = urls.length && draft.trim() === urls[0] ? "link" : "text";
      await messengerApi.sendMessage(api, {
        conversationId: activeId,
        contentType,
        body,
        encrypted,
        encryptionSchemeId: schemeId,
        linkPreview: linkPreview ?? undefined,
        showLinkPreview: true,
      });
      setDraft("");
      setLinkPreview(null);
      await loadMessages();
      await loadConversations();
    } finally {
      setBusy(false);
    }
  }

  async function sendFile(file: File) {
    if (!session || !api || !activeId) return;
    const cid = await uploadMedia(api, file);
    const ct = file.type.startsWith("video/") ? "video" : "image";
    await messengerApi.sendMessage(api, {
      conversationId: activeId,
      contentType: ct,
      body: cid,
      mediaCids: [cid],
    });
    await loadMessages();
  }

  function updateScheme(newScheme: string) {
    if (!peerDid) return;
    saveContactPrefs({
      contactDid: peerDid,
      schemeId: newScheme,
      config: passphrase ? { passphraseHint: passphrase } : contactPrefs?.config,
    });
    if (activeId && api) void messengerApi.setEncryption(api, activeId, newScheme);
  }

  const sidebar = useMemo(
    () => (
      <aside className="w-full md:w-80 border-r border-tg bg-tg-sidebar flex flex-col min-h-0">
        <div className="p-4 border-b border-tg flex items-center gap-2">
          <GhostLogo className="h-8 w-8" />
          <div>
            <div className="font-semibold text-tg">gHosted.u</div>
            <div className="text-xs text-tg-muted">alt.dream messenger</div>
          </div>
          <button
            type="button"
            className="ml-auto text-tg-muted hover:text-tg"
            onClick={() => {
              logout();
              setLocation("/identity");
            }}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((c) => {
            const peer = c.participantDids.find((d) => d !== session?.did) ?? c.participantDids[0]!;
            return (
              <button
                key={c.id}
                type="button"
                className={`w-full text-left px-4 py-3 flex gap-3 hover-tg ${activeId === c.id ? "active-tg" : ""}`}
                onClick={() => setActiveId(c.id)}
              >
                <div className="h-10 w-10 rounded-full bg-tg-hover flex items-center justify-center text-sm text-tg">
                  {displayName(peer, profileCache[peer]).slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-tg truncate">{displayName(peer, profileCache[peer])}</div>
                  <div className="text-xs text-tg-muted truncate">{c.lastMessagePreview ?? "No messages yet"}</div>
                </div>
                {c.lastMessageAt ? <time className="text-xs text-tg-muted">{timeAgo(c.lastMessageAt)}</time> : null}
              </button>
            );
          })}
          {conversations.length === 0 ? (
            <p className="p-4 text-sm text-tg-muted">No conversations yet. Add friends on alt.dream, then message them here.</p>
          ) : null}
        </div>
      </aside>
    ),
    [conversations, activeId, session, profileCache, logout, setLocation],
  );

  return (
    <div className="ghost-telegram min-h-screen bg-tg-bg text-tg flex flex-col md:flex-row">
      {sidebar}
      <main className="flex-1 flex flex-col min-h-0 min-w-0">
        {activeConv && peerDid && api ? (
          <>
            <header className="p-3 border-b border-tg bg-tg-sidebar flex flex-wrap gap-2 items-center">
              <strong>{displayName(peerDid, profileCache[peerDid])}</strong>
              <select
                className="ml-auto bg-tg-bg border border-tg rounded px-2 py-1 text-sm"
                value={schemeId}
                onChange={(e) => updateScheme(e.target.value)}
              >
                {BUILTIN_ENCRYPTION_SCHEMES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              {schemeId !== "none" ? (
                <input
                  type="password"
                  placeholder="Shared passphrase"
                  className="bg-tg-bg border border-tg rounded px-2 py-1 text-sm"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  autoComplete="off"
                />
              ) : null}
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map((m) => {
                const mine = m.authorDid === session?.did;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        mine ? "bg-tg-bubble-outgoing text-white" : "bg-tg-bubble-incoming text-tg"
                      }`}
                    >
                      {m.contentType === "image" || m.contentType === "gif" ? (
                        <img src={m.mediaCids[0] ? blobUrl(api, m.mediaCids[0]) : m.body} alt="" className="max-w-full rounded" />
                      ) : m.contentType === "video" && m.mediaCids[0] ? (
                        <video src={blobUrl(api, m.mediaCids[0])} controls className="max-w-full rounded" />
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{displayBodies[m.id] ?? m.body}</p>
                      )}
                      {m.encrypted ? <span className="text-xs opacity-70">🔒</span> : null}
                      <time className="block text-xs opacity-60 mt-1">{timeAgo(m.createdAt)}</time>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <div className="p-3 border-t border-tg bg-tg-sidebar">
              <div className="flex gap-1 mb-2 flex-wrap">
                {EMOJI_QUICK.map((em) => (
                  <button key={em} type="button" className="text-lg" onClick={() => setDraft((d) => d + em)}>
                    {em}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <label className="cursor-pointer px-2 py-2 text-tg-muted">
                  📎
                  <input type="file" accept="image/*,video/*" hidden onChange={(e) => e.target.files?.[0] && void sendFile(e.target.files[0])} />
                </label>
                <input
                  className="flex-1 bg-tg-bg border border-tg rounded-lg px-3 py-2 text-tg"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Message…"
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), void send())}
                />
                <button
                  type="button"
                  className="bg-[var(--tg-accent)] text-white px-4 py-2 rounded-lg disabled:opacity-50"
                  disabled={busy || !draft.trim()}
                  onClick={() => void send()}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-tg-muted p-8 text-center">
            <div>
              <GhostLogo className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h2 className="text-lg text-tg mb-2">Select a conversation</h2>
              <p className="text-sm">Messages live on your alt.dream gateway — one inbox with the social site.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

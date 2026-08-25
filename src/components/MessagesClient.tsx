"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronsDown,
  CircleAlert,
  Copy,
  Info,
  KeyRound,
  Link2,
  LockKeyhole,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  PenSquare,
  Reply,
  Search,
  Send,
  Smile,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { getSocket } from "@/lib/socket";
import { getUserHandle } from "@/lib/userHandle";
import { chatFetch } from "@/lib/chat-api";
import { createConversationKey, decryptChatText, encryptChatText, ensureChatIdentity, isChatKeyMismatchError, unwrapConversationKey } from "@/lib/chat-crypto";
import NativeEmojiPicker from "@/components/ui/NativeEmojiPicker";
import IconButton from "@/components/ui/IconButton";
import ChatDeviceLinkModal from "@/components/chat/ChatDeviceLinkModal";
import ChatRecoveryModal from "@/components/chat/ChatRecoveryModal";
import { usePresence } from "@/providers/PresenceProvider";

type Person = {
  _id: string;
  firebaseId: string;
  name: string;
  username?: string;
  image?: string;
  chatPublicKey?: string;
};
type ChatMessage = {
  _id: string;
  text: string;
  createdAt: string;
  sender: Person;
  replyTo?: {
    _id: string;
    text: string;
    createdAt: string;
    sender: Person;
    ciphertext?: string;
    iv?: string;
    encryptionVersion?: number;
  } | null;
  readBy?: string[];
  deliveryState?: "sending" | "failed";
  ciphertext?: string;
  iv?: string;
  encryptionVersion?: number;
  reactions?: Array<{ emoji: string; users: Array<{ firebaseId: string } | string> }>;
  decrypted?: boolean;
};

function messageDayKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function messageDateLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (messageDayKey(value) === messageDayKey(today.toISOString())) return "Today";
  if (messageDayKey(value) === messageDayKey(yesterday.toISOString())) return "Yesterday";
  return date.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
}

const EMOJI_TOKEN_PATTERN = /(?:\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*)/gu;

function isEmojiOnlyMessage(value = "") {
  const emojiTokens = value.match(EMOJI_TOKEN_PATTERN);
  if (!emojiTokens?.length) return false;
  return value.replace(EMOJI_TOKEN_PATTERN, "").trim().length === 0;
}

function renderEmojiText(value: string, keyPrefix: string) {
  const parts: React.ReactNode[] = [];
  const pattern = new RegExp(EMOJI_TOKEN_PATTERN.source, "gu");
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push(value.slice(cursor, index));
    parts.push(
      <span
        key={`${keyPrefix}-${index}-${match[0]}`}
        className="inline-block align-[-0.08em] text-[1.2em] leading-none"
      >
        {match[0]}
      </span>,
    );
    cursor = index + match[0].length;
  }
  if (cursor < value.length) parts.push(value.slice(cursor));
  return parts;
}

function renderMessageText(value: string, emojiOnly: boolean) {
  if (emojiOnly) return value;
  const parts: React.ReactNode[] = [];
  const urlPattern = /\b(?:https?:\/\/|www\.)[^\s<]+/gi;
  let cursor = 0;
  for (const match of value.matchAll(urlPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push(...renderEmojiText(value.slice(cursor, index), `text-${cursor}`));
    const rawUrl = match[0];
    const trailing = rawUrl.match(/[),.!?;:]+$/)?.[0] || "";
    const visibleUrl = trailing ? rawUrl.slice(0, -trailing.length) : rawUrl;
    const href = visibleUrl.toLowerCase().startsWith("www.") ? `https://${visibleUrl}` : visibleUrl;
    parts.push(
      <a
        key={`url-${index}-${visibleUrl}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        className="text-[#58a6ff] underline decoration-[#58a6ff]/55 underline-offset-2 hover:decoration-[#58a6ff]"
      >
        {visibleUrl}
      </a>,
    );
    if (trailing) parts.push(trailing);
    cursor = index + rawUrl.length;
  }
  if (cursor < value.length) parts.push(...renderEmojiText(value.slice(cursor), `text-${cursor}`));
  return parts;
}

type Conversation = {
  _id: string;
  participants: Person[];
  lastMessage?: ChatMessage;
  lastMessageAt: string;
  unreadCount: number;
  encryptionVersion?: number;
  encryptedKeys?: Array<{ user: Person; wrappedKey: string }>;
};

const CHAT_CACHE_PREFIX = "mindfuel:chat:v1:";
const CHAT_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const REPLY_TIP_PREFIX = "mindfuel:reply-tip:v2:";
const ENCRYPTION_BANNER_PREFIX = "mindfuel:encryption-banner-dismissed:v1:";

function readChatCache<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const value = window.localStorage.getItem(`${CHAT_CACHE_PREFIX}${key}`);
    if (!value) return undefined;
    const cached = JSON.parse(value) as { data?: T; timestamp?: number };
    if (
      !cached.timestamp ||
      Date.now() - cached.timestamp > CHAT_CACHE_MAX_AGE
    ) {
      window.localStorage.removeItem(`${CHAT_CACHE_PREFIX}${key}`);
      return undefined;
    }
    return cached.data;
  } catch {
    return undefined;
  }
}

function writeChatCache<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${CHAT_CACHE_PREFIX}${key}`,
      JSON.stringify({ data, timestamp: Date.now() }),
    );
  } catch {
    // SWR's in-memory cache remains available when storage is unavailable.
  }
}

function Avatar({ person, size = 44, online = false }: { person: Person; size?: number; online?: boolean }) {
  const avatar = person.image && !person.image.startsWith("#") ? (
    <Image
      src={person.image}
      alt=""
      width={size}
      height={size}
      unoptimized
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-brand-green/15 font-bold text-brand-green"
      style={{ width: size, height: size }}
    >
      {person.name?.[0]?.toUpperCase()}
    </span>
  );
  return (
    <span className="relative shrink-0">
      {avatar}
      <span
        className={`absolute bottom-0 right-0 rounded-full border-2 border-surface ${online ? "bg-[#35d07f]" : "bg-[#5f6b65]"}`}
        style={{ width: Math.max(10, Math.round(size * 0.24)), height: Math.max(10, Math.round(size * 0.24)) }}
        aria-label={online ? "Online" : "Offline"}
        title={online ? "Online" : "Offline"}
      />
    </span>
  );
}

export default function MessagesClient() {
  const { user, profile, loading: authLoading, openSignInModal } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [active, setActive] = useState<Conversation | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const draft = active ? drafts[active._id] || "" : "";
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [typingName, setTypingName] = useState("");
  const [query, setQuery] = useState("");
  const [showConversationInfo, setShowConversationInfo] = useState(false);
  const [showConversationMenu, setShowConversationMenu] = useState(false);
  const [profileLinkCopied, setProfileLinkCopied] = useState(false);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientResults, setRecipientResults] = useState<Person[]>([]);
  const [recipientSearchLoading, setRecipientSearchLoading] = useState(false);
  const [startingRecipientId, setStartingRecipientId] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState("");
  const [reactionPickerPosition, setReactionPickerPosition] = useState<{ left: number; top: number } | null>(null);
  const [deviceLinkMode, setDeviceLinkMode] = useState<"source" | "target" | null>(null);
  const [recoveryModalMode, setRecoveryModalMode] = useState<"setup" | "restore" | null>(null);
  const [recoveryAvailable, setRecoveryAvailable] = useState<boolean | null>(null);
  const [hasChatKeyConflict, setHasChatKeyConflict] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showReplyTip, setShowReplyTip] = useState(false);
  const [showEncryptionBanner, setShowEncryptionBanner] = useState(true);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const activeIdRef = useRef<string | null>(null);
  const conversationMessageIdsRef = useRef<Map<string, string>>(new Map());
  const conversationSnapshotReadyRef = useRef(false);
  const lastMarkedReadIdRef = useRef("");
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationKeysRef = useRef<Map<string, CryptoKey>>(new Map());
  const sharedDraftAppliedRef = useRef("");
  const lastTypingStateRef = useRef<{
    conversationId: string;
    isTyping: boolean;
    sentAt: number;
  } | null>(null);

  const conversationCacheKey = user ? `conversations:${user.uid}` : "";
  const cachedConversations = useMemo(
    () =>
      conversationCacheKey
        ? readChatCache<Conversation[]>(conversationCacheKey)
        : undefined,
    [conversationCacheKey],
  );
  const conversationUrl = user ? "/api/chat/conversations" : null;
  const conversationsFetcher = useCallback(async (url: string): Promise<Conversation[]> => {
    if (!user) return [];
    const response = await chatFetch(user, url, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load conversations");
    return (await response.json()).conversations || [];
  }, [user]);
  const {
    data: conversationData,
    isLoading: loading,
    mutate: mutateConversations,
  } = useSWR<Conversation[]>(conversationUrl, conversationsFetcher, {
    fallbackData: cachedConversations,
    dedupingInterval: 30_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    shouldRetryOnError: false,
    refreshInterval: 0,
    refreshWhenHidden: false,
  });
  const conversations = useMemo(
    () => conversationData || [],
    [conversationData],
  );
  const setConversations = useCallback(
    (next: React.SetStateAction<Conversation[]>) => {
      void mutateConversations(
        (current) =>
          typeof next === "function"
            ? next(current || [])
            : next,
        { revalidate: false },
      );
    },
    [mutateConversations],
  );

  const messageCacheKey =
    user && active ? `messages:${user.uid}:${active._id}` : "";
  const cachedMessages = useMemo(
    () =>
      messageCacheKey
        ? readChatCache<ChatMessage[]>(messageCacheKey)
        : undefined,
    [messageCacheKey],
  );
  const messagesUrl =
    user && active
      ? `/api/chat/messages?conversationId=${encodeURIComponent(active._id)}`
      : null;
  const messagesFetcher = useCallback(async (url: string): Promise<ChatMessage[]> => {
    if (!user) return [];
    const response = await chatFetch(user, url, { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load messages");
    return (await response.json()).messages || [];
  }, [user]);
  const { data: messageData, mutate: mutateMessages } = useSWR<ChatMessage[]>(
    messagesUrl,
    messagesFetcher,
    {
      fallbackData: cachedMessages,
      dedupingInterval: 15_000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      shouldRetryOnError: false,
      refreshInterval: 0,
      refreshWhenHidden: false,
    },
  );
  const messages = useMemo(() => messageData || [], [messageData]);
  const setMessages = useCallback(
    (next: React.SetStateAction<ChatMessage[]>) => {
      void mutateMessages(
        (current) =>
          typeof next === "function"
            ? next(current || [])
            : next,
        { revalidate: false },
      );
    },
    [mutateMessages],
  );

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const identity = await ensureChatIdentity(user.uid);
        const response = await chatFetch(user, "/api/chat/keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicKey: identity.publicKey }),
        });
        if (response.ok) {
          setHasChatKeyConflict(false);
          void mutateConversations();
          const recoveryResponse = await chatFetch(user, "/api/chat/recovery", { cache: "no-store" });
          if (recoveryResponse.ok) {
            const data = await recoveryResponse.json();
            setRecoveryAvailable(Boolean(data.available));
          }
        }
        else if (response.status === 409) {
          setHasChatKeyConflict(true);
        }
      } catch {
        showToast("Secure messaging could not be initialized", "error");
      }
    })();
  }, [user, mutateConversations, showToast]);

  const prepareConversationKey = useCallback(async (conversation: Conversation) => {
    if (!user) throw new Error("Sign in required");
    const cached = conversationKeysRef.current.get(conversation._id);
    if (cached) return cached;
    if (conversation.encryptionVersion) {
      const wrapped = conversation.encryptedKeys?.find((row) => row.user?.firebaseId === user.uid)?.wrappedKey;
      if (wrapped) {
        try {
          const key = await unwrapConversationKey(user.uid, wrapped);
          conversationKeysRef.current.set(conversation._id, key);
          return key;
        } catch (error) {
          if (!isChatKeyMismatchError(error)) throw error;
          // This device's identity can no longer unwrap the conversation's
          // existing shared key (e.g. after "start fresh" gave up the old
          // one). Fall through and establish a fresh key wrapped for
          // everyone's *current* identity instead of leaving the
          // conversation permanently unable to send new messages.
        }
      }
    }

    const identity = await ensureChatIdentity(user.uid);
    let keyParticipants = conversation.participants;
    let keys = keyParticipants.map((person) => ({
      userId: person.firebaseId,
      publicKey: person.firebaseId === user.uid ? identity.publicKey : person.chatPublicKey || "",
    }));
    if (keys.some((row) => !row.publicKey)) {
      // The conversation in memory may predate the recipient publishing their
      // key. Refresh once before showing an actionable error to the sender.
      const refreshResponse = await chatFetch(user, "/api/chat/conversations", { cache: "no-store" });
      if (refreshResponse.ok) {
        const refreshedRows: Conversation[] = (await refreshResponse.json()).conversations || [];
        const refreshed = refreshedRows.find((row) => row._id === conversation._id);
        if (refreshed) {
          keyParticipants = refreshed.participants;
          keys = keyParticipants.map((person) => ({
            userId: person.firebaseId,
            publicKey: person.firebaseId === user.uid ? identity.publicKey : person.chatPublicKey || "",
          }));
          setActive((current) => current?._id === refreshed._id ? refreshed : current);
          setConversations((rows) => rows.map((row) => row._id === refreshed._id ? refreshed : row));
        }
      }
      if (keys.some((row) => !row.publicKey)) {
        throw new Error("Encrypted chat is not ready for this person yet. They need to sign in to the updated MindFuel app once, then you can try again.");
      }
    }
    const created = await createConversationKey(keys);
    const response = await chatFetch(user, "/api/chat/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: conversation._id, wrappedKeys: created.wrappedKeys }),
    });
    if (!response.ok) throw new Error("Unable to establish encrypted conversation");
    const encryption = await response.json();
    const secured = { ...conversation, ...encryption };
    const ownWrapped = encryption.encryptedKeys?.find((row: { user?: Person }) => row.user?.firebaseId === user.uid)?.wrappedKey;
    if (!ownWrapped) throw new Error("The encrypted conversation key is unavailable");
    const establishedKey = await unwrapConversationKey(user.uid, ownWrapped);
    setActive((current) => current?._id === secured._id ? secured : current);
    setConversations((rows) => rows.map((row) => row._id === secured._id ? { ...row, ...encryption } : row));
    conversationKeysRef.current.set(conversation._id, establishedKey);
    return establishedKey;
  }, [user, setConversations]);

  useEffect(() => {
    if (!active || !messageData?.some((message) => message.ciphertext && !message.decrypted)) return;
    let cancelled = false;
    void prepareConversationKey(active).then(async (key) => {
      const decrypted = await Promise.all(messageData.map(async (message) => {
        if (!message.ciphertext || !message.iv || message.decrypted) return message;
        try {
          const text = await decryptChatText(key, message.ciphertext, message.iv);
          let replyTo = message.replyTo;
          if (replyTo?.ciphertext && replyTo.iv) replyTo = { ...replyTo, text: await decryptChatText(key, replyTo.ciphertext, replyTo.iv) };
          return { ...message, text, replyTo, decrypted: true };
        } catch {
          return { ...message, text: "Unable to decrypt this message", decrypted: true };
        }
      }));
      if (!cancelled) setMessages(decrypted);
    }).catch((error: unknown) => {
      if (!isChatKeyMismatchError(error)) return;
      // This means this one conversation's key predates the device's current
      // identity (e.g. after "start fresh") — not that the device itself is
      // unregistered, so it must not drive the device-wide hasChatKeyConflict
      // banner. That banner's "Link this device" / "Restore with recovery
      // PIN" actions wouldn't fix this conversation anyway, and would falsely
      // suggest the device is broken when it's actually fine going forward.
      setMessages((rows) => rows.map((message) =>
        message.ciphertext && !message.decrypted
          ? { ...message, text: "This message is encrypted for another linked device.", decrypted: true }
          : message,
      ));
    });
    return () => { cancelled = true; };
  }, [active, messageData, prepareConversationKey, setMessages, showToast]);
  const updateTypingState = useCallback(
    (conversationId: string, isTyping: boolean, force = false) => {
      if (!user) return;
      const previous = lastTypingStateRef.current;
      const now = Date.now();
      if (
        !force &&
        previous?.conversationId === conversationId &&
        previous.isTyping === isTyping &&
        now - previous.sentAt < 1800
      ) {
        return;
      }
      lastTypingStateRef.current = { conversationId, isTyping, sentAt: now };
      chatFetch(user, "/api/chat/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, isTyping }),
      }).catch(() => {
        // Socket events still carry typing when the HTTP fallback is unavailable.
      });
    },
    [user],
  );

  useEffect(() => {
    if (conversationCacheKey && conversationData !== undefined)
      writeChatCache(conversationCacheKey, conversationData);
  }, [conversationCacheKey, conversationData]);

  useEffect(() => {
    if (messageCacheKey && messageData !== undefined)
      writeChatCache(messageCacheKey, messageData);
  }, [messageCacheKey, messageData]);

  useEffect(() => {
    if (!user || !active || !messageData?.length) return;
    const latest = messageData[messageData.length - 1];
    if (latest.sender.firebaseId === user.uid || lastMarkedReadIdRef.current === latest._id) return;
    lastMarkedReadIdRef.current = latest._id;
    const socket = getSocket(user.uid);
    chatFetch(user, "/api/chat/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: active._id }),
    })
      .then((response) => {
        if (response.ok) socket.emit("messages:read", { conversationId: active._id });
      })
      .catch(() => undefined);
  }, [active, messageData, user]);

  const otherPerson = useCallback(
    (conversation: Conversation) =>
      conversation.participants.find(
        (person) => person.firebaseId !== user?.uid,
      ) || conversation.participants[0],
    [user?.uid],
  );
  const visibleConversations = useMemo(
    () =>
      conversations
        .filter((conversation) => {
          const person = otherPerson(conversation);
          const search = query.trim().toLowerCase();
          if (!search) return true;
          return `${person?.name || ""} ${person?.username || ""} ${conversation.lastMessage?.text || ""}`
            .toLowerCase()
            .includes(search);
        })
        .sort(
          (left, right) =>
            new Date(right.lastMessageAt || 0).getTime() -
            new Date(left.lastMessageAt || 0).getTime(),
        ),
    [conversations, query, otherPerson],
  );

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const recipientId = searchParams.get("with");
      if (!recipientId) return;
      try {
        const createResponse = await chatFetch(user, "/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientId }),
        });
        if (!createResponse.ok)
          throw new Error("Unable to start conversation");
        const created = (await createResponse.json()).conversation;
        if (created) {
          setConversations((rows) => [
            created,
            ...rows.filter((row) => row._id !== created._id),
          ]);
          setActive({ ...created, unreadCount: 0 });
        }
      } catch {
        showToast("Conversation could not be opened", "error");
      }
    };
    void load();
  }, [user, searchParams, setConversations, showToast]);

  useEffect(() => {
    activeIdRef.current = active?._id || null;
    lastMarkedReadIdRef.current = "";
  }, [active?._id]);

  useEffect(() => {
    if (!user) return;
    const socket = getSocket(user.uid);
    const onConversationMessage = ({
      conversationId,
      conversation,
      message,
    }: {
      conversationId: string;
      conversation: Conversation;
      message: ChatMessage;
    }) => {
      const isOpen = activeIdRef.current === conversationId;
      setConversations((rows) => {
        const existing = rows.find((row) => row._id === conversationId);
        const updated: Conversation = {
          ...(existing || conversation),
          lastMessage: message,
          lastMessageAt: message.createdAt,
          unreadCount: isOpen ? 0 : (existing?.unreadCount || 0) + 1,
        };
        return [updated, ...rows.filter((row) => row._id !== conversationId)];
      });

      if (isOpen) {
        setMessages((rows) =>
          rows.some((item) => item._id === message._id)
            ? rows
            : [...rows, message],
        );
        chatFetch(user, "/api/chat/messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId }),
        })
          .then((response) => {
            if (response.ok) socket.emit("messages:read", { conversationId });
          })
          .catch(() => {
            // The read receipt can be retried when the conversation is reopened.
          });
      } else {
        // The conversation cache update below drives the unified toast effect,
        // which also covers polling fallback when sockets reconnect.
      }
    };
    socket.on("conversation:message", onConversationMessage);
    return () => {
      socket.off("conversation:message", onConversationMessage);
    };
  }, [user, showToast, setConversations, setMessages]);

  useEffect(() => {
    if (!user || !conversationData) return;
    const nextIds = new Map<string, string>();
    for (const conversation of conversationData) {
      const message = conversation.lastMessage;
      if (!message?._id) continue;
      nextIds.set(conversation._id, message._id);
      const previousId = conversationMessageIdsRef.current.get(conversation._id);
      if (
        conversationSnapshotReadyRef.current &&
        previousId !== message._id &&
        message.sender?.firebaseId !== user.uid &&
        activeIdRef.current !== conversation._id
      ) {
        const firstName = message.sender.name.trim().split(/\s+/)[0] || "Someone";
        showToast(`New message from ${firstName}`, "info", 4500);
      }
    }
    conversationMessageIdsRef.current = nextIds;
    conversationSnapshotReadyRef.current = true;
  }, [conversationData, showToast, user]);

  useEffect(() => {
    if (!user || !active) return;
    const socket = getSocket(user.uid);
    socket.emit("conversation:join", active._id);
    let cancelled = false;
    const onTyping = ({
      conversationId,
      name,
      isTyping,
    }: {
      conversationId: string;
      name: string;
      isTyping: boolean;
    }) => {
      if (conversationId !== active._id) return;
      setTypingName(isTyping ? name : "");
    };
    const onRead = ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      if (conversationId !== active._id) return;
      setMessages((rows) =>
        rows.map((message) => {
          if (
            message.sender.firebaseId !== user.uid ||
            message.readBy?.includes(userId)
          )
            return message;
          return { ...message, readBy: [...(message.readBy || []), userId] };
        }),
      );
      setConversations((rows) =>
        rows.map((conversation) => {
          const lastMessage = conversation.lastMessage;
          if (
            conversation._id !== conversationId ||
            !lastMessage ||
            lastMessage.sender?.firebaseId !== user.uid ||
            lastMessage.readBy?.includes(userId)
          )
            return conversation;
          return {
            ...conversation,
            lastMessage: {
              ...lastMessage,
              readBy: [...(lastMessage.readBy || []), userId],
            },
          };
        }),
      );
    };
    const onReaction = ({ conversationId, messageId, reactions }: { conversationId: string; messageId: string; reactions: ChatMessage["reactions"] }) => {
      if (conversationId !== active._id) return;
      setMessages((rows) => rows.map((row) => row._id === messageId ? { ...row, reactions } : row));
    };
    socket.on("typing:update", onTyping);
    socket.on("messages:read", onRead);
    socket.on("message:reaction", onReaction);
    const loadTypingState = async () => {
      try {
        const response = await chatFetch(user,
          `/api/chat/typing?conversationId=${encodeURIComponent(active._id)}`,
          { cache: "no-store" },
        );
        if (!response.ok || cancelled) return;
        const data = await response.json();
        const firstTyping = data.typing?.[0];
        setTypingName(firstTyping?.name || "");
      } catch {
        // Socket typing remains the primary realtime path when polling misses.
      }
    };
    const typingPoll = window.setInterval(loadTypingState, 4000);
    void loadTypingState();
    // A single WebSocket frame (the incoming message notification) has no
    // redundancy the way repeated typing pings do, so a dropped or delayed
    // frame — common on mobile connections — otherwise leaves the open
    // conversation stuck until the user manually reopens it. This mirrors the
    // typing poll above: a cheap background refresh that self-heals a missed
    // "conversation:message" event within a few seconds instead of never.
    const messagesPoll = window.setInterval(() => {
      void mutateMessages();
    }, 6000);
    // A reconnect can also open a gap where events were missed entirely, so
    // resync explicitly as soon as the socket comes back instead of waiting
    // for the next poll tick.
    const onReconnect = () => {
      socket.emit("conversation:join", active._id);
      void mutateMessages();
    };
    socket.on("connect", onReconnect);
    chatFetch(user, "/api/chat/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: active._id }),
    })
      .then((response) => {
        if (response.ok)
          socket.emit("messages:read", { conversationId: active._id });
      })
      .catch(() => {
        // Cached messages remain readable while the network is unavailable.
      });
    setConversations((rows) =>
      rows.map((row) =>
        row._id === active._id ? { ...row, unreadCount: 0 } : row,
      ),
    );
    return () => {
      cancelled = true;
      window.clearInterval(typingPoll);
      window.clearInterval(messagesPoll);
      isTypingRef.current = false;
      socket.emit("typing:stop", {
        conversationId: active._id,
        name: profile?.name || user.displayName || "Someone",
      });
      void updateTypingState(active._id, false, true);
      socket.emit("conversation:leave", active._id);
      socket.off("typing:update", onTyping);
      socket.off("messages:read", onRead);
      socket.off("message:reaction", onReaction);
      socket.off("connect", onReconnect);
    };
  }, [active, user, profile?.name, setConversations, setMessages, updateTypingState, mutateMessages]);

  useEffect(() => {
    // Deliberately excludes typingName: the indicator flickers on and off
    // repeatedly while the other person types, and re-triggering a smooth
    // scroll on every flicker made the page visibly judder on mobile.
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?._id, messages.length]);

  useEffect(() => {
    if (!user || !active) return;
    const key = `${REPLY_TIP_PREFIX}${user.uid}`;
    if (window.localStorage.getItem(key)) return;
    setShowReplyTip(true);
  }, [active, user]);

  useEffect(() => {
    if (!user) return;
    setShowEncryptionBanner(
      window.localStorage.getItem(`${ENCRYPTION_BANNER_PREFIX}${user.uid}`) !== "true",
    );
  }, [user]);

  useEffect(
    () => () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("mindfuel:conversation-state", {
        detail: { active: Boolean(active) },
      }),
    );
  }, [active]);

  useEffect(
    () => () => {
      window.dispatchEvent(
        new CustomEvent("mindfuel:conversation-state", {
          detail: { active: false },
        }),
      );
    },
    [],
  );

  useEffect(() => {
    setShowConversationInfo(false);
    setShowConversationMenu(false);
    setProfileLinkCopied(false);
    setShowEmojiPicker(false);
    setReactionPickerMessageId("");
    setReactionPickerPosition(null);
    setReplyingTo(null);
  }, [active?._id]);

  useEffect(() => {
    if (!active) return;
    const recipientId = searchParams.get("with");
    const sharedDraft = searchParams.get("draft");
    if (!recipientId || !sharedDraft || sharedDraft.length > 2200) return;
    if (!active.participants.some((participant) => participant.firebaseId === recipientId)) return;
    const applicationKey = `${active._id}:${recipientId}:${sharedDraft}`;
    if (sharedDraftAppliedRef.current === applicationKey) return;
    sharedDraftAppliedRef.current = applicationKey;
    setDrafts((current) => current[active._id]
      ? current
      : { ...current, [active._id]: sharedDraft },
    );
    window.setTimeout(() => composerRef.current?.focus(), 0);
  }, [active, searchParams]);

  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, 128);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 128 ? "auto" : "hidden";
    setComposerExpanded(nextHeight > 44);
  }, [draft]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!emojiPickerRef.current?.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [showEmojiPicker]);

  useEffect(() => {
    if (!reactionPickerMessageId) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!reactionPickerRef.current?.contains(event.target as Node)) {
        setReactionPickerMessageId("");
        setReactionPickerPosition(null);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [reactionPickerMessageId]);

  useEffect(() => {
    if (!showNewMessage) return;
    const search = recipientQuery.trim();
    if (search.length < 2) {
      setRecipientResults([]);
      setRecipientSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setRecipientSearchLoading(true);
      try {
        const response = await fetch(
          `/api/users/search?q=${encodeURIComponent(search)}`,
          { signal: controller.signal },
        );
        const data = await response.json();
        setRecipientResults(
          (data.users || []).filter(
            (person: Person) => person.firebaseId !== user?.uid,
          ),
        );
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError")
          setRecipientResults([]);
      } finally {
        if (!controller.signal.aborted) setRecipientSearchLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [recipientQuery, showNewMessage, user?.uid]);

  const startConversation = async (recipient: Person) => {
    if (!user || startingRecipientId) return;
    setStartingRecipientId(recipient.firebaseId);
    try {
      const response = await chatFetch(user, "/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: recipient.firebaseId,
        }),
      });
      if (!response.ok) throw new Error("Could not start conversation");
      const data = await response.json();
      const conversation: Conversation = {
        ...data.conversation,
        unreadCount: 0,
      };
      setConversations((rows) => [
        conversation,
        ...rows.filter((row) => row._id !== conversation._id),
      ]);
      setActive(conversation);
      setShowNewMessage(false);
      setRecipientQuery("");
    } catch (error) {
      console.error(error);
    } finally {
      setStartingRecipientId("");
    }
  };

  const copyProfileLink = async (person: Person) => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/profile/${person.firebaseId}`,
      );
      setProfileLinkCopied(true);
      window.setTimeout(() => setProfileLinkCopied(false), 1800);
    } catch {
      setProfileLinkCopied(false);
    }
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !active || !draft.trim()) return;
    const text = draft.trim();
    const conversationId = active._id;
    const temporaryId = `pending-${crypto.randomUUID()}`;
    const socket = getSocket(user.uid);
    let encryptedPayload: { ciphertext: string; iv: string; encryptionVersion: number };
    try {
      const key = await prepareConversationKey(active);
      encryptedPayload = await encryptChatText(key, text);
    } catch (error) {
      if (isChatKeyMismatchError(error) || (error instanceof Error && error.message.includes("not linked"))) {
        setHasChatKeyConflict(true);
        setDeviceLinkMode("target");
        showToast("Link this browser to a trusted device before sending encrypted messages.", "error", 8000);
      } else {
        showToast(error instanceof Error ? error.message : "Encrypted chat could not be started", "error", 6000);
      }
      return;
    }
    const optimisticMessage: ChatMessage = {
      _id: temporaryId,
      text,
      createdAt: new Date().toISOString(),
      sender: {
        _id: user.uid,
        firebaseId: user.uid,
        name: profile?.name || user.displayName || "You",
        username: profile?.username,
        image: profile?.image || user.photoURL || undefined,
      },
      readBy: [],
      replyTo: replyingTo
        ? {
            _id: replyingTo._id,
            text: replyingTo.text,
            createdAt: replyingTo.createdAt,
            sender: replyingTo.sender,
          }
        : null,
      deliveryState: "sending",
    };
    if (typingTimer.current) clearTimeout(typingTimer.current);
    isTypingRef.current = false;
    socket.emit("typing:stop", {
      conversationId,
      name: profile?.name || user.displayName || "Someone",
    });
    updateTypingState(conversationId, false, true);
    setDrafts((current) => {
      const next = { ...current };
      delete next[conversationId];
      return next;
    });
    const replyToId = replyingTo?._id;
    setReplyingTo(null);
    setMessages((rows) => [...rows, optimisticMessage]);
    setConversations((rows) => {
      const current = rows.find((row) => row._id === conversationId);
      if (!current) return rows;
      const updated = {
        ...current,
        lastMessage: optimisticMessage,
        lastMessageAt: optimisticMessage.createdAt,
      };
      return [updated, ...rows.filter((row) => row._id !== conversationId)];
    });

    try {
      const response = await chatFetch(user, "/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, ...encryptedPayload, replyTo: replyToId }),
      });
      if (!response.ok) throw new Error("Message failed to send");
      const data = await response.json();
      setMessages((rows) =>
        rows.map((message) =>
          message._id === temporaryId ? data.message : message,
        ),
      );
      setConversations((rows) => {
        const current = rows.find((row) => row._id === conversationId);
        if (!current) return rows;
        const updated = {
          ...current,
          lastMessage: data.message,
          lastMessageAt: data.message.createdAt,
        };
        return [updated, ...rows.filter((row) => row._id !== conversationId)];
      });
      socket.emit("message:published", {
        conversationId,
        message: data.message,
      });
    } catch {
      setMessages((rows) =>
        rows.map((message) =>
          message._id === temporaryId
            ? { ...message, deliveryState: "failed" }
            : message,
        ),
      );
      showToast("Message could not be sent", "error");
    }
  };

  const reactToMessage = async (messageId: string, emoji: string) => {
    if (!user || !active) return;
    const previousMessages = messages;
    setMessages((rows) => rows.map((message) => {
      if (message._id !== messageId) return message;
      const reactions = message.reactions || [];
      const selected = reactions.find((reaction) => reaction.emoji === emoji);
      const alreadySelected = selected?.users.some((reactionUser) =>
        typeof reactionUser === "string" ? reactionUser === user.uid : reactionUser.firebaseId === user.uid,
      );
      const withoutOwnReaction = reactions
        .map((reaction) => ({
          ...reaction,
          users: reaction.users.filter((reactionUser) =>
            typeof reactionUser === "string" ? reactionUser !== user.uid : reactionUser.firebaseId !== user.uid,
          ),
        }))
        .filter((reaction) => reaction.users.length > 0);
      if (!alreadySelected) {
        const target = withoutOwnReaction.find((reaction) => reaction.emoji === emoji);
        if (target) target.users = [...target.users, { firebaseId: user.uid }];
        else withoutOwnReaction.push({ emoji, users: [{ firebaseId: user.uid }] });
      }
      return { ...message, reactions: withoutOwnReaction };
    }));
    try {
      const response = await chatFetch(user, "/api/chat/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: active._id, messageId, emoji }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setMessages((rows) => rows.map((row) => row._id === messageId ? { ...row, reactions: data.reactions } : row));
      getSocket(user.uid).emit("message:reaction", { conversationId: active._id, messageId });
    } catch {
      setMessages(previousMessages);
      showToast("Reaction could not be updated", "error");
    }
  };

  const changeDraft = (value: string) => {
    if (!user || !active) return;
    const conversationId = active._id;
    setDrafts((current) => ({ ...current, [conversationId]: value }));
    const socket = getSocket(user.uid);
    if (!value.trim()) {
      isTypingRef.current = false;
      socket.emit("typing:stop", {
        conversationId,
        name: profile?.name || user.displayName || "Someone",
      });
      updateTypingState(conversationId, false, true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      return;
    }
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing:start", {
        conversationId,
        name: profile?.name || user.displayName || "Someone",
      });
    }
    updateTypingState(conversationId, true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(
      () => {
        isTypingRef.current = false;
        socket.emit("typing:stop", {
          conversationId,
          name: profile?.name || user.displayName || "Someone",
        });
        updateTypingState(conversationId, false, true);
      },
      900,
    );
  };

  const addEmoji = ({ emoji }: { emoji: string }) => {
    const cursor = composerRef.current?.selectionStart ?? draft.length;
    changeDraft(`${draft.slice(0, cursor)}${emoji}${draft.slice(cursor)}`);
    setShowEmojiPicker(false);
    window.setTimeout(() => {
      const nextCursor = cursor + emoji.length;
      composerRef.current?.focus();
      composerRef.current?.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  const closeReplyTip = () => {
    if (user) window.localStorage.setItem(`${REPLY_TIP_PREFIX}${user.uid}`, "seen");
    setShowReplyTip(false);
  };

  const dismissEncryptionBanner = () => {
    if (user) {
      window.localStorage.setItem(`${ENCRYPTION_BANNER_PREFIX}${user.uid}`, "true");
    }
    setShowEncryptionBanner(false);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const openReactionPicker = (messageId: string, anchor?: HTMLElement) => {
    if (reactionPickerMessageId === messageId) {
      setReactionPickerMessageId("");
      setReactionPickerPosition(null);
      return;
    }
    if (window.innerWidth >= 768 && anchor) {
      const room = messagesScrollRef.current?.getBoundingClientRect();
      const trigger = anchor.getBoundingClientRect();
      const width = 332;
      const height = 310;
      const padding = 12;
      const roomLeft = room?.left ?? 0;
      const roomRight = room?.right ?? window.innerWidth;
      const roomTop = room?.top ?? 0;
      const roomBottom = room?.bottom ?? window.innerHeight;
      const left = Math.min(
        Math.max(trigger.left + trigger.width / 2 - width / 2, roomLeft + padding),
        Math.max(roomLeft + padding, roomRight - width - padding),
      );
      const spaceAbove = trigger.top - roomTop;
      const preferredTop = spaceAbove >= height + padding
        ? trigger.top - height - 8
        : trigger.bottom + 8;
      const top = Math.min(
        Math.max(preferredTop, roomTop + padding),
        Math.max(roomTop + padding, roomBottom - height - padding),
      );
      setReactionPickerPosition({ left, top });
    } else {
      setReactionPickerPosition(null);
    }
    setReactionPickerMessageId(messageId);
  };

  const handleMessagesScroll = () => {
    const container = messagesScrollRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowJumpToBottom(distanceFromBottom > 180);
  };

  const registerMessageRef = (messageId: string) => (node: HTMLDivElement | null) => {
    if (node) messageRefs.current.set(messageId, node);
    else messageRefs.current.delete(messageId);
  };

  const scrollToMessage = (messageId: string) => {
    const node = messageRefs.current.get(messageId);
    if (!node) {
      showToast("That message is not loaded yet", "info");
      return;
    }
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(messageId);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightedMessageId(""), 1600);
  };

  const person = active ? otherPerson(active) : null;
  const presenceUserIds = useMemo(
    () => Array.from(new Set([
      ...conversations.flatMap((conversation) => conversation.participants.map((participant) => participant.firebaseId)),
      ...recipientResults.map((recipient) => recipient.firebaseId),
      ...(person ? [person.firebaseId] : []),
    ])),
    [conversations, person, recipientResults],
  );
  const isOnline = usePresence(presenceUserIds);

  if (authLoading)
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-green" />
      </div>
    );
  if (!user)
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
        <MessageCircle className="mb-4 h-12 w-12 text-brand-green" />
        <h1 className="text-xl font-bold">Conversations are personal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to connect and chat with the MindFuel community.
        </p>
        <button
          onClick={openSignInModal}
          className="mt-6 rounded-full bg-brand-green px-6 py-3 font-bold text-white"
        >
          Sign in
        </button>
      </div>
    );

  return (
    <div className="flex h-full max-h-[100dvh] min-h-0 overflow-hidden bg-surface">
      {showNewMessage && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowNewMessage(false)}
        >
          <div
            className="modal-solid flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-line-strong shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-lg font-bold">New message</h2>
              <button
                type="button"
                onClick={() => setShowNewMessage(false)}
                className="rounded-full p-2 hover:bg-white/[0.07]"
                aria-label="Close new message"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <label className="flex items-center gap-2 rounded-full bg-surface-elevated px-4 ring-1 ring-white/[0.06] focus-within:ring-brand-green/60">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={recipientQuery}
                  onChange={(event) => setRecipientQuery(event.target.value)}
                  placeholder="Search people"
                  className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                {recipientSearchLoading && (
                  <Loader2 className="h-4 w-4 animate-spin text-brand-green" />
                )}
              </label>
            </div>
            <div className="thin-scrollbar min-h-48 overflow-y-auto border-t border-line-subtle">
              {recipientQuery.trim().length < 2 ? (
                <p className="px-6 py-16 text-center text-sm text-muted-foreground">
                  Type at least two characters to find someone.
                </p>
              ) : !recipientSearchLoading && recipientResults.length === 0 ? (
                <p className="px-6 py-16 text-center text-sm text-muted-foreground">
                  No people found.
                </p>
              ) : (
                recipientResults.map((recipient) => (
                  <button
                    key={recipient._id}
                    type="button"
                    onClick={() => startConversation(recipient)}
                    disabled={Boolean(startingRecipientId)}
                    className="flex w-full items-center gap-3 border-b border-line-subtle px-5 py-3.5 text-left transition-colors hover:bg-white/[0.05] disabled:opacity-60"
                  >
                    <Avatar person={recipient} size={44} online={isOnline(recipient.firebaseId)} />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm">
                        {recipient.name}
                      </strong>
                      <span className="block truncate text-xs text-muted-foreground">
                        @{getUserHandle(recipient)}
                      </span>
                    </span>
                    {startingRecipientId === recipient.firebaseId && (
                      <Loader2 className="h-4 w-4 animate-spin text-brand-green" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {showReplyTip && (
        <div
          className="fixed inset-0 z-[230] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeReplyTip}
        >
          <div
            className="modal-solid w-full max-w-sm rounded-3xl border border-line-strong p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green/15 text-brand-green">
                <Reply className="h-5 w-5" />
              </div>
              <button
                type="button"
                onClick={closeReplyTip}
                className="rounded-full p-2 text-white/55 hover:bg-white/[0.07] hover:text-white"
                aria-label="Close reply tip"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <h2 className="text-lg font-bold">Reply and react quickly</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Tap or click any message to reply. On a phone or tablet, use the smile button in the reply strip to react. Tap a quoted reply to jump back to it.
            </p>
            <button
              type="button"
              onClick={closeReplyTip}
              className="mt-5 w-full rounded-full bg-brand-green px-4 py-3 text-sm font-bold text-white"
            >
              Got it
            </button>
          </div>
        </div>
      )}
      {deviceLinkMode && user && (
        <ChatDeviceLinkModal
          user={user}
          mode={deviceLinkMode}
          onClose={() => setDeviceLinkMode(null)}
          onLinked={() => window.location.reload()}
        />
      )}
      {recoveryModalMode && user && (
        <ChatRecoveryModal
          user={user}
          mode={recoveryModalMode}
          onClose={() => {
            setRecoveryModalMode(null);
            if (recoveryModalMode === "setup") setRecoveryAvailable(true);
          }}
          onRestored={() => window.location.reload()}
        />
      )}
      {reactionPickerMessageId && (
        <div
          className="fixed inset-0 z-[210] overflow-y-auto overscroll-contain bg-black/35 px-3 pb-[calc(9rem+env(safe-area-inset-bottom))] pt-3 md:pointer-events-none md:overflow-visible md:bg-transparent md:p-0"
          onClick={() => {
            setReactionPickerMessageId("");
            setReactionPickerPosition(null);
          }}
        >
          <div className="flex min-h-full items-end justify-center md:block md:min-h-0">
            <div
              ref={reactionPickerRef}
              className="pointer-events-auto static max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-line-strong bg-surface-raised shadow-2xl md:fixed md:max-w-none"
              style={reactionPickerPosition || undefined}
              onClick={(event) => event.stopPropagation()}
            >
              <NativeEmojiPicker
                title="React to message"
                onSelect={(emoji) => {
                  const messageId = reactionPickerMessageId;
                  void reactToMessage(messageId, emoji);
                  setReactionPickerMessageId("");
                  setReactionPickerPosition(null);
                  setReplyingTo((current) => current?._id === messageId ? null : current);
                }}
              />
            </div>
          </div>
        </div>
      )}
      <section
        className={`${active ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-r border-line bg-surface md:w-[390px] lg:w-[410px]`}
      >
        <header className="border-b border-line bg-surface px-4 pb-3 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold tracking-tight">Messages</h1>
            <div className="flex items-center gap-0.5">
              <IconButton
                onClick={() => setRecoveryModalMode(hasChatKeyConflict ? "restore" : "setup")}
                aria-label={hasChatKeyConflict ? "Restore with recovery PIN" : "Chat recovery PIN"}
                title={hasChatKeyConflict ? "Restore with recovery PIN" : "Chat recovery PIN"}
              >
                <KeyRound className="h-5 w-5" />
              </IconButton>
              <IconButton
                onClick={() => setDeviceLinkMode(hasChatKeyConflict ? "target" : "source")}
                aria-label={hasChatKeyConflict ? "Link this device" : "Link another device"}
                title={hasChatKeyConflict ? "Link this device" : "Link another device"}
              >
                <Link2 className="h-5 w-5" />
              </IconButton>
              <IconButton onClick={() => setShowNewMessage(true)} aria-label="New message">
                <PenSquare className="h-5 w-5" />
              </IconButton>
            </div>
          </div>
          {hasChatKeyConflict ? (
            <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200">
              <span className="flex items-center gap-2">
                <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                This browser isn&apos;t linked to your encrypted chats.
              </span>
              <span className="flex items-center gap-3 pl-[22px]">
                <button
                  type="button"
                  onClick={() => setDeviceLinkMode("target")}
                  className="font-bold underline underline-offset-2"
                >
                  Link this device
                </button>
                <button
                  type="button"
                  onClick={() => setRecoveryModalMode("restore")}
                  className="font-bold underline underline-offset-2"
                >
                  Restore with recovery PIN
                </button>
              </span>
            </div>
          ) : recoveryAvailable === false && (
            <button
              type="button"
              onClick={() => setRecoveryModalMode("setup")}
              className="mt-3 flex w-full items-center justify-between gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-200"
            >
              <span className="flex items-center gap-2"><KeyRound className="h-3.5 w-3.5 shrink-0" /> Set up a recovery PIN for your encrypted chats</span>
              <span className="font-bold underline underline-offset-2">Set up</span>
            </button>
          )}
          <label className="mt-4 flex items-center gap-2 rounded-full bg-surface-elevated px-4 focus-within:ring-1 focus-within:ring-brand-green/60">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations"
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
        </header>
        <div className="thin-scrollbar flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-10">
              <Loader2 className="h-5 w-5 animate-spin text-brand-green" />
            </div>
          ) : visibleConversations.length ? (
            visibleConversations.map((conversation) => {
              const other = otherPerson(conversation);
              const selected = active?._id === conversation._id;
              const lastMessageIsOwn =
                conversation.lastMessage?.sender?.firebaseId === user.uid;
              const lastMessageWasRead =
                (conversation.lastMessage?.readBy?.length || 0) > 1;
              return (
                <button
                  key={conversation._id}
                  onClick={() => setActive(conversation)}
                  className={`flex w-full items-center gap-3 border-b border-line-subtle px-4 py-3 text-left transition-colors ${selected ? "bg-white/[0.08]" : "hover:bg-white/[0.045]"}`}
                >
                  <Avatar person={other} size={48} online={isOnline(other.firebaseId)} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <strong className="truncate text-[14px]">
                        {other.name}
                      </strong>
                      <small className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                        {conversation.lastMessageAt
                          ? new Date(
                              conversation.lastMessageAt,
                            ).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })
                          : ""}
                      </small>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      {lastMessageIsOwn &&
                        (conversation.lastMessage?.deliveryState ===
                        "failed" ? (
                          <CircleAlert
                            className="h-3.5 w-3.5 shrink-0 text-red-400"
                            aria-label="Not sent"
                          />
                        ) : conversation.lastMessage?.deliveryState ===
                          "sending" ? (
                          <Check
                            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                            aria-label="Sending"
                          />
                        ) : (
                          <span title={lastMessageWasRead ? "Seen" : "Delivered"} className="shrink-0">
                            <CheckCheck
                              className={`h-3.5 w-3.5 ${lastMessageWasRead ? "text-[#35d07f]" : "text-muted-foreground"}`}
                              aria-label={lastMessageWasRead ? "Seen" : "Delivered"}
                            />
                          </span>
                        ))}
                      <span
                        className={`truncate text-[13px] ${conversation.unreadCount ? "font-semibold" : "text-muted-foreground"}`}
                        style={
                          conversation.unreadCount
                            ? { color: "var(--brand-green, #00bf63)" }
                            : undefined
                        }
                      >
                        {conversation.lastMessage?.text ||
                          `@${getUserHandle(other)}`}
                      </span>
                      {conversation.unreadCount > 0 && (
                        <b
                          className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border px-1.5 text-[10px] font-extrabold leading-none"
                          style={{
                            color: "var(--brand-green, #00bf63)",
                            backgroundColor: "rgba(0, 191, 99, 0.12)",
                            borderColor: "rgba(0, 191, 99, 0.4)",
                          }}
                          aria-label={`${conversation.unreadCount} unread message${conversation.unreadCount === 1 ? "" : "s"}`}
                        >
                          {conversation.unreadCount}
                        </b>
                      )}
                    </span>
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-8 py-20 text-center">
              <MessageCircle className="mx-auto h-9 w-9 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-semibold">
                {query.trim() ? "No matching conversations" : "No conversations yet"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {query.trim()
                  ? "Try a name, username, or recent message."
                  : "Visit someone’s profile and say hello."}
              </p>
            </div>
          )}
        </div>
      </section>
      <section
        className={`${active ? "flex" : "hidden md:flex"} relative min-w-0 flex-1 flex-col`}
      >
        {active && person ? (
          <>
            <header className="sticky top-0 z-20 flex h-[64px] shrink-0 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur-xl">
              <button
                onClick={() => setActive(null)}
                className="rounded-full p-2 hover:bg-white/[0.07] md:hidden"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Avatar person={person} size={40} online={isOnline(person.firebaseId)} />
              <span className="min-w-0 flex flex-col items-start text-left">
                <strong className="block truncate text-[15px] ">
                  {person.name}
                </strong>
                <small className={`text-xs ${isOnline(person.firebaseId) ? "text-[#35d07f]" : "text-muted-foreground"}`}>
                  {isOnline(person.firebaseId) ? "Online" : "Offline"} · @{getUserHandle(person)}
                </small>
              </span>
              <div className="ml-auto flex items-center justify-start">
                <div className="relative">
                  <button
                    onClick={() =>
                      setShowConversationMenu((visible) => !visible)
                    }
                    className="rounded-full p-2.5 hover:bg-white/[0.07]"
                    aria-label="More options"
                    aria-expanded={showConversationMenu}
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                  {showConversationMenu && (
                    <>
                      <button
                        type="button"
                        className="fixed inset-0 z-10 cursor-default"
                        onClick={() => setShowConversationMenu(false)}
                        aria-label="Close conversation menu"
                      />
                      <div className="popover-solid absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-2xl border border-line-strong py-1 shadow-2xl">
                        <button
                          type="button"
                          onClick={() => {
                            setShowConversationInfo(true);
                            setShowConversationMenu(false);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] font-medium hover:bg-white/[0.07]"
                        >
                          <Info className="h-4 w-4" />
                          Conversation info
                        </button>
                        <Link
                          href={`/profile/${person.firebaseId}`}
                          onClick={() => setShowConversationMenu(false)}
                          className="flex items-center gap-3 px-4 py-3 text-[13px] font-medium hover:bg-white/[0.07]"
                        >
                          <UserRound className="h-4 w-4" />
                          View profile
                        </Link>
                        <button
                          type="button"
                          onClick={() => copyProfileLink(person)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] font-medium hover:bg-white/[0.07]"
                        >
                          <Copy className="h-4 w-4" />
                          {profileLinkCopied
                            ? "Profile link copied"
                            : "Copy profile link"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </header>
            {hasChatKeyConflict ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-line-subtle bg-amber-500/10 py-1.5 pl-4 pr-2 text-[11px] text-amber-200">
                <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1">
                  This browser can&apos;t unlock this conversation.
                </span>
                <button
                  type="button"
                  onClick={() => setDeviceLinkMode("target")}
                  className="font-bold underline underline-offset-2"
                >
                  Link this device
                </button>
                <button
                  type="button"
                  onClick={() => setRecoveryModalMode("restore")}
                  className="font-bold underline underline-offset-2"
                >
                  Restore with recovery PIN
                </button>
              </div>
            ) : showEncryptionBanner && (
              <div className="flex items-center gap-2 border-b border-line-subtle bg-brand-green/[0.06] py-1.5 pl-4 pr-2 text-[11px] text-brand-green">
                <LockKeyhole className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 text-center">
                  {active.encryptionVersion
                    ? "New messages are end-to-end encrypted. Only you and this person can read them."
                    : "End-to-end encryption will be enabled before your first new message is sent."}
                </span>
                <button
                  type="button"
                  onClick={dismissEncryptionBanner}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-brand-green/70 hover:bg-brand-green/10 hover:text-brand-green"
                  aria-label="Dismiss encryption notice"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {showConversationInfo && (
              <div
                className="absolute inset-0 z-30 flex justify-end bg-black/65 backdrop-blur-sm"
                onClick={() => setShowConversationInfo(false)}
              >
                <aside
                  className="flex h-full w-full max-w-sm flex-col border-l border-line bg-surface-raised shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                  aria-label="Conversation information"
                >
                  <div className="flex h-[68px] items-center justify-between border-b border-line px-5">
                    <h2 className="font-bold">Conversation info</h2>
                    <button
                      type="button"
                      onClick={() => setShowConversationInfo(false)}
                      className="rounded-full p-2 hover:bg-white/[0.07]"
                      aria-label="Close conversation info"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex flex-col items-center px-6 py-8 text-center">
                    <Avatar person={person} size={80} online={isOnline(person.firebaseId)} />
                    <h3 className="mt-4 text-xl font-bold">{person.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      @{getUserHandle(person)}
                    </p>
                  </div>
                  <div className="space-y-2 px-4">
                    <Link
                      href={`/profile/${person.firebaseId}`}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-green px-4 py-3 text-sm font-bold text-white"
                    >
                      <UserRound className="h-4 w-4" />
                      View profile
                    </Link>
                    <button
                      type="button"
                      onClick={() => copyProfileLink(person)}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-line-strong px-4 py-3 text-sm font-bold hover:bg-white/[0.06]"
                    >
                      <Copy className="h-4 w-4" />
                      {profileLinkCopied
                        ? "Profile link copied"
                        : "Copy profile link"}
                    </button>
                  </div>
                </aside>
              </div>
            )}
            <div
              ref={messagesScrollRef}
              onScroll={handleMessagesScroll}
              className="chat-wallpaper thin-scrollbar relative flex-1 overflow-y-auto px-3 py-5 sm:px-5"
            >
              <div className="relative z-[1] mx-auto flex max-w-3xl flex-col gap-0.5">
                {messages.map((message, index) => {
                  const own = message.sender.firebaseId === user.uid;
                  const emojiOnly = isEmojiOnlyMessage(message.text);
                  const hasBeenRead = own && (message.readBy?.length || 0) > 1;
                  const showDate =
                    index === 0 ||
                    messageDayKey(messages[index - 1].createdAt) !== messageDayKey(message.createdAt);
                  return (
                    <React.Fragment key={message._id}>
                      {showDate && (
                        <div className="relative z-10 my-4 flex w-full shrink-0 justify-center">
                          <time
                            dateTime={message.createdAt}
                            className="rounded-full border border-line-subtle bg-surface-raised/95 px-3 py-1.5 text-[11px] font-semibold text-white/80 shadow-sm backdrop-blur-md"
                          >
                            {messageDateLabel(message.createdAt)}
                          </time>
                        </div>
                      )}
                      <div
                        ref={registerMessageRef(message._id)}
                        className={`group flex w-full scroll-mt-24 items-center gap-1 transition-all duration-300 ${message.reactions?.length ? "mb-5" : "mb-0.5"} ${own ? "justify-end" : "justify-start"} ${highlightedMessageId === message._id ? "scale-[1.015]" : ""}`}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setReplyingTo(message)}
                          onKeyDown={(event) => {
                            if (event.target !== event.currentTarget) return;
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setReplyingTo(message);
                            }
                          }}
                          className={`relative min-w-0 max-w-[84%] cursor-pointer rounded-lg border px-2.5 py-1.5 text-left text-[14px] leading-[1.35] shadow-sm transition sm:max-w-[76%] ${message.reactions?.length ? "min-w-[5.5rem]" : ""} ${own ? "rounded-tr-[3px] border-[#07685b] bg-[#064f46] text-white" : "rounded-tl-[3px] border-line-subtle bg-[#191e1b] text-white"} ${message.deliveryState === "failed" ? "border-red-500/60" : ""} ${highlightedMessageId === message._id ? "ring-2 ring-brand-green/70" : "hover:ring-1 hover:ring-white/10 focus:outline-none focus:ring-2 focus:ring-brand-green/70"}`}
                          aria-label="Reply to message"
                        >
                          {message.replyTo && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                scrollToMessage(message.replyTo?._id || "");
                              }}
                              className="mb-1.5 block w-full rounded-md border-l-4 bg-brand-green/15 px-2.5 py-1.5 text-left transition hover:bg-brand-green/20 focus:outline-none focus:ring-1 focus:ring-brand-green/50"
                              style={{ borderLeftColor: "var(--brand-green, #00bf63)" }}
                              aria-label="Jump to replied message"
                            >
                              <strong
                                className="block text-[11px] font-semibold"
                                style={{ color: "var(--brand-green, #00bf63)" }}
                              >
                                {message.replyTo.sender.firebaseId === user.uid ? "You" : message.replyTo.sender.name}
                              </strong>
                              <span className="block max-w-sm truncate text-[12px] text-[#d1d7db]/75">
                                {message.replyTo.text || (message.replyTo.ciphertext ? "Encrypted message" : "")}
                              </span>
                            </button>
                          )}
                          <p className={`whitespace-pre-wrap [overflow-wrap:anywhere] ${emojiOnly ? "text-[30px] leading-none" : ""}`}>
                            {renderMessageText(message.text || (message.ciphertext ? "Decrypting…" : ""), emojiOnly)}
                          </p>
                          <span className={`mt-1.5 ml-3 flex items-center justify-end gap-0.5 text-[10px] leading-none ${own ? "text-white/65" : "text-white/45"}`}>
                            <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                            {own && message.deliveryState === "sending" && <Check className="h-3.5 w-3.5" aria-label="Sending" />}
                            {own && message.deliveryState === "failed" && <CircleAlert className="h-3.5 w-3.5 text-red-300" aria-label="Not sent" />}
                            {own && !message.deliveryState && <CheckCheck className={`h-3.5 w-3.5 ${hasBeenRead ? "text-[#35d07f]" : "text-white/60"}`} aria-label={hasBeenRead ? "Read" : "Delivered"} />}
                          </span>
                          {!!message.reactions?.length && (
                            <div className="absolute -bottom-[18px] left-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-0.5">
                              {message.reactions.map((reaction) => (
                                <button key={reaction.emoji} type="button" onClick={(event) => { event.stopPropagation(); void reactToMessage(message._id, reaction.emoji); }} className="inline-flex h-6 min-w-6 items-center justify-center p-0 text-[20px] leading-none drop-shadow-md transition hover:scale-110 active:scale-90" aria-label={`React with ${reaction.emoji}`}>
                                  {reaction.emoji}
                                </button>
                              ))}
                            </div>
                          )}
                          <div
                            className={`absolute top-[calc(50%-1rem)] z-10 ${own ? "-left-9" : "-right-9"}`}
                          >
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openReactionPicker(message._id, event.currentTarget);
                              }}
                              className={`hidden h-8 w-8 items-center justify-center rounded-full text-white/55 transition hover:bg-white/[0.08] hover:text-white md:flex md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 ${reactionPickerMessageId === message._id ? "bg-white/[0.10] text-brand-green opacity-100" : ""}`}
                              aria-label="React to message"
                              aria-expanded={reactionPickerMessageId === message._id}
                            >
                              <Smile className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                {typingName && (
                  <div className="flex items-end gap-2 px-1 py-2" aria-live="polite">
                    {person && <Avatar person={person} size={28} online={isOnline(person.firebaseId)} />}
                    <div className="relative max-w-[78%] rounded-lg rounded-tl-[3px] bg-[#191e1b] px-3 py-2 shadow-sm">
                      <span className="mb-1 block max-w-36 truncate text-[11px] font-semibold text-brand-green">
                        {typingName}
                      </span>
                      <span className="flex h-5 items-center gap-1.5" aria-label={`${typingName} is typing`}>
                        <span className="h-2 w-2 animate-bounce rounded-full bg-white/70 [animation-delay:-0.24s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-white/70 [animation-delay:-0.12s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-white/70" />
                      </span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
              {showJumpToBottom && (
                <button
                  type="button"
                  onClick={scrollToBottom}
                  className="sticky bottom-3 z-20 ml-auto mr-1 mt-3 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface-raised/95 text-white shadow-xl backdrop-blur transition hover:border-brand-green/50 hover:text-brand-green"
                  aria-label="Jump to latest messages"
                >
                  <ChevronsDown className="h-5 w-5" />
                </button>
              )}
            </div>
            <form
              onSubmit={send}
              className="sticky bottom-0 z-20 shrink-0 border-t border-line bg-surface/95 px-2.5 py-2 pb-safe backdrop-blur-xl"
            >
              {replyingTo && (
                <div
                  className="mx-auto mb-1.5 flex max-w-3xl items-center gap-3 rounded-lg border-l-4 bg-brand-green/15 px-3 py-2 shadow-sm"
                  style={{ borderLeftColor: "var(--brand-green, #00bf63)" }}
                >
                  <Reply className="h-4 w-4 shrink-0" style={{ color: "var(--brand-green, #00bf63)" }} />
                  <div className="min-w-0 flex-1">
                    <strong
                      className="block text-[11px]"
                      style={{ color: "var(--brand-green, #00bf63)" }}
                    >
                      Replying to {replyingTo.sender.firebaseId === user.uid ? "yourself" : replyingTo.sender.name}
                    </strong>
                    <p className="truncate text-xs text-white/50">{replyingTo.text}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openReactionPicker(replyingTo._id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-brand-green hover:bg-white/[0.07] md:hidden"
                    aria-label="React to message"
                  >
                    <Smile className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setReplyingTo(null)} className="rounded-full p-1.5 text-white/45 hover:bg-white/[0.07] hover:text-white" aria-label="Cancel reply">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className={`relative mx-auto flex min-h-12 max-w-3xl items-end gap-1 bg-surface-elevated p-1.5 ring-1 ring-white/[0.06] focus-within:ring-brand-green/50 ${composerExpanded ? "rounded-[26px]" : "rounded-full"}`}>
                <div ref={emojiPickerRef} className="static mb-0.5 shrink-0 self-end">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((open) => !open)}
                    className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${showEmojiPicker ? "bg-brand-green/15 text-brand-green" : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"}`}
                    aria-label="Add emoji"
                    aria-expanded={showEmojiPicker}
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-[calc(100%+10px)] left-0 z-40 overflow-hidden rounded-2xl border border-line shadow-2xl">
                      <NativeEmojiPicker
                        title="Add emoji"
                        onSelect={(emoji) => addEmoji({ emoji })}
                      />
                    </div>
                  )}
                </div>
                <textarea
                  ref={composerRef}
                  value={draft}
                  onChange={(e) => changeDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && window.innerWidth >= 768) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="Start a new message"
                  rows={1}
                  maxLength={2000}
                  className="thin-scrollbar min-h-10 min-w-0 flex-1 resize-none overflow-x-hidden bg-transparent px-1 py-2.5 text-base leading-5 text-white placeholder:text-muted-foreground [overflow-wrap:anywhere] outline-none sm:text-sm"
                />
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="mb-0.5 flex h-10 w-10 shrink-0 self-end items-center justify-center rounded-full text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: "var(--brand-green, #00bf63)" }}
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="m-auto max-w-sm px-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/15">
              <MessageCircle className="h-10 w-10" />
            </div>
            <h2 className="mt-5 text-2xl font-extrabold tracking-tight">
              Select a message
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Choose from your existing conversations or start a new one.
            </p>
            <button
              onClick={() => setShowNewMessage(true)}
              className="mt-6 rounded-full bg-brand-green px-6 py-3 text-sm font-bold text-white"
            >
              New message
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

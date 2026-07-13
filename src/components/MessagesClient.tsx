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
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Theme } from "emoji-picker-react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronsDown,
  CircleAlert,
  Copy,
  Info,
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

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
});

type Person = {
  _id: string;
  firebaseId: string;
  name: string;
  username?: string;
  image?: string;
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
  } | null;
  readBy?: string[];
  deliveryState?: "sending" | "failed";
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
type Conversation = {
  _id: string;
  participants: Person[];
  lastMessage?: ChatMessage;
  lastMessageAt: string;
  unreadCount: number;
};

const CHAT_CACHE_PREFIX = "mindfuel:chat:v1:";
const CHAT_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const REPLY_TIP_PREFIX = "mindfuel:reply-tip:v1:";

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

async function conversationsFetcher(url: string): Promise<Conversation[]> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load conversations");
  const data = await response.json();
  return data.conversations || [];
}

async function messagesFetcher(url: string): Promise<ChatMessage[]> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load messages");
  const data = await response.json();
  return data.messages || [];
}

function Avatar({ person, size = 44 }: { person: Person; size?: number }) {
  return person.image && !person.image.startsWith("#") ? (
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
}

export default function MessagesClient() {
  const { user, profile, loading: authLoading, openSignInModal } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [active, setActive] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState("");
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
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showReplyTip, setShowReplyTip] = useState(false);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const conversationMessageIdsRef = useRef<Map<string, string>>(new Map());
  const conversationSnapshotReadyRef = useRef(false);
  const lastMarkedReadIdRef = useRef("");
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const conversationUrl = user
    ? `/api/chat/conversations?userId=${encodeURIComponent(user.uid)}`
    : null;
  const {
    data: conversationData,
    isLoading: loading,
    mutate: mutateConversations,
  } = useSWR<Conversation[]>(conversationUrl, conversationsFetcher, {
    fallbackData: cachedConversations,
    dedupingInterval: 30_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    shouldRetryOnError: true,
    errorRetryInterval: 10_000,
    refreshInterval: 5_000,
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
      ? `/api/chat/messages?conversationId=${encodeURIComponent(active._id)}&userId=${encodeURIComponent(user.uid)}`
      : null;
  const { data: messageData, mutate: mutateMessages } = useSWR<ChatMessage[]>(
    messagesUrl,
    messagesFetcher,
    {
      fallbackData: cachedMessages,
      dedupingInterval: 15_000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      shouldRetryOnError: true,
      errorRetryInterval: 10_000,
      refreshInterval: 3_500,
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
      fetch("/api/chat/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, conversationId, isTyping }),
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
    fetch("/api/chat/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.uid, conversationId: active._id }),
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
        const createResponse = await fetch("/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.uid, recipientId }),
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
        fetch("/api/chat/messages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.uid, conversationId }),
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
    socket.on("typing:update", onTyping);
    socket.on("messages:read", onRead);
    const loadTypingState = async () => {
      try {
        const response = await fetch(
          `/api/chat/typing?conversationId=${encodeURIComponent(active._id)}&userId=${encodeURIComponent(user.uid)}`,
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
    const typingPoll = window.setInterval(loadTypingState, 1500);
    void loadTypingState();
    fetch("/api/chat/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.uid, conversationId: active._id }),
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
      socket.emit("typing:stop", {
        conversationId: active._id,
        name: profile?.name || user.displayName || "Someone",
      });
      void updateTypingState(active._id, false, true);
      socket.emit("conversation:leave", active._id);
      socket.off("typing:update", onTyping);
      socket.off("messages:read", onRead);
    };
  }, [active, user, profile?.name, setConversations, setMessages, updateTypingState]);

  useEffect(
    () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
    [messages, typingName],
  );

  useEffect(() => {
    if (!user || !active) return;
    const key = `${REPLY_TIP_PREFIX}${user.uid}`;
    if (window.localStorage.getItem(key)) return;
    setShowReplyTip(true);
  }, [active, user]);

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
    setReplyingTo(null);
  }, [active?._id]);

  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
    textarea.style.overflowY = textarea.scrollHeight > 128 ? "auto" : "hidden";
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
      const response = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
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
    socket.emit("typing:stop", {
      conversationId,
      name: profile?.name || user.displayName || "Someone",
    });
    updateTypingState(conversationId, false, true);
    setDraft("");
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
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid, conversationId, text, replyTo: replyToId }),
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

  const changeDraft = (value: string) => {
    setDraft(value);
    if (!user || !active) return;
    const socket = getSocket(user.uid);
    if (!value.trim()) {
      socket.emit("typing:stop", {
        conversationId: active._id,
        name: profile?.name || user.displayName || "Someone",
      });
      updateTypingState(active._id, false, true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      return;
    }
    socket.emit("typing:start", {
      conversationId: active._id,
      name: profile?.name || user.displayName || "Someone",
    });
    updateTypingState(active._id, true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(
      () => {
        socket.emit("typing:stop", {
          conversationId: active._id,
          name: profile?.name || user.displayName || "Someone",
        });
        updateTypingState(active._id, false, true);
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

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const person = active ? otherPerson(active) : null;
  return (
    <div className="flex h-full max-h-[100dvh] min-h-0 overflow-hidden bg-[#010302]">
      {showNewMessage && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowNewMessage(false)}
        >
          <div
            className="modal-solid flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/[0.12] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.09] px-5 py-4">
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
              <label className="flex items-center gap-2 rounded-full bg-[#151a18] px-4 ring-1 ring-white/[0.06] focus-within:ring-brand-green/60">
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
            <div className="thin-scrollbar min-h-48 overflow-y-auto border-t border-white/[0.06]">
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
                    className="flex w-full items-center gap-3 border-b border-white/[0.06] px-5 py-3.5 text-left transition-colors hover:bg-white/[0.05] disabled:opacity-60"
                  >
                    <Avatar person={recipient} size={44} />
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
            className="modal-solid w-full max-w-sm rounded-3xl border border-white/[0.12] p-5 shadow-2xl"
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
            <h2 className="text-lg font-bold">Replying is easier now</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Tap or click any message to reply to it. When a message includes a quoted reply, tap the quote to jump back to the original message.
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
      <section
        className={`${active ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-r border-white/[0.09] md:w-[390px] lg:w-[410px]`}
      >
        <header className="border-b border-white/[0.09] px-4 pb-3 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold tracking-tight">Messages</h1>
            <button
              type="button"
              onClick={() => setShowNewMessage(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/[0.08]"
              aria-label="New message"
            >
              <PenSquare className="h-5 w-5" />
            </button>
          </div>
          <label className="mt-4 flex items-center gap-2 rounded-full bg-[#151a18] px-4 focus-within:ring-1 focus-within:ring-brand-green/60">
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
                  className={`flex w-full items-center gap-3 border-b border-white/[0.055] px-4 py-3 text-left transition-colors ${selected ? "bg-white/[0.08]" : "hover:bg-white/[0.045]"}`}
                >
                  <Avatar person={other} size={48} />
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
                          lastMessageWasRead ? (
                            <span title="Seen" className="shrink-0">
                              <CheckCheck
                                className="h-3.5 w-3.5 text-[#35d07f]"
                                aria-label="Seen"
                              />
                            </span>
                          ) : (
                            <span title="Delivered" className="shrink-0">
                              <Check
                                className="h-3.5 w-3.5 text-muted-foreground"
                                aria-label="Delivered"
                              />
                            </span>
                          )
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
            <header className="sticky top-0 z-20 flex h-[68px] shrink-0 items-center gap-3 border-b border-white/[0.09] bg-[#010302]/95 px-4 backdrop-blur-xl">
              <button
                onClick={() => setActive(null)}
                className="rounded-full p-2 hover:bg-white/[0.07] md:hidden"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Avatar person={person} size={40} />
              <span className="min-w-0 flex flex-col items-start text-left">
                <strong className="block truncate text-[15px] ">
                  {person.name}
                </strong>
                <small className="text-xs text-muted-foreground">
                  @{getUserHandle(person)}
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
                      <div className="popover-solid absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-2xl border border-white/[0.12] py-1 shadow-2xl">
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
            {showConversationInfo && (
              <div
                className="absolute inset-0 z-30 flex justify-end bg-black/65 backdrop-blur-sm"
                onClick={() => setShowConversationInfo(false)}
              >
                <aside
                  className="flex h-full w-full max-w-sm flex-col border-l border-white/[0.1] bg-[#080b09] shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                  aria-label="Conversation information"
                >
                  <div className="flex h-[68px] items-center justify-between border-b border-white/[0.09] px-5">
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
                    <Avatar person={person} size={80} />
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
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-white/[0.12] px-4 py-3 text-sm font-bold hover:bg-white/[0.06]"
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
              className="thin-scrollbar relative flex-1 overflow-y-auto px-4 py-6"
            >
              <div className="mx-auto flex max-w-2xl flex-col gap-1.5">
                {messages.map((message, index) => {
                  const own = message.sender.firebaseId === user.uid;
                  const hasBeenRead = own && (message.readBy?.length || 0) > 1;
                  const showDate =
                    index === 0 ||
                    messageDayKey(messages[index - 1].createdAt) !== messageDayKey(message.createdAt);
                  return (
                    <React.Fragment key={message._id}>
                      {showDate && (
                        <div className="sticky top-2 z-10 my-3 flex justify-center">
                          <time
                            dateTime={message.createdAt}
                            className="rounded-full border border-white/[0.07] bg-[#17231e]/95 px-3 py-1 text-[11px] font-bold text-white/80 backdrop-blur-md"
                          >
                            {messageDateLabel(message.createdAt)}
                          </time>
                        </div>
                      )}
                      <div
                        ref={registerMessageRef(message._id)}
                        className={`group flex scroll-mt-24 items-center gap-2 transition-all duration-300 ${own ? "justify-end" : "justify-start"} ${highlightedMessageId === message._id ? "scale-[1.015]" : ""}`}
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
                          className={`min-w-0 max-w-[78%] cursor-pointer rounded-[20px] border px-3.5 py-2 text-left text-[14px] leading-relaxed shadow-sm transition ${own ? "rounded-br-[5px] border-[#087766] bg-[#075e54] text-white" : "rounded-bl-[5px] border-white/[0.06] bg-[#202522] text-white"} ${message.deliveryState === "failed" ? "border-red-500/60" : ""} ${highlightedMessageId === message._id ? "ring-2 ring-brand-green/70" : "hover:ring-1 hover:ring-white/15 focus:outline-none focus:ring-2 focus:ring-brand-green/70"}`}
                          aria-label="Reply to message"
                        >
                          {message.replyTo && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                scrollToMessage(message.replyTo?._id || "");
                              }}
                              className="mb-2 block w-full rounded-xl border-l-2 border-brand-green bg-black/20 px-3 py-2 text-left transition hover:bg-black/30 focus:outline-none focus:ring-2 focus:ring-brand-green/60"
                              aria-label="Jump to replied message"
                            >
                              <strong className="block text-[11px] text-brand-green">
                                {message.replyTo.sender.firebaseId === user.uid ? "You" : message.replyTo.sender.name}
                              </strong>
                              <span className="block max-w-sm truncate text-[12px] text-white/60">
                                {message.replyTo.text}
                              </span>
                            </button>
                          )}
                          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                            {message.text}
                          </p>
                          <span className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${own ? "text-white/65" : "text-white/45"}`}>
                            <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                            {own && message.deliveryState === "sending" && <Check className="h-3.5 w-3.5" aria-label="Sending" />}
                            {own && message.deliveryState === "failed" && <CircleAlert className="h-3.5 w-3.5 text-red-300" aria-label="Not sent" />}
                            {own && !message.deliveryState && <CheckCheck className={`h-3.5 w-3.5 ${hasBeenRead ? "text-[#35d07f]" : "text-white/60"}`} aria-label={hasBeenRead ? "Read" : "Delivered"} />}
                          </span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                {typingName && (
                  <div className="flex items-end gap-2 px-1 py-2" aria-live="polite">
                    {person && <Avatar person={person} size={28} />}
                    <div className="relative max-w-[78%] rounded-[20px] rounded-bl-[6px] border border-white/[0.07] bg-[#202522] px-3.5 py-2.5 shadow-sm">
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
                  className="sticky bottom-3 z-20 ml-auto mr-1 mt-3 flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.1] bg-[#111713]/95 text-white shadow-xl backdrop-blur transition hover:border-brand-green/50 hover:text-brand-green"
                  aria-label="Jump to latest messages"
                >
                  <ChevronsDown className="h-5 w-5" />
                </button>
              )}
            </div>
            <form
              onSubmit={send}
              className="sticky bottom-0 z-20 shrink-0 border-t border-white/[0.09] bg-[#010302]/95 p-3 pb-safe backdrop-blur-xl"
            >
              {replyingTo && (
                <div className="mx-auto mb-2 flex max-w-2xl items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#101713] px-3 py-2">
                  <Reply className="h-4 w-4 shrink-0 text-brand-green" />
                  <div className="min-w-0 flex-1">
                    <strong className="block text-[11px] text-brand-green">
                      Replying to {replyingTo.sender.firebaseId === user.uid ? "yourself" : replyingTo.sender.name}
                    </strong>
                    <p className="truncate text-xs text-white/50">{replyingTo.text}</p>
                  </div>
                  <button type="button" onClick={() => setReplyingTo(null)} className="rounded-full p-1.5 text-white/45 hover:bg-white/[0.07] hover:text-white" aria-label="Cancel reply">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="relative mx-auto flex max-w-2xl items-end gap-1 rounded-[24px] bg-[#151a18] p-1.5 pl-2 ring-1 ring-white/[0.06] focus-within:ring-brand-green/50">
                <div ref={emojiPickerRef} className="relative shrink-0 self-end">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((open) => !open)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${showEmojiPicker ? "bg-brand-green/15 text-brand-green" : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"}`}
                    aria-label="Add emoji"
                    aria-expanded={showEmojiPicker}
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-[calc(100%+10px)] left-0 z-40 overflow-hidden rounded-2xl border border-white/[0.1] shadow-2xl">
                      <EmojiPicker
                        onEmojiClick={addEmoji}
                        theme={Theme.DARK}
                        width={Math.min(320, typeof window === "undefined" ? 320 : window.innerWidth - 32)}
                        height={360}
                      />
                    </div>
                  )}
                </div>
                <textarea
                  ref={composerRef}
                  value={draft}
                  onChange={(e) => changeDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="Start a new message"
                  rows={1}
                  maxLength={2000}
                  className="thin-scrollbar min-h-10 min-w-0 flex-1 resize-none overflow-x-hidden bg-transparent py-2 text-sm [overflow-wrap:anywhere] outline-none"
                />
                <button
                  disabled={!draft.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green text-white transition-opacity disabled:opacity-35"
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

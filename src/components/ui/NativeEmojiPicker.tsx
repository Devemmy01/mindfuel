"use client";

import { useState } from "react";

const CATEGORIES = [
  { label: "Smileys", icon: "😊", emojis: "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫣 🤭 🫢 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕" },
  { label: "Gestures", icon: "👍", emojis: "👍 👎 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 🤝 👏 🙌 🫶 👐 🤲 🙏 ✍️ 💪 🦾 🖕 🫵 👀 👁️ 👄 🫦 💋 🧠 🫂" },
  { label: "Hearts", icon: "❤️", emojis: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❤️‍🔥 ❤️‍🩹 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 💌 💋 🌹 🥀 🌷 🌸 💐 ✨ ⭐ 🌟 💫 🔥 💯" },
  { label: "People", icon: "🙋", emojis: "👶 🧒 👦 👧 🧑 👱 👨 🧔 👩 🧓 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷 👮 👷 💂 🕵️ 👩‍⚕️ 👩‍🌾 👩‍🍳 👩‍🎓 👩‍🎤 👩‍🏫 👩‍💻 👩‍💼 👩‍🔧 👩‍🔬 👩‍🎨 👩‍🚒 👩‍✈️ 👩‍🚀 👩‍⚖️ 👰 🤵 👸 🤴 🦸 🦹 🧙 🧚 🧛 🧜 🧝" },
  { label: "Nature", icon: "🐶", emojis: "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪱 🐛 🦋 🐌 🐞 🐜 🪰 🪲 🪳 🕷️ 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦀 🐠 🐟 🐡 🐬 🐳 🦈 🐊 🐅 🐆 🦓 🦍 🦧 🐘 🦛 🦏 🐪 🦒 🦘 🦬 🐃 🐄 🐎 🐖 🐏 🦙 🐐 🦌 🐕 🐈 🪶 🌿 ☘️ 🍀 🎍 🪴 🌵 🌴 🌳 🌲 🍁 🍂 🍃" },
  { label: "Food", icon: "🍕", emojis: "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🫓 🥪 🌮 🌯 🫔 🥙 🧆 🍜 🍝 🍣 🍤 🍚 🍛 🍲 🥗 🍿 🧂 🍩 🍪 🎂 🍰 🧁 🍫 🍬 🍭 🍮 🍯 🍼 ☕ 🍵 🧃 🥤 🧋 🍺 🍻 🥂 🍷 🍸 🍹" },
  { label: "Activities", icon: "⚽", emojis: "⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🪂 🏋️ 🤼 🤸 ⛹️ 🤺 🤾 🏌️ 🏇 🧘 🏄 🏊 🤽 🚣 🧗 🚵 🚴 🏆 🥇 🥈 🥉 🏅 🎖️ 🎪 🎭 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🎻 🎲 ♟️ 🎯 🎳 🎮 🧩" },
  { label: "Travel", icon: "🚗", emojis: "🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🏍️ 🛵 🚲 🛴 🚨 🚔 🚍 🚘 🚖 ✈️ 🛫 🛬 🛩️ 💺 🚁 🚀 🛸 🚉 🚞 🚆 🚄 🚅 🚈 🚂 🚊 🚝 🚟 🚠 🚡 🛰️ ⛵ 🛶 🚤 🛥️ 🛳️ ⛴️ 🚢 ⚓ ⛽ 🚧 🚦 🚥 🗺️ 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛲ ⛱️ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏕️ ⛺ 🛖 🏠 🏡 🏢 🏥 🏦 🏨 🏪 🏫 ⛪ 🕌 🛕 🕍" },
].map((category) => ({ ...category, emojis: category.emojis.split(" ") }));

export default function NativeEmojiPicker({
  onSelect,
  title = "Choose an emoji",
  className = "",
}: {
  onSelect: (emoji: string) => void;
  title?: string;
  className?: string;
}) {
  const [activeCategory, setActiveCategory] = useState(0);
  const category = CATEGORIES[activeCategory];

  return (
    <div className={`flex h-[310px] w-[min(332px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl bg-[#101512] text-white shadow-2xl ${className}`}>
      <div className="flex h-11 shrink-0 items-center px-3 text-[13px] font-semibold text-white/85">{title}</div>
      <div className="no-scrollbar flex shrink-0 items-center gap-0.5 overflow-x-auto border-y border-line-subtle px-1.5 py-1">
        {CATEGORIES.map((item, index) => (
          <button key={item.label} type="button" onClick={() => setActiveCategory(index)} className={`relative flex h-9 min-w-9 items-center justify-center rounded-lg text-lg transition ${activeCategory === index ? "bg-brand-green/15" : "opacity-60 hover:bg-white/[0.06] hover:opacity-100"}`} aria-label={item.label} aria-pressed={activeCategory === index}>
            {item.icon}
            {activeCategory === index && <span className="absolute inset-x-2 -bottom-1 h-0.5 rounded-full bg-brand-green" />}
          </button>
        ))}
      </div>
      <div className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-white/40">{category.label}</div>
      <div className="thin-scrollbar grid flex-1 grid-cols-8 content-start gap-0.5 overflow-y-auto px-2 pb-2">
        {category.emojis.map((emoji, index) => (
          <button key={`${emoji}-${index}`} type="button" onClick={() => onSelect(emoji)} className="flex h-9 w-9 items-center justify-center rounded-lg text-[22px] leading-none transition hover:bg-white/[0.09] active:scale-90" aria-label={`Choose ${emoji}`}>
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

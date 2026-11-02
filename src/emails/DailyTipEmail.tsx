import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface DailyTipEmailProps {
  name: string;
  /** Day theme, e.g. "Try-This Tuesday", and its one-line kicker. */
  themeLabel: string;
  kicker: string;
  title: string;
  body: string;
  /** Word for Wednesday: where the word comes from, and a question about it. */
  extra?: string;
  /** Show the title large, as a word (Word for Wednesday). */
  wordStyle?: boolean;
  promptQuestion: string;
  ctaLabel: string;
  /** Composer link with today's prompt (see src/lib/links.ts). */
  writeUrl: string;
  streakLine?: string | null;
  communityLine?: string | null;
  downloadUrl?: string;
  unsubscribeUrl?: string;
  baseUrl?: string;
}

export const DailyTipEmail: React.FC<Readonly<DailyTipEmailProps>> = ({
  name,
  themeLabel,
  kicker,
  title,
  body,
  extra,
  wordStyle,
  promptQuestion,
  ctaLabel,
  writeUrl,
  streakLine,
  communityLine,
  downloadUrl,
  unsubscribeUrl,
  baseUrl,
}) => {
  const site = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || "https://mind-fuel.app";
  return (
    <Html>
      <Head>
        <style>{`
          @media (prefers-color-scheme: dark) {
            .main, .main > table > tbody > tr > td { background-color: #000000 !important; }
            .card { background-color: #0a0a0a !important; border-color: #27272a !important; }
            .title, .greeting, .prompt { color: #fafafa !important; }
            .body, .kicker, .meta, .footer { color: #a1a1aa !important; }
            .promptCard { background-color: #052e1c !important; border-color: #065f46 !important; }
          }
        `}</style>
      </Head>
      <Preview>{`${themeLabel}: ${title}. ${body}`.slice(0, 140)}</Preview>
      <Body style={main} className="main">
        <Container style={container}>
          <Img src={`${site}/maskable-icon.png`} width="40" height="40" alt="MindFuel" style={logo} />
          <Text style={badge}>{themeLabel.toUpperCase()}</Text>
          <Text style={greeting} className="greeting">Good morning, {name}</Text>
          <Text style={kickerStyle} className="kicker">{kicker}</Text>

          <Section style={card} className="card">
            <Text style={wordStyle ? wordTitle : titleStyle} className="title">{title}</Text>
            <Text style={bodyStyle} className="body">{body}</Text>
            {extra ? <Text style={extraStyle} className="meta">{extra}</Text> : null}
            {downloadUrl ? (
              <Link href={downloadUrl} style={smallLink}>Save as an image</Link>
            ) : null}
          </Section>

          <Section style={promptCard} className="promptCard">
            <Text style={promptLabel}>TODAY&apos;S QUESTION</Text>
            <Text style={promptText} className="prompt">{promptQuestion}</Text>
            <Link href={writeUrl} style={button}>{ctaLabel}</Link>
          </Section>

          {streakLine ? <Text style={meta} className="meta">🔥 {streakLine}</Text> : null}
          {communityLine ? <Text style={meta} className="meta">💚 {communityLine}</Text> : null}

          <Text style={footer} className="footer">
            Daily Fuel from MindFuel, a new format every day of the week.
            <br />
            <Link href={unsubscribeUrl || `${site}/settings/notifications`} style={footerLink}>Turn off these emails</Link>
            {" · "}
            <Link href={`${site}/settings/notifications`} style={footerLink}>Manage notifications</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default DailyTipEmail;

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif';
const main = { backgroundColor: "#ffffff", fontFamily: font };
const container = { margin: "0 auto", padding: "28px 18px 40px", maxWidth: "560px" };
const logo = { borderRadius: "10px", margin: "0 0 18px" };
const badge = {
  display: "inline-block",
  backgroundColor: "#00bf63",
  color: "#03140b",
  fontSize: "11px",
  fontWeight: "800",
  letterSpacing: "0.12em",
  borderRadius: "999px",
  padding: "5px 12px",
  margin: "0 0 14px",
};
const greeting = { fontSize: "22px", fontWeight: "800", color: "#18181b", margin: "0 0 4px", lineHeight: "1.3" };
const kickerStyle = { fontSize: "15px", color: "#52525b", margin: "0 0 20px" };
const card = {
  border: "1px solid #e4e4e7",
  borderRadius: "20px",
  padding: "22px 22px 14px",
  margin: "0 0 16px",
  backgroundColor: "#ffffff",
};
const titleStyle = { fontSize: "20px", fontWeight: "800", lineHeight: "1.35", color: "#18181b", margin: "0 0 8px" };
const wordTitle = { fontSize: "34px", fontWeight: "900", letterSpacing: "-0.02em", color: "#18181b", margin: "0 0 6px" };
const bodyStyle = { fontSize: "16px", lineHeight: "1.6", color: "#3f3f46", margin: "0 0 10px" };
const extraStyle = { fontSize: "14px", lineHeight: "1.55", color: "#52525b", fontStyle: "italic" as const, margin: "0 0 10px" };
const smallLink = { fontSize: "13px", color: "#007a3d", fontWeight: "600", textDecoration: "none" };
const promptCard = {
  backgroundColor: "#ecfdf3",
  border: "1px solid #bbf7d0",
  borderRadius: "20px",
  padding: "20px 22px 22px",
  margin: "0 0 18px",
};
const promptLabel = { fontSize: "11px", fontWeight: "800", letterSpacing: "0.12em", color: "#007a3d", margin: "0 0 6px" };
const promptText = { fontSize: "18px", fontWeight: "700", lineHeight: "1.4", color: "#18181b", margin: "0 0 16px" };
const button = {
  backgroundColor: "#00bf63",
  color: "#03140b",
  padding: "12px 22px",
  borderRadius: "999px",
  fontSize: "15px",
  fontWeight: "800",
  textDecoration: "none",
  display: "inline-block",
};
const meta = { fontSize: "14px", color: "#3f3f46", margin: "0 0 8px" };
const footer = { fontSize: "12px", lineHeight: "1.6", color: "#71717a", margin: "24px 0 0" };
const footerLink = { color: "#71717a", textDecoration: "underline" };

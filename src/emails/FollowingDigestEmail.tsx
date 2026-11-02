import {
  Body,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import type { DigestPost } from "@/lib/following-digest";

interface FollowingDigestEmailProps {
  headline: string;
  posts: Array<DigestPost & { url: string; age: string }>;
  morePosts: number;
  feedUrl: string;
  settingsUrl: string;
  unsubscribeUrl: string;
}

const EXCERPT_LENGTH = 320;

function excerpt(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > EXCERPT_LENGTH ? `${clean.slice(0, EXCERPT_LENGTH).trimEnd()}…` : clean;
}

export const FollowingDigestEmail: React.FC<Readonly<FollowingDigestEmailProps>> = ({
  headline,
  posts,
  morePosts,
  feedUrl,
  settingsUrl,
  unsubscribeUrl,
}) => (
  <Html>
    <Head>
      <style>{`
        @media (prefers-color-scheme: dark) {
          .main, .main > table > tbody > tr > td { background-color: #000000 !important; }
          .heading, .name, .body { color: #f4f4f5 !important; }
          .card { background-color: #0a0a0a !important; border-color: #27272a !important; }
          .meta, .footer { color: #a1a1aa !important; }
          .hr { border-color: #27272a !important; }
        }
      `}</style>
    </Head>
    <Preview>{excerpt(posts[0]?.text || headline).slice(0, 110)}</Preview>
    <Body style={main} className="main">
      <Container style={container}>
        <Img src="https://mind-fuel.app/maskable-icon.png" width="36" height="36" alt="MindFuel" style={logo} />
        <Text style={heading} className="heading">{headline}</Text>

        {posts.map((post) => (
          <Section key={post.id} style={card} className="card">
            <Row>
              <Column style={{ width: "48px", verticalAlign: "top" }}>
                {post.author.image && !post.author.image.startsWith("data:") ? (
                  <Img src={post.author.image} width="40" height="40" alt="" style={avatar} />
                ) : (
                  <div style={avatarFallback}>{post.author.name.charAt(0).toUpperCase()}</div>
                )}
              </Column>
              <Column style={{ verticalAlign: "top" }}>
                <Text style={nameLine}>
                  <span style={name} className="name">{post.author.name}</span>
                  <span style={followPill}>You follow</span>
                  <span style={age} className="meta">{post.age}</span>
                </Text>
                <Link href={post.url} style={{ textDecoration: "none" }}>
                  <Text style={body} className="body">{excerpt(post.text)}</Text>
                </Link>
                <Text style={counts} className="meta">
                  ♡ {post.likes}&nbsp;&nbsp;&nbsp;💬 {post.comments}&nbsp;&nbsp;&nbsp;↻ {post.reposts}
                  &nbsp;&nbsp;&nbsp;<Link href={post.url} style={readLink}>Read</Link>
                </Text>
              </Column>
            </Row>
          </Section>
        ))}

        {morePosts > 0 ? (
          <Text style={more} className="meta">
            And {morePosts} more {morePosts === 1 ? "reflection" : "reflections"} from people you follow.
          </Text>
        ) : null}

        <Section style={{ textAlign: "center", margin: "8px 0 32px" }}>
          <Link href={feedUrl} style={button}>Open MindFuel</Link>
        </Section>

        <Hr style={hr} className="hr" />
        <Text style={footer} className="footer">
          You&apos;re getting this because you follow these people on MindFuel. We send it at most once a day,
          only when there&apos;s something new.{" "}
          <Link href={unsubscribeUrl} style={footerLink}>Turn off these emails</Link>
          {" · "}
          <Link href={settingsUrl} style={footerLink}>Manage notifications</Link>
        </Text>
      </Container>
    </Body>
  </Html>
);

export default FollowingDigestEmail;

const font = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif';

const main = { backgroundColor: "#ffffff", fontFamily: font };
const container = { margin: "0 auto", padding: "24px 16px 40px", maxWidth: "560px" };
const logo = { borderRadius: "8px", margin: "0 0 16px" };
const heading = { fontSize: "24px", lineHeight: "1.3", fontWeight: "700", color: "#18181b", margin: "0 0 24px" };
const card = {
  border: "1px solid #e4e4e7",
  borderRadius: "16px",
  padding: "16px 16px 4px",
  marginBottom: "12px",
  backgroundColor: "#ffffff",
};
const avatar = { borderRadius: "999px", objectFit: "cover" as const };
const avatarFallback = {
  width: "40px",
  height: "40px",
  borderRadius: "999px",
  backgroundColor: "#00bf63",
  color: "#ffffff",
  fontWeight: "700",
  fontSize: "16px",
  lineHeight: "40px",
  textAlign: "center" as const,
};
const nameLine = { margin: "0 0 4px", fontSize: "14px", lineHeight: "20px" };
const name = { fontWeight: "700", color: "#18181b", marginRight: "8px" };
const followPill = {
  fontSize: "11px",
  color: "#52525b",
  backgroundColor: "#f4f4f5",
  border: "1px solid #e4e4e7",
  borderRadius: "4px",
  padding: "1px 6px",
  marginRight: "8px",
};
const age = { color: "#71717a", fontSize: "13px" };
const body = { fontSize: "15px", lineHeight: "1.55", color: "#27272a", margin: "0 0 12px", whiteSpace: "pre-line" as const };
const counts = { fontSize: "13px", color: "#71717a", margin: "0 0 12px" };
const readLink = { color: "#00a656", fontWeight: "600", textDecoration: "none" };
const more = { fontSize: "14px", color: "#52525b", margin: "4px 0 16px", textAlign: "center" as const };
const button = {
  backgroundColor: "#00bf63",
  color: "#ffffff",
  padding: "12px 28px",
  borderRadius: "100px",
  fontSize: "15px",
  fontWeight: "bold",
  textDecoration: "none",
  display: "inline-block",
};
const hr = { borderTop: "1px solid #f1f5f9", margin: "0 0 16px" };
const footer = { fontSize: "12px", lineHeight: "1.6", color: "#71717a", margin: 0 };
const footerLink = { color: "#71717a", textDecoration: "underline" };

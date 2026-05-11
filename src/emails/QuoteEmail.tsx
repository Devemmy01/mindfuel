import {
  Container,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
  Body,
} from "@react-email/components";
import * as React from "react";

interface QuoteEmailProps {
  authorName: string;
  quoterName: string;
  quoteText: string;
  originalPostText: string;
  postLink: string;
}

export const QuoteEmail: React.FC<Readonly<QuoteEmailProps>> = ({
  authorName,
  quoterName,
  quoteText,
  originalPostText,
  postLink,
}) => (
  <Html>
    <Head>
      <style>{`
        @media (prefers-color-scheme: dark) {
          .main { background-color: #000000 !important; }
          .text { color: #a1a1aa !important; }
          .quoteBox { background-color: #0a0a0a !important; border-color: #1a1a1a !important; }
          .quoteContent { color: #ffffff !important; }
        }
      `}</style>
    </Head>
    <Preview>{quoterName} quoted your thought</Preview>
    <Body style={main} className="main">
      <Container style={container}>
        <Section style={logoContainer}>
          <Img
            src="https://mind-fuel.app/logoDarkbg.png"
            width="140"
            height="auto"
            alt="MindFuel"
            style={logo}
          />
        </Section>

        <Text style={text} className="text">
          Hi {authorName}, <strong>{quoterName}</strong> just quoted your thought!
        </Text>

        <Section style={quoteBox} className="quoteBox">
          <Text style={quoteLabel}>{quoterName}&apos;s Commentary</Text>
          <Text style={quoteContent} className="quoteContent">{quoteText}</Text>
        </Section>

        <Section style={postPreview}>
          <Text style={postPreviewLabel}>Your Original Post</Text>
          <Text style={postPreviewText}>
            {originalPostText.length > 100
              ? originalPostText.substring(0, 100) + "..."
              : originalPostText}
          </Text>
        </Section>

        <Link href={postLink} style={button}>
          View Interaction
        </Link>

        <Hr style={hr} />
      </Container>
    </Body>
  </Html>
);

export default QuoteEmail;

const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "580px",
};

const logoContainer = {
  backgroundColor: "#171717",
  padding: "10px 6px",
  borderRadius: "12px",
  width: "152px",
  margin: "0 auto 32px",
  textAlign: "center" as const,
};

const logo = {
  borderRadius: "6px",
};

const text = {
  fontSize: "18px",
  lineHeight: "1.6",
  marginBottom: "24px",
};

const quoteBox = {
  padding: "20px",
  borderRadius: "20px",
  backgroundColor: "#f1f5f9",
  color: "#171717",
  marginBottom: "16px",
  border: "1px solid #e2e8f0",
};

const quoteLabel = {
  fontSize: "12px",
  fontWeight: "700",
  opacity: "0.6",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  marginBottom: "8px",
  marginTop: "0",
};

const quoteContent = {
  fontSize: "16px",
  fontWeight: "500",
  margin: "0",
  lineHeight: "1.5",
};

const postPreview = {
  padding: "20px",
  borderRadius: "20px",
  backgroundColor: "#171717",
  color: "#ffffff",
  marginBottom: "32px",
};

const postPreviewLabel = {
  fontSize: "12px",
  fontWeight: "700",
  opacity: "0.6",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  marginBottom: "8px",
  marginTop: "0",
};

const postPreviewText = {
  fontSize: "14px",
  fontWeight: "400",
  margin: "0",
  lineHeight: "1.5",
  opacity: "0.9",
};

const button = {
  backgroundColor: "#00bf63",
  color: "#ffffff",
  padding: "14px 28px",
  borderRadius: "100px",
  fontSize: "15px",
  fontWeight: "bold",
  textDecoration: "none",
  display: "inline-block",
  textAlign: "center" as const,
  marginBottom: "40px",
};

const hr = {
  borderTop: "1px solid #f1f5f9",
  marginBottom: "24px",
};

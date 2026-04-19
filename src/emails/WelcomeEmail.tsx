import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface WelcomeEmailProps {
  name: string;
}

export const WelcomeEmail: React.FC<Readonly<WelcomeEmailProps>> = ({
  name,
}) => {
  return (
    <Html>
      <Head />
      <Preview>Welcome to MindFuel, {name}!</Preview>
      <Body style={main}>
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

          <Heading style={h1}>
            Welcome to your{" "}
            <span style={{ color: "#00bf63" }}>intentional</span> space.
          </Heading>

          <Text style={text}>
            Hi {name}, we&apos;re thrilled to have you here. MindFuel was built
            for thinkers like you—a place to share reflections, curations, and
            ideas without the noise.
          </Text>

          <Section style={boxCard}>
            <Text style={boxTitle}>Getting Started</Text>
            <Text style={listItem}>
              ✨ <strong>Share your first thought:</strong> Use the card creator
              to design a beautiful reflection.
            </Text>
            <Text style={listItem}>
              🔖 <strong>Save for later:</strong> Bookmark thoughts that
              resonate with you.
            </Text>
            <Text style={listItem}>
              🌿 <strong>Stay mindful:</strong> Look out for our fresh daily
              tips every morning.
            </Text>
          </Section>

          <Link href="https://mind-fuel.app" style={button}>
            Open MindFuel
          </Link>

          <Hr style={hr} />

          <Text style={footer}>
            MindFuel &bull; a Lumyn product
            <br />
            <Link href="https://mind-fuel.app/privacy" style={footerLink}>
              Privacy Policy
            </Link>{" "}
            &bull;{" "}
            <Link href="https://mind-fuel.app/terms" style={footerLink}>
              Terms of Service
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmail;

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
  borderRadius: "8px",
};

const h1 = {
  fontSize: "32px",
  fontWeight: "800",
  marginBottom: "24px",
  letterSpacing: "-0.03em",
  lineHeight: "1.2",
};

const text = {
  fontSize: "18px",
  lineHeight: "1.6",
  marginBottom: "24px",
};

const boxCard = {
  backgroundColor: "#f9fafb",
  borderRadius: "16px",
  padding: "24px",
  marginBottom: "32px",
  border: "1px solid #f1f5f9",
};

const boxTitle = {
  fontSize: "16px",
  fontWeight: "bold",
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
  color: "#64748b",
  marginBottom: "16px",
  marginTop: "0",
};

const listItem = {
  fontSize: "16px",
  marginBottom: "12px",
  marginTop: "0",
};

const button = {
  backgroundColor: "#00bf63",
  color: "#ffffff",
  padding: "16px 32px",
  borderRadius: "100px",
  fontSize: "16px",
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

const footer = {
  fontSize: "14px",
  color: "#64748b",
  textAlign: "center" as const,
};

const footerLink = {
  color: "#00bf63",
  textDecoration: "none",
};

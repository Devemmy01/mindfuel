import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Button,
  Link,
  Hr,
  Img,
} from "@react-email/components";
import * as React from "react";

interface UpdateEmailProps {
  userName: string;
  updateTitle: string;
  updateDetails: string;
}

export const UpdateEmail = ({
  userName,
  updateTitle,
  updateDetails,
}: UpdateEmailProps) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://mind-fuel.app";
  const detailParagraphs = updateDetails
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <Html>
      <Head>
        <style>{`
          @media (prefers-color-scheme: dark) {
            .main { background-color: #000000 !important; }
            .container { background-color: #0a0a0a !important; border-color: #1a1a1a !important; }
            .h1 { color: #ffffff !important; }
            .text { color: #a1a1aa !important; }
            .updateCard { background-color: #111111 !important; border-color: #222222 !important; }
            .updateTitle { color: #00bf63 !important; }
            .updateBody { color: #d1d1d6 !important; }
            .footerText { color: #52525b !important; }
          }
        `}</style>
      </Head>
      <Preview>New on MindFuel: {updateTitle}</Preview>
      <Body style={main} className="main">
        <Container style={container} className="container">
          <Section style={header}>
            <Img
              src={`${baseUrl}/logoDarkbg.png`}
              width="130"
              height="38"
              alt="MindFuel"
              style={logo}
            />
          </Section>
          
          <Section style={content}>
            <Heading style={h1} className="h1">Something New is Here 🚀</Heading>
            <Text style={text} className="text">Hi {userName},</Text>
            <Text style={text} className="text">
              The team has been busy building new ways for you to reflect and grow. Here&apos;s the latest update to your MindFuel experience:
            </Text>
            
            <Section style={updateCard} className="updateCard">
              <Text style={updateTitleStyle} className="updateTitle">{updateTitle}</Text>
              {detailParagraphs.map((paragraph, index) => (
                <Text
                  key={`${index}-${paragraph.slice(0, 24)}`}
                  style={{
                    ...updateBodyStyle,
                    margin: index === detailParagraphs.length - 1 ? "0" : "0 0 14px 0",
                  }}
                  className="updateBody"
                >
                  {paragraph}
                </Text>
              ))}
            </Section>

            <Section style={buttonContainer}>
              <Button style={button} href={baseUrl}>
                Open MindFuel
              </Button>
            </Section>
            
            <Text style={footerText} className="footerText">
              Stay mindful,<br />
              The MindFuel Team
            </Text>
          </Section>
          
          <Hr style={hr} />
          
          <Section style={footer}>
            <Text style={footerSubtext}>
              MindFuel by Lumyn. High-performance reflection for high-performance humans.
              <br />
              <Link href={`${baseUrl}/settings`} style={link}>Update Email Preferences</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: "#f4f4f5",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  padding: "20px 0",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  borderRadius: "24px",
  border: "1px solid #e4e4e7",
  overflow: "hidden",
  maxWidth: "600px",
};

const header = {
  padding: "32px 24px",
  backgroundColor: "#0a0a0a",
  textAlign: "center" as const,
  borderBottom: "1px solid #1a1a1a",
};

const logo = {
  margin: "0 auto",
};

const content = {
  padding: "40px 24px",
};

const h1 = {
  color: "#09090b",
  fontSize: "24px",
  fontWeight: "800",
  lineHeight: "1.2",
  letterSpacing: "-0.02em",
  margin: "0 0 20px 0",
};

const text = {
  color: "#3f3f46",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px 0",
};

const updateCard = {
  margin: "32px 0",
  padding: "24px",
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
};

const updateTitleStyle = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#00a855",
  margin: "0 0 8px 0",
};

const updateBodyStyle = {
  fontSize: "14px",
  color: "#475569",
  lineHeight: "22px",
  margin: "0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "40px 0",
};

const button = {
  backgroundColor: "#00a855",
  borderRadius: "16px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "18px 36px",
};

const footerText = {
  fontSize: "15px",
  fontWeight: "500",
  color: "#71717a",
  marginTop: "40px",
};

const hr = {
  borderColor: "#e4e4e7",
  margin: "0",
};

const footer = {
  padding: "32px 40px",
  backgroundColor: "#fafafa",
};

const footerSubtext = {
  fontSize: "12px",
  color: "#a1a1aa",
  textAlign: "center" as const,
  lineHeight: "18px",
  fontWeight: "500",
};

const link = {
  color: "#00a855",
  textDecoration: "none",
  fontWeight: "bold",
  marginLeft: "8px",
};

export default UpdateEmail;

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
} from '@react-email/components';
import * as React from 'react';

interface DailyTipEmailProps {
  name: string;
  tip: string;
  baseUrl?: string;
}

export const DailyTipEmail: React.FC<Readonly<DailyTipEmailProps>> = ({
  name,
  tip,
  baseUrl,
}) => {
  const currentBaseUrl =
    baseUrl || process.env.NEXT_PUBLIC_BASE_URL || "https://mind-fuel.app";

  return (
    <Html>
      <Head>
        <style>{`
          body, table, td, div, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
          table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          
          @media (prefers-color-scheme: dark) {
            .main { background-color: #000000 !important; }
            .tipCard { background-color: #0a0a0a !important; border-color: #1a1a1a !important; }
            .h1 { color: #ffffff !important; }
            .subtext { color: #a1a1aa !important; }
            .spacer { color: #52525b !important; }
            .footer { color: #52525b !important; }
          }

          @media only screen and (max-width: 600px) {
            .container { width: 100% !important; max-width: 100% !important; padding: 0 16px !important; }
            .tipCard { padding: 24px 16px !important; margin-bottom: 24px !important; border-radius: 24px !important; }
            .h1 { font-size: 18px !important; line-height: 1.4 !important; }
            .quoteMark { font-size: 32px !important; margin-bottom: 12px !important; }
            .quoteMarkRight { font-size: 32px !important; margin-top: 12px !important; }
            .subtext { font-size: 14px !important; margin-bottom: 24px !important; }
            .button, .secondaryButton { padding: 12px 24px !important; font-size: 13px !important; }
            .logoContainer { padding: 8px 4px !important; width: 140px !important; margin: 0 auto 24px !important; }
            .greeting { margin-bottom: 16px !important; }
          }
        `}</style>
      </Head>
      <Preview>Your Daily Mindful Tip, {name}</Preview>
      <Body style={main} className="main">
        <Container style={container} className="container">
          <Section style={logoContainer} className="logoContainer">
            <Img
              src={`${currentBaseUrl}/logoDarkbg.png`}
              width="160"
              height="auto"
              alt="MindFuel"
              style={logo}
            />
          </Section>
          
          <Text style={greeting} className="greeting">
            Good Morning, {name}
          </Text>

          <Section style={tipCard} className="tipCard">
            <Text style={quoteMark} className="quoteMark">&ldquo;</Text>
            <Heading style={h1} className="h1">
              {tip}
            </Heading>
            <Text style={quoteMarkRight} className="quoteMarkRight">&rdquo;</Text>
          </Section>
          
          <Text style={subtext} className="subtext">
            Stay intentional today. Take a breath, fuel your mind, and share what inspires you.
          </Text>

          <Section style={center}>
            <Link href={`${currentBaseUrl}`} style={button} className="button">
              Go to Feed
            </Link>
            <Text style={spacer} className="spacer">or</Text>
            <Link 
              href={`${currentBaseUrl}/tip/download?text=${encodeURIComponent(tip)}`} 
              style={secondaryButton}
              className="secondaryButton"
            >
              Download as Image
            </Link>
          </Section>
          
          <Text style={footer} className="footer">
            You received this daily mindful tip from MindFuel.<br />
            Don&apos;t want these? <Link href={`${currentBaseUrl}/settings`} style={footerLink}>Unsubscribe</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default DailyTipEmail;

const main = {
  backgroundColor: '#f9fafb',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  padding: '40px 0',
};

const container = {
  margin: '0 auto',
  maxWidth: '500px',
  padding: '0 16px',
  textAlign: 'center' as const,
};

const logoContainer = {
  backgroundColor: '#171717',
  padding: '10px 6px',
  borderRadius: '12px',
  width: '172px',
  margin: '0 auto 40px',
  textAlign: 'center' as const,
};

const logo = {
  margin: '0 auto',
  borderRadius: '12px',
};

const greeting = {
  fontSize: '14px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.2em',
  color: '#00bf63',
  marginBottom: '24px',
};

const tipCard = {
  backgroundColor: '#ffffff',
  borderRadius: '32px',
  padding: '48px 40px',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
  marginBottom: '40px',
  border: '1px solid #f1f5f9',
};

const quoteMark = {
  fontSize: '48px',
  color: '#00bf63',
  marginBottom: '16px',
  lineHeight: '1',
  textAlign: 'left' as const,
  margin: '0 0 8px 0',
};

const quoteMarkRight = {
  fontSize: '48px',
  color: '#00bf63',
  marginTop: '16px',
  lineHeight: '1',
  textAlign: 'right' as const,
  margin: '8px 0 0 0',
};

const h1 = {
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '1.4',
  margin: '0',
  color: '#171717',
  letterSpacing: '-0.02em',
};

const subtext = {
  fontSize: '16px',
  color: '#64748b',
  marginBottom: '32px',
  lineHeight: '1.6',
  margin: '0 0 32px 0',
};

const center = {
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#171717',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '100px',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  display: 'inline-block',
  marginBottom: '10px',
};

const secondaryButton = {
  backgroundColor: 'transparent',
  color: '#00bf63',
  padding: '12px 32px',
  borderRadius: '100px',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'underline',
  display: 'inline-block',
  marginBottom: '40px',
};

const spacer = {
  fontSize: '12px',
  color: '#94a3b8',
  margin: '8px 0',
};

const footer = {
  fontSize: '12px',
  color: '#94a3b8',
};

const footerLink = {
  color: '#00bf63',
  textDecoration: 'none',
};

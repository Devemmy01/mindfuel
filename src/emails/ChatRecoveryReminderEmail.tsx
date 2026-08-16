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

interface ChatRecoveryReminderEmailProps {
  name: string;
}

export const ChatRecoveryReminderEmail: React.FC<Readonly<ChatRecoveryReminderEmailProps>> = ({
  name,
}) => (
  <Html>
    <Head>
      <style>{`
        body, table, td, div, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }

        @media (prefers-color-scheme: dark) {
          .main { background-color: #000000 !important; }
          .reminderCard { background-color: #0a0a0a !important; border-color: #1a1a1a !important; }
          .h1 { color: #ffffff !important; }
          .subtext { color: #a1a1aa !important; }
          .accent { color: #00bf63 !important; }
          .footer { color: #52525b !important; }
        }

        @media only screen and (max-width: 600px) {
          .container { width: 100% !important; max-width: 100% !important; padding: 0 16px !important; }
          .reminderCard { padding: 24px 16px !important; margin-bottom: 24px !important; border-radius: 24px !important; }
          .h1 { font-size: 18px !important; line-height: 1.4 !important; }
          .button { padding: 12px 24px !important; font-size: 13px !important; }
          .logoContainer { padding: 8px 4px !important; width: 140px !important; margin: 0 auto 24px !important; }
        }
      `}</style>
    </Head>
    <Preview>Set a recovery PIN for your encrypted chats</Preview>
    <Body style={main} className="main">
      <Container style={container} className="container">
        <Section style={logoContainer} className="logoContainer">
          <Img
            src="https://mind-fuel.app/logoDarkbg.png"
            width="160"
            height="auto"
            alt="MindFuel"
            style={logo}
          />
        </Section>

        <Text style={greeting}>
          Hey {name},
        </Text>

        <Section style={reminderCard} className="reminderCard">
          <Heading style={h1} className="h1">
            Don&apos;t lose your <span style={accent} className="accent">encrypted chats</span>
          </Heading>
          <Text style={subtext} className="subtext">
            Your private messages on MindFuel are end-to-end encrypted &mdash; which means only your own
            devices can read them, not even us. That&apos;s great for privacy, but it also means if you ever
            lose access to every device you&apos;ve used MindFuel on, there&apos;s no way for anyone, including
            MindFuel, to get those conversations back.
          </Text>
        </Section>

        <Text style={subtext} className="subtext">
          A recovery PIN fixes that. It takes about 30 seconds to set up: open Messages, tap the key
          icon, and choose a PIN you&apos;ll remember. If you ever lose access to your devices,
          entering that PIN restores every encrypted conversation exactly as it was.
        </Text>

        <Section style={center}>
          <Link href="https://mind-fuel.app/messages" style={button} className="button">
            Set Up Recovery
          </Link>
        </Section>

        <Text style={footer} className="footer">
          You&apos;re receiving this once because you have encrypted conversations without a recovery
          PIN saved. We won&apos;t send this again.<br />
          Prefer not to get emails like this? <Link href="https://mind-fuel.app/settings" style={footerLink}>Adjust your preferences</Link>.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ChatRecoveryReminderEmail;

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

const reminderCard = {
  backgroundColor: '#ffffff',
  borderRadius: '32px',
  padding: '48px 40px',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
  marginBottom: '40px',
  border: '1px solid #f1f5f9',
};

const h1 = {
  fontSize: '28px',
  fontWeight: '700',
  lineHeight: '1.4',
  margin: '0',
  color: '#171717',
  letterSpacing: '-0.02em',
};

const accent = {
  color: '#00bf63',
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

const footer = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '1.8',
  marginTop: '40px',
};

const footerLink = {
  color: '#00bf63',
  textDecoration: 'underline',
};

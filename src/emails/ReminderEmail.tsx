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

interface ReminderEmailProps {
  name: string;
  daysSincePost?: number;
  hasNeverPosted?: boolean;
}

export const ReminderEmail: React.FC<Readonly<ReminderEmailProps>> = ({
  name,
  daysSincePost,
  hasNeverPosted = false,
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
    <Preview>We miss your thoughts, {name}</Preview>
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
            We miss your <span style={accent} className="accent">reflections</span>
          </Heading>
          <Text style={subtext} className="subtext">
            {hasNeverPosted
              ? "You&apos;ve been part of MindFuel for a bit now, but we haven&apos;t seen a post from you yet. Your unique perspective matters—share what&apos;s on your mind."
              : `It&apos;s been ${daysSincePost} days since your last post. Your unique perspective matters—share what&apos;s on your mind today.`}
          </Text>
        </Section>
        
        <Text style={subtext} className="subtext">
          Whether it&apos;s a thought, a discovery, or something that inspired you, MindFuel is the perfect place to share with others who appreciate intentional conversations.
        </Text>

        <Section style={center}>
          <Link href="https://mind-fuel.app/create" style={button} className="button">
            Share Your Thoughts
          </Link>
        </Section>

        <Text style={subtext} className="subtext">
          Not feeling inspired right now? Check out our community&apos;s recent posts or get a fresh daily tip.
        </Text>
        
        <Section style={center}>
          <Link href="https://mind-fuel.app" style={secondaryButton} className="secondaryButton">
            Browse Feed
          </Link>
        </Section>
        
        <Text style={footer} className="footer">
          You&apos;re receiving this because you&apos;re part of the MindFuel community.<br />
          Prefer not to get reminders? <Link href="https://mind-fuel.app/settings" style={footerLink}>Adjust your preferences</Link>.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ReminderEmail;

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

const secondaryButton = {
  backgroundColor: '#ffffff',
  color: '#171717',
  padding: '14px 32px',
  borderRadius: '100px',
  fontSize: '14px',
  fontWeight: 'bold',
  textDecoration: 'none',
  display: 'inline-block',
  marginBottom: '10px',
  border: '2px solid #171717',
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

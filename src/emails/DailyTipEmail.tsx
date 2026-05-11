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
}

export const DailyTipEmail: React.FC<Readonly<DailyTipEmailProps>> = ({
  name,
  tip,
}) => (
    <Html>
      <Head>
        <style>{`
          @media (prefers-color-scheme: dark) {
            .main { background-color: #000000 !important; }
            .tipCard { background-color: #0a0a0a !important; border-color: #1a1a1a !important; }
            .h1 { color: #ffffff !important; }
            .subtext { color: #a1a1aa !important; }
            .spacer { color: #52525b !important; }
            .footer { color: #52525b !important; }
          }
        `}</style>
      </Head>
      <Preview>Your Daily Mindful Tip, {name}</Preview>
      <Body style={main} className="main">
        <Container style={container}>
          <Section style={logoContainer}>
            <Img
              src="https://mind-fuel.app/logoDarkbg.png"
              width="160"
              height="auto"
              alt="MindFuel"
              style={logo}
            />
          </Section>
          
          <Text style={greeting}>
            Good Morning, {name}
          </Text>

          <Section style={tipCard} className="tipCard">
            <Text style={quoteMark}>&ldquo;</Text>
            <Heading style={h1} className="h1">
              {tip}
            </Heading>
            <Text style={quoteMarkRight}>&rdquo;</Text>
          </Section>
          
          <Text style={subtext} className="subtext">
            Stay intentional today. Take a breath, fuel your mind, and share what inspires you.
          </Text>

          <Section style={center}>
            <Link href="https://mind-fuel.app" style={button}>
              Go to Feed
            </Link>
            <Text style={spacer} className="spacer">or</Text>
            <Link 
              href={`https://mind-fuel.app/tip/download?text=${encodeURIComponent(tip)}`} 
              style={secondaryButton}
            >
              Download as Image
            </Link>
          </Section>
          
          <Text style={footer} className="footer">
            You received this daily mindful tip from MindFuel.<br />
            Don&apos;t want these? <Link href="https://mind-fuel.app/settings" style={footerLink}>Unsubscribe</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
);

export default DailyTipEmail;

const main = {
  backgroundColor: '#f9fafb',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  padding: '60px 0',
};

const container = {
  margin: '0 auto',
  maxWidth: '480px',
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
  padding: '48px 32px',
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
  margin: '0',
};

const quoteMarkRight = {
  fontSize: '48px',
  color: '#00bf63',
  marginTop: '16px',
  lineHeight: '1',
  textAlign: 'right' as const,
  margin: '0',
};

const h1 = {
  fontSize: '24px',
  fontWeight: '700',
  lineHeight: '1.5',
  margin: '0',
  color: '#171717',
  letterSpacing: '-0.02em',
};

const subtext = {
  fontSize: '16px',
  color: '#64748b',
  marginBottom: '32px',
  lineHeight: '1.6',
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

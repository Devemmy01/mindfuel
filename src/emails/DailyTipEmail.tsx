/* eslint-disable @next/next/no-img-element */
import * as React from 'react';


interface DailyTipEmailProps {
  name: string;
  tip: string;
}

export const DailyTipEmail: React.FC<Readonly<DailyTipEmailProps>> = ({
  name,
  tip,
}) => (
  <div style={{
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
    backgroundColor: '#f9fafb',
    color: '#171717',
    padding: '60px 20px',
  }}>
    <div style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ marginBottom: '40px' }}>
        <img src="https://mind-fuel.app/logo.png" alt="MindFuel" width="48" height="48" style={{ margin: '0 auto', borderRadius: '12px' }} />
      </div>
      
      <p style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#00bf63', marginBottom: '24px' }}>
        Good Morning, {name}
      </p>

      <div style={{ 
        backgroundColor: '#ffffff', 
        borderRadius: '32px', 
        padding: '48px 32px', 
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)',
        marginBottom: '40px',
        border: '1px solid #f1f5f9'
      }}>
        <span style={{ fontSize: '48px', color: '#00bf63', display: 'block', marginBottom: '16px', lineHeight: '1' }}>&ldquo;</span>
        <h1 style={{ fontSize: '24px', fontWeight: '700', lineHeight: '1.5', margin: '0', color: '#171717', letterSpacing: '-0.02em' }}>
          {tip}
        </h1>
        <span style={{ fontSize: '48px', color: '#00bf63', display: 'block', marginTop: '16px', lineHeight: '1', textAlign: 'right' }}>&rdquo;</span>
      </div>
      
      <p style={{ fontSize: '16px', color: '#64748b', marginBottom: '32px', lineHeight: '1.6' }}>
        Stay intentional today. Take a breath, fuel your mind, and share what inspires you.
      </p>

      <a href="https://mind-fuel.app" style={{ 
        display: 'inline-block', 
        backgroundColor: '#171717', 
        color: '#ffffff', 
        padding: '14px 32px', 
        borderRadius: '100px', 
        fontSize: '14px', 
        fontWeight: 'bold', 
        textDecoration: 'none',
        marginBottom: '40px'
      }}>
        Go to Feed
      </a>
      
      <p style={{ fontSize: '12px', color: '#94a3b8' }}>
        You received this daily mindful tip from MindFuel.<br />
        Don&apos;t want these? <a href="https://mind-fuel.app/settings" style={{ color: '#00bf63', textDecoration: 'none' }}>Unsubscribe</a>.
      </p>
    </div>
  </div>
);

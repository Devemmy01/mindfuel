/* eslint-disable @next/next/no-img-element */
import * as React from 'react';


interface WelcomeEmailProps {
  name: string;
}

export const WelcomeEmail: React.FC<Readonly<WelcomeEmailProps>> = ({
  name,
}) => (
  <div style={{
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
    backgroundColor: '#ffffff',
    color: '#171717',
    padding: '40px 20px',
  }}>
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
        <img src="https://mind-fuel.app/logo.png" alt="MindFuel" width="40" height="40" style={{ borderRadius: '8px' }} />
        <span style={{ fontSize: '20px', fontWeight: 'bold', marginLeft: '12px', letterSpacing: '-0.02em' }}>MindFuel</span>
      </div>
      
      <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '24px', letterSpacing: '-0.03em' }}>
        Welcome to your <span style={{ color: '#00bf63' }}>intentional</span> space.
      </h1>
      
      <p style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '24px' }}>
        Hi {name}, we&apos;re thrilled to have you here. MindFuel was built for thinkers like you—a place to share reflections, curations, and ideas without the noise.
      </p>
      
      <div style={{ backgroundColor: '#f9fafb', borderRadius: '16px', padding: '24px', marginBottom: '32px', border: '1px solid #f1f5f9' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '16px' }}>Getting Started</h2>
        <ul style={{ padding: '0', margin: '0', listStyleType: 'none', fontSize: '16px' }}>
          <li style={{ marginBottom: '12px' }}>✨ <strong>Share your first thought:</strong> Use the card creator to design a beautiful reflection.</li>
          <li style={{ marginBottom: '12px' }}>🔖 <strong>Save for later:</strong> Bookmark thoughts that resonate with you.</li>
          <li style={{ marginBottom: '12px' }}>🌿 <strong>Stay mindful:</strong> Look out for our fresh daily tips every morning.</li>
        </ul>
      </div>
      
      <a href="https://mind-fuel.app" style={{ 
        display: 'inline-block', 
        backgroundColor: '#00bf63', 
        color: '#ffffff', 
        padding: '16px 32px', 
        borderRadius: '100px', 
        fontSize: '16px', 
        fontWeight: 'bold', 
        textDecoration: 'none',
        marginBottom: '40px'
      }}>
        Open MindFuel
      </a>
      
      <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', marginBottom: '24px' }} />
      
      <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center' }}>
        MindFuel &bull; a Lumyn product<br />
        <a href="https://mind-fuel.app/privacy" style={{ color: '#00bf63', textDecoration: 'none' }}>Privacy Policy</a> &bull; <a href="https://mind-fuel.app/terms" style={{ color: '#00bf63', textDecoration: 'none' }}>Terms of Service</a>
      </p>
    </div>
  </div>
);

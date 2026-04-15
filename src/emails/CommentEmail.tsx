/* eslint-disable @next/next/no-img-element */
import * as React from 'react';


interface CommentEmailProps {
  authorName: string;
  commenterName: string;
  commentContent: string;
  postText: string;
  postLink: string;
}

export const CommentEmail: React.FC<Readonly<CommentEmailProps>> = ({
  authorName,
  commenterName,
  commentContent,
  postText,
  postLink,
}) => (
  <div style={{
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
    backgroundColor: '#ffffff',
    color: '#171717',
    padding: '40px 20px',
  }}>
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
        <img src="https://mind-fuel.app/logo.png" alt="MindFuel" width="32" height="32" style={{ borderRadius: '6px' }} />
        <span style={{ fontSize: '18px', fontWeight: 'bold', marginLeft: '10px', letterSpacing: '-0.02em' }}>MindFuel</span>
      </div>
      
      <p style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '24px' }}>
        Hi {authorName}, <strong>{commenterName}</strong> just shared a thought on your post:
      </p>
      
      <div style={{ borderLeft: '4px solid #00bf63', padding: '16px 24px', backgroundColor: '#f9fafb', borderRadius: '0 16px 16px 0', marginBottom: '24px' }}>
        <p style={{ fontSize: '16px', fontStyle: 'italic', color: '#475569', marginBottom: '0' }}>
          &quot;{commentContent}&quot;
        </p>
      </div>

      <div style={{ padding: '20px', borderRadius: '20px', backgroundColor: '#171717', color: '#ffffff', marginBottom: '32px' }}>
        <p style={{ fontSize: '14px', fontWeight: '600', opacity: '0.6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', marginTop: '0' }}>Your Post</p>
        <p style={{ fontSize: '16px', fontWeight: '500', margin: '0', lineHeight: '1.5' }}>
          {postText.length > 100 ? postText.substring(0, 100) + '...' : postText}
        </p>
      </div>
      
      <a href={postLink} style={{ 
        display: 'inline-block', 
        backgroundColor: '#00bf63', 
        color: '#ffffff', 
        padding: '14px 28px', 
        borderRadius: '100px', 
        fontSize: '15px', 
        fontWeight: 'bold', 
        textDecoration: 'none',
        marginBottom: '40px'
      }}>
        Reply to Comment
      </a>
      
      <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', marginBottom: '24px' }} />
      
      <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
        You received this because someone commented on your MindFuel post.<br />
        Manage your notifications in your <a href="https://mind-fuel.app/settings" style={{ color: '#00bf63', textDecoration: 'none' }}>settings</a>.
      </p>
    </div>
  </div>
);

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
  <Html>
    <Head />
    <Preview>{commenterName} commented on your post</Preview>
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

        <Text style={text}>
          Hi {authorName}, <strong>{commenterName}</strong> just shared a
          thought on your post:
        </Text>

        <Section style={commentBox}>
          <Text style={commentText}>&quot;{commentContent}&quot;</Text>
        </Section>

        <Section style={postPreview}>
          <Text style={postPreviewLabel}>Your Post</Text>
          <Text style={postPreviewText}>
            {postText.length > 100
              ? postText.substring(0, 100) + "..."
              : postText}
          </Text>
        </Section>

        <Link href={postLink} style={button}>
          Reply to Comment
        </Link>

        <Hr style={hr} />
      </Container>
    </Body>
  </Html>
);

export default CommentEmail;

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

const commentBox = {
  borderLeft: "4px solid #00bf63",
  padding: "8px 24px",
  backgroundColor: "#f9fafb",
  borderRadius: "0 16px 16px 0",
  marginBottom: "24px",
};

const commentText = {
  fontSize: "16px",
  fontStyle: "italic",
  color: "#475569",
  margin: "0",
};

const postPreview = {
  padding: "20px",
  borderRadius: "20px",
  backgroundColor: "#171717",
  color: "#ffffff",
  marginBottom: "32px",
};

const postPreviewLabel = {
  fontSize: "14px",
  fontWeight: "600",
  opacity: "0.6",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  marginBottom: "12px",
  marginTop: "0",
};

const postPreviewText = {
  fontSize: "16px",
  fontWeight: "500",
  margin: "0",
  lineHeight: "1.5",
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

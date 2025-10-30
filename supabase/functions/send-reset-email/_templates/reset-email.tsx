import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface ResetEmailProps {
  method: 'link' | 'otp';
  resetLink?: string;
  otpCode?: string;
  expiresIn: string;
}

export const ResetEmail = ({
  method,
  resetLink,
  otpCode,
  expiresIn,
}: ResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your Magverse AI password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>✨ Magverse AI</Heading>
        <Heading style={h2}>Reset Your Password</Heading>
        
        <Text style={text}>
          We received a request to reset your password. 
          {method === 'link' 
            ? ' Click the button below to reset your password.'
            : ' Use the code below to reset your password.'}
        </Text>

        {method === 'link' && resetLink && (
          <>
            <Section style={buttonContainer}>
              <Link href={resetLink} style={button}>
                🔐 Reset Password
              </Link>
            </Section>
            <Text style={text}>
              Or copy and paste this link in your browser:
            </Text>
            <Text style={linkText}>{resetLink}</Text>
          </>
        )}

        {method === 'otp' && otpCode && (
          <>
            <Text style={text}>Your verification code is:</Text>
            <Section style={codeContainer}>
              <Text style={code}>{otpCode}</Text>
            </Section>
            <Text style={text}>
              Enter this code on the reset page to continue.
            </Text>
          </>
        )}

        <Text style={expiryText}>
          This {method === 'link' ? 'link' : 'code'} expires in {expiresIn}.
        </Text>

        <Text style={warningText}>
          If you didn't request this password reset, you can safely ignore this email.
          Your password will not be changed.
        </Text>

        <Text style={footer}>
          <Link
            href="https://magverse-chat-realm.lovable.app"
            target="_blank"
            style={footerLink}
          >
            Magverse AI
          </Link>
          {' '}- Your AI Chat Companion
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ResetEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  borderRadius: '8px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 20px',
  padding: '0 40px',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
  margin: '16px 0',
};

const buttonContainer = {
  padding: '27px 0 27px',
};

const button = {
  backgroundColor: '#5046e4',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '18px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '16px 32px',
  margin: '0 40px',
};

const linkText = {
  color: '#5046e4',
  fontSize: '14px',
  padding: '0 40px',
  wordBreak: 'break-all' as const,
  margin: '8px 0',
};

const codeContainer = {
  backgroundColor: '#f4f4f4',
  borderRadius: '8px',
  border: '2px solid #e1e1e1',
  padding: '24px',
  margin: '24px 40px',
};

const code = {
  color: '#1a1a1a',
  fontSize: '36px',
  fontWeight: 'bold',
  letterSpacing: '8px',
  textAlign: 'center' as const,
  margin: '0',
  fontFamily: 'monospace',
};

const expiryText = {
  color: '#666',
  fontSize: '14px',
  padding: '0 40px',
  margin: '24px 0',
  textAlign: 'center' as const,
};

const warningText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '22px',
  padding: '0 40px',
  margin: '24px 0',
  borderTop: '1px solid #e1e1e1',
  paddingTop: '24px',
};

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '22px',
  padding: '0 40px',
  marginTop: '32px',
  textAlign: 'center' as const,
};

const footerLink = {
  color: '#5046e4',
  textDecoration: 'underline',
};

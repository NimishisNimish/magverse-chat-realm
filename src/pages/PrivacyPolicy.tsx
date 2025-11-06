import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Shield, Lock, Eye, Database, Mail } from "lucide-react";
const PrivacyPolicy = () => {
  return <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 animate-fade-in">
            <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: November 2, 2025</p>
          </div>

          <div className="glass-card p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Eye className="w-6 h-6 text-primary" />
                Introduction
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Magverse AI ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI chat platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Database className="w-6 h-6 text-secondary" />
                Information We Collect
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Personal Information</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Email address (required for account creation)</li>
                    <li>Username and display name (optional)</li>
                    <li>Profile picture (optional)</li>
                    <li>Password (encrypted and never stored in plain text)</li>
                    <li>Phone number (optional, for account recovery)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Usage Information</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Chat messages and conversations with AI models</li>
                    <li>Files and documents you upload (images, PDFs, text files)</li>
                    <li>AI model preferences and settings</li>
                    <li>Usage statistics and interaction patterns</li>
                    <li>Browser type, device information, and IP address</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Lock className="w-6 h-6 text-accent" />
                How We Use Your Information
              </h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
                <li>To provide and maintain our AI chat services</li>
                <li>To process your requests to multiple AI models (ChatGPT, Gemini, Claude, Llama, Deepseek, Grok, Perplexity)</li>
                <li>To personalize your experience and remember your preferences</li>
                <li>To improve our services, develop new features, and enhance user experience</li>
                <li>To communicate with you about updates, security alerts, and support</li>
                <li>To monitor usage patterns and prevent abuse</li>
                <li>To comply with legal obligations and enforce our Terms of Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Storage and Security</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Your data is stored securely using Supabase, a secure cloud database platform. We implement industry-standard security measures including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
                <li>End-to-end encryption for passwords</li>
                <li>Secure HTTPS connections for all data transmission</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Automatic backups to prevent data loss</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Third-Party AI Services</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Magverse AI integrates with multiple AI service providers to deliver responses:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
                <li><strong>OpenAI (ChatGPT)</strong> - Your messages may be processed by OpenAI's API</li>
                <li><strong>Google AI (Gemini)</strong> - Your messages may be processed by Google's AI services</li>
                <li><strong>Anthropic (Claude)</strong> - Your messages may be processed by Anthropic's API</li>
                <li><strong>Meta (Llama)</strong> - Your messages may be processed by Meta's AI models</li>
                
                <li><strong>xAI (Grok)</strong> - Your messages may be processed by xAI's services</li>
                <li><strong>Perplexity AI</strong> - Your messages may be processed for web-enhanced responses</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Each AI provider has their own privacy policy governing how they handle data. We encourage you to review their policies. We do not control how these providers use your data once transmitted to them.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You have the following rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
                <li><strong>Export:</strong> Download your chat history and data</li>
                <li><strong>Opt-out:</strong> Unsubscribe from promotional communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Cookies and Tracking</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use cookies and similar technologies to maintain your session, remember your preferences, and analyze site usage. You can control cookies through your browser settings, but disabling them may affect functionality.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal information for as long as your account is active or as needed to provide services. Chat history is stored indefinitely unless you delete it. You can delete individual chats or your entire account at any time.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Magverse AI is not intended for users under 13 years of age. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy periodically. We will notify you of significant changes by posting a notice on our platform or sending you an email. Your continued use after changes indicates acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Mail className="w-6 h-6 text-primary" />
                Contact Us
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                If you have questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="glass-card p-4 space-y-2">
                <p className="text-foreground"><strong>Email:</strong> magverse4@gmail.com</p>
                <p className="text-foreground"><strong>Phone:</strong> +91 9872021777</p>
                <p className="text-foreground"><strong>Location:</strong> Chitkara University, Rajpura</p>
              </div>
            </section>

            <div className="pt-8 border-t border-glass-border">
              <Link to="/" className="text-primary hover:text-primary/80 transition-colors">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>;
};
export default PrivacyPolicy;
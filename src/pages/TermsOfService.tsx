import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { FileText, CheckCircle, AlertCircle, Scale } from "lucide-react";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 animate-fade-in">
            <FileText className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">Terms of Service</h1>
            <p className="text-muted-foreground">Last updated: November 2, 2025</p>
          </div>

          <div className="glass-card p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-primary" />
                Acceptance of Terms
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using Magverse AI ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service. These Terms apply to all users, including visitors, registered users, and subscribers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Service Description</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Magverse AI provides a unified platform for accessing multiple AI language models including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
                <li>ChatGPT (via OpenAI/Meta Llama models)</li>
                <li>Google Gemini</li>
                <li>Anthropic Claude</li>
                <li>Meta Llama</li>
                <li>Deepseek</li>
                <li>xAI Grok</li>
                <li>Perplexity AI (with web search capabilities)</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                The Service is currently provided free of charge with unlimited access to all AI models. We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">User Accounts</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Account Creation</h3>
                  <p>To use the Service, you must create an account by providing:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                    <li>A valid email address</li>
                    <li>A secure password meeting our requirements</li>
                    <li>Optional: username, profile picture, and phone number</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Account Security</h3>
                  <p>You are responsible for:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                    <li>Maintaining the confidentiality of your account credentials</li>
                    <li>All activities that occur under your account</li>
                    <li>Notifying us immediately of any unauthorized access</li>
                    <li>Using a strong, unique password</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Account Eligibility</h3>
                  <p>You must be at least 13 years old to use this Service. Users under 18 should have parental consent.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-accent" />
                Acceptable Use Policy
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You agree NOT to use the Service to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
                <li>Generate illegal, harmful, threatening, abusive, or offensive content</li>
                <li>Impersonate any person or entity, or falsely represent your affiliation</li>
                <li>Violate any local, state, national, or international law</li>
                <li>Infringe on intellectual property rights of others</li>
                <li>Transmit viruses, malware, or any malicious code</li>
                <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
                <li>Scrape, crawl, or automatically extract data from the Service</li>
                <li>Use the Service for commercial purposes without our permission</li>
                <li>Generate spam, phishing content, or unsolicited communications</li>
                <li>Create content that promotes violence, discrimination, or hate speech</li>
                <li>Bypass any rate limiting or security measures</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Violation of this policy may result in immediate account suspension or termination.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Content Ownership and Rights</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Your Content</h3>
                  <p>You retain ownership of:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                    <li>Messages you send to AI models</li>
                    <li>Files and documents you upload</li>
                    <li>Your profile information and settings</li>
                  </ul>
                  <p className="mt-2">
                    By using the Service, you grant us a non-exclusive, worldwide license to process your content to provide and improve the Service.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">AI-Generated Content</h3>
                  <p>
                    AI-generated responses are provided "as-is" without guarantees of accuracy, completeness, or reliability. You are responsible for verifying any AI-generated content before using it. We do not claim ownership of AI-generated responses, but the underlying AI models may be subject to their providers' terms.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Subscription and Payments</h2>
              <p className="text-muted-foreground leading-relaxed">
                Currently, Magverse AI is provided free of charge with unlimited access to all features. We reserve the right to introduce paid subscription tiers in the future. If we do, existing users will receive advance notice and the option to continue with a free tier or upgrade to premium features.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Disclaimer of Warranties</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
                <li>Accuracy, reliability, or completeness of AI-generated responses</li>
                <li>Uninterrupted or error-free operation</li>
                <li>Freedom from viruses or other harmful components</li>
                <li>Fitness for a particular purpose</li>
                <li>Non-infringement of third-party rights</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                AI models may produce inaccurate, biased, or inappropriate content. Always verify important information from authoritative sources.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, MAGVERSE AI SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4 mt-4">
                <li>Your use or inability to use the Service</li>
                <li>Unauthorized access to or alteration of your data</li>
                <li>AI-generated content or advice that proves inaccurate or harmful</li>
                <li>Any other matter relating to the Service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Termination</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Your Rights</h3>
                  <p>You may terminate your account at any time by contacting us or using the account deletion feature. Upon termination, your access to the Service will cease immediately.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Our Rights</h3>
                  <p>We reserve the right to suspend or terminate your account at any time, with or without notice, for:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                    <li>Violation of these Terms</li>
                    <li>Suspected fraudulent, abusive, or illegal activity</li>
                    <li>Extended periods of inactivity</li>
                    <li>At our sole discretion for any reason</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Effect of Termination</h3>
                  <p>Upon termination, all rights granted to you will immediately cease. We may delete your data in accordance with our data retention policies. You remain liable for any obligations incurred before termination.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these Terms at any time. We will provide notice of significant changes by:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4 mt-2">
                <li>Posting the updated Terms on our website</li>
                <li>Sending an email notification to registered users</li>
                <li>Displaying a notice within the Service</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Your continued use of the Service after changes become effective constitutes acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Scale className="w-6 h-6 text-secondary" />
                Governing Law and Disputes
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms are governed by the laws of India. Any disputes arising from these Terms or the Service shall be resolved through good faith negotiation. If negotiation fails, disputes shall be subject to the exclusive jurisdiction of courts in Rajpura, Punjab, India.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Miscellaneous</h2>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground leading-relaxed ml-4">
                <li><strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and Magverse AI</li>
                <li><strong>Severability:</strong> If any provision is found unenforceable, the remaining provisions remain in effect</li>
                <li><strong>No Waiver:</strong> Our failure to enforce any right does not waive that right</li>
                <li><strong>Assignment:</strong> You may not assign these Terms without our consent</li>
                <li><strong>Contact:</strong> For questions about these Terms, email magverse4@gmail.com</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
              <div className="glass-card p-4 space-y-2">
                <p className="text-foreground"><strong>Magverse AI</strong></p>
                <p className="text-foreground"><strong>Email:</strong> magverse4@gmail.com</p>
                <p className="text-foreground"><strong>Phone:</strong> +91 9872021777</p>
                <p className="text-foreground"><strong>Location:</strong> Chitkara University, Rajpura, Punjab, India</p>
              </div>
            </section>

            <div className="pt-8 border-t border-glass-border">
              <p className="text-sm text-muted-foreground mb-4">
                By using Magverse AI, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
              <Link to="/" className="text-primary hover:text-primary/80 transition-colors">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;

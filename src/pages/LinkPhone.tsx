import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Smartphone, ArrowLeft, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import Navbar from "@/components/Navbar";

const phoneSchema = z.string().regex(/^\+[1-9]\d{1,14}$/, "Invalid phone number format. Use E.164 format (e.g., +919876543210)");

const LinkPhone = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { linkPhoneNumber, profile } = useAuth();

  const handleLinkPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Normalize to E.164 format
      let normalizedPhone = phoneNumber.replace(/\s+/g, '').replace(/-/g, '');
      if (!normalizedPhone.startsWith('+')) {
        if (normalizedPhone.length === 10) {
          normalizedPhone = `+91${normalizedPhone}`;
        }
      }

      phoneSchema.parse(normalizedPhone);

      const { error } = await linkPhoneNumber(normalizedPhone);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to link phone number",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Phone number linked successfully!",
      });
      
      navigate('/chat');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: error.errors[0].message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "An unexpected error occurred",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-2xl mx-auto px-4 py-12">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/chat')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Chat
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-6 w-6" />
              Link Phone Number
            </CardTitle>
            <CardDescription>
              Link your phone number to enable password reset via SMS
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile?.phone_number ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Phone number already linked</span>
                </div>
                <p className="text-muted-foreground">
                  Current number: {profile.phone_number}
                </p>
                <form onSubmit={handleLinkPhone} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Update Phone Number</label>
                    <Input
                      type="tel"
                      placeholder="+91 9876543210"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter new number with country code (e.g., +91 9876543210)
                    </p>
                  </div>
                  <Button type="submit" disabled={loading || !phoneNumber}>
                    {loading ? "Updating..." : "Update Phone Number"}
                  </Button>
                </form>
              </div>
            ) : (
              <form onSubmit={handleLinkPhone} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter your mobile number with country code (e.g., +91 9876543210)
                  </p>
                </div>
                
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <h4 className="text-sm font-medium">Benefits:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Reset password via SMS OTP</li>
                    <li>Quick and secure account recovery</li>
                    <li>One phone number per account</li>
                  </ul>
                </div>

                <Button type="submit" className="w-full" disabled={loading || !phoneNumber}>
                  {loading ? "Linking..." : "Link Phone Number"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LinkPhone;

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Bell, X, DollarSign, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { format } from "date-fns";

interface PaymentNotification {
  id: string;
  user_id: string;
  amount: number;
  plan_type: string;
  created_at: string;
  username?: string;
  email?: string;
}

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      loadRecentPayments();
      setupRealtimeSubscription();
      requestNotificationPermission();
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    setIsAdmin(!!data);
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  const playNotificationSound = () => {
    // Create audio element for notification sound
    if (!audioRef.current) {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBCyB0fPTgjMGHGm98OShUBANVKzn77RgGgU7k9n0yHkpBSJ1w/Daj0EKFF+27OylUxILT6Th8dBxJAYudcvz14Y6BxpqvPDlpFARDVGo5O+zYBoFOZLY88h5KAUid8T05o9AChRftu7spVMSC06k4e/PciQHLXbL89SFOwcZbbz06aFQEg1Rp+XvsmAaBjiS2fXIeiYFI3bE8uaOQQoTX7Xv7aZUEgxPpeLv0HImBy52y/PThToIGWy88OihUBINUajl77NgGgY5k9n1yHomBSN2xPLmjkIKE1+37+ymVBIMT6Xi79ByJgcudsvz04U7CBhsvPHooVARDVCn5e+zYBsGOJLZ9MdyJgUjdsPy5o5BChNftd/spVQTC06k4+/PciUHLnbL89OFOwgYbLzx6KFRDwxQqOXvs2AbBjiS2fTFciYFI3bD8uaOQQoTX7Xf66VUEgxOo+Lvz3IlBy52yvPThToIGGy88OihUBENUKfl8rJgGgY4ktn0xXImBSN2w/Lmj0EKE1+13+umVBIMTqPi789yJQcvdsvz04U6CBhsvPHooVATDVCn5e+zYBsGOJLZ9MdyJgUjdcPy5o5BChNftd/spVQSDE6j4u/PciUHL3bL89OFOgcYa7zx6KFRDw1Qp+bvs2AbBjiS2fPHciYFI3XD8uaPQQoTX7Xf7KVUEgxOo+Lvz3IlBy92y/PThToIGGy88eihURANUKjl77JgGwc4ktn0x3ImBSN2w/Lmj0EKE1+13+ylVBIMTqPi789yJQcvdsvz04U6CBhsvPHooVETDVCn5u+zYBsHOJLa9MdyJgUjdcPy5o9BChNftd/spVQSDE6j4u/PciUHL3bL89OFOggYbLzx6KFRDw1Qp+bvs2AbBziS2fTHciYFI3XD8uaPQQoTX7Xf7KVUEgxOo+Lvz3IlBy92y/PThToIGGy88eihURANUKjl77NgGwY4ktrzx3ImBSN1w/Lmj0EKE1+13+ylVBIMTqPi789yJQcvdsvz04U6CBhsvPHooVEPDVCo5u+zYBsHOJLZ9MdyJgUjdcPy5o9BChNftd/spVQSDE6j4u/PciUHL3bL89OFOggYa7zy6KFRDw1QqOXvs2AbBziS2vTHciYFI3XD8uaPQQoTX7Xf7KVUEgxOo+Lvz3IlBy92y/PThToIGGy88eihUQ==');
    }
    audioRef.current?.play().catch(console.error);
  };

  const showDesktopNotification = (payment: PaymentNotification) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("New Payment Received!", {
        body: `${payment.username || 'User'} paid ₹${payment.amount} for ${payment.plan_type === 'monthly' ? 'Yearly' : 'Lifetime'} Pro`,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: payment.id,
      });
    }
  };

  const loadRecentPayments = async () => {
    const { data: payments } = await supabase
      .from('transactions')
      .select('*')
      .eq('verification_status', 'pending_verification')
      .order('created_at', { ascending: false })
      .limit(10);

    if (payments) {
      // Get user emails and usernames
      const userIds = [...new Set(payments.map(p => p.user_id))];
      
      // Get profiles from database
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      // Fetch user emails securely via Edge Function
      let userEmails: Record<string, string> = {};
      try {
        const { data, error } = await supabase.functions.invoke('admin-get-user-emails', {
          body: { userIds }
        });
        if (!error && data?.userEmails) {
          userEmails = data.userEmails;
        }
      } catch (err) {
        console.error('Failed to fetch user emails:', err);
      }

      const enrichedPayments = payments.map(p => {
        const profile = profiles?.find(pr => pr.id === p.user_id);
        return {
          ...p,
          username: profile?.username,
          email: userEmails[p.user_id] || undefined,
        };
      });

      setNotifications(enrichedPayments);
      setUnreadCount(enrichedPayments.length);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('admin-payment-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: 'verification_status=eq.pending_verification',
        },
        async (payload) => {
          const newPayment = payload.new as any;

          // Fetch user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', newPayment.user_id)
            .single();

          // Fetch user email securely via Edge Function
          let userEmail: string | undefined;
          try {
            const { data, error } = await supabase.functions.invoke('admin-get-user-emails', {
              body: { userIds: [newPayment.user_id] }
            });
            if (!error && data?.userEmails?.[newPayment.user_id]) {
              userEmail = data.userEmails[newPayment.user_id];
            }
          } catch (err) {
            console.error('Failed to fetch user email:', err);
          }

          const enrichedPayment = {
            ...newPayment,
            username: profile?.username,
            email: userEmail,
          };

          setNotifications(prev => [enrichedPayment, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Play sound and show desktop notification
          playNotificationSound();
          showDesktopNotification(enrichedPayment);

          // Show toast
          toast({
            title: "💰 New Payment Received!",
            description: `${enrichedPayment.username || 'User'} paid ₹${enrichedPayment.amount}`,
            duration: 10000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  if (!isAdmin) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Payment Notifications</SheetTitle>
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllNotifications}>
                Clear All
              </Button>
            )}
          </div>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-100px)] mt-6">
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No pending payments</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <Card key={notification.id} className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => clearNotification(notification.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <DollarSign className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <p className="font-medium">{notification.username || 'User'}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">{notification.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">
                            ₹{notification.amount}
                          </Badge>
                          <Badge variant="outline">
                            {notification.plan_type === 'monthly' ? 'Yearly Pro' : 'Lifetime Pro'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(notification.created_at), 'PPp')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default AdminNotifications;

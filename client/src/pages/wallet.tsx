import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import PaymentForm from "@/components/payment-form";
import { 
  DollarSign, 
  CreditCard, 
  Crown, 
  Zap, 
  Heart, 
  Video, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";
import { User, Payment, Violation } from "@shared/schema";

interface WalletProps {
  user: User;
  onUpdate: (user: User) => void;
}

export default function Wallet({ user, onUpdate }: WalletProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user payments
  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments", user.id],
  });

  // Get user violations
  const { data: violations = [], isLoading: violationsLoading } = useQuery<Violation[]>({
    queryKey: ["/api/violations", user.id],
  });

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: async (data: {
      amount: string;
      type: string;
      paymentMethod?: string;
    }) => {
      const response = await apiRequest("POST", "/api/payments", {
        userId: user.id,
        ...data,
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Payment Processing",
        description: "Your payment is being processed. You'll be notified when complete.",
      });
      setShowPaymentForm(false);
      setSelectedAmount(null);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user.id] });
      
      // Simulate payment completion for demo
      setTimeout(() => {
        toast({
          title: "Payment Successful",
          description: `$${variables.amount} has been added to your wallet.`,
        });
      }, 3000);
    },
    onError: () => {
      toast({
        title: "Payment Failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const premiumFeatures = [
    { icon: Heart, title: "Unlimited Likes", description: "Like as many profiles as you want" },
    { icon: Zap, title: "Super Likes", description: "Stand out with 5 super likes per day" },
    { icon: Video, title: "Video Calling", description: "Video chat with your matches" },
    { icon: Crown, title: "See Who Likes You", description: "View your likes before swiping" },
    { icon: Calendar, title: "Priority Support", description: "Get help when you need it" },
  ];

  const walletAmounts = [25, 50, 100, 250, 500];

  const handleAddFunds = (amount: number) => {
    setSelectedAmount(amount);
    setShowPaymentForm(true);
  };

  const handlePremiumUpgrade = () => {
    processPaymentMutation.mutate({
      amount: "9.99",
      type: "premium",
      paymentMethod: "card",
    });
  };

  const handlePayFine = (violationId: number, amount: string) => {
    processPaymentMutation.mutate({
      amount,
      type: "fine",
      paymentMethod: "wallet",
    });
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "pending": return <Clock className="w-4 h-4 text-yellow-500" />;
      case "failed": return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const pendingViolations = violations.filter(v => v.status === "pending" && v.fineAmount);

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Wallet Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-500" />
            Wallet Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold text-green-600">
                ${user.walletBalance}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Available balance
              </p>
            </div>
            <div className="flex items-center gap-2">
              {user.isPremium && (
                <Badge className="bg-yellow-500">
                  <Crown className="w-4 h-4 mr-1" />
                  Premium
                </Badge>
              )}
              {user.isVerified && (
                <Badge variant="secondary">Verified</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Violations Alert */}
      {pendingViolations.length > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              Account Suspended - Payment Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 mb-4">
              Your account is suspended due to violations. Pay the fine below to restore access.
            </p>
            {pendingViolations.map((violation) => (
              <div key={violation.id} className="border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-red-800">
                      {violation.type === "phone_number" ? "Phone Number Sharing" : violation.type}
                    </h4>
                    <p className="text-sm text-red-600">
                      Fine: ${violation.fineAmount}
                    </p>
                  </div>
                  <Button
                    onClick={() => handlePayFine(violation.id, violation.fineAmount!)}
                    disabled={parseFloat(user.walletBalance) < parseFloat(violation.fineAmount!)}
                    variant="destructive"
                    size="sm"
                  >
                    Pay Fine
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="add-funds" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="add-funds">Add Funds</TabsTrigger>
          <TabsTrigger value="premium">Premium</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Add Funds */}
        <TabsContent value="add-funds" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Funds to Wallet</CardTitle>
              <p className="text-sm text-muted-foreground">
                Add money to your wallet for premium features and blind dates
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                {walletAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    className="h-16 text-lg font-semibold"
                    onClick={() => handleAddFunds(amount)}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">How to use your wallet:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Blind dates require $100 deposit</li>
                  <li>• Premium subscription: $9.99/month</li>
                  <li>• Account violation fines: $100</li>
                  <li>• Unused blind date funds are refunded</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {showPaymentForm && selectedAmount && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentForm
                  amount={selectedAmount}
                  onSubmit={(paymentData) => {
                    processPaymentMutation.mutate({
                      amount: selectedAmount.toString(),
                      type: "wallet_topup",
                      paymentMethod: paymentData.method,
                    });
                  }}
                  onCancel={() => {
                    setShowPaymentForm(false);
                    setSelectedAmount(null);
                  }}
                  isLoading={processPaymentMutation.isPending}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Premium */}
        <TabsContent value="premium" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-6 h-6 text-yellow-500" />
                Premium Membership
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Unlock all features and get the most out of LoveAR
              </p>
            </CardHeader>
            <CardContent>
              {user.isPremium ? (
                <div className="text-center py-8">
                  <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">You're Premium!</h3>
                  <p className="text-muted-foreground mb-4">
                    Enjoy all premium features and priority support
                  </p>
                  <Badge className="bg-yellow-500">Active Premium Member</Badge>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <div className="text-center mb-6">
                      <div className="text-4xl font-bold mb-2">$9.99<span className="text-lg text-muted-foreground">/month</span></div>
                      <p className="text-muted-foreground">Get premium features and stand out from the crowd</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {premiumFeatures.map(({ icon: Icon, title, description }) => (
                      <div key={title} className="flex items-start gap-3 p-4 border rounded-lg">
                        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                          <Icon className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{title}</h4>
                          <p className="text-sm text-muted-foreground">{description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handlePremiumUpgrade}
                    disabled={processPaymentMutation.isPending}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                    size="lg"
                  >
                    <Crown className="w-5 h-5 mr-2" />
                    {processPaymentMutation.isPending ? "Processing..." : "Upgrade to Premium"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No Transactions Yet</h3>
                  <p className="text-muted-foreground">
                    Your payment history will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getPaymentStatusIcon(payment.status)}
                        <div>
                          <div className="font-medium">
                            {payment.type === "premium" && "Premium Subscription"}
                            {payment.type === "blind_date" && "Blind Date"}
                            {payment.type === "wallet_topup" && "Wallet Top-up"}
                            {payment.type === "fine" && "Account Fine"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${payment.amount}</div>
                        <Badge 
                          variant={payment.status === "completed" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

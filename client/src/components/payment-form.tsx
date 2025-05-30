import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Shield, DollarSign } from "lucide-react";

interface PaymentFormProps {
  amount: number;
  onSubmit: (data: PaymentData) => void;
  onCancel: () => void;
  isLoading: boolean;
  description?: string;
}

interface PaymentData {
  method: string;
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  cardholderName?: string;
}

export default function PaymentForm({ 
  amount, 
  onSubmit, 
  onCancel, 
  isLoading,
  description 
}: PaymentFormProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [formData, setFormData] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const paymentMethods = [
    { value: "card", label: "Credit/Debit Card", icon: "💳" },
    { value: "paypal", label: "PayPal", icon: "🅿️" },
    { value: "apple_pay", label: "Apple Pay", icon: "🍎" },
    { value: "google_pay", label: "Google Pay", icon: "🔍" },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!paymentMethod) {
      newErrors.paymentMethod = "Please select a payment method";
    }

    if (paymentMethod === "card") {
      if (!formData.cardNumber || formData.cardNumber.length < 16) {
        newErrors.cardNumber = "Please enter a valid card number";
      }
      if (!formData.expiryDate || !/^\d{2}\/\d{2}$/.test(formData.expiryDate)) {
        newErrors.expiryDate = "Please enter expiry date (MM/YY)";
      }
      if (!formData.cvv || formData.cvv.length < 3) {
        newErrors.cvv = "Please enter a valid CVV";
      }
      if (!formData.cardholderName.trim()) {
        newErrors.cardholderName = "Please enter cardholder name";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Form Error",
        description: "Please fill in all required fields correctly.",
        variant: "destructive",
      });
      return;
    }

    const paymentData: PaymentData = {
      method: paymentMethod,
    };

    if (paymentMethod === "card") {
      paymentData.cardNumber = formData.cardNumber;
      paymentData.expiryDate = formData.expiryDate;
      paymentData.cvv = formData.cvv;
      paymentData.cardholderName = formData.cardholderName;
    }

    onSubmit(paymentData);
  };

  const handleCardNumberChange = (value: string) => {
    // Format card number with spaces
    const cleaned = value.replace(/\D/g, "");
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, "$1 ");
    setFormData(prev => ({ ...prev, cardNumber: formatted }));
  };

  const handleExpiryChange = (value: string) => {
    // Format expiry date as MM/YY
    const cleaned = value.replace(/\D/g, "");
    let formatted = cleaned;
    if (cleaned.length >= 2) {
      formatted = cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4);
    }
    setFormData(prev => ({ ...prev, expiryDate: formatted }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-500" />
          Payment Details
        </CardTitle>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {description || "Complete your payment"}
          </span>
          <Badge className="text-lg font-bold">${amount.toFixed(2)}</Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Method Selection */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((method) => (
                <Button
                  key={method.value}
                  type="button"
                  variant={paymentMethod === method.value ? "default" : "outline"}
                  onClick={() => setPaymentMethod(method.value)}
                  className="h-16 flex flex-col gap-1"
                >
                  <span className="text-xl">{method.icon}</span>
                  <span className="text-xs">{method.label}</span>
                </Button>
              ))}
            </div>
            {errors.paymentMethod && (
              <p className="text-sm text-red-600">{errors.paymentMethod}</p>
            )}
          </div>

          {/* Card Details (if card payment selected) */}
          {paymentMethod === "card" && (
            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="cardholderName">Cardholder Name</Label>
                <Input
                  id="cardholderName"
                  placeholder="John Doe"
                  value={formData.cardholderName}
                  onChange={(e) => setFormData(prev => ({ ...prev, cardholderName: e.target.value }))}
                  className={errors.cardholderName ? "border-red-300" : ""}
                />
                {errors.cardholderName && (
                  <p className="text-sm text-red-600">{errors.cardholderName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input
                  id="cardNumber"
                  placeholder="1234 5678 9012 3456"
                  value={formData.cardNumber}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  maxLength={19}
                  className={errors.cardNumber ? "border-red-300" : ""}
                />
                {errors.cardNumber && (
                  <p className="text-sm text-red-600">{errors.cardNumber}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    placeholder="MM/YY"
                    value={formData.expiryDate}
                    onChange={(e) => handleExpiryChange(e.target.value)}
                    maxLength={5}
                    className={errors.expiryDate ? "border-red-300" : ""}
                  />
                  {errors.expiryDate && (
                    <p className="text-sm text-red-600">{errors.expiryDate}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="123"
                    value={formData.cvv}
                    onChange={(e) => setFormData(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, "") }))}
                    maxLength={4}
                    className={errors.cvv ? "border-red-300" : ""}
                  />
                  {errors.cvv && (
                    <p className="text-sm text-red-600">{errors.cvv}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Alternative Payment Method Info */}
          {paymentMethod && paymentMethod !== "card" && (
            <div className="border-t pt-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800 mb-2">
                  <span className="text-xl">
                    {paymentMethods.find(m => m.value === paymentMethod)?.icon}
                  </span>
                  <span className="font-medium">
                    {paymentMethods.find(m => m.value === paymentMethod)?.label}
                  </span>
                </div>
                <p className="text-sm text-blue-700">
                  You'll be redirected to complete your payment securely.
                </p>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-700 mb-2">
              <Shield className="w-4 h-4" />
              <span className="font-medium">Secure Payment</span>
            </div>
            <p className="text-sm text-gray-600">
              Your payment information is encrypted and processed securely. 
              We never store your credit card details.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || !paymentMethod}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay ${amount.toFixed(2)}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

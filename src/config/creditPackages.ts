// Unified credit package configuration
// Used across Payment, Pricing, and CreditTopUpDialog

export interface CreditPackage {
  id: string;
  credits: number;
  amount: number;
  perCredit: string;
  description?: string;
  popular?: boolean;
  bestValue?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { 
    id: 'credits_50', 
    credits: 50, 
    amount: 25, 
    perCredit: "₹0.50",
    description: '50 Credits'
  },
  { 
    id: 'credits_200', 
    credits: 200, 
    amount: 75, 
    perCredit: "₹0.38",
    description: '200 Credits',
    popular: true 
  },
  { 
    id: 'credits_500', 
    credits: 500, 
    amount: 150, 
    perCredit: "₹0.30",
    description: '500 Credits',
    bestValue: true 
  },
];

// Backend credit mapping (for edge functions and admin)
export const CREDIT_PACKAGES_MAP: Record<string, number> = {
  credits_50: 50,
  credits_200: 200,
  credits_500: 500,
};

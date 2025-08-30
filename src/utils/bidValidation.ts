
// Client-side bid validation (mirrors server-side logic)
export const validateBid = (currentPrice: number, bidAmount: number): { isValid: boolean; requiredMinimum: number } => {
  const baseline = Math.max(currentPrice || 0, 0);
  const minIncrement = Math.max(Math.ceil(baseline * 0.05), 20);
  const requiredMinimum = baseline + minIncrement;
  
  return {
    isValid: bidAmount >= requiredMinimum,
    requiredMinimum
  };
};

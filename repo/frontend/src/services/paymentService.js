import { apiRequest } from './api';

/**
 * Creates a Razorpay order + internal Mongo order on the backend
 */
export const createPaymentOrder = async (orderData) => {
  return await apiRequest('/payments/create-order', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });
};

/**
 * Verifies Razorpay HMAC SHA256 signature on the backend
 */
export const verifyPayment = async (verificationData) => {
  return await apiRequest('/payments/verify-payment', {
    method: 'POST',
    body: JSON.stringify(verificationData)
  });
};

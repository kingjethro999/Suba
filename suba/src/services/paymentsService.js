// //suba-frontend/src/services/paymentsService.js
// import api from '../api/config';

// export const getPaymentHistory = async () => {
//   try {
//     const response = await api.get('/payments');
//     return response.data;
//   } catch (error) {
//     console.error('Error fetching payment history:', error);
//     // Return mock data for development
//     return getMockPayments();
//   }
// };

// // Mock data for development
// const getMockPayments = () => {
//   return [
//     {
//       id: 1,
//       plan: 'Netflix Premium',
//       amount: 3600,
//       currency: 'NGN',
//       method: 'Card',
//       status: 'successful',
//       paid_at: new Date().toISOString(),
//       receipt_url: null
//     },
//     {
//       id: 2,
//       plan: 'DSTV Compact',
//       amount: 7900,
//       currency: 'NGN',
//       method: 'Bank Transfer',
//       status: 'successful',
//       paid_at: new Date(Date.now() - 86400000).toISOString(),
//       receipt_url: null
//     },
//     {
//       id: 3,
//       plan: 'Spotify Premium',
//       amount: 10,
//       currency: 'USD',
//       method: 'PayPal',
//       status: 'pending',
//       paid_at: new Date(Date.now() - 172800000).toISOString(),
//       receipt_url: null
//     }
//   ];
// };
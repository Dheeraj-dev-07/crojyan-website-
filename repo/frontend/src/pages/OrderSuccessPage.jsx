import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import { CheckCircle2, Package, Clock, Ribbon, Gift, ArrowRight, ShieldCheck } from 'lucide-react';

export default function OrderSuccessPage() {
  const { orderId } = useParams();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!order);

  useEffect(() => {
    if (!order) {
      const fetchOrder = async () => {
        try {
          const response = await apiRequest(`/orders/${orderId}`);
          if (response.success) {
            setOrder(response.data);
          }
        } catch (err) {
          console.error('Failed to fetch order details', err);
        } finally {
          setLoading(false);
        }
      };
      fetchOrder();
    }
  }, [orderId, order]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-canvas">
        <p className="text-stone-500 font-semibold text-sm">Loading order summary...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-8">
      
      {/* Confirmation Header Banner */}
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-stone-200 shadow-soft text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <span className="text-xs font-semibold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block">
          Order Received • Pending Review
        </span>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal">
          Thank You for Your Order!
        </h1>

        <p className="text-stone-600 text-sm max-w-md mx-auto">
          Your handcrafted bouquet request has been logged. Our artisan team will review your customizations before starting the hand-crocheting process.
        </p>

        <div className="inline-block bg-rose-50 border border-rose-200 px-6 py-3 rounded-2xl text-center">
          <span className="text-xs text-stone-500 block uppercase tracking-wider">Unique Order ID</span>
          <span className="font-mono text-lg font-bold text-rose-600">{order?.orderId || orderId}</span>
        </div>
      </div>

      {/* Order Snapshot Details */}
      {order && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
            <h3 className="font-serif font-bold text-base text-charcoal flex items-center gap-2">
              <Package className="w-4 h-4 text-rose-500" /> Ordered Bouquets
            </h3>
            <div className="divide-y divide-stone-100 space-y-3">
              {order.items?.map((item, idx) => (
                <div key={idx} className="pt-2 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-charcoal">
                    <span>{item.bouquetTitle}</span>
                    <span className="text-rose-600">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                  </div>
                  <div className="text-stone-500 flex items-center gap-2">
                    <Ribbon className="w-3 h-3 text-rose-400" />
                    <span>Ribbon: {item.selectedCustomization?.ribbonColor} | Wrapper: {item.selectedCustomization?.wrappingPaperShade}</span>
                  </div>
                  {item.selectedCustomization?.giftCardText && (
                    <div className="p-2 bg-rose-50/70 rounded-lg text-rose-800 italic flex items-start gap-1 mt-1">
                      <Gift className="w-3 h-3 text-rose-500 mt-0.5 flex-shrink-0" />
                      <span>"{item.selectedCustomization.giftCardText}"</span>
                    </div>
                  )}
                  <span className="text-stone-400 block">Quantity: {item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-stone-200 flex justify-between font-serif font-bold text-lg text-charcoal">
              <span>Total Price</span>
              <span className="text-rose-600">₹{order.totalPrice}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
            <h3 className="font-serif font-bold text-base text-charcoal flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-500" /> Customer & Delivery Details
            </h3>
            
            <div className="text-xs text-stone-600 space-y-2">
              <div>
                <span className="text-stone-400 block">Recipient Name:</span>
                <span className="font-bold text-charcoal">{order.customer?.fullName}</span>
              </div>
              <div>
                <span className="text-stone-400 block">Phone & Email:</span>
                <span className="font-semibold text-charcoal">{order.customer?.phone} • {order.customer?.email}</span>
              </div>
              <div>
                <span className="text-stone-400 block">Delivery Address:</span>
                <span className="font-semibold text-charcoal">
                  {order.customer?.deliveryAddress?.addressLine}, {order.customer?.deliveryAddress?.city}, {order.customer?.deliveryAddress?.state} {order.customer?.deliveryAddress?.postalCode}
                </span>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl text-[11px] text-stone-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>You will receive dispatch notifications once the order progresses to CRAFTING.</span>
            </div>
          </div>

        </div>
      )}

      <div className="text-center pt-4">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-rose-600 text-white font-semibold text-xs shadow-md hover:bg-rose-700 transition"
        >
          <span>Continue Exploring Catalog</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

    </div>
  );
}

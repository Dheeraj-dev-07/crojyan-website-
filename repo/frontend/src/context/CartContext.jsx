import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('bloom_cart_items');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('bloom_cart_items', JSON.stringify(cartItems));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cartItems]);

  const addToCart = (product, selectedCustomization, quantity = 1) => {
    setCartItems((prevItems) => {
      // Find matching item with same bouquetId and SAME customizations
      const existingIndex = prevItems.findIndex(
        (item) =>
          item.bouquetId === product._id &&
          item.selectedCustomization.ribbonColor === selectedCustomization.ribbonColor &&
          item.selectedCustomization.wrappingPaperShade === selectedCustomization.wrappingPaperShade
      );

      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex].quantity += quantity;
        return updated;
      } else {
        const newItem = {
          cartItemId: `${product._id}-${Date.now()}`,
          bouquetId: product._id,
          title: product.title,
          unitPrice: product.basePrice,
          image: product.images?.find((img) => img.isPrimary)?.url || product.images?.[0]?.url,
          selectedCustomization: {
            ribbonColor: selectedCustomization.ribbonColor,
            wrappingPaperShade: selectedCustomization.wrappingPaperShade,
            giftCardText: selectedCustomization.giftCardText || ''
          },
          quantity
        };
        return [...prevItems, newItem];
      }
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (cartItemId) => {
    setCartItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const updateQuantity = (cartItemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.cartItemId === cartItemId ? { ...item, quantity: newQuantity } : item))
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        totalItemCount,
        isCartOpen,
        setIsCartOpen
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X, ShieldCheck, Instagram, Gift, Flower2, KeyRound } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import crojyanLogo from '../assets/crojyan-logo.png';

export default function Navbar() {
  const { totalItemCount, setIsCartOpen } = useCart();
  const { isAdminAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [customOrderOpen, setCustomOrderOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;
  const isStorefrontPage = !location.pathname.startsWith('/admin');
  const navLinkClass = (active) =>
    `rounded-md transition-colors hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-4 ${
      active ? 'text-rose-600 font-semibold' : ''
    }`;

  useEffect(() => {
    if (location.pathname === '/' && location.hash === '#craft') {
      requestAnimationFrame(() => document.getElementById('craft')?.scrollIntoView({ behavior: 'smooth' }));
    }
  }, [location.pathname, location.hash]);

  const handleCraftClick = () => setMobileMenuOpen(false);
  const openCustomOrder = () => {
    setMobileMenuOpen(false);
    setCustomOrderOpen(true);
  };

  useEffect(() => {
    if (!customOrderOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setCustomOrderOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [customOrderOpen]);

  return (
    <header className="sticky top-0 z-50 glass-nav border-b border-stone-200/60 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Brand Logo */}
          <Link
            to="/"
            aria-label="Crojyan home"
            className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-stone-200/80 transition-shadow duration-300 hover:shadow-md sm:h-[72px] sm:w-[72px]"
          >
            <img
              src={crojyanLogo}
              alt="Crojyan - Handmade with Love"
              width="72"
              height="72"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-contain"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-charcoal-light">
            <Link
              to="/"
              aria-current={isActive('/') ? 'page' : undefined}
              className={navLinkClass(isActive('/'))}
            >
              Home
            </Link>
            <Link
              to="/shop"
              aria-current={isActive('/shop') ? 'page' : undefined}
              className={navLinkClass(isActive('/shop'))}
            >
              Our Catalog
            </Link>
            <Link
              to="/#craft"
              onClick={handleCraftClick}
              className={navLinkClass(false)}
            >
              Our Craft
            </Link>
          </nav>

          {/* Action Icons */}
          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={openCustomOrder}
              className="hidden md:inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
            >
              <Instagram className="h-4 w-4" />
              <span>Custom Order</span>
            </button>

            {/* Admin Profile Button - Rendered ONLY on Storefront when Admin Session is Active */}
            {isStorefrontPage && isAdminAuthenticated && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 text-rose-800 text-xs font-semibold hover:bg-rose-600 hover:text-white transition-all shadow-xs border border-rose-200 group"
                title="Go to Admin Dashboard"
              >
                <ShieldCheck className="w-4 h-4 text-rose-600 group-hover:text-white transition-colors" />
                <span className="hidden sm:inline">Admin Profile</span>
              </Link>
            )}

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setIsCartOpen(true);
              }}
              className="relative p-2.5 rounded-full bg-white text-charcoal shadow-sm hover:shadow-md border border-stone-200 hover:border-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 transition-all duration-200 flex items-center justify-center group"
              aria-label="View Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5 text-stone-700 group-hover:text-rose-600 transition-colors" />
              {totalItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-bounce">
                  {totalItemCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-charcoal hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 transition"
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <nav id="mobile-navigation" aria-label="Mobile navigation" className="md:hidden bg-canvas border-b border-stone-200 px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top duration-200">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            aria-current={isActive('/') ? 'page' : undefined}
            className={`block px-3 py-2 text-base font-medium hover:bg-rose-50 ${navLinkClass(isActive('/'))}`}
          >
            Home
          </Link>
          <Link
            to="/shop"
            onClick={() => setMobileMenuOpen(false)}
            aria-current={isActive('/shop') ? 'page' : undefined}
            className={`block px-3 py-2 text-base font-medium hover:bg-rose-50 ${navLinkClass(isActive('/shop'))}`}
          >
            Our Catalog
          </Link>
          <Link
            to="/#craft"
            onClick={handleCraftClick}
            className={`block px-3 py-2 text-base font-medium hover:bg-rose-50 ${navLinkClass(false)}`}
          >
            Our Craft
          </Link>
          <button
            type="button"
            onClick={openCustomOrder}
            className="flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-base font-semibold text-white hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <Instagram className="h-4 w-4" />
            Custom Order
          </button>
          {isStorefrontPage && isAdminAuthenticated && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-semibold text-rose-700 bg-rose-50 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-rose-600" />
              Admin Profile
            </Link>
          )}
        </nav>
      )}

      {customOrderOpen && createPortal(
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-stone-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCustomOrderOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="custom-order-title"
            className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl border border-rose-100 bg-white p-6 shadow-2xl sm:p-8"
          >
            <button
              type="button"
              onClick={() => setCustomOrderOpen(false)}
              aria-label="Close custom order message"
              className="absolute right-4 top-4 rounded-full p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              autoFocus
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
              <Gift className="h-6 w-6" />
            </div>
            <h2 id="custom-order-title" className="font-serif text-2xl font-bold text-charcoal">
              Have something in mind?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              We can create customized hampers, bouquets, keychains and charms, and more.
            </p>

            <ul className="mt-5 space-y-3 text-sm text-charcoal">
              <li className="flex items-center gap-3"><Gift className="h-4 w-4 text-rose-500" /> Customized hampers</li>
              <li className="flex items-center gap-3"><Flower2 className="h-4 w-4 text-rose-500" /> Handmade bouquets</li>
              <li className="flex items-center gap-3"><KeyRound className="h-4 w-4 text-rose-500" /> Keychains and charms</li>
              <li className="pl-7 text-stone-500">And more creations made just for you</li>
            </ul>

            <p className="mt-5 text-sm leading-relaxed text-stone-600">
              DM us on Instagram and share your idea for the creation.
            </p>
            <a
              href="https://www.instagram.com/direct/t/17848803671640868/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setCustomOrderOpen(false)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
            >
              <Instagram className="h-4 w-4" /> DM us on Instagram
            </a>
          </section>
        </div>,
        document.body
      )}
    </header>
  );
}

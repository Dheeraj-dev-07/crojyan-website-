import React from 'react';
import { Heart, Flower2, Sparkles, ShieldCheck, Instagram } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300 pt-16 pb-12 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-stone-800">

          {/* Brand Story */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-rose-900/50 flex items-center justify-center text-rose-400">
                <Flower2 className="w-5 h-5" />
              </div>
              <span className="font-serif text-2xl font-bold text-white tracking-tight">
                Crojyan
              </span>
            </div>
            <p className="text-stone-400 text-sm leading-relaxed max-w-md">
              Handcrafted forever crochet flower bouquets stitched with love, premium cotton yarn, and endless care. Everlasting blooms created to preserve life's special moments.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-stone-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-amber-400" /> 100% Handcrafted
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Zero Wilting Guarantee
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-4">
              Explore Store
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/" className="hover:text-rose-400 transition-colors">Home Studio</Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-rose-400 transition-colors">Crochet Catalog</Link>
              </li>
              <li>
                <Link to="/shop?availability=available" className="hover:text-rose-400 transition-colors">Ready to Ship</Link>
              </li>
              <li>
                <Link to="/shop?availability=made_to_order" className="hover:text-rose-400 transition-colors">Made to Order</Link>
              </li>
            </ul>
          </div>

          {/* Studio Info & Social Media */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-4">
              Studio & Socials
            </h3>
            <div className="space-y-3 text-sm text-stone-400">
              <p>📍 Artisan Floral Studio</p>
              <p>⏱️ Crafting Lead Time: 3–5 Days</p>
              <div className="pt-1">
                <a
                  href="https://www.instagram.com/crojyan/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-stone-800 text-stone-200 hover:bg-rose-600 hover:text-white transition-all duration-200 text-xs font-semibold border border-stone-700 hover:border-rose-500"
                >
                  <Instagram className="w-4 h-4 text-rose-400 group-hover:text-white" />
                  <span>@crojyan on Instagram</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} Crojyan Crochet Studio. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a
              href="https://www.instagram.com/crojyan/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-rose-400 transition-colors flex items-center gap-1.5"
            >
              <Instagram className="w-4 h-4" /> Instagram
            </a>
            <span className="text-stone-700">•</span>
            <p className="flex items-center gap-1">
              Created with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for flower lovers
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

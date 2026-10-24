import React from 'react';
import { Link } from 'react-router-dom';
import {
  HeartHandshake,
  Clock,
  Truck,
  Flower2,
  Instagram,
  ArrowRight,
  MessageCircle
} from 'lucide-react';
import {
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  TRUST_ITEMS,
  INSTAGRAM_PHOTOS,
  TESTIMONIALS
} from '../config/socialProof';

// Icon lookup map for Trust items
const ICON_MAP = {
  HeartHandshake,
  Clock,
  Truck,
  Flower2
};

export function TrustStrip() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Why Choose Crojyan">
      <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {TRUST_ITEMS.map((item, index) => {
          const IconComponent = ICON_MAP[item.icon] || Flower2;
          return (
            <li
              key={index}
              className="bg-white/80 border border-stone-200/60 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col items-center text-center sm:items-start sm:text-left gap-2.5 hover:border-rose-200 transition-colors duration-300"
            >
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                <IconComponent className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-bold text-charcoal">{item.title}</h3>
                <p className="text-[12px] text-stone-500 leading-snug mt-0.5">{item.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function InstagramGrid() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8" aria-label="Instagram Feed">
      <div className="text-center space-y-1">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal tracking-tight">
          Follow our craft on Instagram
        </h2>
        <div>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-semibold text-rose-600 hover:text-rose-700 transition-colors"
          >
            <span>@{INSTAGRAM_HANDLE}</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
        {INSTAGRAM_PHOTOS.map((photo, index) => (
          <a
            key={index}
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block aspect-square rounded-2xl overflow-hidden border border-stone-200/80 bg-stone-100 shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-md"
            aria-label={`View photo ${index + 1} on Instagram`}
          >
            <img
              src={photo.src}
              alt={photo.alt}
              loading="lazy"
              decoding="async"
              width="400"
              height="400"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <Instagram className="w-8 h-8 text-white drop-shadow-md transform group-hover:scale-110 transition-transform duration-300" />
            </div>
          </a>
        ))}
      </div>

      <div className="text-center pt-2">
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-rose-600 border border-rose-200 font-semibold text-sm shadow-xs hover:bg-rose-50 hover:border-rose-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 transition-all duration-300"
        >
          <Instagram className="w-4 h-4" />
          <span>Follow @{INSTAGRAM_HANDLE}</span>
        </a>
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  if (!TESTIMONIALS || TESTIMONIALS.length === 0) {
    return null;
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8" aria-label="Customer Testimonials">
      <div className="text-center">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal">
          Loved by Flower Lovers
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {TESTIMONIALS.map((item, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
            <p className="text-stone-600 text-sm italic">"{item.text}"</p>
            <p className="text-charcoal font-serif font-bold text-xs">— {item.name}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ClosingCta() {
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center py-10 space-y-6" aria-label="Closing Call To Action">
      <div className="bg-rose-50/50 rounded-3xl p-8 sm:p-12 border border-rose-100 space-y-6">
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal tracking-tight">
          find your forever KEEPSAKE
        </h2>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/shop"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-rose-600 text-white font-semibold text-sm shadow-md hover:bg-rose-700 transition duration-300"
          >
            <span>Explore Collections</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-stone-600 hover:text-rose-600 transition-colors py-2"
          >
            <MessageCircle className="w-4 h-4 text-rose-500" />
            <span>Want a custom bouquet or a product made from your reference? Message us on Instagram</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export default function SocialProofSection() {
  return (
    <div className="space-y-16 pt-6">
      <TrustStrip />
      <InstagramGrid />
      <TestimonialsSection />
      <ClosingCta />
    </div>
  );
}

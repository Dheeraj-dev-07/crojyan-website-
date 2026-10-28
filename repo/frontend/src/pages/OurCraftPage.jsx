import React from 'react';
import { Link } from 'react-router-dom';
import {
  HeartHandshake,
  Clock,
  Truck,
  Flower2,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { CRAFT_STORY, CRAFT_PROCESS_PHOTOS } from '../config/ourCraft';
import { TRUST_ITEMS } from '../config/socialProof';

const ICON_MAP = {
  HeartHandshake,
  Clock,
  Truck,
  Flower2
};

export default function OurCraftPage() {
  return (
    <div className="py-12 sm:py-16 space-y-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Page Header & Story */}
      <section className="text-center max-w-2xl mx-auto space-y-5" aria-labelledby="our-craft-heading">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-100/80 border border-rose-200/80 text-rose-800 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-rose-600" />
          <span>Handmade in Indore</span>
        </div>

        <h1 id="our-craft-heading" className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-charcoal tracking-tight">
          Our Craft
        </h1>

        <p className="text-stone-600 text-base sm:text-lg leading-relaxed">
          {CRAFT_STORY}
        </p>
      </section>

      {/* Trust Items / Artisan Values */}
      <section aria-label="Our Craft Values">
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
                  <h2 className="font-serif text-sm font-bold text-charcoal">{item.title}</h2>
                  <p className="text-[12px] text-stone-500 leading-snug mt-0.5">{item.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Process Photos Gallery (rendered ONLY if photos exist in config) */}
      {Array.isArray(CRAFT_PROCESS_PHOTOS) && CRAFT_PROCESS_PHOTOS.length > 0 && (
        <section aria-labelledby="process-gallery-heading" className="space-y-6">
          <div className="text-center">
            <h2 id="process-gallery-heading" className="font-serif text-2xl sm:text-3xl font-bold text-charcoal">
              Behind the Stitches
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
            {CRAFT_PROCESS_PHOTOS.map((photo, idx) => (
              <div
                key={idx}
                className="aspect-square rounded-2xl overflow-hidden border border-stone-200/80 bg-stone-100 shadow-xs"
              >
                <img
                  src={photo.src}
                  alt={photo.alt || `Crojyan craft process photo ${idx + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Closing CTA linking to Catalog */}
      <section className="text-center pt-4" aria-label="Explore Catalog">
        <Link
          to="/shop"
          className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-rose-600 text-white font-medium hover:bg-rose-700 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
        >
          <span>Explore bouquets</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}

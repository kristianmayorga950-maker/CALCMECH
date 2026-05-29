import React, { useState, useEffect } from 'react';
import type { ActiveTab } from '@/context/CalculatorContext';

const SLIDES = [
  'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=1800&q=80',
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1800&q=80',
  'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=1800&q=80',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1800&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1800&q=80',
];

const CARDS: {
  id: ActiveTab;
  icon: string;
  title: string;
  subtitle: string;
  desc: string;
}[] = [
  {
    id: 'power',
    icon: '⚙️',
    title: 'Tornillo de Potencia',
    subtitle: 'Shigley §8-1 · §8-2',
    desc: 'Acme y cuadrada: torques TR/TL con secα, eficiencia, autobloqueo, Von Mises en el cuerpo y esfuerzos en el filete.',
  },
  {
    id: 'tension',
    icon: '🔩',
    title: 'Junta a Tensión',
    subtitle: 'Shigley §8-3 a §8-11',
    desc: 'Rigideces kb, km (Wileman), constante C, precarga Fi, factores np/n0, torque de apriete y fatiga (Goodman/Gerber/ASME).',
  },
  {
    id: 'shear',
    icon: '✂️',
    title: 'Junta a Cortante',
    subtitle: 'Shigley §8-12',
    desc: 'Patrón de pernos con carga excéntrica: cortante directo + por momento, aplastamiento y tensión en el área neta.',
  },
];

interface LandingPageProps {
  onEnter: (tab: 'power' | 'tension' | 'shear') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  type CardTab = 'power' | 'tension' | 'shear';
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCurrent(p => (p + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-navy-950 flex flex-col">

      {/* ── Slideshow ── */}
      <div className="absolute inset-0 z-0">
        {SLIDES.map((url, i) => (
          <div
            key={i}
            className={`slide-image ${i === current ? 'active' : 'inactive'}`}
            style={{ backgroundImage: `url(${url})` }}
          />
        ))}
        <div className="hero-overlay absolute inset-0" />
      </div>

      {/* ── Nav bar ── */}
      <nav className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-5">
        <span className="font-hero text-2xl text-white tracking-widest select-none">
          CALC<span className="text-orange-500">MECH</span>
        </span>
        <img
          src="/uis-logo.png"
          alt="Universidad Industrial de Santander"
          className="h-12 sm:h-14 object-contain drop-shadow-lg"
        />
      </nav>

      {/* ── Hero content ── */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-6 text-center pb-12">

        <p className="font-title text-orange-400 text-xs tracking-[0.35em] uppercase mb-5 animate-fade-in-up"
           style={{ animationDelay: '0.1s' }}>
          Ingeniería Mecánica · Diseño de Máquinas
        </p>

        <h1
          className="font-hero text-7xl sm:text-8xl lg:text-[9rem] text-white leading-none mb-4 animate-fade-in-up"
          style={{ textShadow: '0 4px 32px rgba(0,0,0,0.8)', animationDelay: '0.2s' }}
        >
          TORNILLOS<br />
          <span className="text-orange-500" style={{ textShadow: '0 0 64px #ff980080' }}>
            MECÁNICOS
          </span>
        </h1>

        <p className="font-title text-white/80 text-lg sm:text-xl font-medium tracking-wide mb-4 animate-fade-in-up"
           style={{ animationDelay: '0.3s' }}>
          Basada en Shigley &mdash; <em>Diseño en Ingeniería Mecánica, 9ª Edición</em>
        </p>

        <div className="accent-bar mx-auto mb-12 animate-fade-in-up" style={{ animationDelay: '0.4s' }} />

        {/* Calculator cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl animate-fade-in-up"
             style={{ animationDelay: '0.5s' }}>
          {CARDS.map(card => (
            <div
              key={card.id}
              className="calc-card p-8 group text-left"
              onClick={() => onEnter(card.id as CardTab)}
            >
              <div className="text-5xl mb-5 transition-transform duration-300 group-hover:scale-110 select-none">
                {card.icon}
              </div>
              <div className="accent-bar mb-4" />
              <h3 className="font-title text-xl font-bold text-white mb-1 tracking-wide">
                {card.title}
              </h3>
              <p className="text-[11px] font-title text-orange-400 uppercase tracking-[0.2em] mb-3">
                {card.subtitle}
              </p>
              <p className="text-white/70 text-sm leading-relaxed">{card.desc}</p>
              <div className="mt-6 flex items-center gap-2 text-orange-400 text-sm font-title font-semibold">
                <span>CALCULAR</span>
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Slide dots ── */}
      <div className="relative z-20 flex justify-center gap-2 pb-6">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Imagen ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? 'bg-orange-500 w-4' : 'bg-white/50 w-1.5'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

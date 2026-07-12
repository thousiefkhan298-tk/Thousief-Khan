import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'motion/react';
import { ArrowRight, Dumbbell, Flame, HeartPulse, Trophy, Star, ChevronDown, Instagram, Mail, Phone } from 'lucide-react';
import { SpeedFitLogo } from '../components/SpeedFitLogo';

const HERO_VIDEO = 'https://videos.pexels.com/video-files/855828/855828-hd_1920_1080_30fps.mp4';
const ABOUT_VIDEO = 'https://videos.pexels.com/video-files/4367577/4367577-hd_1920_1080_30fps.mp4';

const IMG = {
  treadmill: 'https://images.pexels.com/photos/1954524/pexels-photo-1954524.jpeg?auto=compress&w=1200',
  deadlift: 'https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?auto=compress&w=1200',
  barbell: 'https://images.pexels.com/photos/2261477/pexels-photo-2261477.jpeg?auto=compress&w=1200',
  kettlebell: 'https://images.pexels.com/photos/416809/pexels-photo-416809.jpeg?auto=compress&w=1200',
};

/* ---------- Animated counter ---------- */
const Counter: React.FC<{ to: number; suffix?: string; label: string }> = ({ to, suffix = '', label }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const t0 = performance.now();
    const dur = 1600;
    const tick = (t: number) => {
      const p = Math.min((t - t0) / dur, 1);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, to]);
  return (
    <div ref={ref} className="text-center">
      <div className="font-display text-4xl md:text-5xl text-white tracking-wide">
        {n}
        <span className="text-red-600">{suffix}</span>
      </div>
      <div className="font-mono uppercase tracking-widest text-[11px] text-[#94a3b8] mt-2">{label}</div>
    </div>
  );
};

/* ---------- Section heading ---------- */
const Heading: React.FC<{ kicker: string; title: React.ReactNode }> = ({ kicker, title }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: 0.7, ease: 'easeOut' }}
    className="mb-14 text-center"
  >
    <span className="font-mono uppercase tracking-[0.35em] text-red-600 text-xs">{kicker}</span>
    <h2 className="font-display text-4xl md:text-6xl text-white uppercase mt-4 leading-tight">{title}</h2>
  </motion.div>
);

const fadeUp = {
  initial: { opacity: 0, y: 50 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
};

const Landing: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const yBg = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const heroFade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const programs = [
    {
      icon: Dumbbell,
      img: IMG.deadlift,
      title: '1-on-1 Personal Training',
      desc: 'Private coaching sessions built around your body, your goals and your schedule. Every rep supervised, every session tracked in your dashboard.',
    },
    {
      icon: Flame,
      img: IMG.kettlebell,
      title: 'Online Coaching',
      desc: 'Train anywhere with custom workout plans, video exercise guides, weekly check-ins and direct chat with your coach — all inside the app.',
    },
    {
      icon: HeartPulse,
      img: IMG.treadmill,
      title: '12-Week Transformation',
      desc: 'The complete package: training, nutrition guidance, progress photos, BMI and body metrics tracked week by week until you hit your goal.',
    },
  ];

  const testimonials = [
    {
      name: 'Arjun R.',
      result: 'Lost 14 kg in 16 weeks',
      quote: 'The structure changed everything. Workouts, meals, check-ins — it was all in one place and Thousief kept me accountable every single week.',
    },
    {
      name: 'Priya S.',
      result: 'First pull-up at age 34',
      quote: 'I trained online from another city and it still felt personal. The video guides and weekly reviews made me stronger than I have ever been.',
    },
    {
      name: 'Mohammed F.',
      result: 'Gained 8 kg lean muscle',
      quote: 'No junk volume, no guesswork. Every block had a purpose and the progress charts in the app proved it was working.',
    },
  ];

  return (
    <div className="bg-[#0d0d0f] text-white overflow-x-hidden">
      {/* marquee keyframes */}
      <style>{`
        @keyframes tk-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .tk-marquee { animation: tk-marquee 22s linear infinite; }
      `}</style>

      {/* ---------- NAV ---------- */}
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-[#0d0d0f]/70 border-b border-white/5"
      >
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <SpeedFitLogo />
          <nav className="hidden md:flex items-center gap-8 font-mono uppercase text-xs tracking-widest text-[#cbd5e1]">
            <a href="#programs" className="hover:text-red-500 transition-colors">Programs</a>
            <a href="#coach" className="hover:text-red-500 transition-colors">The Coach</a>
            <a href="#results" className="hover:text-red-500 transition-colors">Results</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="font-mono uppercase text-xs tracking-widest text-[#cbd5e1] hover:text-white px-3 py-2 transition-colors">
              Log in
            </Link>
            <Link
              to="/signup"
              className="bg-red-600 hover:bg-red-500 text-white font-bold uppercase text-xs tracking-widest px-5 py-2.5 rounded-full transition-all hover:shadow-[0_0_25px_rgba(230,0,0,0.5)]"
            >
              Start now
            </Link>
          </div>
        </div>
      </motion.header>

      {/* ---------- HERO ---------- */}
      <section ref={heroRef} className="relative h-[100svh] min-h-[640px] flex items-center justify-center overflow-hidden">
        <motion.div style={{ y: yBg }} className="absolute inset-0">
          <video
            className="w-full h-full object-cover"
            src={HERO_VIDEO}
            poster={IMG.barbell}
            autoPlay
            muted
            loop
            playsInline
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d0d0f]/80 via-[#0d0d0f]/60 to-[#0d0d0f]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(13,13,15,0.55)_100%)]" />

        <motion.div style={{ opacity: heroFade }} className="relative z-10 text-center px-5 max-w-5xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="font-mono uppercase tracking-[0.4em] text-red-500 text-xs md:text-sm mb-6"
          >
            Thousief Khan &bull; Personal Trainer
          </motion.p>
          <h1 className="font-display uppercase leading-[0.95] text-6xl md:text-8xl lg:text-9xl">
            {['Build', 'To', 'Transform'].map((w, i) => (
              <motion.span
                key={w}
                initial={{ opacity: 0, y: 70 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 + i * 0.18, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className={`inline-block mr-4 md:mr-6 ${i === 2 ? 'text-red-600' : 'text-white'}`}
              >
                {w}
              </motion.span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="mt-6 text-[#cbd5e1] max-w-2xl mx-auto text-base md:text-lg font-light"
          >
            Elite coaching, custom programming and relentless accountability — in the gym or online.
            Your transformation is engineered, not left to chance.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.45, duration: 0.7 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/signup"
              className="group bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-widest text-sm px-10 py-4 rounded-full flex items-center gap-3 transition-all hover:shadow-[0_0_40px_rgba(230,0,0,0.6)] hover:scale-105"
            >
              Begin your transformation
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#programs"
              className="border border-white/25 hover:border-white/60 text-white font-mono uppercase tracking-widest text-xs px-8 py-4 rounded-full transition-colors"
            >
              View programs
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[#94a3b8]"
        >
          <ChevronDown size={26} />
        </motion.div>
      </section>

      {/* ---------- MARQUEE ---------- */}
      <div className="border-y border-white/5 bg-[#141417] py-4 overflow-hidden">
        <div className="tk-marquee flex whitespace-nowrap w-max">
          {[0, 1].map((k) => (
            <div key={k} className="flex items-center">
              {['Strength', 'Discipline', 'Nutrition', 'Consistency', 'Results', 'Mindset'].map((w) => (
                <span key={w + k} className="font-display uppercase text-2xl md:text-3xl text-white/10 mx-8 flex items-center gap-8">
                  {w} <span className="text-red-600/60 text-xl">&#10022;</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ---------- STATS ---------- */}
      <section className="py-20 px-5">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
          <Counter to={200} suffix="+" label="Clients coached" />
          <Counter to={8} suffix="yrs" label="Experience" />
          <Counter to={5000} suffix="+" label="Sessions delivered" />
          <Counter to={97} suffix="%" label="Goal success rate" />
        </div>
      </section>

      {/* ---------- PROGRAMS ---------- */}
      <section id="programs" className="py-24 px-5 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(230,0,0,0.07),transparent_45%)]" />
        <div className="max-w-7xl mx-auto relative">
          <Heading kicker="Programs" title={<>Choose your <span className="text-red-600">battle</span></>} />
          <div className="grid md:grid-cols-3 gap-8">
            {programs.map((p, i) => (
              <motion.div
                key={p.title}
                {...fadeUp}
                transition={{ duration: 0.7, delay: i * 0.15 }}
                whileHover={{ y: -10 }}
                className="group rounded-2xl overflow-hidden bg-[#141417] border border-white/5 hover:border-red-600/40 hover:shadow-[0_20px_60px_rgba(230,0,0,0.15)] transition-all"
              >
                <div className="h-52 overflow-hidden relative">
                  <img
                    src={p.img}
                    alt={p.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141417] to-transparent" />
                  <div className="absolute bottom-4 left-4 w-11 h-11 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_20px_rgba(230,0,0,0.5)]">
                    <p.icon size={20} className="text-white" />
                  </div>
                </div>
                <div className="p-7">
                  <h3 className="font-display uppercase text-xl text-white tracking-wide">{p.title}</h3>
                  <p className="text-[#94a3b8] text-sm leading-relaxed mt-3">{p.desc}</p>
                  <Link to="/signup" className="inline-flex items-center gap-2 text-red-500 hover:text-red-400 font-mono uppercase text-xs tracking-widest mt-5">
                    Get started <ArrowRight size={14} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- COACH / ABOUT ---------- */}
      <section id="coach" className="py-24 px-5 bg-[#141417] border-y border-white/5">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-14 items-center">
          <motion.div {...fadeUp} transition={{ duration: 0.8 }} className="relative">
            <div className="rounded-2xl overflow-hidden border border-white/10">
              <video className="w-full h-full object-cover aspect-[4/5]" src={ABOUT_VIDEO} poster={IMG.deadlift} autoPlay muted loop playsInline />
            </div>
            <div className="absolute -bottom-6 -right-4 md:-right-8 bg-red-600 rounded-2xl px-6 py-4 shadow-[0_10px_40px_rgba(230,0,0,0.4)]">
              <div className="font-display text-3xl text-white">TK</div>
              <div className="font-mono uppercase text-[10px] tracking-widest text-white/85">Speed Fit Coaching</div>
            </div>
          </motion.div>
          <motion.div {...fadeUp} transition={{ duration: 0.8, delay: 0.15 }}>
            <span className="font-mono uppercase tracking-[0.35em] text-red-600 text-xs">The Coach</span>
            <h2 className="font-display uppercase text-4xl md:text-5xl text-white mt-4 leading-tight">
              Trained by science.<br />Driven by <span className="text-red-600">results.</span>
            </h2>
            <p className="text-[#94a3b8] mt-6 leading-relaxed">
              I&apos;m Thousief Khan — a certified personal trainer who believes a transformation is built,
              not wished for. Every client gets an engineered plan: structured training blocks, nutrition
              targets, and weekly data reviews inside a private app built just for my clients.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                'Custom programs updated every week from your logs',
                'Progress photos, BMI and body metrics tracked in-app',
                'Direct chat with your coach — never train alone',
                'Train in person or 100% online, anywhere in the world',
              ].map((f, i) => (
                <motion.li
                  key={f}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="flex items-start gap-3 text-sm text-[#cbd5e1]"
                >
                  <Trophy size={16} className="text-red-500 mt-0.5 shrink-0" /> {f}
                </motion.li>
              ))}
            </ul>
            <Link
              to="/signup"
              className="inline-flex items-center gap-3 mt-10 bg-white text-black font-bold uppercase tracking-widest text-xs px-8 py-4 rounded-full hover:bg-red-600 hover:text-white transition-colors"
            >
              Work with me <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ---------- TESTIMONIALS ---------- */}
      <section id="results" className="py-24 px-5">
        <div className="max-w-7xl mx-auto">
          <Heading kicker="Results" title={<>Proof over <span className="text-red-600">promises</span></>} />
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                {...fadeUp}
                transition={{ duration: 0.7, delay: i * 0.15 }}
                className="bg-[#141417] border border-white/5 rounded-2xl p-8 hover:border-red-600/30 transition-colors"
              >
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} size={15} className="text-red-500 fill-red-500" />
                  ))}
                </div>
                <p className="text-[#cbd5e1] text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6 pt-5 border-t border-white/5">
                  <div className="text-white font-bold text-sm">{t.name}</div>
                  <div className="font-mono uppercase text-[10px] tracking-widest text-red-500 mt-1">{t.result}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="relative py-28 px-5 overflow-hidden">
        <img src={IMG.barbell} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-[#0d0d0f]/85" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(230,0,0,0.15),transparent_60%)]" />
        <motion.div {...fadeUp} transition={{ duration: 0.8 }} className="relative max-w-3xl mx-auto text-center">
          <h2 className="font-display uppercase text-5xl md:text-7xl text-white leading-tight">
            Your only limit<br />is <span className="text-red-600">you.</span>
          </h2>
          <p className="text-[#cbd5e1] mt-6 max-w-xl mx-auto">
            Spots are limited each month so every client gets full attention. Claim yours and start training this week.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-3 mt-10 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-widest text-sm px-12 py-5 rounded-full transition-all hover:shadow-[0_0_50px_rgba(230,0,0,0.6)] hover:scale-105"
          >
            Start today <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="border-t border-white/5 bg-[#0d0d0f] py-12 px-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <SpeedFitLogo />
          <div className="flex items-center gap-6 text-[#94a3b8]">
            <a href="mailto:thousiefkhan298@gmail.com" className="hover:text-red-500 transition-colors" aria-label="Email">
              <Mail size={18} />
            </a>
            <a href="tel:+910000000000" className="hover:text-red-500 transition-colors" aria-label="Phone">
              <Phone size={18} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-red-500 transition-colors" aria-label="Instagram">
              <Instagram size={18} />
            </a>
          </div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-[#94a3b8] text-center md:text-right">
            &copy; {new Date().getFullYear()} Speed Fit &bull; Build to Transform
            <div className="mt-1 space-x-4">
              <a href="/privacy-policy.html" className="hover:text-white">Privacy</a>
              <a href="/terms-of-service.html" className="hover:text-white">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

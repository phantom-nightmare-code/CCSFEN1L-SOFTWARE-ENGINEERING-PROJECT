import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="space-y-16 pb-16">

      {/* ==================== HERO ==================== */}
      <section className="max-w-5xl mx-auto px-6 pt-12 text-center space-y-6">
        <img
          src="/logo.png"
          alt="FitForge — Your move, your progress"
          className="w-40 h-40 mx-auto rounded-2xl shadow-lg object-cover"
        />
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Welcome to FitForge
        </h1>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Track workouts, forge routines, monitor progress, rent gear, and manage your gym
          membership — all in one place.
        </p>
        <p className="text-sm text-brand-600 font-semibold tracking-widest uppercase">
          Your move, your progress.
        </p>

        {!user && (
          <div className="flex gap-3 justify-center pt-2 flex-wrap">
            <Link
              to="/register"
              className="px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium shadow-lg transition"
            >
              Get Started — it's free
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              I have an account
            </Link>
          </div>
        )}

        {user && (
          <div className="flex gap-3 justify-center pt-2 flex-wrap">
            <Link
              to="/workouts"
              className="px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium shadow-lg transition"
            >
              Log a workout
            </Link>
            <Link
              to="/analytics"
              className="px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              View my progress
            </Link>
          </div>
        )}
      </section>

      {/* ==================== ABOUT ==================== */}
      <section className="max-w-3xl mx-auto px-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow border border-gray-100 dark:border-gray-800 p-8 md:p-10 space-y-5">
          <div>
            <h2 className="text-3xl font-bold mb-2">About FitForge</h2>
            <div className="w-20 h-1 bg-brand-600 rounded-full" />
          </div>

          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            <strong className="text-brand-600">FitForge</strong> is an all-in-one gym
            companion. Most fitness apps only do one thing — track workouts, manage
            memberships, or sell coaching. FitForge brings all of it together: a
            workout tracker, a routine builder, an analytics dashboard, a membership
            system, equipment rentals, and a personal coaching tool, all in a single
            platform.
          </p>

          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Every workout you log automatically updates your personal records, feeds
            your progress charts, and stays visible to your coach. Your membership and
            rentals are managed right next to your training data — so you're never
            juggling five different apps or scribbling sets on paper.
          </p>

          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            Whether you're walking into the gym for the first time or chasing a new
            PR, FitForge gives you the tools to <em>forge</em> yourself — one rep at
            a time.
          </p>

          {!user && (
            <div className="pt-2">
              <Link
                to="/register"
                className="inline-block px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium transition"
              >
                Join FitForge
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ==================== FEATURES ==================== */}
      <section className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">Everything in one place</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Six core features built for real gym-goers.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: '🏋️',
              title: 'Track Workouts',
              desc: 'Log every set, rep, and weight. Automatic PR detection with Epley 1RM. Full history with expandable details.',
            },
            {
              icon: '📋',
              title: 'Build Routines',
              desc: 'Create reusable Push / Pull / Legs templates. Add exercises with target sets and reps, then launch a workout in one click.',
            },
            {
              icon: '📊',
              title: 'Smart Analytics',
              desc: "Daily volume charts, muscle balance breakdown, and a running table of every personal record you've hit.",
            },
            {
              icon: '💳',
              title: 'Membership & Payments',
              desc: 'Walk-in, monthly, or yearly plans. Pay via GCash, Maya, bank, card, or cash. QR verification and receipts included.',
            },
            {
              icon: '🏋️',
              title: 'Equipment Rentals',
              desc: 'Reserve barbells, racks, dumbbells, and cardio machines by the hour. Live stock tracking and automatic receipts.',
            },
            {
              icon: '🎯',
              title: 'Personal Coaching',
              desc: 'Get assigned a coach who can view your workouts and leave detailed feedback with ratings and notes.',
            },
          ].map(c => (
            <div
              key={c.title}
              className="p-6 bg-white dark:bg-gray-900 rounded-xl shadow border border-gray-100 dark:border-gray-800 hover:border-brand-500 transition"
            >
              <div className="text-4xl mb-3">{c.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{c.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {c.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">How it works</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            From sign-up to first PR in four steps.
          </p>
        </div>

        <div className="space-y-6">
          {[
            {
              n: '1',
              title: 'Create your account',
              desc: 'Register with your email in seconds. Add a birthday for age-based insights.',
            },
            {
              n: '2',
              title: 'Pick a plan',
              desc: 'Subscribe to walk-in, monthly, or yearly membership. Pay with any method.',
            },
            {
              n: '3',
              title: 'Log workouts',
              desc: 'Track sets, reps, and weight. Watch your volume charts climb and PRs fall.',
            },
            {
              n: '4',
              title: 'Level up with a coach',
              desc: 'Get assigned a coach who reviews your history and sends detailed feedback.',
            },
          ].map(s => (
            <div key={s.n} className="flex gap-5 items-start">
              <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold shrink-0">
                {s.n}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{s.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      {!user && (
        <section className="max-w-3xl mx-auto px-6 text-center space-y-4">
          <h2 className="text-3xl font-bold">Start forging today</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Free to sign up. No credit card. Cancel anytime.
          </p>
          <Link
            to="/register"
            className="inline-block px-8 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium shadow-lg transition"
          >
            Create your free account
          </Link>
        </section>
      )}
    </div>
  );
}
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { miscApi } from '../services/api';

export default function NewsletterForm({ dark = false }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ status: 'idle', message: '' });

  const submit = async (e) => {
    e.preventDefault();
    setState({ status: 'loading', message: '' });
    try {
      await miscApi.subscribe(email.trim());
      setState({ status: 'done', message: 'Thank you! You are on the list.' });
      setEmail('');
    } catch (err) {
      setState({ status: 'error', message: err.errors?.[0]?.message || err.message });
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <div className={`flex items-center gap-2 rounded-full p-1.5 ${dark ? 'bg-white/10' : 'border-[1.5px] border-line bg-white'}`}>
        <input
          id="newsletter-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          className={`min-w-0 flex-1 bg-transparent px-4 py-2 text-sm outline-none ${dark ? 'text-white placeholder:text-white/60' : 'placeholder:text-muted/70'}`}
        />
        <button type="submit" disabled={state.status === 'loading'} className="btn btn-gold btn-sm shrink-0" aria-label="Subscribe">
          Subscribe <ArrowRight size={15} />
        </button>
      </div>
      {state.message && (
        <p className={`mt-2 px-4 text-sm ${state.status === 'error' ? (dark ? 'text-blush' : 'text-rose') : dark ? 'text-butter' : 'text-olive'}`} role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}

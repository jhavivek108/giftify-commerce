import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { InstagramIcon, WhatsAppIcon } from '../components/ui';
import { miscApi } from '../services/api';
import { fieldErrors } from '../utils/format';
import { BRAND_NAME, INSTAGRAM_HANDLE, INSTAGRAM_URL, whatsappDisplayNumber, whatsappLink } from '../utils/whatsapp';

const EMPTY = { name: '', email: '', phone: '', company: '', subject: '', message: '' };

function ContactForm({ type }) {
  const business = type === 'business';
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState({ status: 'idle', error: null });
  const errors = fieldErrors(state.error);
  const bind = (name) => ({ id: `${type}-${name}`, name, value: form[name], onChange: (e) => setForm({ ...form, [name]: e.target.value }), 'aria-invalid': Boolean(errors[name]) });

  const submit = async (e) => {
    e.preventDefault();
    setState({ status: 'saving', error: null });
    try {
      await miscApi.contact({
        type,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        company: business ? form.company.trim() || undefined : undefined,
        subject: form.subject.trim() || undefined,
        message: form.message.trim(),
      });
      setForm(EMPTY);
      setState({ status: 'done', error: null });
    } catch (error) {
      setState({ status: 'error', error });
    }
  };

  if (state.status === 'done') {
    return (
      <div className="rounded-3xl bg-[#E8F2E6] px-6 py-10 text-center text-[#1E4A26]" role="status">
        <CheckCircle2 size={40} className="mx-auto" />
        <p className="mt-3 font-display text-2xl font-bold">Message sent</p>
        <p className="mt-1">Thank you for writing in. We will get back to you soon.</p>
        <button className="btn btn-outline btn-sm mt-5" onClick={() => setState({ status: 'idle', error: null })}>
          Send another
        </button>
      </div>
    );
  }

  const err = (name) => errors[name] && <p className="field-error">{errors[name]}</p>;

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div>
        <label className="label" htmlFor={`${type}-name`}>
          Your name
        </label>
        <input className="input" required autoComplete="name" {...bind('name')} />
        {err('name')}
      </div>
      <div>
        <label className="label" htmlFor={`${type}-email`}>
          Email
        </label>
        <input className="input" type="email" required autoComplete="email" {...bind('email')} />
        {err('email')}
      </div>
      <div>
        <label className="label" htmlFor={`${type}-phone`}>
          Phone <span className="font-medium text-muted">(optional)</span>
        </label>
        <input className="input" type="tel" autoComplete="tel" {...bind('phone')} />
        {err('phone')}
      </div>
      {business ? (
        <div>
          <label className="label" htmlFor={`${type}-company`}>
            Business / organisation
          </label>
          <input className="input" autoComplete="organization" {...bind('company')} />
          {err('company')}
        </div>
      ) : (
        <div>
          <label className="label" htmlFor={`${type}-subject`}>
            Subject <span className="font-medium text-muted">(optional)</span>
          </label>
          <input className="input" {...bind('subject')} />
          {err('subject')}
        </div>
      )}
      {business && (
        <div className="sm:col-span-2">
          <label className="label" htmlFor={`${type}-subject`}>
            What is it about?
          </label>
          <input className="input" placeholder="Bulk order, return gifts, event decor, collaboration…" {...bind('subject')} />
          {err('subject')}
        </div>
      )}
      <div className="sm:col-span-2">
        <label className="label" htmlFor={`${type}-message`}>
          Message
        </label>
        <textarea className="input min-h-32" required minLength={10} maxLength={2000} placeholder={business ? 'Tell us quantities, dates and any colours or designs you have in mind.' : 'How can we help?'} {...bind('message')} />
        {err('message')}
      </div>
      {state.error && Object.keys(errors).length === 0 && (
        <p className="field-error sm:col-span-2" role="alert">
          {state.error.message}
        </p>
      )}
      <div className="sm:col-span-2">
        <button className="btn btn-primary" disabled={state.status === 'saving'}>
          {state.status === 'saving' ? 'Sending…' : business ? 'Send business enquiry' : 'Send message'}
        </button>
      </div>
    </form>
  );
}

export default function Contact() {
  const [tab, setTab] = useState('general');

  return (
    <div className="container-page pb-6 pt-10 sm:pt-14">
      <header className="mx-auto max-w-2xl text-center">
        <p className="eyebrow text-[#B8935A]">Contact us</p>
        <h1 className="mt-4 text-5xl sm:text-6xl">Say hello</h1>
        <p className="mt-4 text-lg text-muted">Need a different colour or a customised design? Just ask us.</p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
          <a href={whatsappLink(`Hi ${BRAND_NAME}!`)} target="_blank" rel="noreferrer" className="group rounded-[32px] bg-[#D2E5CF] p-8 text-[#1E4A26] transition-shadow hover:shadow-lift">
            <WhatsAppIcon size={34} />
            <p className="eyebrow mt-5 opacity-75">WhatsApp</p>
            <p className="mt-1 font-display text-3xl font-bold">{whatsappDisplayNumber()}</p>
            <p className="mt-2">The quickest way to order or ask a question.</p>
            <span className="btn btn-white btn-sm mt-5">Chat on WhatsApp</span>
          </a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="group rounded-[32px] bg-[#F5C9D1] p-8 text-[#6E1420] transition-shadow hover:shadow-lift">
            <InstagramIcon size={34} />
            <p className="eyebrow mt-5 opacity-75">Instagram</p>
            <p className="mt-1 font-display text-3xl font-bold">{INSTAGRAM_HANDLE}</p>
            <p className="mt-2">New designs, festive drops and DMs to order.</p>
            <span className="btn btn-white btn-sm mt-5">Visit profile</span>
          </a>
        </div>

        <div className="surface p-6 sm:p-9 lg:col-span-7">
          <p className="font-display text-2xl font-bold">{BRAND_NAME}</p>
          <div className="mb-6 mt-4 inline-flex rounded-full bg-cream p-1" role="tablist" aria-label="Enquiry type">
            {[
              ['general', 'General message'],
              ['business', 'Business enquiry'],
            ].map(([key, label]) => (
              <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={`rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${tab === key ? 'bg-olive text-white' : ''}`}>
                {label}
              </button>
            ))}
          </div>
          <ContactForm key={tab} type={tab} />
        </div>
      </div>
    </div>
  );
}

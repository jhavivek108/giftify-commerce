import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fieldErrors } from '../utils/format';

/**
 * One form for three screens: customer sign-in, customer registration and admin sign-in.
 * There is deliberately no admin registration: admins are created on the server only.
 */
export default function Auth({ mode = 'login' }) {
  const { user, ready, isAdmin, login, register, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const admin = mode === 'admin';
  const registering = mode === 'register';
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [state, setState] = useState({ saving: false, error: null });
  const errors = fieldErrors(state.error);
  const from = location.state?.from || (admin ? '/admin' : '/');

  if (ready && user && !state.saving) {
    if (!admin) return <Navigate to={from} replace />;
    if (isAdmin) return <Navigate to="/admin" replace />;
  }

  const bind = (name) => ({ id: name, name, value: form[name], onChange: (e) => setForm({ ...form, [name]: e.target.value }), 'aria-invalid': Boolean(errors[name]) });

  const submit = async (e) => {
    e.preventDefault();
    setState({ saving: true, error: null });
    try {
      const signedIn = registering
        ? await register({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || undefined, password: form.password })
        : await login({ email: form.email.trim(), password: form.password });
      if (admin && signedIn.role !== 'admin') {
        await logout();
        setState({ saving: false, error: { message: 'This account does not have admin access.' } });
        return;
      }
      navigate(from, { replace: true });
    } catch (error) {
      setState({ saving: false, error });
    }
  };

  const title = admin ? 'Admin sign in' : registering ? 'Create your account' : 'Welcome back';

  return (
    <div className="container-page grid place-items-center py-12 sm:py-20">
      <div className="surface w-full max-w-md p-7 sm:p-10">
        <img src="/images/brand/logo.png" alt="" className="mx-auto h-20 w-20" />
        <h1 className="mt-4 text-center text-4xl">{title}</h1>
        <p className="mt-2 text-center text-muted">
          {admin ? 'For the shop owner only.' : registering ? 'Save your wishlist and track your orders.' : 'Sign in to see your orders and saved items.'}
        </p>

        {admin && user && !isAdmin && <p className="mt-4 rounded-2xl bg-[#FDF3D2] px-4 py-3 text-sm text-[#5A3C00]">You are signed in as a customer. Sign in with an admin account to continue.</p>}

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          {registering && (
            <div>
              <label className="label" htmlFor="name">
                Full name
              </label>
              <input className="input" required autoComplete="name" {...bind('name')} />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input className="input" type="email" required autoComplete="email" {...bind('email')} />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>
          {registering && (
            <div>
              <label className="label" htmlFor="phone">
                Phone <span className="font-medium text-muted">(optional)</span>
              </label>
              <input className="input" type="tel" autoComplete="tel" {...bind('phone')} />
              {errors.phone && <p className="field-error">{errors.phone}</p>}
            </div>
          )}
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input className="input" type="password" required minLength={8} autoComplete={registering ? 'new-password' : 'current-password'} {...bind('password')} />
            {registering && !errors.password && <p className="mt-1 text-xs text-muted">At least 8 characters.</p>}
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>

          {state.error && Object.keys(errors).length === 0 && (
            <p className="rounded-2xl bg-[#FBE9EC] px-4 py-3 text-sm font-medium text-[#6E1420]" role="alert">
              {state.error.message}
            </p>
          )}

          <button className="btn btn-primary w-full" disabled={state.saving}>
            {state.saving ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {!admin && (
          <p className="mt-6 text-center text-sm">
            {registering ? 'Already have an account? ' : 'New here? '}
            <Link to={registering ? '/login' : '/register'} state={location.state} className="font-bold underline">
              {registering ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

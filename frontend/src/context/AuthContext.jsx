import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, configApi } from '../services/api';

const AuthContext = createContext(null);

const DEFAULT_CONFIG = { deliveryCharge: 0, freeDeliveryAbove: 0, paymentMethods: ['cod', 'manual'], razorpayEnabled: false };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  useEffect(() => {
    let alive = true;
    authApi
      .me()
      .then((data) => alive && setUser(data.user))
      .catch(() => alive && setUser(null))
      .finally(() => alive && setReady(true));
    configApi
      .get()
      .then((data) => alive && setConfig({ ...DEFAULT_CONFIG, ...data }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (details) => {
    const data = await authApi.register(details);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, ready, config, isAdmin: user?.role === 'admin', login, register, logout }),
    [user, ready, config, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

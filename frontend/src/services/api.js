import axios from 'axios';

/**
 * One axios instance for the whole app.
 * - The backend wraps everything as { success, data, message }; we unwrap `data`.
 * - Auth uses an httpOnly cookie, so no token is ever stored in JavaScript.
 */
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  timeout: 20000,
});

http.interceptors.response.use(
  (response) => response.data?.data ?? response.data,
  (error) => {
    const res = error.response;
    return Promise.reject({
      status: res?.status ?? 0,
      message:
        res?.data?.message ||
        (res ? 'Something went wrong. Please try again.' : 'Cannot reach the server. Please check your connection.'),
      errors: res?.data?.errors || [],
    });
  }
);

const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null && v !== false));

export const configApi = {
  get: () => http.get('/config'),
};

export const authApi = {
  register: (body) => http.post('/auth/register', body),
  login: (body) => http.post('/auth/login', body),
  logout: () => http.post('/auth/logout'),
  me: () => http.get('/auth/me'),
};

export const categoryApi = {
  list: () => http.get('/categories'),
  create: (body) => http.post('/categories', body),
  update: (id, body) => http.put(`/categories/${id}`, body),
  remove: (id) => http.delete(`/categories/${id}`),
};

export const productApi = {
  list: (params) => http.get('/products', { params: clean(params) }),
  bySlug: (slug) => http.get(`/products/${slug}`),
  adminList: (params) => http.get('/admin/products', { params: clean(params) }),
  create: (body) => http.post('/products', body),
  update: (id, body) => http.put(`/products/${id}`, body),
  remove: (id) => http.delete(`/products/${id}`),
  reviews: (id) => http.get(`/products/${id}/reviews`),
  addReview: (id, body) => http.post(`/products/${id}/reviews`, body),
};

export const reviewApi = {
  recent: (limit = 6) => http.get('/reviews/recent', { params: { limit } }),
  remove: (id) => http.delete(`/admin/reviews/${id}`),
};

export const cartApi = {
  get: () => http.get('/cart'),
  add: (body) => http.post('/cart', body),
  update: (itemId, body) => http.put(`/cart/${itemId}`, body),
  remove: (itemId) => http.delete(`/cart/${itemId}`),
  clear: () => http.delete('/cart'),
  merge: (items) => http.post('/cart/merge', { items }),
};

export const wishlistApi = {
  get: () => http.get('/wishlist'),
  add: (productId) => http.post('/wishlist', { productId }),
  remove: (productId) => http.delete(`/wishlist/${productId}`),
  merge: (productIds) => http.post('/wishlist/merge', { productIds }),
};

export const orderApi = {
  create: (body) => http.post('/orders', body),
  mine: () => http.get('/orders/my-orders'),
  byId: (id) => http.get(`/orders/${id}`),
  cancel: (id) => http.patch(`/orders/${id}/cancel`),
};

export const adminApi = {
  dashboard: () => http.get('/admin/dashboard'),
  orders: (params) => http.get('/admin/orders', { params: clean(params) }),
  order: (id) => http.get(`/admin/orders/${id}`),
  setOrderStatus: (id, body) => http.patch(`/admin/orders/${id}/status`, body),
  setOrderPayment: (id, body) => http.patch(`/admin/orders/${id}/payment`, body),
  customers: (params) => http.get('/admin/customers', { params: clean(params) }),
  customer: (id) => http.get(`/admin/customers/${id}`),
  messages: (params) => http.get('/admin/messages', { params: clean(params) }),
  markMessageRead: (id) => http.patch(`/admin/messages/${id}/read`),
  upload: (files) => {
    const form = new FormData();
    [...files].forEach((f) => form.append('images', f));
    return http.post('/uploads', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const miscApi = {
  subscribe: (email) => http.post('/newsletter/subscribe', { email }),
  contact: (body) => http.post('/contact', body),
};

export default http;

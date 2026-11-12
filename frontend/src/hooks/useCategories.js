import { useEffect, useState } from 'react';
import { categoryApi } from '../services/api';

// Categories are needed by the navbar, footer, home and shop pages.
// One shared request keeps them in step and avoids refetching on every page.
let cache = null;
let inflight = null;

export const invalidateCategories = () => {
  cache = null;
  inflight = null;
};

export default function useCategories() {
  const [state, setState] = useState({ categories: cache || [], loading: !cache, error: null });

  useEffect(() => {
    if (cache) return;
    let alive = true;
    inflight = inflight || categoryApi.list().then((data) => (cache = data.items || []));
    inflight
      .then((items) => alive && setState({ categories: items, loading: false, error: null }))
      .catch((error) => {
        inflight = null;
        if (alive) setState({ categories: [], loading: false, error });
      });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}

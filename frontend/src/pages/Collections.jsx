import { CategoryGrid } from '../components/CategoryCard';
import { ErrorMessage, LoadingSpinner } from '../components/ui';
import useCategories from '../hooks/useCategories';

export default function Collections() {
  const { categories, loading, error } = useCategories();
  return (
    <div className="container-page pb-6 pt-10 sm:pt-14">
      <header className="mx-auto mb-10 max-w-2xl text-center">
        <p className="eyebrow text-[#B8935A]">Shop by category</p>
        <h1 className="mt-4 text-5xl sm:text-6xl">Our collections</h1>
        <p className="mt-4 text-lg text-muted">From everyday accessories to festive decor, every piece is handmade with love, patience and care.</p>
      </header>
      {loading ? <LoadingSpinner /> : error ? <ErrorMessage error={error} /> : <CategoryGrid categories={categories} />}
    </div>
  );
}

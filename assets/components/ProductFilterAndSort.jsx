import React from 'react';
import ProductCard from '@/assets/components/ProductCard';
import ProductListCard from '@/assets/components/ProductListCard';
import { Select, SelectItem, SelectTrigger, SelectValue, SelectContent } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Grid3x3, List } from 'lucide-react';


// Reusable FilterAndSort component
// Props:
// - products: array of product objects
// - onLike?: optional function(productId) -> void for toggling like
// - renderResults?: optional function(filteredProducts) -> JSX to render results (default: grid of ProductCard)
export default function FilterAndSort({ products = [], renderResults, initialCategory = 'all', onLike }) {
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState(initialCategory);
  const [sort, setSort] = React.useState('latest');
  const [viewMode, setViewMode] = React.useState('grid');

  const categories = React.useMemo(() => {
    if (!products) return ['all'];
    const setCats = new Set(
      products.map((p) => (p.category ? String(p.category) : 'Uncategorized'))
    );
    return ['all', ...Array.from(setCats)];
  }, [products]);

  // Capitalize helper for display labels (preserve original value for filtering)
  const capitalize = (s) => {
    if (!s || typeof s !== 'string') return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const filteredProducts = React.useMemo(() => {
    if (!products) return [];

    let list = products.slice();

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          (p.title || p.name || '')
            .toString()
            .toLowerCase()
            .includes(q) ||
          (p.description || '')
            .toString()
            .toLowerCase()
            .includes(q)
      );
    }

    if (category !== 'all') {
      list = list.filter((p) => (p.category || 'Uncategorized') === category);
    }

    if (sort === 'price-asc') {
      list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sort === 'price-desc') {
      list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    } else {
      list.sort(
        (a, b) =>
          new Date(b.createdAt || b._createdAt || 0) -
          new Date(a.createdAt || a._createdAt || 0)
      );
    }

    return list;
  }, [products, query, category, sort]);

  // Default renderer: grid of ProductCard
  const defaultRender = (items) => {
    if (!items || items.length === 0) {
      return (
        <div className="py-8 text-center text-gray-400">No products match your filters.</div>
      );
    }

    if (viewMode === 'list') {
      return (
        <div className="space-y-4">
          {items.map((p, i) => (
            <ProductListCard key={p.id || p._id || i} product={p} onLike={onLike} />
          ))}
        </div>
      );
    }

    return (
      <div className="-mx-4 sm:mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
        {items.map((p, i) => (
          <ProductCard className="bg-amber-400" key={p.id || p._id || i} product={p} onLike={onLike} />
        ))}
      </div>
    );
  };

  return (
    <div className="mb-6">
      <div className="flex flex-row items-center gap-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-3 sm:p-4 rounded-xl shadow-sm mb-4">
        <Input
          aria-label="Search products"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or description"
          className="flex-1 min-w-[120px] h-9 px-3 py-2 dark:bg-zinc-900 dark:text-white bg-white text-gray-900 text-sm"
        />

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="hidden sm:inline-flex sm:w-1/6 h-9 px-3 py-2 text-sm dark:bg-zinc-900 dark:text-white bg-white text-gray-900 border">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent className='backdrop-blur-md bg-white/50 text-zinc-900 dark:text-white dark:bg-black/50'>
            {categories.map((c) => (
              <SelectItem className='hover:bg-emerald-600 cursor-pointer text-sm' key={c} value={c}>
                {capitalize(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="hidden sm:inline-flex sm:w-1/6 h-9 px-3 py-2 text-sm dark:bg-zinc-900 dark:text-white bg-white text-gray-900 border">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent className='backdrop-blur-md bg-white/50 text-zinc-900 dark:text-white dark:bg-black/50'>
            <SelectItem className='hover:bg-emerald-600 cursor-pointer text-sm' value="latest">Newest</SelectItem>
            <SelectItem className='hover:bg-emerald-600 cursor-pointer text-sm' value="price-asc">Price: Low → High</SelectItem>
            <SelectItem className='hover:bg-emerald-600 cursor-pointer text-sm' value="price-desc">Price: High → Low</SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle (matches StoreFilterSort) */}
        <div className="flex gap-1 bg-gray-100 dark:bg-zinc-800 rounded-lg p-1 shrink-0">
          <Button
            onClick={() => setViewMode('grid')}
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            className={`h-8 w-8 p-0`}
            aria-label="Grid view"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setViewMode('list')}
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            className={`h-8 w-8 p-0`}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        
      </div>

      {/* Render results using provided render function or default grid/list */}
      {renderResults ? renderResults(filteredProducts, viewMode) : defaultRender(filteredProducts)}
    </div>
  );
}

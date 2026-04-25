import React from 'react';
import StoreCard from '@/assets/components/StoreCard';
import StoreListCard from '@/assets/components/StoreListCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Grid3x3, List } from 'lucide-react';

const provinces = [
  "All Provinces",
  "Gauteng",
  "Western Cape",
  "KwaZulu-Natal",
  "Eastern Cape",
  "Free State",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West"
];

export default function StoreFilterSort({ stores = [], onLike, selectedStoreId, viewMode, onViewModeChange }) {
  const [search, setSearch] = React.useState('');
  const [province, setProvince] = React.useState('All Provinces');
  const [sortBy, setSortBy] = React.useState('createdAt');

  const filteredStores = React.useMemo(() => {
    if (!stores) return [];

    let list = stores.slice();

    // Filter by search query
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (store) =>
          (store.storename || '')
            .toString()
            .toLowerCase()
            .includes(q) ||
          (store.about || '')
            .toString()
            .toLowerCase()
            .includes(q)
      );
    }

    // Filter by province
    if (province !== 'All Provinces') {
      list = list.filter((store) => store.province === province);
    }

    // Sort stores
    if (sortBy === 'storename') {
      list.sort((a, b) => 
        (a.storename || '').localeCompare(b.storename || '')
      );
    } else if (sortBy === 'city') {
      list.sort((a, b) => 
        (a.city || '').localeCompare(b.city || '')
      );
    } else if (sortBy === 'province') {
      list.sort((a, b) => 
        (a.province || '').localeCompare(b.province || '')
      );
    } else {
      // Default: sort by createdAt (newest first)
      list.sort(
        (a, b) =>
          new Date(b.createdAt || b._createdAt || 0) -
          new Date(a.createdAt || a._createdAt || 0)
      );
    }

    return list;
  }, [stores, search, province, sortBy]);

  return (
    <div className="mb-6">
      {/* Controls Bar */}
      <div className="flex flex-row items-center gap-2 bg-zinc-100 dark:bg-zinc-900 p-3 sm:p-4 rounded-xl dark:border-gray-800 mb-6">
        {/* Search Input - Takes remaining space */}
        <Input
          aria-label="Search stores"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Stores..."
          className="flex-1 min-w-[120px] h-9 px-3 py-2 dark:bg-zinc-900 dark:text-white bg-white text-gray-900 text-sm"
        />

        {/* Province Select */}
        <Select
          value={province}
          onValueChange={(value) => setProvince(value)}
        >
          <SelectTrigger className="hidden sm:inline-flex sm:w-1/6 h-9 px-3 py-2 text-sm dark:bg-zinc-900 dark:text-white bg-white text-gray-900 border">
            <SelectValue placeholder="Province" />
          </SelectTrigger>
          <SelectContent className="bg-white/10 dark:bg-black/10 backdrop-blur-md">
            {provinces.map((prov) => (
              <SelectItem key={prov} value={prov} className="cursor-pointer hover:bg-emerald-600/30 text-sm">
                {prov.length > 10 ? prov.substring(0, 10) + '...' : prov}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort Select */}
        <Select
          value={sortBy}
          onValueChange={(value) => setSortBy(value)}
        >
          <SelectTrigger className="hidden sm:inline-flex sm:w-1/6 h-9 px-3 py-2 text-sm dark:bg-zinc-900 dark:text-white bg-white text-gray-900 border">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent className="bg-white/10 dark:bg-black/10 backdrop-blur-md">
            <SelectItem value="createdAt" className="cursor-pointer hover:bg-emerald-600/30 text-sm">Date Added</SelectItem>
            <SelectItem value="storename" className="cursor-pointer hover:bg-emerald-600/30 text-sm">Store Name</SelectItem>
            <SelectItem value="city" className="cursor-pointer hover:bg-emerald-600/30 text-sm">City</SelectItem>
            <SelectItem value="province" className="cursor-pointer hover:bg-emerald-600/30 text-sm">Province</SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle */}
        {onViewModeChange && (
          <div className="flex gap-1 bg-gray-100 dark:bg-zinc-800 rounded-lg p-1 shrink-0">
            <Button
              onClick={() => onViewModeChange('grid')}
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className={`h-8 w-8 p-0`}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => onViewModeChange('list')}
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className={`h-8 w-8 p-0`}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Render filtered results */}
      {filteredStores.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xl text-gray-500">No stores found</p>
          <p className="text-sm text-gray-400 mt-2">
            Try adjusting your filters or check back later
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-4">
          {filteredStores.map(store => (
            <StoreListCard 
              key={store._id} 
              shop={{
                id: store._id,
                name: store.storename,
                avatar: store.image || '/profile.png',
                likes: store.likes || 0,
                totalProducts: 0,
                isLiked: store.isLiked || false,
                province: store.province,
                city: store.city,
                about: store.about,
              }}
              onLike={onLike}
              isHighlighted={selectedStoreId === store._id}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStores.map(store => (
            <StoreCard
              key={store._id}
              shop={{
                id: store._id,
                name: store.storename,
                avatar: store.image || '/profile.png',
                likes: store.likes || 0,
                totalProducts: 0,
                isLiked: store.isLiked || false,
                province: store.province,
                city: store.city,
                about: store.about,
              }}
              onLike={onLike}
              isHighlighted={selectedStoreId === store._id}
            />
          ))}
        </div>
      )}

      <div className="mt-8 text-center text-sm text-gray-500">
        Showing {filteredStores.length} store{filteredStores.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
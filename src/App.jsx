import React, { useState, useEffect } from 'react';
import { Plus, Search, User, Share2, Flame, Star, X, Check, Settings, GripVertical, Tv, Film } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const TMDB_API_KEY = 'af77d893efdba514a3f24f0048d46b91';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const STATUS_OPTIONS = [
  { value: 'want', label: 'Want to Watch', color: 'bg-blue-500' },
  { value: 'interested', label: 'Interested', color: 'bg-purple-500' },
  { value: 'watching', label: 'Watching', color: 'bg-yellow-500' },
  { value: 'watched', label: 'Watched', color: 'bg-green-500' }
];

const GENRE_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western', 10759: 'Action & Adventure',
  10762: 'Kids', 10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy',
  10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics'
};

const STREAMING_SERVICES = [
  'Netflix', 'Disney+', 'Amazon Prime', 'Apple TV+', 'HBO Max',
  'Hulu', 'Paramount+', 'Peacock', 'Stan', 'Binge'
];

const AGE_GROUPS = [
  '10-20', '20-30', '30-40', '40-50', '50-60', '60+'
];

// Sortable Movie/TV Card Component
function SortableMovieCard({ item, isDraggable, onUpdateStatus, onShare, onDelete, onViewDetails, ratingPreference }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const currentStatus = STATUS_OPTIONS.find(s => s.value === item.status);
  const displayRating = ratingPreference === 'tmdb' 
    ? item.vote_average?.toFixed(1) 
    : item.imdbRating;

  // Determine display title and year
  const title = item.title || item.name;
  const releaseYear = item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="flex gap-3 p-3">
        {/* Drag Handle - Only visible when draggable */}
        {isDraggable && (
          <div
            {...attributes}
            {...listeners}
            className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex items-start pt-1"
          >
            <GripVertical className="w-5 h-5" />
          </div>
        )}

        {/* Poster */}
        <div className="flex-shrink-0">
          {item.poster_path ? (
            <img
              src={`${TMDB_IMAGE_BASE}${item.poster_path}`}
              alt={title}
              className="w-20 h-28 object-cover rounded cursor-pointer"
              onClick={() => onViewDetails(item)}
            />
          ) : (
            <div className="w-20 h-28 bg-gray-200 rounded flex items-center justify-center cursor-pointer"
                 onClick={() => onViewDetails(item)}>
              {item.media_type === 'tv' ? (
                <Tv className="w-8 h-8 text-gray-400" />
              ) : (
                <Film className="w-8 h-8 text-gray-400" />
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <h3 
              className="font-semibold text-gray-800 truncate cursor-pointer hover:text-orange-500 flex-1"
              onClick={() => onViewDetails(item)}
            >
              {title}
            </h3>
            {item.media_type === 'tv' && (
              <span className="flex-shrink-0 bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded">
                TV
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-1">{releaseYear}</p>
          
          {/* Rating */}
          <div className="flex items-center gap-1 mb-2">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-medium">
              {displayRating || 'N/A'}
            </span>
            {item.imdbRating && (
              <span className="text-xs text-gray-500 ml-1">
                ({ratingPreference === 'tmdb' ? 'TMDB' : 'IMDb'})
              </span>
            )}
          </div>

          {/* Genres */}
          <div className="flex flex-wrap gap-1 mb-2">
            {item.genre_ids?.slice(0, 2).map(genreId => (
              <span key={genreId} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                {GENRE_MAP[genreId]}
              </span>
            ))}
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-1 rounded text-white ${currentStatus?.color}`}>
              {currentStatus?.label}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1 mt-2">
            {STATUS_OPTIONS.filter(s => s.value !== item.status).map(status => (
              <button
                key={status.value}
                onClick={() => onUpdateStatus(item.id, status.value)}
                className={`text-xs px-2 py-1 rounded ${status.color} text-white hover:opacity-80`}
              >
                {status.label}
              </button>
            ))}
          </div>

          {/* Share and Delete */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onShare(item)}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Share2 className="w-3 h-3" />
              Share
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('hotlist');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [showRatingPreference, setShowRatingPreference] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [username, setUsername] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [ratingPreference, setRatingPreference] = useState('tmdb');

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load data from localStorage
  useEffect(() => {
    const savedItems = localStorage.getItem('hotlist-items');
    const savedUsername = localStorage.getItem('hotlist-username');
    const savedGenres = localStorage.getItem('hotlist-genres');
    const savedServices = localStorage.getItem('hotlist-services');
    const savedAgeGroup = localStorage.getItem('hotlist-agegroup');
    const savedRatingPref = localStorage.getItem('hotlist-rating-preference');
    const hasCompletedOnboarding = localStorage.getItem('hotlist-onboarding-complete');

    if (savedItems) setItems(JSON.parse(savedItems));
    if (savedUsername) setUsername(savedUsername);
    if (savedGenres) setSelectedGenres(JSON.parse(savedGenres));
    if (savedServices) setSelectedServices(JSON.parse(savedServices));
    if (savedAgeGroup) setSelectedAgeGroup(savedAgeGroup);
    if (savedRatingPref) setRatingPreference(savedRatingPref);
    if (hasCompletedOnboarding) setShowOnboarding(false);
  }, []);

  // Save items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('hotlist-items', JSON.stringify(items));
  }, [items]);

  // Handle drag end
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex((item) => item.id === active.id);
        const newIndex = currentItems.findIndex((item) => item.id === over.id);
        
        return arrayMove(currentItems, oldIndex, newIndex);
      });
    }
  };

  // Search both movies and TV shows from TMDB
  const searchContent = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      
      // Filter to only movies and TV shows
      const filtered = (data.results || []).filter(
        item => item.media_type === 'movie' || item.media_type === 'tv'
      );
      
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching content:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Fetch detailed info including IMDb rating
  const fetchDetails = async (tmdbId, mediaType) => {
    try {
      const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
      const response = await fetch(
        `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,external_ids`
      );
      const data = await response.json();
      
      // Try to get IMDb rating from OMDb API
      let imdbRating = null;
      if (data.imdb_id || data.external_ids?.imdb_id) {
        try {
          const imdbId = data.imdb_id || data.external_ids.imdb_id;
          const omdbResponse = await fetch(
            `https://www.omdbapi.com/?i=${imdbId}&apikey=5a69a918`
          );
          const omdbData = await omdbResponse.json();
          if (omdbData.imdbRating && omdbData.imdbRating !== 'N/A') {
            imdbRating = omdbData.imdbRating;
          }
        } catch (error) {
          console.error('Error fetching IMDb rating:', error);
        }
      }

      return { ...data, imdbRating };
    } catch (error) {
      console.error('Error fetching details:', error);
      return null;
    }
  };

  // Add item to hotlist
  const addItem = async (item) => {
    const details = await fetchDetails(item.id, item.media_type);
    
    const newItem = {
      id: `${item.media_type}-${item.id}`, // Unique ID combining type and TMDB ID
      tmdbId: item.id,
      media_type: item.media_type,
      title: item.title,
      name: item.name,
      poster_path: item.poster_path,
      release_date: item.release_date,
      first_air_date: item.first_air_date,
      genre_ids: item.genre_ids,
      vote_average: item.vote_average,
      imdbRating: details?.imdbRating,
      status: 'want',
      addedAt: new Date().toISOString(),
      cast: details?.credits?.cast?.slice(0, 5).map(c => c.name) || [],
      director: item.media_type === 'movie' 
        ? details?.credits?.crew?.find(c => c.job === 'Director')?.name || 'Unknown'
        : details?.created_by?.[0]?.name || 'Unknown',
      synopsis: details?.overview || item.overview || 'No synopsis available',
      seasons: item.media_type === 'tv' ? details?.number_of_seasons : null,
      episodes: item.media_type === 'tv' ? details?.number_of_episodes : null,
    };

    setItems(prev => [newItem, ...prev]);
    setShowAddModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Update status
  const updateStatus = (itemId, newStatus) => {
    setItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, status: newStatus } : item
      )
    );
  };

  // Delete item
  const deleteItem = (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      setItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  // Share item
  const shareItem = (item) => {
    const title = item.title || item.name;
    const shareText = `Check out "${title}" on my HOTLIST! 🔥`;
    if (navigator.share) {
      navigator.share({
        title: title,
        text: shareText,
      });
    } else {
      alert('Sharing not supported on this device');
    }
  };

  // View details
  const viewDetails = async (item) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
    
    // Fetch full details if not already present
    if (!item.cast || !item.director) {
      const details = await fetchDetails(item.tmdbId, item.media_type);
      if (details) {
        setItemDetails(details);
      }
    } else {
      setItemDetails(item);
    }
  };

  // Complete onboarding
  const completeOnboarding = () => {
    localStorage.setItem('hotlist-username', username);
    localStorage.setItem('hotlist-genres', JSON.stringify(selectedGenres));
    localStorage.setItem('hotlist-services', JSON.stringify(selectedServices));
    localStorage.setItem('hotlist-agegroup', selectedAgeGroup);
    localStorage.setItem('hotlist-onboarding-complete', 'true');
    setShowOnboarding(false);
  };

  // Save rating preference
  const saveRatingPreference = (preference) => {
    setRatingPreference(preference);
    localStorage.setItem('hotlist-rating-preference', preference);
    setShowRatingPreference(false);
  };

  // Filter items by active tab
  const filteredItems = activeTab === 'hotlist'
    ? items.filter(m => m.status === 'want' || m.status === 'interested' || m.status === 'watching')
    : items.filter(m => m.status === 'watched');

  // Get only hotlist items for drag and drop (maintain order)
  const hotlistItems = items.filter(m => 
    m.status === 'want' || m.status === 'interested' || m.status === 'watching'
  );

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Aptos, system-ui, sans-serif' }}>
      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <Flame className="w-16 h-16 text-orange-500 mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to HOTLIST!</h2>
              <p className="text-gray-600">Let's personalize your experience</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What's your name?
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age Group
                </label>
                <select
                  value={selectedAgeGroup}
                  onChange={(e) => setSelectedAgeGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Select age group</option>
                  {AGE_GROUPS.map(age => (
                    <option key={age} value={age}>{age}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Favorite Genres (select all that apply)
                </label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                  {Object.entries(GENRE_MAP).map(([id, name]) => (
                    <button
                      key={id}
                      onClick={() => {
                        const genreId = parseInt(id);
                        setSelectedGenres(prev =>
                          prev.includes(genreId)
                            ? prev.filter(g => g !== genreId)
                            : [...prev, genreId]
                        );
                      }}
                      className={`px-3 py-1 rounded-full text-sm ${
                        selectedGenres.includes(parseInt(id))
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Streaming Services (select all you have)
                </label>
                <div className="flex flex-wrap gap-2">
                  {STREAMING_SERVICES.map(service => (
                    <button
                      key={service}
                      onClick={() => {
                        setSelectedServices(prev =>
                          prev.includes(service)
                            ? prev.filter(s => s !== service)
                            : [...prev, service]
                        );
                      }}
                      className={`px-3 py-1 rounded-full text-sm ${
                        selectedServices.includes(service)
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {service}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={completeOnboarding}
                disabled={!username || !selectedAgeGroup}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Get Started 🔥
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    localStorage.setItem('hotlist-username', e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Age Group</label>
                <select
                  value={selectedAgeGroup}
                  onChange={(e) => {
                    setSelectedAgeGroup(e.target.value);
                    localStorage.setItem('hotlist-agegroup', e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select age group</option>
                  {AGE_GROUPS.map(age => (
                    <option key={age} value={age}>{age}</option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  onClick={() => {
                    setShowSettings(false);
                    setShowRatingPreference(true);
                  }}
                  className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <div className="font-medium text-gray-800">Rating Preference</div>
                  <div className="text-sm text-gray-600">
                    Currently: {ratingPreference === 'tmdb' ? 'TMDB' : 'IMDb'}
                  </div>
                </button>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Preference Modal */}
      {showRatingPreference && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Choose Rating Source</h2>
            
            <div className="space-y-3">
              <button
                onClick={() => saveRatingPreference('tmdb')}
                className={`w-full p-4 rounded-lg border-2 text-left ${
                  ratingPreference === 'tmdb'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">TMDB Rating</div>
                <div className="text-sm text-gray-600">
                  The Movie Database ratings (0-10 scale)
                </div>
              </button>

              <button
                onClick={() => saveRatingPreference('imdb')}
                className={`w-full p-4 rounded-lg border-2 text-left ${
                  ratingPreference === 'imdb'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">IMDb Rating</div>
                <div className="text-sm text-gray-600">
                  Internet Movie Database ratings (0-10 scale)
                </div>
              </button>
            </div>

            <button
              onClick={() => setShowRatingPreference(false)}
              className="w-full mt-4 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {selectedItem.poster_path && (
              <img
                src={`${TMDB_IMAGE_BASE}${selectedItem.poster_path}`}
                alt={selectedItem.title || selectedItem.name}
                className="w-full h-64 object-cover"
              />
            )}
            
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-bold text-gray-800">
                      {selectedItem.title || selectedItem.name}
                    </h2>
                    {selectedItem.media_type === 'tv' && (
                      <span className="bg-purple-100 text-purple-700 text-sm px-2 py-1 rounded">
                        TV Series
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600">
                    {selectedItem.release_date?.split('-')[0] || selectedItem.first_air_date?.split('-')[0]}
                  </p>
                  {selectedItem.media_type === 'tv' && selectedItem.seasons && (
                    <p className="text-sm text-gray-500">
                      {selectedItem.seasons} Season{selectedItem.seasons > 1 ? 's' : ''} • {selectedItem.episodes} Episodes
                    </p>
                  )}
                </div>
                <button onClick={() => setShowDetailsModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold">
                    {ratingPreference === 'tmdb' 
                      ? selectedItem.vote_average?.toFixed(1)
                      : selectedItem.imdbRating || selectedItem.vote_average?.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">
                    ({ratingPreference === 'tmdb' ? 'TMDB' : 'IMDb'})
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold text-gray-800 mb-2">Synopsis</h3>
                <p className="text-gray-600 leading-relaxed">
                  {itemDetails?.synopsis || selectedItem.synopsis || 'Loading...'}
                </p>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold text-gray-800 mb-2">
                  {selectedItem.media_type === 'tv' ? 'Creator' : 'Director'}
                </h3>
                <p className="text-gray-600">
                  {itemDetails?.director || selectedItem.director || 'Loading...'}
                </p>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold text-gray-800 mb-2">Cast</h3>
                <p className="text-gray-600">
                  {itemDetails?.cast?.join(', ') || selectedItem.cast?.join(', ') || 'Loading...'}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.genre_ids?.map(genreId => (
                    <span key={genreId} className="bg-gray-100 px-3 py-1 rounded-full text-sm">
                      {GENRE_MAP[genreId]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Add to Hotlist</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchContent(e.target.value);
                  }}
                  placeholder="Search for movies or TV shows..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              {isSearching && (
                <div className="text-center py-8 text-gray-500">Searching...</div>
              )}

              {!isSearching && searchResults.length === 0 && searchQuery && (
                <div className="text-center py-8 text-gray-500">No results found</div>
              )}

              <div className="space-y-3">
                {searchResults.map(item => {
                  const title = item.title || item.name;
                  const year = item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0];
                  
                  return (
                    <div key={`${item.media_type}-${item.id}`} className="flex gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                      {item.poster_path ? (
                        <img
                          src={`${TMDB_IMAGE_BASE}${item.poster_path}`}
                          alt={title}
                          className="w-16 h-24 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-24 bg-gray-200 rounded flex items-center justify-center">
                          {item.media_type === 'tv' ? (
                            <Tv className="w-6 h-6 text-gray-400" />
                          ) : (
                            <Film className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-start gap-2">
                          <h3 className="font-semibold text-gray-800 flex-1">{title}</h3>
                          {item.media_type === 'tv' && (
                            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded">
                              TV
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mb-1">{year}</p>
                        <div className="flex items-center gap-1 mb-2">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm">{item.vote_average?.toFixed(1)}</span>
                        </div>
                        <button
                          onClick={() => addItem(item)}
                          className="bg-orange-500 text-white px-4 py-1 rounded hover:bg-orange-600 text-sm"
                        >
                          Add to Hotlist
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Friends List Modal */}
      {showFriendsList && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Friends</h2>
              <button onClick={() => setShowFriendsList(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="text-center py-8 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Friends feature coming soon!</p>
              <p className="text-sm mt-2">Connect with friends and share your hotlists</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flame className="w-7 h-7" />
            HOTLIST
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowFriendsList(!showFriendsList)}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30"
            >
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-[72px] z-10">
        <div className="max-w-2xl mx-auto flex">
          <button
            onClick={() => setActiveTab('hotlist')}
            className={`flex-1 py-3 font-semibold ${
              activeTab === 'hotlist'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-500'
            }`}
          >
            My HOTLIST ({hotlistItems.length})
          </button>
          <button
            onClick={() => setActiveTab('watched')}
            className={`flex-1 py-3 font-semibold ${
              activeTab === 'watched'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-500'
            }`}
          >
            Watched ({items.filter(m => m.status === 'watched').length})
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Flame className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">
              {activeTab === 'hotlist' ? 'Your hotlist is empty' : 'No watched items yet'}
            </p>
            {activeTab === 'hotlist' && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600"
              >
                Add Your First Item
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {activeTab === 'hotlist' ? (
              // Drag and Drop enabled for Hotlist
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={hotlistItems.map(m => m.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {hotlistItems.map((item) => (
                    <SortableMovieCard
                      key={item.id}
                      item={item}
                      isDraggable={true}
                      onUpdateStatus={updateStatus}
                      onShare={shareItem}
                      onDelete={deleteItem}
                      onViewDetails={viewDetails}
                      ratingPreference={ratingPreference}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              // Regular list for Watched (no drag and drop)
              filteredItems.map((item) => (
                <SortableMovieCard
                  key={item.id}
                  item={item}
                  isDraggable={false}
                  onUpdateStatus={updateStatus}
                  onShare={shareItem}
                  onDelete={deleteItem}
                  onViewDetails={viewDetails}
                  ratingPreference={ratingPreference}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      {activeTab === 'hotlist' && (
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-shadow z-20"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

export default App;
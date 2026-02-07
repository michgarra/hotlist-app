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

// Helper function to convert genre IDs to names
const getGenreNames = (genreIds) => {
  if (!genreIds || genreIds.length === 0) return '';
  return genreIds
    .map(id => GENRE_MAP[id])
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');
};

// Sortable Movie/TV Card Component
function SortableMovieCard({ item, isDraggable, onUpdateStatus, onShare, onDelete, onViewDetails, ratingPreference }) {
  const [swipeX, setSwipeX] = React.useState(0);
  const [isSwiping, setIsSwiping] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const startX = React.useRef(0);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !isDraggable || isSwiping });

  const style = {
    transform: isDragging ? CSS.Transform.toString(transform) : `translateX(${swipeX}px)`,
    transition: isSwiping ? 'none' : transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleTouchStart = (e) => {
    if (isDraggable) return; // Don't swipe when drag handle is available
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (isDraggable || !isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    // Only allow left swipe (negative values)
    if (diff < 0) {
      setSwipeX(Math.max(diff, -100)); // Limit to -100px
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    
    // If swiped more than 60px, show delete confirmation
    if (swipeX < -60) {
      setShowDeleteConfirm(true);
    } else {
      setSwipeX(0); // Snap back
    }
  };

  const handleDeleteConfirm = () => {
    onDelete(item.id);
    setShowDeleteConfirm(false);
    setSwipeX(0);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setSwipeX(0);
  };

  const currentStatus = STATUS_OPTIONS.find(s => s.value === item.status);
  
  // Display rating based on user preference and tab
  let displayRating = '';
  if (item.status === 'watched' && item.hotRating) {
    // On WATCHED tab or watched items: show user's flame rating
    displayRating = null; // Will show flame separately
  } else {
    // On HOTLIST tab: show external rating based on preference
    if (ratingPreference === 'imdb' || ratingPreference === 'tmdb') {
      const rating = item.tmdbRating || '0.0';
      displayRating = rating;
    } else if (ratingPreference === 'rotten') {
      // For Rotten Tomatoes, convert TMDB 0-10 scale to 0-100%
      const rating = item.tmdbRating ? Math.round(parseFloat(item.tmdbRating) * 10) : 0;
      displayRating = `${rating}%`;
    }
  }

  // Convert genre IDs to names
  const genreDisplay = getGenreNames(item.genre_ids);

  return (
    <>
      <div 
        ref={setNodeRef} 
        style={style} 
        className={`bg-white rounded-lg p-2 transition-all relative ${
          isDragging 
            ? 'border-4 border-orange-500 shadow-2xl' 
            : 'border-2 border-gray-400 hover:border-orange-500'
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex gap-2">
        {isDraggable && (
          <div 
            {...attributes} 
            {...listeners} 
            className="flex items-center justify-center bg-gray-100 hover:bg-orange-100 active:bg-orange-200 rounded cursor-grab active:cursor-grabbing transition-colors"
            style={{ width: '32px', minHeight: '100%', touchAction: 'none' }}
          >
            <div className="flex flex-col gap-0.5">
              <div className="flex gap-0.5">
                <div className="w-0.5 h-3 bg-gray-500 rounded"></div>
                <div className="w-0.5 h-3 bg-gray-500 rounded"></div>
              </div>
              <div className="flex gap-0.5">
                <div className="w-0.5 h-3 bg-gray-500 rounded"></div>
                <div className="w-0.5 h-3 bg-gray-500 rounded"></div>
              </div>
              <div className="flex gap-0.5">
                <div className="w-0.5 h-3 bg-gray-500 rounded"></div>
                <div className="w-0.5 h-3 bg-gray-500 rounded"></div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex-shrink-0 cursor-pointer" onClick={() => onViewDetails(item)}>
          {item.poster_path ? (
            <img
              src={`${TMDB_IMAGE_BASE}${item.poster_path}`}
              alt={item.title || item.name}
              className="w-12 h-18 object-cover rounded"
            />
          ) : (
            <div className="w-12 h-18 bg-gray-200 rounded flex items-center justify-center">
              {item.media_type === 'tv' ? <Tv className="w-6 h-6 text-gray-400" /> : <Film className="w-6 h-6 text-gray-400" />}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 
              className="font-semibold text-sm text-gray-900 cursor-pointer hover:text-orange-500 transition-colors line-clamp-1"
              onClick={() => onViewDetails(item)}
            >
              {item.title || item.name}
            </h3>
            {item.media_type === 'tv' && (
              <span className="flex-shrink-0 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded font-semibold">
                TV
              </span>
            )}
          </div>

          <div className="text-xs text-gray-600 mt-0.5">
            {item.streaming && <span>{item.streaming}</span>}
            {item.streaming && genreDisplay && <span> • </span>}
            {genreDisplay && <span>{genreDisplay}</span>}
          </div>

          {/* Rating + Status Buttons + Friend on same line */}
          <div className="flex items-center justify-between mt-1 gap-2">
            {/* Left side: Rating + Friend */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {item.status === 'watched' && item.hotRating ? (
                // WATCHED: Show user's flame rating
                <>
                  <Flame className="w-3 h-3 text-orange-500" />
                  <span className="text-xs font-semibold text-orange-500">
                    {item.hotRating.toFixed(1)}
                  </span>
                </>
              ) : (
                // HOTLIST: Show external rating
                displayRating && <span className="text-xs font-medium text-gray-700">{displayRating}</span>
              )}
              {item.recommendedBy && (
                <span className="text-xs text-orange-500">({item.recommendedBy})</span>
              )}
            </div>

            {/* Right side: Status buttons */}
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => onUpdateStatus(item, 'interested')}
                className={`text-xs px-2 py-0.5 rounded ${
                  item.status === 'interested'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Interested
              </button>
              <button
                onClick={() => onUpdateStatus(item, 'watching')}
                className={`text-xs px-2 py-0.5 rounded ${
                  item.status === 'watching'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Watching
              </button>
              <button
                onClick={() => onUpdateStatus(item, 'watched')}
                className={`text-xs px-2 py-0.5 rounded ${
                  item.status === 'watched'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Watched
              </button>
            </div>
          </div>

          {/* Share button only */}
          <div className="flex gap-1.5 mt-1">
            <button
              onClick={() => onShare(item)}
              className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center gap-0.5"
            >
              <Share2 className="w-3 h-3" />
              Share
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">Delete Title?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to remove "{item.title || item.name}" from your list?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('hotlist');
  const [items, setItems] = useState([]);
  const [friends, setFriends] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [tempRating, setTempRating] = useState(3);
  const [ratingPreference, setRatingPreference] = useState('imdb');
  const [userName, setUserName] = useState('');
  const [userGender, setUserGender] = useState('');
  const [userAge, setUserAge] = useState('');
  const [userStreaming, setUserStreaming] = useState([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load data from localStorage
  useEffect(() => {
    const loadData = () => {
      const savedItems = localStorage.getItem('hotlist_items');
      const savedFriends = localStorage.getItem('hotlist_friends');
      const savedName = localStorage.getItem('hotlist_userName');
      const savedGender = localStorage.getItem('hotlist_userGender');
      const savedAge = localStorage.getItem('hotlist_userAge');
      const savedStreaming = localStorage.getItem('hotlist_userStreaming');
      const savedRatingPref = localStorage.getItem('hotlist_ratingPreference');
      const onboardingComplete = localStorage.getItem('hotlist_onboarding_complete');

      if (savedItems) setItems(JSON.parse(savedItems));
      if (savedFriends) setFriends(JSON.parse(savedFriends));
      if (savedName) setUserName(savedName);
      if (savedGender) setUserGender(savedGender);
      if (savedAge) setUserAge(savedAge);
      if (savedStreaming) setUserStreaming(JSON.parse(savedStreaming));
      if (savedRatingPref) setRatingPreference(savedRatingPref);
      
      if (!onboardingComplete) {
        setShowOnboarding(true);
      }
      
      setIsDataLoaded(true);
    };

    loadData();
  }, []);

  // Save to localStorage whenever items change
  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem('hotlist_items', JSON.stringify(items));
    }
  }, [items, isDataLoaded]);

  // Save friends to localStorage
  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem('hotlist_friends', JSON.stringify(friends));
    }
  }, [friends, isDataLoaded]);

  // Save user preferences
  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem('hotlist_ratingPreference', ratingPreference);
    }
  }, [ratingPreference, isDataLoaded]);

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const searchTMDB = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Use multi-search to get both movies and TV shows
      const response = await fetch(
        `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&include_adult=false`
      );
      const data = await response.json();
      
      // Filter to only movies and TV shows
      const results = data.results
        .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
        .slice(0, 8)
        .map(item => ({
          ...item,
          title: item.title || item.name,
          id: `${item.media_type}-${item.id}` // Prefix ID with media type
        }));
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchItemDetails = async (item) => {
    try {
      const endpoint = item.media_type === 'tv' ? 'tv' : 'movie';
      const tmdbId = item.id.replace(/^(movie|tv)-/, ''); // Remove prefix to get original ID
      
      const [detailsRes, creditsRes, ratingsRes] = await Promise.all([
        fetch(`${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`),
        fetch(`${TMDB_BASE_URL}/${endpoint}/${tmdbId}/credits?api_key=${TMDB_API_KEY}`),
        fetch(`${TMDB_BASE_URL}/${endpoint}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`)
      ]);

      const details = await detailsRes.json();
      const credits = await creditsRes.json();
      const ratings = await ratingsRes.json();

      const cast = credits.cast?.slice(0, 5).map(actor => actor.name) || [];
      const director = item.media_type === 'tv' 
        ? details.created_by?.[0]?.name || 'N/A'
        : credits.crew?.find(person => person.job === 'Director')?.name || 'N/A';

      return {
        ...item,
        overview: details.overview || '',
        cast,
        director,
        runtime: item.media_type === 'tv' 
          ? `${details.number_of_seasons} Season${details.number_of_seasons !== 1 ? 's' : ''}`
          : `${details.runtime} min`,
        tmdbRating: details.vote_average?.toFixed(1) || null,
        imdbId: ratings.imdb_id || null,
        imdbRating: null,
        genre_ids: details.genres?.map(g => g.id) || []
      };
    } catch (error) {
      console.error('Error fetching details:', error);
      return item;
    }
  };

  const addItem = async (searchResult, friend, streaming) => {
    const detailedItem = await fetchItemDetails(searchResult);
    
    const newItem = {
      ...detailedItem,
      status: 'interested',
      recommendedBy: friend,
      streaming: streaming,
      hotRating: null,
      addedAt: new Date().toISOString()
    };

    setItems(prev => [newItem, ...prev]);
    setShowAddModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateItemStatus = (item, newStatus) => {
    if (newStatus === 'watched' && !item.hotRating) {
      setCurrentItem(item);
      setTempRating(3);
      setShowRatingModal(true);
    } else {
      setItems(prev => prev.map(m =>
        m.id === item.id ? { ...m, status: newStatus } : m
      ));
    }
  };

  const saveRating = () => {
    setItems(prev => prev.map(m =>
      m.id === currentItem.id 
        ? { ...m, status: 'watched', hotRating: tempRating }
        : m
    ));
    setShowRatingModal(false);
    setCurrentItem(null);
  };

  const shareItem = (item) => {
    const message = `🔥 Check out ${item.title || item.name}!\n${item.hotRating ? `I rated it ${item.hotRating.toFixed(1)} flames!` : 'Recommended by ' + (item.recommendedBy || 'a friend')}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const deleteItem = (id) => {
    if (window.confirm('Remove this title from your list?')) {
      setItems(prev => prev.filter(m => m.id !== id));
    }
  };

  const viewDetails = (item) => {
    setCurrentItem(item);
    setShowDetailsModal(true);
  };

  const addFriend = (friendName) => {
    if (friendName && !friends.includes(friendName)) {
      setFriends(prev => [...prev, friendName]);
    }
  };

  const removeFriend = (friendName) => {
    if (window.confirm(`Remove ${friendName} from your friends?`)) {
      setFriends(prev => prev.filter(f => f !== friendName));
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem('hotlist_userName', userName);
    localStorage.setItem('hotlist_userGender', userGender);
    localStorage.setItem('hotlist_userAge', userAge);
    localStorage.setItem('hotlist_userStreaming', JSON.stringify(userStreaming));
    localStorage.setItem('hotlist_onboarding_complete', 'true');
    setShowOnboarding(false);
  };

  const hotlistItems = items.filter(m => m.status !== 'watched');
  const watchedItems = items.filter(m => m.status === 'watched');
  const currentItems = activeTab === 'hotlist' ? hotlistItems : watchedItems;

  // Onboarding Modal
  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🔥</div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome to HOTLIST</h1>
            <p className="text-gray-600 mt-2">Let's set up your profile</p>
          </div>

          {onboardingStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">What's your name?</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <div className="flex gap-3">
                  {['Female', 'Male', 'Other'].map(gender => (
                    <button
                      key={gender}
                      onClick={() => setUserGender(gender)}
                      className={`flex-1 py-2 rounded-lg ${
                        userGender === gender
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Age Range</label>
                <select
                  value={userAge}
                  onChange={(e) => setUserAge(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                >
                  <option value="">Select age range</option>
                  {AGE_GROUPS.map(age => (
                    <option key={age} value={age}>{age}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setOnboardingStep(2)}
                disabled={!userName || !userGender || !userAge}
                className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          )}

          {onboardingStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Add Your Friends</label>
                <p className="text-sm text-gray-500 mb-3">Who recommends movies to you?</p>
                {friends.map((friend, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2">
                    <span className="text-gray-700">{friend}</span>
                    <button
                      onClick={() => removeFriend(friend)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 mt-3">
                  <input
                    type="text"
                    placeholder="Friend's name"
                    className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addFriend(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.target.previousSibling;
                      addFriend(input.value);
                      input.value = '';
                    }}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  >
                    Add
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setOnboardingStep(1)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={() => setOnboardingStep(3)}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {onboardingStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Streaming Services</label>
                <p className="text-sm text-gray-500 mb-3">Select all that you have access to</p>
                <div className="grid grid-cols-2 gap-2">
                  {STREAMING_SERVICES.map(service => (
                    <button
                      key={service}
                      onClick={() => {
                        setUserStreaming(prev =>
                          prev.includes(service)
                            ? prev.filter(s => s !== service)
                            : [...prev, service]
                        );
                      }}
                      className={`py-2 px-3 rounded-lg text-sm ${
                        userStreaming.includes(service)
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {service}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setOnboardingStep(2)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={() => setOnboardingStep(4)}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {onboardingStep === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating Preference</label>
                <p className="text-sm text-gray-500 mb-3">Which rating system do you prefer to see?</p>
                <div className="space-y-2">
                  <button
                    onClick={() => setRatingPreference('imdb')}
                    className={`w-full py-3 px-4 rounded-lg text-left ${
                      ratingPreference === 'imdb'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="font-semibold">IMDB</div>
                    <div className="text-sm opacity-90">Shows ratings like: 7.7</div>
                  </button>
                  <button
                    onClick={() => setRatingPreference('rotten')}
                    className={`w-full py-3 px-4 rounded-lg text-left ${
                      ratingPreference === 'rotten'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="font-semibold">Rotten Tomatoes</div>
                    <div className="text-sm opacity-90">Shows ratings like: 85%</div>
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setOnboardingStep(3)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={completeOnboarding}
                  disabled={!ratingPreference}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Start Using HOTLIST
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-8 h-8" />
            <h1 className="text-2xl font-bold">HOTLIST</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Settings className="w-6 h-6" />
            </button>
            <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <User className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={() => setActiveTab('hotlist')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              activeTab === 'hotlist'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🔥 HOTLIST ({hotlistItems.length})
          </button>
          <button
            onClick={() => setActiveTab('watched')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              activeTab === 'watched'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ✓ Watched ({watchedItems.length})
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4">
        {currentItems.length === 0 ? (
          <div className="text-center py-16">
            <Flame className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {activeTab === 'hotlist' 
                ? "No titles in your hotlist yet! Add some recommendations to get started."
                : "You haven't watched anything yet!"}
            </p>
          </div>
        ) : (
          <>
            {/* Drag instruction - only show on HOTLIST tab */}
            {activeTab === 'hotlist' && (
              <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <div className="flex gap-0.5">
                    <div className="w-0.5 h-2 bg-orange-500 rounded"></div>
                    <div className="w-0.5 h-2 bg-orange-500 rounded"></div>
                  </div>
                  <div className="flex gap-0.5">
                    <div className="w-0.5 h-2 bg-orange-500 rounded"></div>
                    <div className="w-0.5 h-2 bg-orange-500 rounded"></div>
                  </div>
                </div>
                <p className="text-xs text-orange-800 font-medium">
                  Drag the grip handle to reorder
                </p>
              </div>
            )}
            
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={currentItems.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {currentItems.map((item) => (
                    <SortableMovieCard
                      key={item.id}
                      item={item}
                      isDraggable={activeTab === 'hotlist'}
                      onUpdateStatus={updateItemStatus}
                      onShare={shareItem}
                      onDelete={deleteItem}
                      onViewDetails={viewDetails}
                      ratingPreference={ratingPreference}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}
      </div>

      {/* Floating Add Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-6 right-6 bg-orange-500 text-white p-4 rounded-full shadow-lg hover:bg-orange-600 transition-colors"
      >
        <Plus className="w-8 h-8" />
      </button>

      {/* Add Movie/TV Modal - FIXED VERSION */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-2xl my-8">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white rounded-t-lg">
              <h2 className="text-xl font-bold">Add to Hotlist</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Search Input - Now visible at top */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchTMDB(e.target.value);
                  }}
                  placeholder="Search for movies or TV shows..."
                  className="w-full px-4 py-3 pr-10 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-lg"
                  autoFocus
                />
                <Search className="absolute right-3 top-3.5 w-5 h-5 text-gray-400" />
              </div>

              {isSearching && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {searchResults.map((result) => (
                    <AddMovieCard
                      key={result.id}
                      result={result}
                      friends={friends}
                      streamingServices={userStreaming}
                      onAdd={addItem}
                      onAddFriend={addFriend}
                    />
                  ))}
                </div>
              )}

              {searchQuery && !isSearching && searchResults.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No results found for "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">How was it?</h2>
            <p className="text-gray-600 mb-6">Rate {currentItem?.title || currentItem?.name}</p>
            
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Flame className="w-8 h-8 text-orange-500" />
                <span className="text-4xl font-bold text-orange-500">
                  {tempRating.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={tempRating}
                onChange={(e) => setTempRating(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>0.5</span>
                <span>5.0</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setCurrentItem(null);
                }}
                className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveRating}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                Save Rating
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && currentItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold">{currentItem.title || currentItem.name}</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="flex gap-4 mb-6">
                {currentItem.poster_path ? (
                  <img
                    src={`${TMDB_IMAGE_BASE}${currentItem.poster_path}`}
                    alt={currentItem.title || currentItem.name}
                    className="w-32 h-48 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-32 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                    {currentItem.media_type === 'tv' ? <Tv className="w-12 h-12 text-gray-400" /> : <Film className="w-12 h-12 text-gray-400" />}
                  </div>
                )}
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {currentItem.media_type === 'tv' && (
                      <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded font-semibold">
                        TV
                      </span>
                    )}
                    {currentItem.streaming && (
                      <span className="text-sm text-gray-600">{currentItem.streaming}</span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {currentItem.runtime && (
                      <p className="text-sm text-gray-600">{currentItem.runtime}</p>
                    )}
                    {currentItem.tmdbRating && (
                      <p className="text-sm">⭐ {currentItem.tmdbRating} (TMDB)</p>
                    )}
                    {currentItem.hotRating && (
                      <p className="text-sm flex items-center gap-1">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span className="font-semibold text-orange-500">
                          {currentItem.hotRating.toFixed(1)} (Your Rating)
                        </span>
                      </p>
                    )}
                    {currentItem.recommendedBy && (
                      <p className="text-sm text-orange-500">
                        Recommended by {currentItem.recommendedBy}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {currentItem.overview && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Synopsis</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">{currentItem.overview}</p>
                </div>
              )}

              {currentItem.director && currentItem.director !== 'N/A' && (
                <div className="mb-4">
                  <h3 className="font-semibold mb-2">
                    {currentItem.media_type === 'tv' ? 'Creator' : 'Director'}
                  </h3>
                  <p className="text-gray-700">{currentItem.director}</p>
                </div>
              )}

              {currentItem.cast && currentItem.cast.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Cast</h3>
                  <p className="text-gray-700">{currentItem.cast.join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">Settings</h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Rating Preference</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => setRatingPreference('imdb')}
                    className={`flex-1 py-2 rounded-lg ${
                      ratingPreference === 'imdb'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    IMDB
                  </button>
                  <button
                    onClick={() => setRatingPreference('tmdb')}
                    className={`flex-1 py-2 rounded-lg ${
                      ratingPreference === 'tmdb'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    TMDB
                  </button>
                  <button
                    onClick={() => setRatingPreference('rotten')}
                    className={`flex-1 py-2 rounded-lg ${
                      ratingPreference === 'rotten'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Rotten Tomatoes
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Your Friends</h3>
                {friends.length === 0 ? (
                  <p className="text-gray-500 text-sm mb-3">No friends added yet</p>
                ) : (
                  <div className="space-y-2 mb-3">
                    {friends.map((friend, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">{friend}</span>
                        <button
                          onClick={() => removeFriend(friend)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add friend"
                    className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addFriend(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = e.target.previousSibling;
                      addFriend(input.value);
                      input.value = '';
                    }}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Your Profile</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-600">Name:</span> {userName}</p>
                  <p><span className="text-gray-600">Gender:</span> {userGender}</p>
                  <p><span className="text-gray-600">Age:</span> {userAge}</p>
                  <p><span className="text-gray-600">Streaming Services:</span> {userStreaming.join(', ') || 'None selected'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add Movie Card Component (used in search results)
function AddMovieCard({ result, friends, streamingServices, onAdd, onAddFriend }) {
  const [selectedFriend, setSelectedFriend] = useState('');
  const [selectedStreaming, setSelectedStreaming] = useState('');
  const [showFriendInput, setShowFriendInput] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');

  const handleAdd = () => {
    if (selectedFriend && selectedStreaming) {
      onAdd(result, selectedFriend, selectedStreaming);
    }
  };

  const handleAddNewFriend = () => {
    if (newFriendName.trim()) {
      onAddFriend(newFriendName.trim());
      setSelectedFriend(newFriendName.trim());
      setNewFriendName('');
      setShowFriendInput(false);
    }
  };

  const displayTitle = result.title || result.name;
  const year = (result.release_date || result.first_air_date || '').split('-')[0];
  const genreDisplay = getGenreNames(result.genre_ids);

  return (
    <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors">
      <div className="flex gap-3">
        {result.poster_path ? (
          <img
            src={`${TMDB_IMAGE_BASE}${result.poster_path}`}
            alt={displayTitle}
            className="w-16 h-24 object-cover rounded"
          />
        ) : (
          <div className="w-16 h-24 bg-gray-200 rounded flex items-center justify-center">
            {result.media_type === 'tv' ? <Tv className="w-8 h-8 text-gray-400" /> : <Film className="w-8 h-8 text-gray-400" />}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <h3 className="font-semibold text-gray-900 flex-1 line-clamp-2">
              {displayTitle}
            </h3>
            {result.media_type === 'tv' && (
              <span className="flex-shrink-0 bg-purple-500 text-white text-xs px-2 py-1 rounded font-semibold">
                TV
              </span>
            )}
          </div>
          
          <div className="text-sm text-gray-600 mt-1">
            {year && <span>{year}</span>}
            {year && genreDisplay && <span> • </span>}
            {genreDisplay && <span>{genreDisplay}</span>}
          </div>

          {result.vote_average > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              ⭐ {result.vote_average.toFixed(1)}
            </p>
          )}

          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <select
                value={selectedFriend}
                onChange={(e) => setSelectedFriend(e.target.value)}
                className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
              >
                <option value="">Who recommended?</option>
                {friends.map(friend => (
                  <option key={friend} value={friend}>{friend}</option>
                ))}
              </select>
              <button
                onClick={() => setShowFriendInput(!showFriendInput)}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
              >
                + Add New Friend
              </button>
            </div>

            {showFriendInput && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFriendName}
                  onChange={(e) => setNewFriendName(e.target.value)}
                  placeholder="Friend's name"
                  className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleAddNewFriend();
                  }}
                />
                <button
                  onClick={handleAddNewFriend}
                  className="px-3 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            )}

            <select
              value={selectedStreaming}
              onChange={(e) => setSelectedStreaming(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
            >
              <option value="">Where to watch?</option>
              {streamingServices.map(service => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>

            <button
              onClick={handleAdd}
              disabled={!selectedFriend || !selectedStreaming}
              className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-semibold"
            >
              Add to Hotlist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

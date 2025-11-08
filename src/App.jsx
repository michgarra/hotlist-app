import React, { useState, useEffect } from 'react';
import { Flame, Plus, X, Settings, User, Star, Share2, Check, Film, Tv, GripVertical } from 'lucide-react';
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

const TMDB_API_KEY = 'YOUR_TMDB_API_KEY'; // Replace with your actual key
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const STATUS_OPTIONS = [
  { value: 'want', label: 'Want to Watch', color: 'bg-blue-100 text-blue-700' },
  { value: 'interested', label: 'Interested', color: 'bg-purple-100 text-purple-700' },
  { value: 'watching', label: 'Watching', color: 'bg-green-100 text-green-700' },
  { value: 'watched', label: 'Watched', color: 'bg-gray-100 text-gray-700' }
];

// Sortable Movie Card Component
function SortableMovieCard({ movie, ratingPreference, onStatusChange, onRate, onShare, onDelete, onCardClick, isDraggable }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: movie.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="bg-white border-2 border-gray-300 hover:border-orange-300 hover:bg-gray-50 transition-colors"
    >
      <div className="p-2 flex items-center gap-2">
        {/* Drag Handle - Only show if draggable */}
        {isDraggable && (
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="w-5 h-5 text-gray-400 hover:text-orange-500" />
          </div>
        )}

        {/* Movie/TV Poster - Smaller */}
        {movie.poster ? (
          <img 
            src={movie.poster}
            alt={movie.title}
            className="w-12 h-16 object-cover rounded flex-shrink-0 cursor-pointer"
            onClick={() => onCardClick(movie)}
          />
        ) : (
          <div 
            className="w-12 h-16 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center cursor-pointer"
            onClick={() => onCardClick(movie)}
          >
            {movie.mediaType === 'tv' ? (
              <Tv className="w-6 h-6 text-gray-400" />
            ) : (
              <Film className="w-6 h-6 text-gray-400" />
            )}
          </div>
        )}
        
        {/* Content - More Compact */}
        <div className="flex-1 min-w-0">
          <div 
            className="flex items-center gap-1 mb-1 cursor-pointer"
            onClick={() => onCardClick(movie)}
          >
            <h3 className="font-bold text-sm text-gray-900 truncate">{movie.title}</h3>
            {movie.mediaType === 'tv' && (
              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-medium flex-shrink-0">TV</span>
            )}
          </div>
          
          <div className="text-xs text-gray-600 flex items-center gap-2">
            <span>{movie.streaming || '???'}</span>
            <span>•</span>
            <span>{ratingPreference === 'imdb' ? movie.imdbRating : movie.rtRating}</span>
            <span>•</span>
            <span className="text-orange-500 font-medium">{movie.friend}</span>
            {movie.myRating && (
              <>
                <span>•</span>
                <span className="text-orange-600 font-medium">{movie.myRating} 🔥</span>
              </>
            )}
          </div>
          
          <div className="flex flex-wrap gap-1 mt-1">
            {STATUS_OPTIONS.map(status => (
              <button
                key={status.value}
                onClick={() => onStatusChange(movie.id, status.value)}
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  movie.status === status.value
                    ? status.color
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {status.label}
              </button>
            ))}
            
            <button
              onClick={() => onShare(movie)}
              className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1"
            >
              <Share2 className="w-3 h-3" />
              Share
            </button>
            
            <button
              onClick={() => onDelete(movie.id)}
              className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  // State
  const [movies, setMovies] = useState([]);
  const [friends, setFriends] = useState([]);
  const [activeTab, setActiveTab] = useState('hotlist');
  const [showAddMovie, setShowAddMovie] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [detailsMovie, setDetailsMovie] = useState(null);
  const [ratingPreference, setRatingPreference] = useState('imdb');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [userProfile, setUserProfile] = useState({ name: '', gender: '', ageGroup: '' });
  const [tempProfile, setTempProfile] = useState({ name: '', gender: '', ageGroup: '' });
  const [tempFriends, setTempFriends] = useState([]);
  const [tempFriendInput, setTempFriendInput] = useState('');
  const [tempServices, setTempServices] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Add movie form state
  const [selectedResult, setSelectedResult] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState('');
  const [newInlineFriend, setNewInlineFriend] = useState('');
  const [showInlineFriendAdd, setShowInlineFriendAdd] = useState(false);
  const [streaming, setStreaming] = useState('');
  const [note, setNote] = useState('');

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load data from localStorage
  useEffect(() => {
    const savedMovies = localStorage.getItem('hotlist_movies');
    const savedFriends = localStorage.getItem('hotlist_friends');
    const savedRatingPref = localStorage.getItem('hotlist_rating_pref');
    const savedProfile = localStorage.getItem('hotlist_profile');
    const onboardingComplete = localStorage.getItem('hotlist_onboarding_complete');

    if (savedMovies) setMovies(JSON.parse(savedMovies));
    if (savedFriends) setFriends(JSON.parse(savedFriends));
    if (savedRatingPref) setRatingPreference(savedRatingPref);
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      setUserProfile(profile);
      setTempProfile(profile);
    }

    setShowOnboarding(!onboardingComplete);
    setIsDataLoaded(true);
  }, []);

  // Save data to localStorage
  useEffect(() => {
    if (isDataLoaded && movies.length > 0) {
      localStorage.setItem('hotlist_movies', JSON.stringify(movies));
    }
  }, [movies, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded && friends.length > 0) {
      localStorage.setItem('hotlist_friends', JSON.stringify(friends));
    }
  }, [friends, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem('hotlist_rating_pref', ratingPreference);
    }
  }, [ratingPreference, isDataLoaded]);

  // TMDB Multi-Search (Movies + TV Shows)
  const searchTMDB = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      
      const results = data.results
        .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
        .map(item => ({
          id: `${item.media_type}-${item.id}`,
          tmdbId: item.id,
          mediaType: item.media_type,
          title: item.media_type === 'movie' ? item.title : item.name,
          year: item.media_type === 'movie' 
            ? item.release_date?.substring(0, 4) 
            : item.first_air_date?.substring(0, 4),
          poster: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null,
          genre: item.genre_ids?.join(', ') || 'Unknown',
          imdbRating: item.vote_average ? `⭐ ${item.vote_average.toFixed(1)}` : 'N/A',
          rtRating: item.vote_average ? `🍅 ${Math.round(item.vote_average * 10)}%` : 'N/A',
          overview: item.overview,
          seasons: item.media_type === 'tv' ? item.number_of_seasons : null,
        }));

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching TMDB:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchTMDB(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handlers
  const handleAddMovie = () => {
    if (!selectedResult || !selectedFriend) return;

    const newMovie = {
      ...selectedResult,
      friend: selectedFriend,
      streaming: streaming || '???',
      note: note,
      status: 'want',
      dateAdded: new Date().toISOString()
    };

    setMovies([newMovie, ...movies]);
    
    // Reset form
    setShowAddMovie(false);
    setSelectedResult(null);
    setSelectedFriend('');
    setStreaming('');
    setNote('');
    setSearchQuery('');
    setSearchResults([]);
    setShowInlineFriendAdd(false);
    setNewInlineFriend('');
  };

  const handleInlineFriendAdd = () => {
    if (newInlineFriend.trim()) {
      const newFriend = { id: Date.now(), name: newInlineFriend.trim() };
      setFriends([...friends, newFriend]);
      setSelectedFriend(newFriend.name);
      setNewInlineFriend('');
      setShowInlineFriendAdd(false);
    }
  };

  const updateMovieStatus = (movieId, newStatus) => {
    setMovies(movies.map(m => {
      if (m.id === movieId) {
        if (newStatus === 'watched') {
          setSelectedMovie(m);
          setShowRating(true);
        }
        return { ...m, status: newStatus };
      }
      return m;
    }));
  };

  const rateMovie = (rating) => {
    if (selectedMovie) {
      const updatedMovie = { ...selectedMovie, myRating: rating };
      setMovies(movies.map(m => 
        m.id === selectedMovie.id ? updatedMovie : m
      ));
      setShowRating(false);
      
      // Show share prompt after rating
      setSelectedMovie(updatedMovie);
      
      // Small delay to let rating modal close smoothly
      setTimeout(() => {
        if (window.confirm(`Share your ${updatedMovie.myRating}🔥 rating with ${updatedMovie.friend}?\n\nThey'll get a WhatsApp message thanking them for the recommendation!`)) {
          shareMovieWithFriend(updatedMovie);
        }
        setSelectedMovie(null);
      }, 300);
    }
  };

  const shareMovie = (movie) => {
    const fullFlames = Math.floor(movie.myRating || 0);
    const hasHalf = (movie.myRating || 0) % 1 !== 0;
    const flames = '🔥'.repeat(fullFlames) + (hasHalf ? '🔥' : '');
    const mediaTypeLabel = movie.mediaType === 'tv' ? 'TV show' : 'movie';
    const text = `Check out this ${mediaTypeLabel}: *${movie.title}* on ${movie.streaming}! ${flames}${movie.myRating ? ` (${movie.myRating}/5)` : ''} - Recommended by ${movie.friend}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareMovieWithFriend = (movie) => {
    const fullFlames = Math.floor(movie.myRating || 0);
    const hasHalf = (movie.myRating || 0) % 1 !== 0;
    const flames = '🔥'.repeat(fullFlames) + (hasHalf ? '🔥' : '');
    const mediaTypeLabel = movie.mediaType === 'tv' ? 'TV show' : 'movie';
    const text = `Hey! Just watched *${movie.title}* (the ${mediaTypeLabel} you recommended) - gave it ${movie.myRating}${flames}! Thanks for the suggestion! 🙌`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const addFriend = () => {
    if (newFriendName.trim()) {
      setFriends([...friends, { id: Date.now(), name: newFriendName.trim() }]);
      setNewFriendName('');
    }
  };

  const deleteFriend = (friendId) => {
    setFriends(friends.filter(f => f.id !== friendId));
  };

  const deleteMovie = (movieId) => {
    setMovies(movies.filter(m => m.id !== movieId));
  };

  const handleCardClick = (movie) => {
    setDetailsMovie(movie);
    setShowDetails(true);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setMovies((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Filtered movies
  const filteredMovies = activeTab === 'hotlist'
    ? movies.filter(m => m.status === 'want' || m.status === 'interested' || m.status === 'watching')
    : movies.filter(m => m.status === 'watched');

  const movieIds = filteredMovies.map(m => m.id);

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Aptos, system-ui, sans-serif' }}>
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
      <div className="bg-white border-b sticky top-16 z-10">
        <div className="flex max-w-2xl mx-auto">
          <button
            onClick={() => setActiveTab('hotlist')}
            className={`flex-1 py-3 font-medium ${
              activeTab === 'hotlist'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-500'
            }`}
          >
            🔥 HOTLIST ({movies.filter(m => m.status !== 'watched').length})
          </button>
          <button
            onClick={() => setActiveTab('watched')}
            className={`flex-1 py-3 font-medium ${
              activeTab === 'watched'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-500'
            }`}
          >
            ✓ Watched ({movies.filter(m => m.status === 'watched').length})
          </button>
        </div>
      </div>

      {/* Movie List */}
      <div className="max-w-2xl mx-auto pb-24">
        {filteredMovies.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Flame className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No {activeTab === 'hotlist' ? 'titles' : 'watched titles'} yet</p>
            <p className="text-sm mt-2">Tap the + button to add your first {activeTab === 'hotlist' ? 'recommendation' : 'title'}!</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            {activeTab === 'hotlist' ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={movieIds}
                  strategy={verticalListSortingStrategy}
                >
                  {filteredMovies.map((movie) => (
                    <SortableMovieCard
                      key={movie.id}
                      movie={movie}
                      ratingPreference={ratingPreference}
                      onStatusChange={updateMovieStatus}
                      onRate={(m) => { setSelectedMovie(m); setShowRating(true); }}
                      onShare={shareMovie}
                      onDelete={deleteMovie}
                      onCardClick={handleCardClick}
                      isDraggable={true}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              filteredMovies.map((movie) => (
                <SortableMovieCard
                  key={movie.id}
                  movie={movie}
                  ratingPreference={ratingPreference}
                  onStatusChange={updateMovieStatus}
                  onRate={(m) => { setSelectedMovie(m); setShowRating(true); }}
                  onShare={shareMovie}
                  onDelete={deleteMovie}
                  onCardClick={handleCardClick}
                  isDraggable={false}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Settings</h2>
              <button onClick={() => setShowSettings(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Rating Preference</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRatingPreference('imdb')}
                    className={`flex-1 py-2 px-4 rounded-lg ${
                      ratingPreference === 'imdb' 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-gray-100'
                    }`}
                  >
                    ⭐ IMDB
                  </button>
                  <button
                    onClick={() => setRatingPreference('rt')}
                    className={`flex-1 py-2 px-4 rounded-lg ${
                      ratingPreference === 'rt' 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-gray-100'
                    }`}
                  >
                    🍅 Rotten Tomatoes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Friends List Modal */}
      {showFriendsList && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 max-w-2xl mx-auto max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Friends</h2>
              <button onClick={() => setShowFriendsList(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFriendName}
                  onChange={(e) => setNewFriendName(e.target.value)}
                  placeholder="Friend's name"
                  className="flex-1 px-4 py-2 border rounded-lg"
                  onKeyPress={(e) => e.key === 'Enter' && addFriend()}
                />
                <button
                  onClick={addFriend}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg"
                >
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {friends.map(friend => (
                  <div key={friend.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span>{friend.name}</span>
                    <button
                      onClick={() => deleteFriend(friend.id)}
                      className="text-red-500"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRating && selectedMovie && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-center">Rate {selectedMovie.title}</h2>
            <p className="text-center text-gray-600 mb-6">How hot was it? 🔥</p>
            
            <div className="mb-6">
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                defaultValue="3"
                className="w-full"
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  document.getElementById('rating-display').textContent = value.toFixed(1);
                  document.getElementById('flame-display').textContent = '🔥'.repeat(Math.floor(value)) + (value % 1 ? '🔥' : '');
                }}
              />
              <div className="text-center mt-4">
                <div id="flame-display" className="text-4xl mb-2">🔥🔥🔥</div>
                <div id="rating-display" className="text-2xl font-bold">3.0</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRating(false);
                  setSelectedMovie(null);
                }}
                className="flex-1 py-3 bg-gray-200 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const rating = parseFloat(document.getElementById('rating-display').textContent);
                  rateMovie(rating);
                }}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-semibold"
              >
                Save & Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetails && detailsMovie && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 max-w-2xl mx-auto max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">{detailsMovie.title}</h2>
                {detailsMovie.year && <p className="text-gray-600">{detailsMovie.year}</p>}
              </div>
              <button onClick={() => setShowDetails(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            {detailsMovie.poster && (
              <img 
                src={detailsMovie.poster}
                alt={detailsMovie.title}
                className="w-full h-64 object-cover rounded-lg mb-4"
              />
            )}

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Genre</p>
                <p>{detailsMovie.genre}</p>
              </div>

              {detailsMovie.mediaType === 'tv' && detailsMovie.seasons && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Seasons</p>
                  <p>{detailsMovie.seasons} season{detailsMovie.seasons !== 1 ? 's' : ''}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-500">Rating</p>
                <p>{ratingPreference === 'imdb' ? detailsMovie.imdbRating : detailsMovie.rtRating}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">Recommended by</p>
                <p>{detailsMovie.friend}</p>
              </div>

              {detailsMovie.note && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Note</p>
                  <p className="italic">{detailsMovie.note}</p>
                </div>
              )}

              {detailsMovie.overview && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Overview</p>
                  <p className="text-sm">{detailsMovie.overview}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Movie Modal */}
      {showAddMovie && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between bg-white">
            <h2 className="text-xl font-bold">Add to HOTLIST</h2>
            <button onClick={() => {
              setShowAddMovie(false);
              setSelectedResult(null);
              setSearchQuery('');
              setSearchResults([]);
              setShowInlineFriendAdd(false);
            }}>
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!selectedResult ? (
              <>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search movies or TV shows..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl mb-4 text-lg"
                  autoFocus
                />

                {isSearching && (
                  <p className="text-center py-4 text-gray-500">Searching...</p>
                )}

                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      onClick={() => setSelectedResult(result)}
                      className="flex gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                    >
                      {result.poster ? (
                        <img src={result.poster} alt={result.title} className="w-12 h-18 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-18 bg-gray-200 rounded flex items-center justify-center">
                          {result.mediaType === 'tv' ? (
                            <Tv className="w-6 h-6 text-gray-400" />
                          ) : (
                            <Film className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold">{result.title}</h3>
                          {result.mediaType === 'tv' && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-medium">TV</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{result.year}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {searchResults.length === 0 && searchQuery.length >= 2 && !isSearching && (
                  <p className="text-center py-4 text-gray-500">No results found. Try a different search.</p>
                )}
                {searchQuery.length < 2 && (
                  <p className="text-gray-500 text-center py-4">Type at least 2 characters to search...</p>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                  {selectedResult.poster ? (
                    <img src={selectedResult.poster} alt={selectedResult.title} className="w-16 h-24 object-cover rounded" />
                  ) : (
                    <div className="w-16 h-24 bg-gray-200 rounded flex items-center justify-center">
                      {selectedResult.mediaType === 'tv' ? (
                        <Tv className="w-8 h-8 text-gray-400" />
                      ) : (
                        <Film className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold">{selectedResult.title}</h3>
                      {selectedResult.mediaType === 'tv' && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-medium">TV</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{selectedResult.year}</p>
                    <p className="text-sm text-gray-600">{selectedResult.imdbRating}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedResult(null)}
                  className="text-orange-500 text-sm"
                >
                  ← Choose different title
                </button>

                <div>
                  <label className="block text-sm font-medium mb-2">Recommended by</label>
                  {!showInlineFriendAdd ? (
                    <div className="space-y-2">
                      <select
                        value={selectedFriend}
                        onChange={(e) => {
                          if (e.target.value === 'ADD_NEW') {
                            setShowInlineFriendAdd(true);
                          } else {
                            setSelectedFriend(e.target.value);
                          }
                        }}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
                      >
                        <option value="">Select a friend</option>
                        {friends.map(friend => (
                          <option key={friend.id} value={friend.name}>{friend.name}</option>
                        ))}
                        <option value="ADD_NEW">+ Add New Friend</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newInlineFriend}
                        onChange={(e) => setNewInlineFriend(e.target.value)}
                        placeholder="Friend's name"
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl"
                        autoFocus
                        onKeyPress={(e) => e.key === 'Enter' && handleInlineFriendAdd()}
                      />
                      <button
                        onClick={handleInlineFriendAdd}
                        className="px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowInlineFriendAdd(false);
                          setNewInlineFriend('');
                        }}
                        className="px-4 py-3 bg-gray-200 rounded-xl"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Streaming Service</label>
                  <input
                    type="text"
                    value={streaming}
                    onChange={(e) => setStreaming(e.target.value)}
                    placeholder="e.g., Netflix, Prime Video, or ???"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Note (Optional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Why should you watch this?"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl resize-none"
                    rows="3"
                  />
                </div>

                <button
                  onClick={handleAddMovie}
                  disabled={!selectedFriend}
                  className={`w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 ${
                    selectedFriend ? 'bg-orange-500' : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-5 h-5" />
                  Add to HOTLIST
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Add Button */}
      <button
        onClick={() => setShowAddMovie(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-orange-600 transition-colors z-40"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* ONBOARDING FLOW */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
          <div className="max-w-md w-full p-6">
            {/* Step 1: Name & Gender */}
            {onboardingStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <Flame className="w-16 h-16 mx-auto mb-4 text-orange-500" />
                  <h2 className="text-3xl font-bold">Welcome to HOTLIST 🔥</h2>
                  <p className="text-gray-600 mt-2">Let's personalize your experience</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Your Name</label>
                  <input
                    type="text"
                    value={tempProfile.name}
                    onChange={(e) => setTempProfile({...tempProfile, name: e.target.value})}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Gender</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Male', 'Female', 'Other'].map(gender => (
                      <button
                        key={gender}
                        onClick={() => setTempProfile({...tempProfile, gender})}
                        className={`py-3 rounded-xl font-medium transition-colors ${
                          tempProfile.gender === gender
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {gender}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setOnboardingStep(2)}
                  disabled={!tempProfile.name || !tempProfile.gender}
                  className={`w-full py-4 rounded-xl font-semibold ${
                    tempProfile.name && tempProfile.gender
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Next
                </button>
              </div>
            )}

            {/* Step 2: Age Group */}
            {onboardingStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold">What's your age group?</h2>
                  <p className="text-gray-600 mt-2">This helps us personalize recommendations</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {['18-24', '25-34', '35-44', '45-54', '55-64', '65+'].map(age => (
                    <button
                      key={age}
                      onClick={() => setTempProfile({...tempProfile, ageGroup: age})}
                      className={`py-4 rounded-xl font-medium transition-colors ${
                        tempProfile.ageGroup === age
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {age}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setOnboardingStep(1)}
                    className="flex-1 py-4 bg-gray-200 rounded-xl font-semibold"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setOnboardingStep(3)}
                    disabled={!tempProfile.ageGroup}
                    className={`flex-1 py-4 rounded-xl font-semibold ${
                      tempProfile.ageGroup
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Streaming Services */}
            {onboardingStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold">Which streaming services do you use?</h2>
                  <p className="text-gray-600 mt-2">Select all that apply</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {['Netflix', 'Prime Video', 'Disney+', 'Apple TV+', 'HBO Max', 'Hulu', 'Paramount+', 'Other'].map(service => (
                    <button
                      key={service}
                      onClick={() => {
                        if (tempServices.includes(service)) {
                          setTempServices(tempServices.filter(s => s !== service));
                        } else {
                          setTempServices([...tempServices, service]);
                        }
                      }}
                      className={`py-4 rounded-xl font-medium transition-colors ${
                        tempServices.includes(service)
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {service}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setOnboardingStep(2)}
                    className="flex-1 py-4 bg-gray-200 rounded-xl font-semibold"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setOnboardingStep(4)}
                    className="flex-1 py-4 bg-orange-500 text-white rounded-xl font-semibold"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Add Friends */}
            {onboardingStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold">Add your friends</h2>
                  <p className="text-gray-600 mt-2">Who gives you the best recommendations?</p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tempFriendInput}
                    onChange={(e) => setTempFriendInput(e.target.value)}
                    placeholder="Friend's name"
                    className="flex-1 px-4 py-3 border-2 rounded-xl"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && tempFriendInput.trim()) {
                        setTempFriends([...tempFriends, {id: Date.now(), name: tempFriendInput.trim()}]);
                        setTempFriendInput('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (tempFriendInput.trim()) {
                        setTempFriends([...tempFriends, {id: Date.now(), name: tempFriendInput.trim()}]);
                        setTempFriendInput('');
                      }
                    }}
                    className="px-6 py-3 bg-orange-500 text-white rounded-xl"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tempFriends.map(friend => (
                    <div key={friend.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span>{friend.name}</span>
                      <button
                        onClick={() => setTempFriends(tempFriends.filter(f => f.id !== friend.id))}
                        className="text-red-500"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setOnboardingStep(3)}
                    className="flex-1 py-4 bg-gray-200 rounded-xl font-semibold"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      setUserProfile(tempProfile);
                      setFriends(tempFriends);
                      localStorage.setItem('hotlist_profile', JSON.stringify(tempProfile));
                      localStorage.setItem('hotlist_friends', JSON.stringify(tempFriends));
                      localStorage.setItem('hotlist_onboarding_complete', 'true');
                      setShowOnboarding(false);
                    }}
                    className="flex-1 py-4 bg-orange-500 text-white rounded-xl font-semibold"
                  >
                    Get Started! 🔥
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { Plus, Search, User, Share2, Flame, Star, X, Check, Settings } from 'lucide-react';

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

export default function HotlistApp() {
  const [movies, setMovies] = useState([]);
  const [friends, setFriends] = useState([]);
  const [showAddMovie, setShowAddMovie] = useState(false);
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [ratingPreference, setRatingPreference] = useState('imdb');
  const [newFriendName, setNewFriendName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentView, setCurrentView] = useState('hotlist');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [userProfile, setUserProfile] = useState({
    name: '',
    gender: '',
    ageGroup: '',
    streamingServices: []
  });
  const [tempProfile, setTempProfile] = useState({
    name: '',
    gender: '',
    ageGroup: '',
    streamingServices: []
  });
  const [tempFriends, setTempFriends] = useState([]);
  const [tempFriendInput, setTempFriendInput] = useState('');
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [selectedMovieDetails, setSelectedMovieDetails] = useState(null);

  useEffect(() => {
    // Load all saved data from localStorage
    console.log('🚀 App loading - checking localStorage...');
    
    try {
      const savedMovies = localStorage.getItem('hotlist_movies');
      const savedFriends = localStorage.getItem('hotlist_friends');
      const savedRatingPref = localStorage.getItem('hotlist_rating_pref');
      const savedProfile = localStorage.getItem('hotlist_profile');
      const hasCompletedOnboarding = localStorage.getItem('hotlist_onboarding_complete');
      
      console.log('📦 Raw savedMovies from localStorage:', savedMovies);
      
      // Parse and set movies
      if (savedMovies && savedMovies !== 'undefined' && savedMovies !== 'null') {
        const parsedMovies = JSON.parse(savedMovies);
        if (Array.isArray(parsedMovies) && parsedMovies.length > 0) {
          console.log('✅ Loading', parsedMovies.length, 'movies:', parsedMovies.map(m => m.title));
          setMovies(parsedMovies);
        } else {
          console.log('⚠️ Parsed movies but array was empty');
        }
      } else {
        console.log('⚠️ No movies found in localStorage');
      }
      
      // Parse and set friends
      if (savedFriends && savedFriends !== 'undefined' && savedFriends !== 'null') {
        const parsedFriends = JSON.parse(savedFriends);
        if (Array.isArray(parsedFriends) && parsedFriends.length > 0) {
          setFriends(parsedFriends);
          console.log('✅ Loaded friends:', parsedFriends.length, parsedFriends.map(f => f.name));
        } else {
          console.log('⚠️ Parsed friends but array was empty');
        }
      } else {
        console.log('⚠️ No friends found in localStorage');
      }
      
      // Set rating preference
      if (savedRatingPref) {
        setRatingPreference(savedRatingPref);
      }
      
      // Parse and set profile
      if (savedProfile && savedProfile !== 'undefined') {
        const parsedProfile = JSON.parse(savedProfile);
        setUserProfile(parsedProfile);
        console.log('✅ Loaded profile:', parsedProfile.name);
      }
      
      // Check if onboarding is needed
      if (!hasCompletedOnboarding) {
        console.log('ℹ️ Onboarding not complete - showing onboarding');
        setShowOnboarding(true);
      } else {
        console.log('✅ Onboarding already completed');
      }
      
      // Mark that initial data has been loaded
      setHasLoadedInitialData(true);
    } catch (error) {
      console.error('❌ Error loading data from localStorage:', error);
      setHasLoadedInitialData(true);
    }
  }, []);

  useEffect(() => {
    // Only save after initial data has loaded
    if (!hasLoadedInitialData) {
      console.log('⏸️ Skipping save - initial data not loaded yet');
      return;
    }
    
    try {
      console.log('🔍 Saving movies to localStorage...');
      localStorage.setItem('hotlist_movies', JSON.stringify(movies));
      console.log('💾 Saved', movies.length, 'movies');
      if (movies.length > 0) {
        console.log('📝 Movie titles:', movies.map(m => m.title));
      }
    } catch (error) {
      console.error('❌ Error saving movies:', error);
    }
  }, [movies, hasLoadedInitialData]);

  useEffect(() => {
    // Only save after initial data has loaded
    if (!hasLoadedInitialData) {
      console.log('⏸️ Skipping friends save - initial data not loaded yet');
      return;
    }
    
    try {
      localStorage.setItem('hotlist_friends', JSON.stringify(friends));
      console.log('💾 Saved', friends.length, 'friends');
    } catch (error) {
      console.error('❌ Error saving friends:', error);
    }
  }, [friends, hasLoadedInitialData]);

  useEffect(() => {
    localStorage.setItem('hotlist_rating_pref', ratingPreference);
  }, [ratingPreference]);

  const searchMovies = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    try {
      const response = await fetch(
        `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=1`
      );
      
      if (!response.ok) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      
      const data = await response.json();
      
      const results = data.results
        .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
        .slice(0, 8)
        .map(item => ({
          id: item.id,
          title: item.title || item.name,
          poster_path: item.poster_path,
          vote_average: item.vote_average || 0,
          genre_ids: item.genre_ids || [],
          overview: item.overview,
          release_date: item.release_date || item.first_air_date,
          media_type: item.media_type
        }));
      
      setSearchResults(results);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchMovies(searchQuery);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const addMovie = (movieData, friend, note, streaming) => {
    const newMovie = {
      id: Date.now(),
      tmdbId: movieData.id,
      title: movieData.title,
      poster: movieData.poster_path ? `${TMDB_IMAGE_BASE}${movieData.poster_path}` : null,
      imdbRating: movieData.vote_average ? movieData.vote_average.toFixed(1) : 'N/A',
      rtRating: movieData.vote_average ? Math.floor(movieData.vote_average * 10) : 0,
      genre: movieData.genre_ids?.[0] ? GENRE_MAP[movieData.genre_ids[0]] || 'Drama' : 'Drama',
      friend: friend,
      note: note,
      streaming: streaming || '???',
      status: 'want',
      myRating: 0,
      addedDate: new Date().toISOString(),
      mediaType: movieData.media_type,
      overview: movieData.overview || '',
      cast: movieData.cast || [],
      director: movieData.director || ''
    };
    
    setMovies([newMovie, ...movies]);
    setShowAddMovie(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateMovieStatus = (movieId, newStatus) => {
    const movie = movies.find(m => m.id === movieId);
    
    if (newStatus === 'watched' && movie && movie.status !== 'watched') {
      setSelectedMovie(movie);
    }
    
    setMovies(movies.map(m => 
      m.id === movieId ? { ...m, status: newStatus } : m
    ));
  };

  const rateMovie = (rating) => {
    if (selectedMovie) {
      setMovies(movies.map(m => 
        m.id === selectedMovie.id ? { ...m, myRating: rating } : m
      ));
      setSelectedMovie(null);
    }
  };

  const shareMovie = (movie) => {
    const flames = '🔥'.repeat(movie.myRating || 0);
    const text = `Check out *${movie.title}* on ${movie.streaming}! ${flames}${movie.myRating ? ` (${movie.myRating}/5)` : ''} - Recommended by ${movie.friend}`;
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

  const filteredMovies = currentView === 'hotlist'
    ? movies.filter(m => m.status === 'want' || m.status === 'interested' || m.status === 'watching')
    : movies.filter(m => m.status === 'watched');

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
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    IMDB
                  </button>
                  <button
                    onClick={() => setRatingPreference('rt')}
                    className={`flex-1 py-2 px-4 rounded-lg ${
                      ratingPreference === 'rt' 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    Rotten Tomatoes
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
              <h2 className="text-xl font-bold">My Friends</h2>
              <button onClick={() => setShowFriendsList(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex gap-2 mb-4">
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
                className="px-4 py-2 bg-orange-500 text-white rounded-lg"
              >
                Add
              </button>
            </div>
            <div className="space-y-2">
              {friends.map(friend => (
                <div key={friend.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{friend.name}</span>
                  <button
                    onClick={() => deleteFriend(friend.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {friends.length === 0 && (
                <p className="text-gray-500 text-center py-4">No friends added yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {selectedMovie && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Rate {selectedMovie.title}</h3>
            <div className="mb-6">
              <div className="flex justify-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map(num => (
                  <div key={num} className="relative cursor-pointer" onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const isLeftHalf = x < rect.width / 2;
                    const rating = isLeftHalf ? num - 0.5 : num;
                    const updated = { ...selectedMovie, myRating: rating };
                    setSelectedMovie(updated);
                  }}>
                    {/* Full flame or half flame based on rating */}
                    {num <= Math.floor(selectedMovie.myRating || 0) ? (
                      <Flame className="w-10 h-10 text-orange-500 fill-orange-500" />
                    ) : num === Math.ceil(selectedMovie.myRating || 0) && (selectedMovie.myRating || 0) % 1 !== 0 ? (
                      <div className="relative w-10 h-10">
                        <Flame className="w-10 h-10 text-gray-300 absolute" />
                        <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                          <Flame className="w-10 h-10 text-orange-500 fill-orange-500" />
                        </div>
                      </div>
                    ) : (
                      <Flame className="w-10 h-10 text-gray-300" />
                    )}
                  </div>
                ))}
              </div>
              <div className="text-center text-2xl font-bold text-orange-500 mb-3">
                {selectedMovie.myRating > 0 ? `${selectedMovie.myRating} / 5` : 'Tap to rate'}
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={selectedMovie.myRating || 0}
                onChange={(e) => {
                  const updated = { ...selectedMovie, myRating: parseFloat(e.target.value) };
                  setSelectedMovie(updated);
                }}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedMovie(null)}
                className="flex-1 py-3 bg-gray-200 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => rateMovie(selectedMovie.myRating)}
                className="flex-1 py-3 bg-orange-500 text-white rounded-lg font-medium"
              >
                Save
              </button>
            </div>
            {selectedMovie.myRating > 0 && (
              <button
                onClick={() => {
                  rateMovie(selectedMovie.myRating);
                  shareMovie(selectedMovie);
                }}
                className="w-full mt-2 py-3 bg-green-500 text-white rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <Share2 className="w-5 h-5" />
                Save & Share on WhatsApp
              </button>
            )}
          </div>
        </div>
      )}

      {/* Movie Details Modal */}
      {selectedMovieDetails && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{selectedMovieDetails.title}</h2>
              <button 
                onClick={() => setSelectedMovieDetails(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex gap-6 mb-6">
              {/* Poster */}
              {selectedMovieDetails.poster && (
                <img 
                  src={selectedMovieDetails.poster}
                  alt={selectedMovieDetails.title}
                  className="w-40 h-60 object-cover rounded-lg shadow-lg flex-shrink-0"
                />
              )}
              
              {/* Details */}
              <div className="flex-1 space-y-3">
                <div>
                  <span className="text-sm text-gray-500">Genre</span>
                  <p className="font-medium">{selectedMovieDetails.genre}</p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">Streaming</span>
                  <p className="font-medium">{selectedMovieDetails.streaming}</p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">Recommended by</span>
                  <p className="font-medium text-orange-500">{selectedMovieDetails.friend}</p>
                </div>
                
                {selectedMovieDetails.director && (
                  <div>
                    <span className="text-sm text-gray-500">Director</span>
                    <p className="font-medium">{selectedMovieDetails.director}</p>
                  </div>
                )}
                
                {selectedMovieDetails.cast && selectedMovieDetails.cast.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-500">Cast</span>
                    <p className="font-medium text-sm">{selectedMovieDetails.cast.join(', ')}</p>
                  </div>
                )}
                
                <div>
                  <span className="text-sm text-gray-500">IMDB Rating</span>
                  <p className="font-medium">⭐ {selectedMovieDetails.imdbRating}</p>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">Rotten Tomatoes</span>
                  <p className="font-medium">🍅 {selectedMovieDetails.rtRating}%</p>
                </div>
                
                {selectedMovieDetails.myRating > 0 && (
                  <div>
                    <span className="text-sm text-gray-500">Your Rating</span>
                    <p className="font-medium flex items-center gap-2">
                      <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                      {selectedMovieDetails.myRating} / 5
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Synopsis */}
            {selectedMovieDetails.overview && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-500 block mb-2 font-medium">Synopsis</span>
                <p className="text-gray-700 leading-relaxed">{selectedMovieDetails.overview}</p>
              </div>
            )}

            {/* Note */}
            {selectedMovieDetails.note && (
              <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-100">
                <span className="text-sm text-orange-600 block mb-1 font-medium">Your Note</span>
                <p className="text-gray-700 italic">"{selectedMovieDetails.note}"</p>
              </div>
            )}

            {/* Status Buttons */}
            <div className="mb-4">
              <span className="text-sm text-gray-500 block mb-2">Status</span>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map(status => (
                  <button
                    key={status.value}
                    onClick={() => {
                      updateMovieStatus(selectedMovieDetails.id, status.value);
                      setSelectedMovieDetails({...selectedMovieDetails, status: status.value});
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      selectedMovieDetails.status === status.value
                        ? `${status.color} text-white`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  shareMovie(selectedMovieDetails);
                }}
                className="flex-1 py-3 bg-green-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-600"
              >
                <Share2 className="w-5 h-5" />
                Share on WhatsApp
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete "${selectedMovieDetails.title}"?`)) {
                    deleteMovie(selectedMovieDetails.id);
                    setSelectedMovieDetails(null);
                  }
                }}
                className="px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <div className="mb-4">
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setCurrentView('hotlist')}
              className={`flex-1 py-3 rounded-lg font-semibold ${
                currentView === 'hotlist'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-orange-300'
              }`}
            >
              🔥 My HOTLIST ({movies.filter(m => m.status !== 'watched').length})
            </button>
            <button
              onClick={() => setCurrentView('watched')}
              className={`flex-1 py-3 rounded-lg font-semibold ${
                currentView === 'watched'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-green-300'
              }`}
            >
              ✓ Watched ({movies.filter(m => m.status === 'watched').length})
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
          {filteredMovies.map((movie) => (
            <div key={movie.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start gap-3">
                {/* Movie Poster - Clickable */}
                <div 
                  onClick={() => setSelectedMovieDetails(movie)}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {movie.poster && (
                    <img 
                      src={movie.poster}
                      alt={movie.title}
                      className="w-16 h-24 object-cover rounded flex-shrink-0"
                    />
                  )}
                  {!movie.poster && (
                    <div className="w-16 h-24 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center">
                      <Flame className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
                
                {/* Movie Details - Clickable */}
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setSelectedMovieDetails(movie)}
                >
                  <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-gray-900 hover:text-orange-500 transition-colors">{movie.title}</h3>
                    <span className="text-sm text-gray-600">{movie.streaming}</span>
                    <span className="text-sm text-gray-600">
                      {ratingPreference === 'imdb' ? movie.imdbRating : movie.rtRating}
                    </span>
                    <span className="text-sm text-orange-500 font-medium">({movie.friend})</span>
                    {movie.myRating > 0 && (
                      <span className="text-sm font-semibold text-orange-500 flex items-center gap-1">
                        <Flame className="w-4 h-4 fill-orange-500" />
                        {movie.myRating}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">{movie.genre}</div>
                  {movie.note && (
                    <p className="text-sm text-gray-600 italic mb-3 line-clamp-2">{movie.note}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map(status => (
                      <button
                        key={status.value}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateMovieStatus(movie.id, status.value);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          movie.status === status.value
                            ? `${status.color} text-white`
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      shareMovie(movie);
                    }}
                    className="text-gray-400 hover:text-green-500 p-1 transition-colors"
                    title="Share on WhatsApp"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMovie(movie.id);
                    }}
                    className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                    title="Delete"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredMovies.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Flame className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="font-medium">
                {currentView === 'hotlist' ? 'Your HOTLIST is empty!' : 'No watched movies yet!'}
              </p>
              <p className="text-sm">
                {currentView === 'hotlist' ? 'Add some movies to get started' : 'Mark movies as watched to see them here'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Movie Modal */}
      {showAddMovie && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add Movie or TV Show</h2>
              <button onClick={() => {
                setShowAddMovie(false);
                setSearchQuery('');
                setSearchResults([]);
              }}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a movie or TV show..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none text-lg"
                autoFocus
              />
            </div>
            {isSearching && (
              <div className="text-center py-4 text-gray-500">Searching...</div>
            )}
            {!isSearching && searchResults.length > 0 && (
              <div className="space-y-2 mb-4">
                {searchResults.map(result => (
                  <AddMovieForm
                    key={result.id}
                    movie={result}
                    friends={friends}
                    onAdd={addMovie}
                    onAddFriend={(friendName) => {
                      setFriends([...friends, { id: Date.now(), name: friendName }]);
                    }}
                  />
                ))}
              </div>
            )}
            {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <p className="text-gray-500 text-center py-4">No results found. Try a different search.</p>
            )}
            {searchQuery.length < 2 && (
              <p className="text-gray-500 text-center py-4">Type at least 2 characters to search...</p>
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
                  className="w-full py-4 bg-orange-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors"
                >
                  Continue
                </button>
              </div>
            )}

            {/* Step 2: Age Group */}
            {onboardingStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold">What's your age range?</h2>
                  <p className="text-gray-600 mt-2">This helps us personalize recommendations</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {AGE_GROUPS.map(age => (
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

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setOnboardingStep(1)}
                    className="flex-1 py-4 bg-gray-200 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setOnboardingStep(3)}
                    disabled={!tempProfile.ageGroup}
                    className="flex-1 py-4 bg-orange-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Streaming Services */}
            {onboardingStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold">Which streaming services do you have?</h2>
                  <p className="text-gray-600 mt-2">Select all that apply</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {STREAMING_SERVICES.map(service => (
                    <button
                      key={service}
                      onClick={() => {
                        const services = tempProfile.streamingServices.includes(service)
                          ? tempProfile.streamingServices.filter(s => s !== service)
                          : [...tempProfile.streamingServices, service];
                        setTempProfile({...tempProfile, streamingServices: services});
                      }}
                      className={`py-3 px-2 rounded-xl font-medium transition-colors ${
                        tempProfile.streamingServices.includes(service)
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
                    className="flex-1 py-4 bg-gray-200 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setOnboardingStep(4)}
                    className="flex-1 py-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Add Friends */}
            {onboardingStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold">Add friends who recommend movies</h2>
                  <p className="text-gray-600 mt-2">You can always add more later</p>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tempFriendInput}
                    onChange={(e) => setTempFriendInput(e.target.value)}
                    placeholder="Friend's name"
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none"
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
                    className="px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tempFriends.map(friend => (
                    <div key={friend.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{friend.name}</span>
                      <button
                        onClick={() => setTempFriends(tempFriends.filter(f => f.id !== friend.id))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  {tempFriends.length === 0 && (
                    <p className="text-gray-400 text-center py-4 text-sm">No friends added yet</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setOnboardingStep(3)}
                    className="flex-1 py-4 bg-gray-200 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
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
                    className="flex-1 py-4 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
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

function AddMovieForm({ movie, friends, onAdd, onAddFriend }) {
  const [selectedFriend, setSelectedFriend] = useState('');
  const [note, setNote] = useState('');
  const [streaming, setStreaming] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [showNewFriendInput, setShowNewFriendInput] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const fetchMovieDetails = async (movieId, mediaType) => {
    setIsLoadingDetails(true);
    try {
      const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
      const response = await fetch(
        `${TMDB_BASE_URL}/${endpoint}/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=credits`
      );
      
      if (!response.ok) {
        return { cast: [], director: '', overview: movie.overview || '' };
      }
      
      const data = await response.json();
      
      // Get cast (top 5)
      const cast = data.credits?.cast?.slice(0, 5).map(person => person.name) || [];
      
      // Get director (for movies) or creator (for TV shows)
      let director = '';
      if (mediaType === 'movie') {
        const directorObj = data.credits?.crew?.find(person => person.job === 'Director');
        director = directorObj?.name || '';
      } else {
        director = data.created_by?.[0]?.name || '';
      }
      
      return {
        cast,
        director,
        overview: data.overview || movie.overview || ''
      };
    } catch (error) {
      console.error('Error fetching movie details:', error);
      return { cast: [], director: '', overview: movie.overview || '' };
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSubmit = async () => {
    const details = await fetchMovieDetails(movie.id, movie.media_type);
    const enrichedMovie = { ...movie, ...details };
    onAdd(enrichedMovie, selectedFriend || 'Me', note, streaming);
    setShowNewFriendInput(false);
    setNewFriendName('');
  };

  const handleFriendChange = (e) => {
    const value = e.target.value;
    if (value === '__ADD_NEW__') {
      setShowNewFriendInput(true);
      setSelectedFriend('');
    } else {
      setShowNewFriendInput(false);
      setSelectedFriend(value);
    }
  };

  const handleAddNewFriend = () => {
    if (newFriendName.trim()) {
      onAddFriend(newFriendName.trim());
      setSelectedFriend(newFriendName.trim());
      setNewFriendName('');
      setShowNewFriendInput(false);
    }
  };

  return (
    <div className="border-2 border-gray-200 rounded-xl p-4 hover:border-orange-300 transition-colors">
      <div 
        className="flex items-start gap-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {movie.poster_path && (
          <img 
            src={`${TMDB_IMAGE_BASE}${movie.poster_path}`}
            alt={movie.title}
            className="w-12 h-18 object-cover rounded flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold">{movie.title}</h3>
          <p className="text-sm text-gray-500">
            {movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'} • 
            {movie.media_type === 'tv' ? ' TV Show' : ' Movie'}
          </p>
          <p className="text-xs text-orange-500 mt-1">
            {expanded ? 'Click to collapse' : 'Click to add details'}
          </p>
        </div>
        <Plus className={`w-5 h-5 flex-shrink-0 transition-transform ${expanded ? 'rotate-45' : ''}`} />
      </div>
      {expanded && (
        <div className="mt-4 space-y-3 border-t pt-3">
          <div>
            <label className="block text-sm font-medium mb-1">Recommended by</label>
            {!showNewFriendInput ? (
              <select
                value={selectedFriend}
                onChange={handleFriendChange}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Me (self-added)</option>
                {friends.map(friend => (
                  <option key={friend.id} value={friend.name}>{friend.name}</option>
                ))}
                <option value="__ADD_NEW__">+ Add New Friend</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFriendName}
                  onChange={(e) => setNewFriendName(e.target.value)}
                  placeholder="Friend's name"
                  className="flex-1 px-3 py-2 border rounded-lg"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && handleAddNewFriend()}
                />
                <button
                  onClick={handleAddNewFriend}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowNewFriendInput(false);
                    setNewFriendName('');
                  }}
                  className="px-4 py-2 bg-gray-200 rounded-lg font-medium hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Streaming Service</label>
            <input
              type="text"
              value={streaming}
              onChange={(e) => setStreaming(e.target.value)}
              placeholder="Netflix, Disney+, etc. or leave blank"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why should you watch this?"
              className="w-full px-3 py-2 border rounded-lg resize-none"
              rows="2"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={isLoadingDetails}
            className="w-full py-3 bg-orange-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingDetails ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Loading details...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Add to HOTLIST
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
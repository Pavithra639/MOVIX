// ============================================================
// Movie & TV Insights Dashboard - OMDb API Integration
// ============================================================

// Global State
let allData = [];
let filteredData = [];
let charts = {};
let posterCache = {}; // Cache for poster URLs to avoid repeated API calls
let apiCallCount = 0;
const MAX_API_CALLS = 50; // Limit API calls to prevent rate limiting
const OMDB_API_KEY = 'c0d3c2a2'; // Free tier API key (limited requests)
const OMDB_BASE_URL = 'https://www.omdbapi.com/';

// GSAP Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// Default placeholder for movies without posters
const DEFAULT_POSTER = 'https://via.placeholder.com/200x300/1a1a1a/FF6B9D?text=No+Poster';

// ===================== DATA LOADING =====================
async function loadData() {
    try {
        const response = await fetch('Copy of netflix_titles_500_rows (1).csv');
        const csvText = await response.text();
        const parsed = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true
        });
        
        allData = parsed.data.filter(item => item.title && item.title.trim() !== '');
        filteredData = [...allData];
        
        // Initialize all components
        populateFilters();
        displayMoviePosterGrid(); // New poster grid display
        populateFeaturedCarousel();
        createCharts();
        updateStats();
        updateFacts();
        setupImageSearch();
        animateOnLoad();
        
        console.log(`✅ Dashboard loaded with ${allData.length} titles`);
        
    } catch (error) {
        console.error('Error loading data:', error);
        showErrorMessage('Failed to load dashboard data');
    }
}

// ===================== OMDB API INTEGRATION =====================
/**
 * Fetch movie poster from OMDb API with caching
 * @param {string} title - Movie title
 * @returns {Promise<string>} - Poster URL or default placeholder
 */
async function fetchMoviePoster(title) {
    // Return cached poster if available
    if (posterCache[title]) {
        return posterCache[title];
    }
    
    // Don't exceed API call limit
    if (apiCallCount >= MAX_API_CALLS) {
        console.warn(`⚠️ API call limit reached (${MAX_API_CALLS}). Using placeholder for: ${title}`);
        return DEFAULT_POSTER;
    }
    
    try {
        // Clean title for API query
        const cleanTitle = title.trim().substring(0, 100);
        
        const params = new URLSearchParams({
            't': cleanTitle,
            'apikey': OMDB_API_KEY,
            'type': 'movie' // Search for movies first
        });
        
        const url = `${OMDB_BASE_URL}?${params}`;
        const response = await fetch(url);
        
        // Rate limit handling
        if (response.status === 429) {
            console.warn('⚠️ API rate limit reached. Using placeholders.');
            return DEFAULT_POSTER;
        }
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        apiCallCount++;
        
        // Check if movie found and has poster
        if (data.Response === 'True' && data.Poster && data.Poster !== 'N/A') {
            posterCache[title] = data.Poster;
            console.log(`✅ Found poster for: ${title}`);
            return data.Poster;
        } else {
            // No poster available, use placeholder
            posterCache[title] = DEFAULT_POSTER;
            console.log(`⚠️ No poster found for: ${title}`);
            return DEFAULT_POSTER;
        }
        
    } catch (error) {
        console.error(`Error fetching poster for "${title}":`, error);
        posterCache[title] = DEFAULT_POSTER;
        return DEFAULT_POSTER;
    }
}

/**
 * Batch fetch posters for multiple movies (optimized)
 * @param {Array} movies - Array of movie objects
 * @param {number} limit - Maximum movies to fetch
 * @returns {Promise<Array>} - Movies with poster URLs
 */
async function fetchMultiplePosters(movies, limit = 20) {
    const moviesToFetch = movies.slice(0, limit);
    console.log(`📥 Fetching posters for ${moviesToFetch.length} movies...`);
    
    const results = await Promise.all(
        moviesToFetch.map(async (movie) => ({
            ...movie,
            posterUrl: await fetchMoviePoster(movie.title)
        }))
    );
    
    console.log(`✅ Poster fetch complete. API calls used: ${apiCallCount}/${MAX_API_CALLS}`);
    return results;
}

// ===================== POSTER GRID DISPLAY =====================
/**
 * Display movies in responsive card grid with posters
 */
async function displayMoviePosterGrid() {
    const container = document.getElementById('search-results');
    
    // Show loading state
    container.innerHTML = '<div class="loading-spinner">Loading movie posters...</div>';
    
    try {
        // Fetch top 20 movies with posters
        const moviesWithPosters = await fetchMultiplePosters(filteredData, 20);
        
        // Generate HTML for movie cards
        const cardsHTML = moviesWithPosters.map((movie, index) => `
            <div class="movie-card" style="animation: fadeInCard 0.6s ease forwards; animation-delay: ${index * 0.05}s;">
                <div class="movie-poster-container">
                    <img 
                        src="${movie.posterUrl}" 
                        alt="${movie.title}" 
                        class="movie-poster-image"
                        onerror="this.src='${DEFAULT_POSTER}'"
                        loading="lazy"
                    />
                    <div class="movie-overlay">
                        <div class="overlay-content">
                            <h3>${movie.title}</h3>
                            <p class="movie-year">${movie.release_year || 'N/A'}</p>
                            <p class="movie-type">${movie.type || 'Content'}</p>
                            <p class="movie-rating">${movie.rating || 'Not Rated'}</p>
                            ${movie.description ? `<p class="movie-description">${movie.description.substring(0, 100)}...</p>` : ''}
                        </div>
                    </div>
                </div>
                <div class="movie-info">
                    <h4 class="movie-title" title="${movie.title}">${movie.title}</h4>
                    <div class="movie-meta">
                        <span class="meta-year">${movie.release_year || 'N/A'}</span>
                        <span class="meta-type">${movie.type || 'Content'}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = cardsHTML;
        
        // Add animations
        gsap.to('.movie-card', {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.05
        });
        
    } catch (error) {
        console.error('Error displaying poster grid:', error);
        container.innerHTML = `<div class="empty-state">Error loading movie posters. ${error.message}</div>`;
    }
}

// ===================== ANIMATIONS =====================
function animateOnLoad() {
    // Hero animations
    gsap.to('.hero-title', {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out'
    });

    gsap.to('.hero-subtitle', {
        opacity: 1,
        y: 0,
        duration: 1,
        delay: 0.2,
        ease: 'power3.out'
    });

    gsap.to('.hero-stats', {
        opacity: 1,
        y: 0,
        duration: 1,
        delay: 0.4,
        ease: 'power3.out'
    });

    gsap.to('.carousel-item', {
        opacity: 1,
        y: 0,
        duration: 0.8,
        delay: 0.6,
        stagger: 0.1,
        ease: 'power2.out'
    });

    // Scroll animations for cards
    gsap.utils.toArray('.insight-card').forEach((card) => {
        gsap.from(card, {
            opacity: 0,
            y: 50,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: card,
                start: 'top 80%',
                toggleActions: 'play none none reverse'
            }
        });
    });

    gsap.from('.fact-card', {
        opacity: 0,
        y: 50,
        duration: 0.8,
        delay: 0.1,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: {
            trigger: '.facts-section',
            start: 'top 80%'
        }
    });
}

// ===================== STATS UPDATES =====================
function updateStats() {
    const totalMovies = allData.length;
    const countries = new Set();
    const genres = new Set();

    allData.forEach(item => {
        if (item.country) {
            item.country.split(',').forEach(c => countries.add(c.trim()));
        }
        if (item.listed_in) {
            item.listed_in.split(',').forEach(g => genres.add(g.trim()));
        }
    });

    animateCounter('#stat-movies', totalMovies);
    animateCounter('#stat-countries', countries.size);
    animateCounter('#stat-genres', genres.size);
}

function animateCounter(selector, endValue) {
    let currentValue = 0;
    const duration = 2000;
    const startTime = Date.now();

    function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        currentValue = Math.floor(progress * endValue);
        
        const element = document.querySelector(selector);
        if (element) element.textContent = currentValue;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    update();
}

// ===================== FEATURED CAROUSEL =====================
async function populateFeaturedCarousel() {
    const carousel = document.getElementById('carousel');
    const items = getRandomItems(15);

    try {
        // Fetch posters for carousel items
        const itemsWithPosters = await fetchMultiplePosters(items, 15);

        itemsWithPosters.forEach(item => {
            const div = document.createElement('div');
            div.className = 'carousel-item';
            
            div.innerHTML = `
                <img src="${item.posterUrl}" alt="${item.title}" loading="lazy" onerror="this.src='${DEFAULT_POSTER}'">
                <div class="carousel-item-overlay">
                    <div class="carousel-item-title">${item.title.substring(0, 30)}</div>
                    <div class="carousel-item-year">${item.release_year || 'N/A'} • ${item.type || 'Content'}</div>
                </div>
            `;
            
            carousel.appendChild(div);
        });

        // Carousel navigation
        document.getElementById('prev-btn').addEventListener('click', () => {
            document.getElementById('carousel').scrollBy({ left: -250, behavior: 'smooth' });
        });

        document.getElementById('next-btn').addEventListener('click', () => {
            document.getElementById('carousel').scrollBy({ left: 250, behavior: 'smooth' });
        });

    } catch (error) {
        console.error('Error populating carousel:', error);
    }
}

function getRandomItems(count) {
    const shuffled = [...allData].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

// ===================== IMAGE SEARCH =====================
function setupImageSearch() {
    const searchInput = document.getElementById('image-search-input');
    const searchBtn = document.getElementById('search-btn');
    const autocompleteList = document.getElementById('autocomplete-list');
    
    searchBtn.addEventListener('click', performImageSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performImageSearch();
        }
    });
    
    // Autocomplete functionality
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (query.length < 2) {
            autocompleteList.classList.remove('active');
            return;
        }
        
        const matches = allData.filter(item =>
            item.title.toLowerCase().includes(query)
        ).slice(0, 8);
        
        if (matches.length === 0) {
            autocompleteList.classList.remove('active');
            return;
        }
        
        autocompleteList.innerHTML = matches.map((item, idx) => `
            <div class="autocomplete-item" data-index="${idx}" onclick="selectAutocompleteItem('${item.title.replace(/'/g, "\\'")}')">
                <span class="autocomplete-item-title">${item.title}</span>
                <span class="autocomplete-item-type">${item.type}</span>
            </div>
        `).join('');
        
        autocompleteList.classList.add('active');
    });
    
    // Close autocomplete when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-input-wrapper')) {
            autocompleteList.classList.remove('active');
        }
    });
}

function selectAutocompleteItem(title) {
    document.getElementById('image-search-input').value = title;
    document.getElementById('autocomplete-list').classList.remove('active');
    performImageSearch();
}

async function performImageSearch() {
    const searchTerm = document.getElementById('image-search-input').value.toLowerCase().trim();
    const resultsContainer = document.getElementById('search-results');
    
    if (!searchTerm) {
        resultsContainer.innerHTML = '<div class="empty-state">Start searching for your favorite movies!</div>';
        return;
    }
    
    resultsContainer.innerHTML = '<div class="loading-spinner">Searching and loading posters...</div>';
    
    const results = allData.filter(item => 
        item.title.toLowerCase().includes(searchTerm) ||
        (item.description && item.description.toLowerCase().includes(searchTerm))
    );
    
    if (results.length === 0) {
        resultsContainer.innerHTML = `<div class="empty-state">No results found for "${searchTerm}".</div>`;
        return;
    }
    
    // Limit to first 20 results and fetch posters
    const displayResults = await fetchMultiplePosters(results, 20);
    
    const cardsHTML = displayResults.map((item, index) => {
        const genres = item.listed_in ? item.listed_in.split(',').map(g => g.trim()).slice(0, 2).join(', ') : 'N/A';
        
        return `
        <div class="movie-card" style="animation: fadeInCard 0.6s ease forwards; animation-delay: ${index * 0.05}s;">
            <div class="movie-poster-container">
                <img 
                    src="${item.posterUrl}" 
                    alt="${item.title}" 
                    class="movie-poster-image"
                    onerror="this.src='${DEFAULT_POSTER}'"
                    loading="lazy"
                />
                <div class="movie-overlay">
                    <div class="overlay-content">
                        <h3>${item.title}</h3>
                        <p class="movie-year">${item.release_year || 'N/A'}</p>
                        <p class="movie-type">${item.type || 'Content'}</p>
                        <p class="movie-rating">${item.rating || 'Not Rated'}</p>
                    </div>
                </div>
            </div>
            <div class="movie-info">
                <h4 class="movie-title" title="${item.title}">${item.title}</h4>
                <div class="movie-meta">
                    <span class="meta-year">${item.release_year || 'N/A'}</span>
                    <span class="meta-type">${item.type || 'Content'}</span>
                </div>
            </div>
        </div>
    `;
    }).join('');
    
    resultsContainer.innerHTML = cardsHTML;
    
    gsap.to('.movie-card', {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.05
    });
}

// ===================== FILTERS =====================
function populateFilters() {
    const years = [...new Set(allData.map(item => item.release_year).filter(Boolean))].sort().reverse();
    const yearSelect = document.getElementById('year-filter');
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });

    const countries = [...new Set(allData.flatMap(item =>
        item.country ? item.country.split(',').map(c => c.trim()) : []
    ))].sort();
    const countrySelect = document.getElementById('country-filter');
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        countrySelect.appendChild(option);
    });

    document.getElementById('year-filter').addEventListener('change', applyFilters);
    document.getElementById('country-filter').addEventListener('change', applyFilters);
    document.getElementById('type-filter').addEventListener('change', applyFilters);
    document.getElementById('search-input').addEventListener('input', applyFilters);
}

function applyFilters() {
    const year = document.getElementById('year-filter').value;
    const country = document.getElementById('country-filter').value;
    const type = document.getElementById('type-filter').value;
    const search = document.getElementById('search-input').value.toLowerCase();

    filteredData = allData.filter(item => {
        const matchYear = !year || item.release_year === year;
        const matchCountry = !country || (item.country && item.country.includes(country));
        const matchType = !type || item.type === type;
        const matchSearch = !search || 
            item.title.toLowerCase().includes(search) ||
            (item.description && item.description.toLowerCase().includes(search));

        return matchYear && matchCountry && matchType && matchSearch;
    });

    updateCharts();
    displayMoviePosterGrid();
    updateFacts(filteredData);
}

// ===================== CHARTS =====================
function createCharts() {
    createTypeChart();
    createRatingChart();
    createYearChart();
    createCountryChart();
    createGenreChart();
}

function createTypeChart() {
    const ctx = document.getElementById('type-chart').getContext('2d');
    const data = processTypeData(filteredData);

    if (charts.typeChart) charts.typeChart.destroy();
    charts.typeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: ['#FF6B9D', '#00B4D8'],
                borderColor: ['#FF6B9D', '#00B4D8'],
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#0A0E27',
                        font: { size: 12, weight: 'bold' }
                    }
                }
            }
        }
    });
}

function createRatingChart() {
    const ctx = document.getElementById('rating-chart').getContext('2d');
    const data = processRatingData(filteredData);
    const top8 = Object.entries(data).sort(([,a], [,b]) => b - a).slice(0, 8);

    if (charts.ratingChart) charts.ratingChart.destroy();
    charts.ratingChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: top8.map(([rating]) => rating),
            datasets: [{
                data: top8.map(([,count]) => count),
                backgroundColor: ['#FF6B9D', '#00B4D8', '#FFD60A', '#A100F2', '#06FFA5', '#FF8C42', '#6366F1', '#EC4899'],
                borderColor: '#FFFFFF',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#0A0E27',
                        font: { size: 11 }
                    }
                }
            }
        }
    });
}

function createYearChart() {
    const ctx = document.getElementById('year-chart').getContext('2d');
    const data = processYearData(filteredData);
    const sortedYears = Object.keys(data).sort();

    if (charts.yearChart) charts.yearChart.destroy();
    charts.yearChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedYears,
            datasets: [{
                label: 'Content Added',
                data: sortedYears.map(year => data[year]),
                borderColor: '#FF6B9D',
                backgroundColor: 'rgba(255, 107, 157, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#FF6B9D',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#0A0E27',
                        font: { weight: 'bold' }
                    }
                }
            },
            scales: {
                y: {
                    ticks: { color: '#666' },
                    grid: { color: 'rgba(255, 107, 157, 0.1)' }
                },
                x: {
                    ticks: { color: '#666' },
                    grid: { color: 'rgba(255, 107, 157, 0.1)' }
                }
            }
        }
    });
}

function createCountryChart() {
    const ctx = document.getElementById('country-chart').getContext('2d');
    const data = processCountryData(filteredData);
    const top10 = Object.entries(data).sort(([,a], [,b]) => b - a).slice(0, 10);

    if (charts.countryChart) charts.countryChart.destroy();
    charts.countryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: top10.map(([country]) => country),
            datasets: [{
                label: 'Number of Titles',
                data: top10.map(([,count]) => count),
                backgroundColor: 'rgba(255, 107, 157, 0.8)',
                borderColor: '#FF6B9D',
                borderWidth: 2
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#0A0E27' }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#666' },
                    grid: { color: 'rgba(255, 107, 157, 0.1)' }
                },
                y: {
                    ticks: { color: '#666' },
                    grid: { color: 'rgba(255, 107, 157, 0.1)' }
                }
            }
        }
    });
}

function createGenreChart() {
    const ctx = document.getElementById('genre-chart').getContext('2d');
    const data = processGenreData(filteredData);
    const top10 = Object.entries(data).sort(([,a], [,b]) => b - a).slice(0, 10);

    if (charts.genreChart) charts.genreChart.destroy();
    charts.genreChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: top10.map(([genre]) => genre),
            datasets: [{
                label: 'Number of Titles',
                data: top10.map(([,count]) => count),
                backgroundColor: '#00B4D8',
                borderColor: '#00B4D8',
                borderWidth: 2
            }]
        },
        options: {
            indexAxis: 'x',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#0A0E27' }
                }
            },
            scales: {
                y: {
                    ticks: { color: '#666' },
                    grid: { color: 'rgba(0, 180, 216, 0.1)' }
                },
                x: {
                    ticks: { color: '#666' },
                    grid: { color: 'rgba(0, 180, 216, 0.1)' }
                }
            }
        }
    });
}

function updateCharts() {
    createCharts();
}

// ===================== DATA PROCESSING =====================
function processTypeData(data) {
    const count = {};
    data.forEach(item => {
        count[item.type] = (count[item.type] || 0) + 1;
    });
    return count;
}

function processRatingData(data) {
    const count = {};
    data.forEach(item => {
        if (item.rating) {
            count[item.rating] = (count[item.rating] || 0) + 1;
        }
    });
    return count;
}

function processYearData(data) {
    const count = {};
    data.forEach(item => {
        if (item.release_year) {
            count[item.release_year] = (count[item.release_year] || 0) + 1;
        }
    });
    return count;
}

function processCountryData(data) {
    const count = {};
    data.forEach(item => {
        if (item.country) {
            item.country.split(',').forEach(country => {
                const c = country.trim();
                count[c] = (count[c] || 0) + 1;
            });
        }
    });
    return count;
}

function processGenreData(data) {
    const count = {};
    data.forEach(item => {
        if (item.listed_in) {
            item.listed_in.split(',').forEach(genre => {
                const g = genre.trim();
                count[g] = (count[g] || 0) + 1;
            });
        }
    });
    return count;
}

// ===================== FACTS =====================
function updateFacts(data = filteredData) {
    const sourceData = (Array.isArray(data) && data.length > 0) ? data : allData;
    const ratingData = processRatingData(sourceData);
    const genreData = processGenreData(sourceData);
    const typeData = processTypeData(sourceData);
    const yearData = processYearData(sourceData);
    const countryData = processCountryData(sourceData);

    const popularRating = Object.entries(ratingData).sort(([,a], [,b]) => b - a)[0];
    const popularGenre = Object.entries(genreData).sort(([,a], [,b]) => b - a)[0];
    const topCountry = Object.entries(countryData).sort(([,a], [,b]) => b - a)[0];
    const movieCount = typeData['Movie'] || 0;
    const showCount = typeData['TV Show'] || 0;
    const activeYear = Object.entries(yearData).sort(([,a], [,b]) => b - a)[0];
    const totalCount = sourceData.length;

    document.getElementById('popular-rating').textContent = popularRating ? popularRating[0] : '—';
    document.getElementById('popular-rating-desc').textContent = popularRating ? 
        `${popularRating[1]} titles with ${popularRating[0]} rating` : 'No rating data';
    
    document.getElementById('popular-genre').textContent = popularGenre ? popularGenre[0] : '—';
    document.getElementById('popular-genre-desc').textContent = popularGenre ? 
        `${popularGenre[1]} titles in this genre` : 'No genre data';
    
    const ratio = movieCount + showCount > 0 ? Math.round(movieCount/(movieCount+showCount)*100) : 0;
    document.getElementById('content-ratio').textContent = `${ratio}% Movies`;
    document.getElementById('content-ratio-desc').textContent = 
        `${movieCount} Movies, ${showCount} TV Shows`;
    
    document.getElementById('active-year').textContent = activeYear ? activeYear[0] : '—';
    document.getElementById('active-year-desc').textContent = activeYear ? 
        `${activeYear[1]} titles released in ${activeYear[0]}` : 'No year data';
    
    document.getElementById('top-country').textContent = topCountry ? topCountry[0] : '—';
    document.getElementById('top-country-desc').textContent = topCountry ? 
        `${topCountry[1]} titles produced` : 'No country data';
    
    document.getElementById('total-content').textContent = totalCount;
    document.getElementById('total-content-desc').textContent = 
        `Across ${Object.keys(countryData).length} countries`;
}

// ===================== UTILITY FUNCTIONS =====================
function showErrorMessage(message) {
    console.error(message);
    const resultsContainer = document.getElementById('search-results');
    if (resultsContainer) {
        resultsContainer.innerHTML = `<div class="empty-state">⚠️ ${message}</div>`;
    }
}

// ===================== INITIALIZATION =====================
document.addEventListener('DOMContentLoaded', loadData);

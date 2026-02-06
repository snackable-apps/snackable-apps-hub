// Data Explorer for Snackable Games

// Text normalization for accent-insensitive search
function normalizeText(text) {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
        .toLowerCase();
}

const API_ENDPOINTS = {
    movies: 'https://snackable-api.vercel.app/api/movies',
    books: 'https://snackable-api.vercel.app/api/books',
    songs: 'https://snackable-api.vercel.app/api/songs'
};

// Column definitions for each database
const COLUMNS = {
    movies: [
        { key: 'title', label: 'Title', filterable: true, type: 'text' },
        { key: 'director', label: 'Director', filterable: true, type: 'text' },
        { key: 'releaseYear', label: 'Year', filterable: true, type: 'number' },
        { key: 'genres', label: 'Genres', filterable: true, type: 'array' },
        { key: 'imdbRating', label: 'Rating', filterable: true, type: 'number' },
        { key: 'runtime', label: 'Runtime', filterable: false, type: 'number' },
        { key: 'country', label: 'Country', filterable: true, type: 'text' },
        { key: 'cast', label: 'Cast', filterable: true, type: 'array' },
        { key: 'difficulty', label: 'Difficulty', filterable: true, type: 'select', options: ['easy', 'medium', 'hard'] }
    ],
    books: [
        { key: 'title', label: 'Title', filterable: true, type: 'text' },
        { key: 'author', label: 'Author', filterable: true, type: 'text' },
        { key: 'publicationYear', label: 'Year', filterable: true, type: 'number' },
        { key: 'genres', label: 'Genres', filterable: true, type: 'array' },
        { key: 'rating', label: 'Rating', filterable: true, type: 'number' },
        { key: 'pages', label: 'Pages', filterable: false, type: 'number' },
        { key: 'language', label: 'Language', filterable: true, type: 'text' },
        { key: 'difficulty', label: 'Difficulty', filterable: true, type: 'select', options: ['easy', 'medium', 'hard'] }
    ],
    songs: [
        { key: 'title', label: 'Title', filterable: true, type: 'text' },
        { key: 'artist', label: 'Artist', filterable: true, type: 'text' },
        { key: 'album', label: 'Album', filterable: true, type: 'text' },
        { key: 'releaseYear', label: 'Year', filterable: true, type: 'number' },
        { key: 'genres', label: 'Genres', filterable: true, type: 'array' },
        { key: 'durationSeconds', label: 'Duration', filterable: false, type: 'duration' },
        { key: 'difficulty', label: 'Difficulty', filterable: true, type: 'select', options: ['easy', 'medium', 'hard'] }
    ]
};

let allData = [];
let filteredData = [];
let currentDatabase = 'movies';
let sortColumn = null;
let sortDirection = 'asc';
let filters = {};

// DOM elements
const databaseSelect = document.getElementById('database');
const totalCountEl = document.getElementById('total-count');
const filteredCountEl = document.getElementById('filtered-count');
const filtersContainer = document.getElementById('filters');
const tableHeader = document.getElementById('table-header');
const tableBody = document.getElementById('table-body');
const loadingEl = document.getElementById('loading');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    databaseSelect.addEventListener('change', (e) => {
        currentDatabase = e.target.value;
        loadData();
    });
    
    loadData();
});

async function loadData() {
    showLoading(true);
    
    try {
        const endpoint = API_ENDPOINTS[currentDatabase];
        const response = await fetch(endpoint);
        const data = await response.json();
        
        // Handle different response structures
        let items = null;
        if (data.success) {
            if (currentDatabase === 'movies' && data.movies) {
                items = data.movies;
            } else if (currentDatabase === 'books' && data.books) {
                items = data.books;
            } else if (currentDatabase === 'songs' && data.songs) {
                items = data.songs;
            }
        }
        
        if (items) {
            allData = items;
            filteredData = [...allData];
            
            renderFilters();
            renderTable();
            updateCounts();
        } else {
            throw new Error('Failed to load data');
        }
    } catch (error) {
        console.error('Error loading data:', error);
        tableBody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;color:#f87171;">Error loading data: ${error.message}</td></tr>`;
    }
    
    showLoading(false);
}

function renderFilters() {
    const columns = COLUMNS[currentDatabase];
    filters = {};
    
    let html = '';
    
    columns.forEach(col => {
        if (!col.filterable) return;
        
        if (col.type === 'select') {
            html += `
                <div class="filter-group">
                    <label>${col.label}</label>
                    <select id="filter-${col.key}" onchange="applyFilter('${col.key}', this.value)">
                        <option value="">All</option>
                        ${col.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                    </select>
                </div>
            `;
        } else if (col.type === 'number') {
            html += `
                <div class="filter-group">
                    <label>${col.label} (min)</label>
                    <input type="number" id="filter-${col.key}-min" placeholder="Min" 
                           onchange="applyRangeFilter('${col.key}', 'min', this.value)">
                </div>
                <div class="filter-group">
                    <label>${col.label} (max)</label>
                    <input type="number" id="filter-${col.key}-max" placeholder="Max" 
                           onchange="applyRangeFilter('${col.key}', 'max', this.value)">
                </div>
            `;
        } else if (col.type === 'array') {
            html += `
                <div class="filter-group">
                    <label>${col.label}</label>
                    <input type="text" id="filter-${col.key}" placeholder="Search..." 
                           oninput="applyFilter('${col.key}', this.value)">
                </div>
            `;
        } else {
            html += `
                <div class="filter-group">
                    <label>${col.label}</label>
                    <input type="text" id="filter-${col.key}" placeholder="Search..." 
                           oninput="applyFilter('${col.key}', this.value)">
                </div>
            `;
        }
    });
    
    html += `<button class="clear-filters" onclick="clearFilters()">Clear All</button>`;
    
    filtersContainer.innerHTML = html;
}

function applyFilter(key, value) {
    if (value) {
        filters[key] = { type: 'text', value: normalizeText(value) };
    } else {
        delete filters[key];
    }
    filterData();
}

function applyRangeFilter(key, bound, value) {
    if (!filters[key]) {
        filters[key] = { type: 'range', min: null, max: null };
    }
    filters[key][bound] = value ? parseFloat(value) : null;
    
    if (filters[key].min === null && filters[key].max === null) {
        delete filters[key];
    }
    filterData();
}

function clearFilters() {
    filters = {};
    renderFilters();
    filterData();
}


function filterData() {
    const columns = COLUMNS[currentDatabase];
    
    filteredData = allData.filter(item => {
        for (const [key, filter] of Object.entries(filters)) {
            const col = columns.find(c => c.key === key);
            const value = item[key];
            
            if (filter.type === 'range') {
                const numValue = parseFloat(value) || 0;
                if (filter.min !== null && numValue < filter.min) return false;
                if (filter.max !== null && numValue > filter.max) return false;
            } else if (filter.type === 'text') {
                if (col.type === 'array') {
                    const arr = value || [];
                    const match = arr.some(v => normalizeText(v).includes(filter.value));
                    if (!match) return false;
                } else {
                    const strValue = normalizeText(String(value || ''));
                    if (!strValue.includes(filter.value)) return false;
                }
            }
        }
        return true;
    });
    
    // Re-apply sort
    if (sortColumn) {
        sortData(sortColumn, false);
    }
    
    renderTableBody();
    updateCounts();
}

function renderTable() {
    renderTableHeader();
    renderTableBody();
}

function renderTableHeader() {
    const columns = COLUMNS[currentDatabase];
    
    let html = '<tr>';
    columns.forEach(col => {
        const sortClass = sortColumn === col.key 
            ? (sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc') 
            : '';
        html += `<th class="${sortClass}" onclick="sortData('${col.key}')">${col.label}</th>`;
    });
    html += '</tr>';
    
    tableHeader.innerHTML = html;
}

function renderTableBody() {
    const columns = COLUMNS[currentDatabase];
    
    if (filteredData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;color:#888;">No data found</td></tr>';
        return;
    }
    
    let html = '';
    filteredData.forEach(item => {
        html += '<tr>';
        columns.forEach(col => {
            const value = item[col.key];
            // Add wrap class to cast column for wrapping
            const wrapClass = col.key === 'cast' ? ' class="wrap"' : '';
            html += `<td${wrapClass}>${formatCell(value, col)}</td>`;
        });
        html += '</tr>';
    });
    
    tableBody.innerHTML = html;
}

function formatCell(value, col) {
    if (value === null || value === undefined) {
        return '<span style="color:#666;">—</span>';
    }
    
    if (col.type === 'array') {
        const arr = value || [];
        const tagClass = col.key === 'genres' ? 'genre' : 'cast';
        
        // Show all items for arrays (full cast, all genres)
        let html = arr.map(v => `<span class="tag ${tagClass}">${escapeHtml(v)}</span>`).join('');
        return html || '—';
    }
    
    if (col.key === 'imdbRating') {
        const rating = parseFloat(value) || 0;
        const ratingClass = rating >= 8 ? 'high' : (rating >= 6.5 ? 'medium' : 'low');
        return `<span class="rating ${ratingClass}">${rating.toFixed(1)}</span>`;
    }
    
    if (col.key === 'runtime') {
        const mins = parseInt(value) || 0;
        if (mins === 0) return '—';
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return hours > 0 ? `${hours}h ${remainingMins}m` : `${mins}m`;
    }
    
    if (col.type === 'duration' || col.key === 'durationSeconds') {
        const secs = parseInt(value) || 0;
        if (secs === 0) return '—';
        const mins = Math.floor(secs / 60);
        const remainingSecs = secs % 60;
        return `${mins}:${String(remainingSecs).padStart(2, '0')}`;
    }
    
    if (col.key === 'rating' && currentDatabase === 'books') {
        const rating = parseFloat(value) || 0;
        if (rating === 0) return '—';
        const ratingClass = rating >= 4 ? 'high' : (rating >= 3 ? 'medium' : 'low');
        return `<span class="rating ${ratingClass}">${rating.toFixed(1)}</span>`;
    }
    
    if (col.key === 'difficulty') {
        return `<span class="difficulty ${value}">${value}</span>`;
    }
    
    return escapeHtml(String(value));
}

function sortData(column, toggle = true) {
    if (toggle) {
        if (sortColumn === column) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            sortColumn = column;
            sortDirection = 'asc';
        }
    }
    
    const col = COLUMNS[currentDatabase].find(c => c.key === column);
    
    filteredData.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];
        
        // Handle arrays
        if (col.type === 'array') {
            aVal = (aVal || []).join(', ');
            bVal = (bVal || []).join(', ');
        }
        
        // Handle nulls
        if (aVal === null || aVal === undefined) aVal = '';
        if (bVal === null || bVal === undefined) bVal = '';
        
        // Compare
        let comparison = 0;
        if (col.type === 'number') {
            comparison = (parseFloat(aVal) || 0) - (parseFloat(bVal) || 0);
        } else {
            comparison = String(aVal).localeCompare(String(bVal));
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    renderTableHeader();
    renderTableBody();
}

function updateCounts() {
    totalCountEl.textContent = `Total: ${allData.length}`;
    
    if (Object.keys(filters).length > 0) {
        filteredCountEl.textContent = `Showing: ${filteredData.length}`;
        filteredCountEl.style.display = 'inline';
    } else {
        filteredCountEl.style.display = 'none';
    }
}

function showLoading(show) {
    loadingEl.classList.toggle('active', show);
    document.querySelector('.table-container').style.display = show ? 'none' : 'block';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

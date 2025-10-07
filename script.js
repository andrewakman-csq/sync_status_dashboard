/**
 * Contentsquare Data Viewer - Interactive CSV Table Application
 * Features: Password protection, search, sort, filter, pagination
 * Accessibility: WCAG 2.1 AA compliant, keyboard navigation, screen reader support
 */

class DataViewer {
    constructor() {
        // Application state
        this.data = [];
        this.filteredData = [];
        this.currentPage = 1;
        this.itemsPerPage = 25;
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.searchTerm = '';
        this.columnFilter = '';
        
        // Configuration
        this.password = 'contentsquare2025'; // Change this to your desired password
        this.csvFile = 'data_source.csv';
        
        // DOM elements
        this.elements = {};
        
        // Initialize application
        this.init();
    }
    
    /**
     * Initialize the application
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.checkAuthentication();
    }
    
    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        this.elements = {
            // Login elements
            loginContainer: document.getElementById('loginContainer'),
            loginForm: document.getElementById('loginForm'),
            passwordInput: document.getElementById('password'),
            passwordError: document.getElementById('password-error'),
            
            // App elements
            appContainer: document.getElementById('appContainer'),
            logoutBtn: document.getElementById('logoutBtn'),
            
            // Control elements
            searchInput: document.getElementById('searchInput'),
            columnFilter: document.getElementById('columnFilter'),
            entriesSelect: document.getElementById('entriesSelect'),
            
            // Table elements
            loadingSpinner: document.getElementById('loadingSpinner'),
            errorMessage: document.getElementById('errorMessage'),
            errorText: document.getElementById('errorText'),
            dataTable: document.getElementById('dataTable'),
            tableHead: document.getElementById('tableHead'),
            tableBody: document.getElementById('tableBody'),
            
            // Pagination elements
            paginationContainer: document.getElementById('paginationContainer'),
            paginationInfo: document.getElementById('paginationInfo'),
            prevBtn: document.getElementById('prevBtn'),
            nextBtn: document.getElementById('nextBtn'),
            pageNumbers: document.getElementById('pageNumbers')
        };
    }
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        // Login form
        this.elements.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.elements.passwordInput.addEventListener('input', () => this.clearError());
        
        // Logout
        this.elements.logoutBtn.addEventListener('click', () => this.handleLogout());
        
        // Search and filter
        this.elements.searchInput.addEventListener('input', 
            this.debounce((e) => this.handleSearch(e.target.value), 300));
        this.elements.columnFilter.addEventListener('change', 
            (e) => this.handleColumnFilter(e.target.value));
        this.elements.entriesSelect.addEventListener('change', 
            (e) => this.handleEntriesChange(e.target.value));
        
        // Pagination
        this.elements.prevBtn.addEventListener('click', () => this.previousPage());
        this.elements.nextBtn.addEventListener('click', () => this.nextPage());
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }
    
    /**
     * Check if user is already authenticated
     */
    checkAuthentication() {
        const isAuthenticated = sessionStorage.getItem('dataviewer_authenticated') === 'true';
        if (isAuthenticated) {
            this.showApp();
            this.loadData();
        }
    }
    
    /**
     * Handle login form submission
     */
    handleLogin(e) {
        e.preventDefault();
        const enteredPassword = this.elements.passwordInput.value.trim();
        
        if (!enteredPassword) {
            this.showError('Please enter a password');
            return;
        }
        
        if (enteredPassword === this.password) {
            sessionStorage.setItem('dataviewer_authenticated', 'true');
            this.showApp();
            this.loadData();
        } else {
            this.showError('Invalid password. Please try again.');
            this.elements.passwordInput.value = '';
            this.elements.passwordInput.focus();
        }
    }
    
    /**
     * Handle logout
     */
    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            sessionStorage.removeItem('dataviewer_authenticated');
            this.elements.appContainer.classList.add('hidden');
            this.elements.loginContainer.classList.remove('hidden');
            this.elements.passwordInput.value = '';
            this.elements.passwordInput.focus();
            
            // Reset application state
            this.data = [];
            this.filteredData = [];
            this.currentPage = 1;
            this.searchTerm = '';
            this.columnFilter = '';
        }
    }
    
    /**
     * Show error message in login form
     */
    showError(message) {
        this.elements.passwordError.textContent = message;
        this.elements.passwordInput.classList.add('error');
        this.elements.passwordInput.setAttribute('aria-invalid', 'true');
    }
    
    /**
     * Clear error message
     */
    clearError() {
        this.elements.passwordError.textContent = '';
        this.elements.passwordInput.classList.remove('error');
        this.elements.passwordInput.setAttribute('aria-invalid', 'false');
    }
    
    /**
     * Show main application
     */
    showApp() {
        this.elements.loginContainer.classList.add('hidden');
        this.elements.appContainer.classList.remove('hidden');
    }
    
    /**
     * Load CSV data
     */
    async loadData() {
        try {
            this.showLoading();
            const response = await fetch(this.csvFile);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const csvText = await response.text();
            this.data = this.parseCSV(csvText);
            
            if (this.data.length === 0) {
                throw new Error('No data found in CSV file');
            }
            
            this.setupTable();
            this.filterData();
            this.hideLoading();
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showErrorMessage(`Failed to load data: ${error.message}`);
        }
    }
    
    /**
     * Parse CSV text into array of objects
     */
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];
        
        const headers = this.parseCSVLine(lines[0]);
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                data.push(row);
            }
        }
        
        return data;
    }
    
    /**
     * Parse a single CSV line, handling quoted fields
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }
    
    /**
     * Setup table headers and column filter options
     */
    setupTable() {
        if (this.data.length === 0) return;
        
        const headers = Object.keys(this.data[0]);
        
        // Create table headers
        const headerRow = document.createElement('tr');
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            th.className = 'sortable';
            th.setAttribute('role', 'columnheader');
            th.setAttribute('tabindex', '0');
            th.setAttribute('aria-sort', 'none');
            th.addEventListener('click', () => this.handleSort(header));
            th.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleSort(header);
                }
            });
            headerRow.appendChild(th);
        });
        
        this.elements.tableHead.innerHTML = '';
        this.elements.tableHead.appendChild(headerRow);
        
        // Populate column filter
        this.elements.columnFilter.innerHTML = '<option value="">All Columns</option>';
        headers.forEach(header => {
            const option = document.createElement('option');
            option.value = header;
            option.textContent = header;
            this.elements.columnFilter.appendChild(option);
        });
    }
    
    /**
     * Handle column sorting
     */
    handleSort(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        
        this.updateSortHeaders();
        this.filterData();
    }
    
    /**
     * Update sort indicators in headers
     */
    updateSortHeaders() {
        const headers = this.elements.tableHead.querySelectorAll('th');
        headers.forEach(th => {
            th.className = 'sortable';
            th.setAttribute('aria-sort', 'none');
            
            if (th.textContent === this.sortColumn) {
                th.className = `sortable sort-${this.sortDirection}`;
                th.setAttribute('aria-sort', this.sortDirection === 'asc' ? 'ascending' : 'descending');
            }
        });
    }
    
    /**
     * Handle search input
     */
    handleSearch(term) {
        this.searchTerm = term.toLowerCase();
        this.currentPage = 1;
        this.filterData();
    }
    
    /**
     * Handle column filter change
     */
    handleColumnFilter(column) {
        this.columnFilter = column;
        this.currentPage = 1;
        this.filterData();
    }
    
    /**
     * Handle entries per page change
     */
    handleEntriesChange(value) {
        this.itemsPerPage = value === '-1' ? -1 : parseInt(value);
        this.currentPage = 1;
        this.renderTable();
        this.updatePagination();
    }
    
    /**
     * Filter and sort data
     */
    filterData() {
        let filtered = [...this.data];
        
        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(row => {
                if (this.columnFilter) {
                    return row[this.columnFilter]?.toString().toLowerCase().includes(this.searchTerm);
                } else {
                    return Object.values(row).some(value => 
                        value?.toString().toLowerCase().includes(this.searchTerm)
                    );
                }
            });
        }
        
        // Apply sorting
        if (this.sortColumn) {
            filtered.sort((a, b) => {
                const aVal = a[this.sortColumn]?.toString() || '';
                const bVal = b[this.sortColumn]?.toString() || '';
                
                // Try numeric comparison first
                const aNum = parseFloat(aVal);
                const bNum = parseFloat(bVal);
                
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return this.sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
                }
                
                // Fallback to string comparison
                const comparison = aVal.localeCompare(bVal, undefined, { numeric: true });
                return this.sortDirection === 'asc' ? comparison : -comparison;
            });
        }
        
        this.filteredData = filtered;
        this.renderTable();
        this.updatePagination();
    }
    
    /**
     * Render table with current page data
     */
    renderTable() {
        const tbody = this.elements.tableBody;
        tbody.innerHTML = '';
        
        if (this.filteredData.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = Object.keys(this.data[0] || {}).length || 1;
            td.textContent = 'No data found';
            td.style.textAlign = 'center';
            td.style.padding = '2rem';
            td.style.color = 'var(--text-light)';
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }
        
        const startIndex = this.itemsPerPage === -1 ? 0 : (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = this.itemsPerPage === -1 ? this.filteredData.length : startIndex + this.itemsPerPage;
        const pageData = this.filteredData.slice(startIndex, endIndex);
        
        pageData.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.setAttribute('role', 'row');
            
            Object.values(row).forEach(value => {
                const td = document.createElement('td');
                td.setAttribute('role', 'cell');
                td.textContent = value || '';
                tr.appendChild(td);
            });
            
            tbody.appendChild(tr);
        });
    }
    
    /**
     * Update pagination controls
     */
    updatePagination() {
        const totalItems = this.filteredData.length;
        const totalPages = this.itemsPerPage === -1 ? 1 : Math.ceil(totalItems / this.itemsPerPage);
        
        // Update pagination info
        if (this.itemsPerPage === -1) {
            this.elements.paginationInfo.textContent = `Showing all ${totalItems} entries`;
        } else {
            const startItem = totalItems === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
            const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);
            this.elements.paginationInfo.textContent = 
                `Showing ${startItem} to ${endItem} of ${totalItems} entries`;
        }
        
        // Update navigation buttons
        this.elements.prevBtn.disabled = this.currentPage <= 1;
        this.elements.nextBtn.disabled = this.currentPage >= totalPages;
        
        // Update page numbers
        this.renderPageNumbers(totalPages);
        
        // Hide pagination if showing all items or only one page
        if (this.itemsPerPage === -1 || totalPages <= 1) {
            this.elements.paginationContainer.style.display = 'none';
        } else {
            this.elements.paginationContainer.style.display = 'flex';
        }
    }
    
    /**
     * Render page number buttons
     */
    renderPageNumbers(totalPages) {
        const pageNumbers = this.elements.pageNumbers;
        pageNumbers.innerHTML = '';
        
        if (totalPages <= 1) return;
        
        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        // First page button
        if (startPage > 1) {
            this.createPageButton(1);
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'page-ellipsis';
                ellipsis.style.padding = '0 0.5rem';
                ellipsis.style.color = 'var(--text-light)';
                pageNumbers.appendChild(ellipsis);
            }
        }
        
        // Page number buttons
        for (let i = startPage; i <= endPage; i++) {
            this.createPageButton(i);
        }
        
        // Last page button
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'page-ellipsis';
                ellipsis.style.padding = '0 0.5rem';
                ellipsis.style.color = 'var(--text-light)';
                pageNumbers.appendChild(ellipsis);
            }
            this.createPageButton(totalPages);
        }
    }
    
    /**
     * Create a page number button
     */
    createPageButton(pageNum) {
        const button = document.createElement('button');
        button.textContent = pageNum;
        button.className = `page-number ${pageNum === this.currentPage ? 'active' : ''}`;
        button.setAttribute('aria-label', `Go to page ${pageNum}`);
        button.setAttribute('aria-current', pageNum === this.currentPage ? 'page' : 'false');
        button.addEventListener('click', () => this.goToPage(pageNum));
        this.elements.pageNumbers.appendChild(button);
    }
    
    /**
     * Navigate to specific page
     */
    goToPage(pageNum) {
        this.currentPage = pageNum;
        this.renderTable();
        this.updatePagination();
        
        // Scroll to top of table
        this.elements.dataTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    /**
     * Go to previous page
     */
    previousPage() {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    }
    
    /**
     * Go to next page
     */
    nextPage() {
        const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    }
    
    /**
     * Handle keyboard navigation
     */
    handleKeyboard(e) {
        // Escape key to clear search
        if (e.key === 'Escape' && document.activeElement === this.elements.searchInput) {
            this.elements.searchInput.value = '';
            this.handleSearch('');
        }
        
        // Ctrl/Cmd + F to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            this.elements.searchInput.focus();
        }
        
        // Arrow keys for pagination (when not in input fields)
        if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.previousPage();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.nextPage();
            }
        }
    }
    
    /**
     * Show loading spinner
     */
    showLoading() {
        this.elements.loadingSpinner.classList.remove('hidden');
        this.elements.errorMessage.classList.add('hidden');
        this.elements.dataTable.style.display = 'none';
        this.elements.paginationContainer.style.display = 'none';
    }
    
    /**
     * Hide loading spinner
     */
    hideLoading() {
        this.elements.loadingSpinner.classList.add('hidden');
        this.elements.dataTable.style.display = 'table';
    }
    
    /**
     * Show error message
     */
    showErrorMessage(message) {
        this.elements.loadingSpinner.classList.add('hidden');
        this.elements.errorMessage.classList.remove('hidden');
        this.elements.errorText.textContent = message;
        this.elements.dataTable.style.display = 'none';
        this.elements.paginationContainer.style.display = 'none';
    }
    
    /**
     * Debounce function for search input
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DataViewer();
});

// Service Worker registration for better caching (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

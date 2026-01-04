/**
 * AI-IKIGAI - Admin Dashboard JavaScript
 * Gestion complète de tous les modules admin
 */

// =============================================
// Configuration & State
// =============================================

const AdminDashboard = {
    currentSection: 'overview',
    currentUser: null,
    data: {
        users: [],
        coaches: [],
        analyses: [],
        tickets: [],
        revenue: {}
    },
    filters: {}
};

// =============================================
// Initialisation
// =============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🎯 Admin Dashboard initialization...');

    // Vérifier l'authentification et le rôle admin
    if (typeof ApiClient !== 'undefined' && !await checkAdminAccess()) {
        console.log('Not authorized as admin, redirecting...');
        window.location.href = 'admin-login.html?error=unauthorized';
        return;
    }

    // Charger les données initiales
    await loadDashboardData();

    // Initialiser la navigation
    initNavigation();

    // Initialiser les événements
    initEventListeners();
});

// =============================================
// Vérification des accès
// =============================================

async function checkAdminAccess() {
    try {
        // Utiliser supabaseClient défini dans admin-dashboard.html
        const { data: { user }, error } = await supabaseClient.auth.getUser();

        if (error || !user) {
            console.log('❌ Non authentifié');
            window.location.href = 'admin-login.html?error=not_logged_in';
            return false;
        }

        // Vérifier le flag is_admin dans user_metadata
        const isAdmin = user?.user_metadata?.is_admin === true;

        if (!isAdmin) {
            console.log('❌ Pas admin:', user.email);
            await supabaseClient.auth.signOut();
            window.location.href = 'admin-login.html?error=unauthorized';
            return false;
        }

        // Stocker l'utilisateur
        AdminDashboard.currentUser = user;

        // Mettre à jour l'interface avec les infos utilisateur
        updateUserProfile(user);

        console.log('✅ Admin vérifié:', user.email);
        return true;
    } catch (error) {
        console.error('Error checking admin access:', error);
        window.location.href = 'admin-login.html?error=error';
        return false;
    }
}

function updateUserProfile(user) {
    const userName = document.querySelector('.user-name');
    const userRole = document.querySelector('.user-role');
    const userAvatar = document.querySelector('.user-avatar');

    if (userName) userName.textContent = user.name || user.email;
    if (userRole) {
        const roleLabels = {
            'super_admin': 'Super Admin',
            'admin': 'Admin',
            'readonly_admin': 'Lecture Seule'
        };
        userRole.textContent = roleLabels[user.role] || user.role;
    }
    if (userAvatar) {
        const initials = (user.name || user.email)
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
        userAvatar.textContent = initials;
    }
}

// =============================================
// Chargement des données
// =============================================

async function loadDashboardData() {
    try {
        showLoadingState();

        // Charger les données selon la section
        switch (AdminDashboard.currentSection) {
            case 'overview':
                await loadOverviewData();
                break;
            case 'users':
                await loadUsersData();
                break;
            case 'coaches':
                await loadCoachesData();
                break;
            case 'ikigai-analyses':
                await loadAnalysesData();
                break;
            case 'pricing-b2c':
            case 'pricing-coach':
                await loadPricingData();
                break;
            case 'analytics':
                await loadAnalyticsData();
                break;
            case 'revenue':
                await loadRevenueData();
                break;
            case 'support':
                await loadSupportData();
                break;
            case 'gdpr':
                await loadGDPRData();
                break;
            case 'audit':
                await loadAuditData();
                break;
            case 'settings':
                await loadSettingsData();
                break;
            case 'roles':
                await loadRolesData();
                break;
            default:
                console.log('Section not implemented:', AdminDashboard.currentSection);
        }

        hideLoadingState();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        hideLoadingState();
        showError('Erreur lors du chargement des données');
    }
}

async function loadOverviewData() {
    try {
        // Récupérer le token d'authentification
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            throw new Error('No session');
        }

        const response = await fetch('https://ai-ikagai.dallyhermann-71e.workers.dev/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch stats');
        }

        const stats = await response.json();
        updateOverviewStats(stats);
    } catch (error) {
        console.error('Error loading stats:', error);
        // Fallback vers données mock
        updateOverviewStats(getDefaultStats());
    }
}

async function loadUsersData() {
    try {
        // Récupérer le token d'authentification
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            throw new Error('No session');
        }

        const response = await fetch('https://ai-ikagai.dallyhermann-71e.workers.dev/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }

        const users = await response.json();
        AdminDashboard.data.users = users;
        renderUsersSection(users);
    } catch (error) {
        console.error('Error loading users:', error);
        // Fallback vers données mock
        const users = getDefaultUsers();
        AdminDashboard.data.users = users;
        renderUsersSection(users);
    }
}

async function loadCoachesData() {
    const coaches = await fetchWithFallback('/api/admin/coaches', getDefaultCoaches());
    AdminDashboard.data.coaches = coaches;
    renderCoachesSection(coaches);
}

async function loadAnalysesData() {
    try {
        // Récupérer le token d'authentification
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            throw new Error('No session');
        }

        const response = await fetch('https://ai-ikagai.dallyhermann-71e.workers.dev/api/admin/analyses', {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch analyses');
        }

        const analyses = await response.json();
        AdminDashboard.data.analyses = analyses;
        renderAnalysesSection(analyses);
    } catch (error) {
        console.error('Error loading analyses:', error);
        // Fallback vers données mock
        const analyses = getDefaultAnalyses();
        AdminDashboard.data.analyses = analyses;
        renderAnalysesSection(analyses);
    }
}

// Helper pour fetch avec fallback
async function fetchWithFallback(url, fallbackData) {
    try {
        if (typeof ApiClient !== 'undefined') {
            return await ApiClient.get(url);
        }
    } catch (error) {
        console.warn(`API call failed for ${url}, using fallback data`, error);
    }
    return fallbackData;
}

// =============================================
// Navigation
// =============================================

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            if (section) {
                navigateToSection(section);
            }
        });
    });
}

function navigateToSection(sectionId) {
    // Mettre à jour l'état
    AdminDashboard.currentSection = sectionId;

    // Mettre à jour la navigation active
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeItem = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }

    // Mettre à jour le titre de la page
    updatePageTitle(sectionId);

    // Masquer toutes les sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Afficher la section demandée
    let targetSection = document.getElementById(`section-${sectionId}`);
    if (!targetSection) {
        // Créer la section si elle n'existe pas
        targetSection = createSection(sectionId);
    }
    targetSection.classList.add('active');

    // Charger les données de la section
    loadDashboardData();

    // Scroll to top
    window.scrollTo(0, 0);
}

function updatePageTitle(sectionId) {
    const titles = {
        'overview': 'Vue d\'ensemble',
        'analytics': 'Analytique Business',
        'users': 'Gestion des Utilisateurs',
        'coaches': 'Gestion des Coaches',
        'ikigai-analyses': 'Analyses Ikigai',
        'pricing-b2c': 'Tarification B2C',
        'pricing-coach': 'Tarification Coach',
        'revenue': 'Revenus',
        'support': 'Support Client',
        'gdpr': 'GDPR',
        'audit': 'Logs d\'Audit',
        'settings': 'Paramètres',
        'roles': 'Rôles & Permissions'
    };

    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = titles[sectionId] || 'Admin Dashboard';
    }
}

function createSection(sectionId) {
    const content = document.querySelector('.dashboard-content');
    const section = document.createElement('div');
    section.className = 'section';
    section.id = `section-${sectionId}`;
    content.appendChild(section);
    return section;
}

// =============================================
// Rendu des sections
// =============================================

function updateOverviewStats(stats) {
    // Mettre à jour les KPIs
    animateValue('stat-users', 0, stats.totalUsers, 1000);
    animateValue('stat-analyses', 0, stats.totalAnalyses, 1000);
    animateValue('stat-revenue', 0, stats.monthlyRevenue, 1000, '€');
    animateValue('stat-conversion', 0, stats.conversionRate, 1000, '%');
}

function renderUsersSection(users) {
    const section = document.getElementById('section-users');
    if (!section) return;

    section.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">
                    <div class="card-icon">👥</div>
                    Gestion des Utilisateurs
                </h2>
                <button class="btn-primary" onclick="exportUsers()">
                    📥 Exporter
                </button>
            </div>
            
            <div class="filters-bar">
                <div class="search-box">
                    <span class="search-icon">🔍</span>
                    <input type="text" class="search-input" placeholder="Rechercher..." onkeyup="filterUsers()">
                </div>
                <select class="filter-select" onchange="filterUsers()">
                    <option value="all">Tous les statuts</option>
                    <option value="active">Actifs</option>
                    <option value="inactive">Inactifs</option>
                    <option value="suspended">Suspendus</option>
                </select>
            </div>
            
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Utilisateur</th>
                        <th>Email</th>
                        <th>Rôle</th>
                        <th>Analyses</th>
                        <th>Inscription</th>
                        <th>Statut</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.name}</td>
                            <td>${user.email}</td>
                            <td>${user.role}</td>
                            <td>${user.analysesCount || 0}</td>
                            <td>${formatDate(user.createdAt)}</td>
                            <td><span class="status-badge status-${user.status}">
                                <span class="status-dot"></span>
                                ${user.status}
                            </span></td>
                            <td>
                                <button class="btn-icon" onclick="viewUser(${user.id})" title="Voir">👁️</button>
                                <button class="btn-icon" onclick="editUser(${user.id})" title="Éditer">✏️</button>
                                <button class="btn-icon" onclick="deleteUser(${user.id})" title="Supprimer">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderCoachesSection(coaches) {
    const section = document.getElementById('section-coaches');
    if (!section) return;

    section.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">
                    <div class="card-icon">🎓</div>
                    Gestion des Coaches
                </h2>
            </div>
            
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Coach</th>
                        <th>Clients</th>
                        <th>Analyses</th>
                        <th>Crédits</th>
                        <th>Plan</th>
                        <th>Renouvellement</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${coaches.map(coach => `
                        <tr>
                            <td>${coach.name}</td>
                            <td>${coach.clientsCount || 0}</td>
                            <td>${coach.creditsUsed || 0} / ${coach.creditsTotal || 0}</td>
                            <td>${coach.creditsRemaining || 0}</td>
                            <td><span class="status-badge status-active">${coach.plan || 'Free'}</span></td>
                            <td>${formatDate(coach.renewalDate)}</td>
                            <td>
                                <button class="btn-icon" onclick="manageCredits(${coach.id})" title="Gérer crédits">⚡</button>
                                <button class="btn-icon" onclick="changePlan(${coach.id})" title="Changer plan">💳</button>
                                <button class="btn-icon" onclick="whiteLabel(${coach.id})" title="Marque blanche">🎨</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderAnalysesSection(analyses) {
    const section = document.getElementById('section-ikigai-analyses');
    if (!section) return;

    section.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">
                    <div class="card-icon">🎯</div>
                    Analyses Ikigai
                </h2>
            </div>
            
            <div class="filters-bar">
                <select class="filter-select" onchange="filterAnalyses()">
                    <option value="all">Toutes les dates</option>
                    <option value="today">Aujourd'hui</option>
                    <option value="week">Cette semaine</option>
                    <option value="month">Ce mois</option>
                </select>
                <select class="filter-select" onchange="filterAnalyses()">
                    <option value="all">Tous les types</option>
                    <option value="b2c">B2C</option>
                    <option value="coach">Coach</option>
                    <option value="enterprise">Entreprise</option>
                </select>
                <select class="filter-select" onchange="filterAnalyses()">
                    <option value="all">Tous les statuts</option>
                    <option value="completed">Complété</option>
                    <option value="pending">En cours</option>
                    <option value="failed">Échoué</option>
                </select>
            </div>
            
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Utilisateur</th>
                        <th>Type</th>
                        <th>Date</th>
                        <th>Durée</th>
                        <th>Statut</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${analyses.map(analysis => `
                        <tr>
                            <td>#${analysis.id}</td>
                            <td>${analysis.userName}</td>
                            <td>${analysis.type}</td>
                            <td>${formatDate(analysis.createdAt)}</td>
                            <td>${analysis.duration || '-'}s</td>
                            <td><span class="status-badge status-${analysis.status}">
                                ${analysis.status}
                            </span></td>
                            <td>
                                <button class="btn-icon" onclick="viewAnalysis(${analysis.id})" title="Voir détails">👁️</button>
                                ${analysis.hasError ? '<button class="btn-icon" onclick="reportAnomaly(' + analysis.id + ')" title="Signaler">⚠️</button>' : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// =============================================
// Utilitaires
// =============================================

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function animateValue(elementId, start, end, duration, suffix = '') {
    const element = document.getElementById(elementId);
    if (!element) return;

    const range = end - start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        element.textContent = current + suffix;
        if (current === end) {
            clearInterval(timer);
        }
    }, stepTime);
}

function showLoadingState() {
    console.log('Loading...');
}

function hideLoadingState() {
    console.log('Loading complete');
}

function showError(message) {
    alert('❌ ' + message);
}

// =============================================
// Actions utilisateurs
// =============================================

function exportUsers() {
    alert('📥 Export des utilisateurs en cours...');
}

function viewUser(userId) {
    alert(`👁️ Voir l'utilisateur ${userId}`);
}

async function editUser(userId) {
    // Trouver l'utilisateur dans les données
    const user = AdminDashboard.data.users.find(u => u.id === userId);
    if (!user) {
        alert('Utilisateur non trouvé');
        return;
    }

    const action = confirm(`Voulez-vous ${user.role === 'admin' ? 'retirer' : 'donner'} les droits admin à ${user.email} ?`);

    if (!action) return;

    try {
        // Récupérer le token admin
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            throw new Error('Non authentifié');
        }

        // Appeler l'API backend pour changer le rôle
        const response = await fetch('https://ai-ikagai.dallyhermann-71e.workers.dev/api/admin/users/toggle-admin', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userId,
                isAdmin: user.role !== 'admin'
            })
        });

        if (!response.ok) {
            throw new Error('Erreur lors de la modification');
        }

        alert('✅ Rôle modifié avec succès !');

        // Recharger les données
        await loadUsersData();

    } catch (error) {
        console.error('Erreur:', error);
        alert('❌ Erreur lors de la modification du rôle');
    }
}

function deleteUser(userId) {
    if (confirm('⚠️ Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
        alert(`🗑️ Suppression de l'utilisateur ${userId}`);
    }
}

function manageCredits(coachId) {
    alert(`⚡ Gérer les crédits du coach ${coachId}`);
}

function changePlan(coachId) {
    alert(`💳 Changer le plan du coach ${coachId}`);
}

function whiteLabel(coachId) {
    alert(`🎨 Configurer la marque blanche pour le coach ${coachId}`);
}

function viewAnalysis(analysisId) {
    alert(`👁️ Voir l'analyse ${analysisId}`);
}

function reportAnomaly(analysisId) {
    alert(`⚠️ Signaler une anomalie pour l'analyse ${analysisId}`);
}

async function logoutAdmin() {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        try {
            await supabaseClient.auth.signOut();
            window.location.href = 'admin-login.html';
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            alert('Erreur lors de la déconnexion');
        }
    }
}

// =============================================
// Sidebar Mobile
// =============================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// =============================================
// Event Listeners
// =============================================

function initEventListeners() {
    // Recherche globale
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        globalSearch.addEventListener('input', debounce(handleGlobalSearch, 300));
    }

    // Fermer la sidebar en cliquant dehors sur mobile
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const menuBtn = document.querySelector('.mobile-menu-btn');

        if (window.innerWidth <= 1024 &&
            sidebar &&
            sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) &&
            !menuBtn.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });
}

function handleGlobalSearch(e) {
    const query = e.target.value.toLowerCase();
    console.log('Global search:', query);
    // Implémenter la recherche globale
}

function debounce(func, wait) {
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

// =============================================
// Données de fallback pour développement
// =============================================

function getDefaultStats() {
    return {
        totalUsers: 1247,
        totalAnalyses: 3892,
        monthlyRevenue: 87400,
        conversionRate: 68.2
    };
}

function getDefaultUsers() {
    return [
        {
            id: 1,
            name: 'Marie Dupont',
            email: 'marie.dupont@email.com',
            role: 'client',
            analysesCount: 3,
            createdAt: '2024-11-15',
            status: 'active'
        },
        {
            id: 2,
            name: 'Jean Martin',
            email: 'jean.martin@email.com',
            role: 'client',
            analysesCount: 1,
            createdAt: '2024-12-01',
            status: 'active'
        }
    ];
}

function getDefaultCoaches() {
    return [
        {
            id: 1,
            name: 'Sophie Bernard',
            email: 'sophie@coach.com',
            clientsCount: 24,
            creditsUsed: 53,
            creditsTotal: 100,
            creditsRemaining: 47,
            plan: 'Pro',
            renewalDate: '2025-01-15'
        }
    ];
}

function getDefaultAnalyses() {
    return [
        {
            id: 1,
            userName: 'Marie Dupont',
            type: 'B2C',
            createdAt: '2024-12-15T10:30:00Z',
            duration: 12,
            status: 'completed',
            hasError: false
        },
        {
            id: 2,
            userName: 'Jean Martin',
            type: 'Coach',
            createdAt: '2024-12-15T09:15:00Z',
            duration: null,
            status: 'failed',
            hasError: true
        }
    ];
}

// =============================================
// Nouvelles Sections - Load Functions
// =============================================

async function loadAnalyticsData() {
    const data = getDefaultAnalytics();
    renderAnalyticsSection(data);
}

async function loadPricingData() {
    const section = AdminDashboard.currentSection;
    if (section === 'pricing-b2c') {
        const data = getDefaultPricingB2C();
        renderPricingB2CSection(data);
    } else if (section === 'pricing-coach') {
        const data = getDefaultPricingCoach();
        renderPricingCoachSection(data);
    }
}

async function loadSupportData() {
    const data = getDefaultSupport();
    renderSupportSection(data);
}

async function loadGDPRData() {
    const data = getDefaultGDPR();
    renderGDPRSection(data);
}

async function loadAuditData() {
    const data = getDefaultAudit();
    renderAuditSection(data);
}

async function loadRevenueData() {
    const data = getDefaultRevenue();
    renderRevenueSection(data);
}

async function loadSettingsData() {
    const data = getDefaultSettings();
    renderSettingsSection(data);
}

async function loadRolesData() {
    const data = getDefaultRoles();
    renderRolesSection(data);
}

// =============================================
// Nouvelles Sections - Render Functions
// =============================================

function renderAnalyticsSection(data) {
    const section = document.getElementById('section-analytics');
    if (!section) {
        const newSection = createSection('analytics');
        renderAnalyticsSection(data);
        return;
    }

    section.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">
                    <div class="card-icon">📈</div>
                    Analytique Business
                </h2>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${data.totalRevenue}€</div>
                    <div class="stat-label">Revenus Totaux</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.mrr}€</div>
                    <div class="stat-label">MRR</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.activeUsers}</div>
                    <div class="stat-label">Utilisateurs Actifs</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.churnRate}%</div>
                    <div class="stat-label">Taux de Churn</div>
                </div>
            </div>
            
            <div style="margin-top: 2rem;">
                <h3 style="margin-bottom: 1rem;">Top Fonctionnalités</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fonctionnalité</th>
                            <th>Utilisations</th>
                            <th>Tendance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.topFeatures.map(feature => `
                            <tr>
                                <td>${feature.name}</td>
                                <td>${feature.count}</td>
                                <td><span class="trend-up">↑ ${feature.growth}%</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderPricingB2CSection(data) {
    const section = document.getElementById('section-pricing-b2c');
    if (!section) {
        const newSection = createSection('pricing-b2c');
        renderPricingB2CSection(data);
        return;
    }

    section.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">
                    <div class="card-icon">💳</div>
                    Tarification B2C
                </h2>
                <button class="btn-primary">Ajouter un Plan</button>
            </div>
            
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Plan</th>
                        <th>Prix</th>
                        <th>Analyses Incluses</th>
                        <th>Fonctionnalités</th>
                        <th>Statut</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.plans.map(plan => `
                        <tr>
                            <td><strong>${plan.name}</strong></td>
                            <td>${plan.price}€/mois</td>
                            <td>${plan.analyses}</td>
                            <td>${plan.features.join(', ')}</td>
                            <td><span class="status-badge status-${plan.active ? 'active' : 'inactive'}">${plan.active ? 'Actif' : 'Inactif'}</span></td>
                            <td>
                                <button class="btn-icon" title="Éditer">✏️</button>
                                <button class="btn-icon" title="Désactiver">🔒</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderPricingCoachSection(data) {
    const section = document.getElementById('section-pricing-coach');
    if (!section) {
        const newSection = createSection('pricing-coach');
        renderPricingCoachSection(data);
        return;
    }

    section.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">
                    <div class="card-icon">💰</div>
                    Tarification Coach
                </h2>
                <button class="btn-primary">Ajouter un Plan</button>
            </div>
            
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Plan</th>
                        <th>Prix</th>
                        <th>Crédits/mois</th>
                        <th>Fonctionnalités</th>
                        <th>Statut</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.plans.map(plan => `
                        <tr>
                            <td><strong>${plan.name}</strong></td>
                            <td>${plan.price}€/mois</td>
                            <td>${plan.credits}</td>
                            <td>${plan.features.join(', ')}</td>
                            <td><span class="status-badge status-active">Actif</span></td>
                            <td>
                                <button class="btn-icon" title="Éditer">✏️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderSupportSection(data) {
    const section = document.getElementById('section-support');
    if (!section) {
        const newSection = createSection('support');
        renderSupportSection(data);
        return;
    }

    section.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">
                    <div class="card-icon">🎧</div>
                    Support Client
                </h2>
            </div>
            
            <div class="filters-bar">
                <select class="filter-select">
                    <option value="all">Tous les statuts</option>
                    <option value="open">Ouvert</option>
                    <option value="in-progress">En cours</option>
                    <option value="resolved">Résolu</option>
                </select>
            </div>
            
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Utilisateur</th>
                        <th>Sujet</th>
                        <th>Priorité</th>
                        <th>Statut</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.tickets.map(ticket => `
                        <tr>
                            <td>#${ticket.id}</td>
                            <td>${ticket.user}</td>
                            <td>${ticket.subject}</td>
                            <td><span class="status-badge status-${ticket.priority === 'Haute' ? 'suspended' : 'pending'}">${ticket.priority}</span></td>
                            <td><span class="status-badge status-${ticket.status === 'Ouvert' ? 'pending' : ticket.status === 'En cours' ? 'active' : 'inactive'}">${ticket.status}</span></td>
                            <td>${formatDate(ticket.date)}</td>
                            <td>
                                <button class="btn-icon" title="Voir">👁️</button>
                                <button class="btn-icon" title="Répondre">💬</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderGDPRSection(data) {
    const section = document.getElementById('section-gdpr');
    if (!section) {
        const newSection = createSection('gdpr');
        renderGDPRSection(data);
        return;
    }

    section.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">
                    <div class="card-icon">🔒</div>
                    GDPR - Conformité
                </h2>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${data.totalRequests}</div>
                    <div class="stat-label">Demandes Totales</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.pendingRequests}</div>
                    <div class="stat-label">En Attente</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.processedRequests}</div>
                    <div class="stat-label">Traitées</div>
                </div>
            </div>
            
            <table class="data-table" style="margin-top: 2rem;">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Utilisateur</th>
                        <th>Date Demande</th>
                        <th>Statut</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.requests.map(request => `
                        <tr>
                            <td>${request.type}</td>
                            <td>${request.user}</td>
                            <td>${formatDate(request.date)}</td>
                            <td><span class="status-badge status-${request.status === 'En attente' ? 'pending' : 'active'}">${request.status}</span></td>
                            <td>
                                <button class="btn-primary" style="padding: 0.5rem 1rem;">Traiter</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderAuditSection(data) {
    const section = document.getElementById('section-audit');
    if (!section) {
        const newSection = createSection('audit');
        renderAuditSection(data);
        return;
    }

    section.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">
                    <div class="card-icon">📝</div>
                    Logs d'Audit
                </h2>
            </div>
            
            <div class="filters-bar">
                <select class="filter-select">
                    <option value="all">Toutes les actions</option>
                    <option value="create">Création</option>
                    <option value="update">Modification</option>
                    <option value="delete">Suppression</option>
                </select>
                <select class="filter-select">
                    <option value="all">Tous les admins</option>
                </select>
            </div>
            
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date/Heure</th>
                        <th>Admin</th>
                        <th>Action</th>
                        <th>Cible</th>
                        <th>IP</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.logs.map(log => `
                        <tr>
                            <td>${formatDate(log.date)}</td>
                            <td>${log.admin}</td>
                            <td><span class="status-badge status-active">${log.action}</span></td>
                            <td>${log.target}</td>
                            <td>${log.ip}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderRevenueSection(data) {
    const section = document.getElementById('section-revenue');
    if (!section) {
        const newSection = createSection('revenue');
        renderRevenueSection(data);
        return;
    }

    section.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">
                    <div class="card-icon">💵</div>
                    Revenus
                </h2>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${data.totalRevenue}€</div>
                    <div class="stat-label">Revenus Totaux</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.mrr}€</div>
                    <div class="stat-label">MRR</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.thisMonth}€</div>
                    <div class="stat-label">Ce Mois</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.growth}%</div>
                    <div class="stat-label">Croissance</div>
                </div>
            </div>
            
            <table class="data-table" style="margin-top: 2rem;">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Client</th>
                        <th>Montant</th>
                        <th>Statut</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.transactions.map(transaction => `
                        <tr>
                            <td>${formatDate(transaction.date)}</td>
                            <td>${transaction.type}</td>
                            <td>${transaction.client}</td>
                            <td>${transaction.amount}€</td>
                            <td><span class="status-badge status-active">Payé</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderSettingsSection(data) {
    const section = document.getElementById('section-settings');
    if (!section) {
        const newSection = createSection('settings');
        renderSettingsSection(data);
        return;
    }

    section.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">
                    <div class="card-icon">⚙️</div>
                    Paramètres
                </h2>
                <button class="btn-primary">Sauvegarder</button>
            </div>
            
            <div style="max-width: 800px;">
                <h3 style="margin-bottom: 1rem;">Configuration Générale</h3>
                <div style="display: grid; gap: 1.5rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Nom de l'Application</label>
                        <input type="text" value="${data.appName}" class="search-input" style="width: 100%;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Email de Contact</label>
                        <input type="email" value="${data.contactEmail}" class="search-input" style="width: 100%;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">URL du Site</label>
                        <input type="url" value="${data.siteUrl}" class="search-input" style="width: 100%;">
                    </div>
                </div>
                
                <h3 style="margin: 2rem 0 1rem;">Intégrations</h3>
                <div style="display: grid; gap: 1.5rem;">
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Clé API Stripe</label>
                        <input type="password" value="${data.stripeKey}" class="search-input" style="width: 100%;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Clé API Claude</label>
                        <input type="password" value="${data.claudeKey}" class="search-input" style="width: 100%;">
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderRolesSection(data) {
    const section = document.getElementById('section-roles');
    if (!section) {
        const newSection = createSection('roles');
        renderRolesSection(data);
        return;
    }

    section.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">
                    <div class="card-icon">🔑</div>
                    Rôles & Permissions
                </h2>
                <button class="btn-primary">Créer un Rôle</button>
            </div>
            
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Rôle</th>
                        <th>Utilisateurs</th>
                        <th>Permissions</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.roles.map(role => `
                        <tr>
                            <td><strong>${role.name}</strong></td>
                            <td>${role.userCount}</td>
                            <td>${role.permissions.join(', ')}</td>
                            <td>
                                <button class="btn-icon" title="Éditer">✏️</button>
                                <button class="btn-icon" title="Supprimer">🗑️</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// =============================================
// Nouvelles Sections - Mock Data
// =============================================

function getDefaultAnalytics() {
    return {
        totalRevenue: 87400,
        mrr: 12500,
        activeUsers: 1247,
        churnRate: 3.2,
        topFeatures: [
            { name: 'Analyse Ikigai', count: 3892, growth: 24 },
            { name: 'Upload CV', count: 2156, growth: 18 },
            { name: 'Dashboard', count: 1847, growth: 12 },
            { name: 'Profil', count: 1234, growth: 8 }
        ]
    };
}

function getDefaultPricingB2C() {
    return {
        plans: [
            {
                name: 'Gratuit',
                price: 0,
                analyses: 1,
                features: ['1 analyse', 'Résultats basiques'],
                active: true
            },
            {
                name: 'Premium',
                price: 19,
                analyses: 5,
                features: ['5 analyses', 'Résultats détaillés', 'Support email'],
                active: true
            },
            {
                name: 'Pro',
                price: 49,
                analyses: 'Illimité',
                features: ['Analyses illimitées', 'Résultats avancés', 'Support prioritaire'],
                active: true
            }
        ]
    };
}

function getDefaultPricingCoach() {
    return {
        plans: [
            {
                name: 'Starter',
                price: 99,
                credits: 50,
                features: ['50 crédits/mois', 'Dashboard coach', 'Support email']
            },
            {
                name: 'Pro',
                price: 249,
                credits: 150,
                features: ['150 crédits/mois', 'Marque blanche', 'Support prioritaire']
            },
            {
                name: 'Enterprise',
                price: 499,
                credits: 500,
                features: ['500 crédits/mois', 'API access', 'Support dédié']
            }
        ]
    };
}

function getDefaultSupport() {
    return {
        tickets: [
            {
                id: 1,
                user: 'Marie Dupont',
                subject: 'Problème de paiement',
                priority: 'Haute',
                status: 'Ouvert',
                date: '2024-12-15T10:30:00Z'
            },
            {
                id: 2,
                user: 'Jean Martin',
                subject: 'Question sur l\'analyse',
                priority: 'Normale',
                status: 'En cours',
                date: '2024-12-14T14:20:00Z'
            },
            {
                id: 3,
                user: 'Sophie Bernard',
                subject: 'Demande de remboursement',
                priority: 'Haute',
                status: 'Résolu',
                date: '2024-12-13T09:15:00Z'
            }
        ]
    };
}

function getDefaultGDPR() {
    return {
        totalRequests: 12,
        pendingRequests: 3,
        processedRequests: 9,
        requests: [
            {
                type: 'Export de données',
                user: 'user@example.com',
                date: '2024-12-15T10:00:00Z',
                status: 'En attente'
            },
            {
                type: 'Suppression de compte',
                user: 'autre@example.com',
                date: '2024-12-14T15:30:00Z',
                status: 'En attente'
            },
            {
                type: 'Export de données',
                user: 'test@example.com',
                date: '2024-12-13T11:20:00Z',
                status: 'Traité'
            }
        ]
    };
}

function getDefaultAudit() {
    return {
        logs: [
            {
                date: '2024-12-15T10:30:00Z',
                admin: 'admin@ai-ikigai.com',
                action: 'Modification utilisateur',
                target: 'user#1234',
                ip: '192.168.1.1'
            },
            {
                date: '2024-12-15T09:15:00Z',
                admin: 'admin@ai-ikigai.com',
                action: 'Création plan',
                target: 'plan#premium',
                ip: '192.168.1.1'
            },
            {
                date: '2024-12-14T16:45:00Z',
                admin: 'admin@ai-ikigai.com',
                action: 'Suppression ticket',
                target: 'ticket#567',
                ip: '192.168.1.1'
            }
        ]
    };
}

function getDefaultRevenue() {
    return {
        totalRevenue: 87400,
        mrr: 12500,
        thisMonth: 15800,
        growth: 32,
        transactions: [
            {
                date: '2024-12-15T10:00:00Z',
                type: 'Abonnement Premium',
                client: 'Marie Dupont',
                amount: 19
            },
            {
                date: '2024-12-14T15:30:00Z',
                type: 'Abonnement Pro',
                client: 'Jean Martin',
                amount: 49
            },
            {
                date: '2024-12-13T11:20:00Z',
                type: 'Abonnement Coach Pro',
                client: 'Sophie Bernard',
                amount: 249
            }
        ]
    };
}

function getDefaultSettings() {
    return {
        appName: 'AI-Ikigai',
        contactEmail: 'contact@ai-ikigai.com',
        siteUrl: 'https://ai-ikigai.com',
        stripeKey: 'sk_test_*********************',
        claudeKey: 'sk-ant-*********************'
    };
}

function getDefaultRoles() {
    return {
        roles: [
            {
                name: 'Super Admin',
                userCount: 1,
                permissions: ['Tout', 'Gestion utilisateurs', 'Gestion revenus', 'Configuration']
            },
            {
                name: 'Admin',
                userCount: 3,
                permissions: ['Gestion utilisateurs', 'Support', 'Analyses']
            },
            {
                name: 'Support',
                userCount: 5,
                permissions: ['Support', 'Lecture analyses']
            }
        ]
    };
}

// =============================================
// Export global
// =============================================

window.AdminDashboard = AdminDashboard;
window.navigateToSection = navigateToSection;
window.toggleSidebar = toggleSidebar;
window.exportUsers = exportUsers;
window.viewUser = viewUser;
window.editUser = editUser;
window.deleteUser = deleteUser;
window.manageCredits = manageCredits;
window.changePlan = changePlan;
window.whiteLabel = whiteLabel;
window.viewAnalysis = viewAnalysis;
window.reportAnomaly = reportAnomaly;
window.logoutAdmin = logoutAdmin;

console.log('✅ Admin Dashboard JS loaded successfully');

/**
 * EUNOIA - Main JavaScript
 * Professional interactions and functionality
 */

(function() {
    'use strict';

    // DOM Elements
    const header = document.querySelector('.header');
    const navToggle = document.querySelector('.nav__toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileOverlay = document.querySelector('.mobile-menu__overlay');
    const mobileClose = document.querySelector('.mobile-menu__close');
    const mobileLinks = document.querySelectorAll('.mobile-menu__link');
    const langBtns = document.querySelectorAll('.lang-btn');
    const sections = document.querySelectorAll('.section');
    const commissionSlider = document.getElementById('commission-slider');

    // Initialize
    function init() {
        setupHeaderScroll();
        setupMobileMenu();
        setupLanguageSwitcher();
        setupSectionObserver();
        setupCalculator();
        setupSmoothScroll();
    }

    // Header scroll effect
    function setupHeaderScroll() {
        if (!header) return;

        function onScroll() {
            if (window.scrollY > 50) {
                header.classList.add('header--scrolled');
            } else {
                header.classList.remove('header--scrolled');
            }
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll(); // Initial check
    }

    // Mobile menu
    function setupMobileMenu() {
        if (!navToggle || !mobileMenu) return;

        function openMenu() {
            mobileMenu.classList.add('mobile-menu--open');
            mobileOverlay.classList.add('mobile-menu__overlay--visible');
            document.body.style.overflow = 'hidden';
        }

        function closeMenu() {
            mobileMenu.classList.remove('mobile-menu--open');
            mobileOverlay.classList.remove('mobile-menu__overlay--visible');
            document.body.style.overflow = '';
        }

        navToggle.addEventListener('click', openMenu);

        if (mobileClose) {
            mobileClose.addEventListener('click', closeMenu);
        }

        if (mobileOverlay) {
            mobileOverlay.addEventListener('click', closeMenu);
        }

        mobileLinks.forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMenu();
        });
    }

    // Language switcher
    function setupLanguageSwitcher() {
        if (!langBtns.length) return;

        langBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const lang = this.dataset.lang;
                switchLanguage(lang);
            });
        });
    }

    function switchLanguage(lang) {
        // Update buttons
        langBtns.forEach(btn => {
            btn.classList.toggle('lang-btn--active', btn.dataset.lang === lang);
        });

        // Update content
        document.querySelectorAll('.lang-content').forEach(content => {
            content.classList.remove('lang-content--active');
        });

        const activeContent = document.getElementById(`${lang}-content`);
        if (activeContent) {
            activeContent.classList.add('lang-content--active');
        }

        // Update nav links for mobile
        updateNavLinks(lang);

        // Store preference
        localStorage.setItem('preferred-lang', lang);
    }

    function updateNavLinks(lang) {
        const navLinks = {
            ru: {
                problem: 'Проблема',
                solution: 'Решение',
                'why-now': 'Почему сейчас',
                'use-cases': 'Кейсы',
                rates: 'Рынок',
                contact: 'Контакты'
            },
            en: {
                problem: 'Problem',
                solution: 'Solution',
                'why-now': 'Why Now',
                'use-cases': 'Use Cases',
                rates: 'Market',
                contact: 'Contact'
            }
        };

        document.querySelectorAll('.nav__link, .mobile-menu__link').forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                const section = href.slice(1);
                if (navLinks[lang] && navLinks[lang][section]) {
                    link.textContent = navLinks[lang][section];
                }
            }
        });
    }

    // Section visibility observer
    function setupSectionObserver() {
        if (!sections.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('section--visible');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        });

        sections.forEach(section => {
            observer.observe(section);
        });
    }

    // Profit calculator
    function setupCalculator() {
        if (!commissionSlider) return;

        const monthlyVolume = 24000000000; // 24 billion tenge monthly
        const yearlyVolume = monthlyVolume * 12;

        function updateCalculator() {
            const commission = parseFloat(commissionSlider.value);

            const monthlyProfit = monthlyVolume * (commission / 100);
            const yearlyProfit = yearlyVolume * (commission / 100);
            const marketShareProfit = yearlyProfit * 0.2; // 20% market share

            // Update displayed values
            const commissionValue = document.getElementById('commission-value');
            const monthlyProfitEl = document.getElementById('monthly-profit');
            const annualProfitEl = document.getElementById('annual-profit');
            const marketProfitEl = document.getElementById('market-profit');

            if (commissionValue) {
                commissionValue.textContent = commission < 1 ? '<1%' : `${commission}%`;
            }

            if (monthlyProfitEl) {
                monthlyProfitEl.textContent = formatCurrency(monthlyProfit);
            }

            if (annualProfitEl) {
                annualProfitEl.textContent = formatCurrency(yearlyProfit);
            }

            if (marketProfitEl) {
                marketProfitEl.textContent = formatCurrency(marketShareProfit);
            }
        }

        commissionSlider.addEventListener('input', updateCalculator);
        updateCalculator(); // Initial calculation
    }

    function formatCurrency(value) {
        if (value >= 1000000000) {
            return `₸${(value / 1000000000).toFixed(1)} млрд`;
        } else if (value >= 1000000) {
            return `₸${Math.round(value / 1000000)} млн`;
        }
        return `₸${value.toLocaleString()}`;
    }

    // Smooth scroll for anchor links
    function setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href === '#') return;

                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    const headerHeight = header ? header.offsetHeight : 0;
                    const targetPosition = target.offsetTop - headerHeight - 20;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    // Load saved language preference
    function loadLanguagePreference() {
        const savedLang = localStorage.getItem('preferred-lang');
        if (savedLang) {
            switchLanguage(savedLang);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init();
            loadLanguagePreference();
        });
    } else {
        init();
        loadLanguagePreference();
    }

})();

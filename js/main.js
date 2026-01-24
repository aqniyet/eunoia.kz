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
        const avgPayoutPerDriver = 400000; // 400K tenge per driver per month

        // Setup calculator for a given suffix ('' for English, '-ru' for Russian)
        function setupCalc(suffix, isRussian) {
            const driversSlider = document.getElementById('drivers-slider' + suffix);
            const commissionSlider = document.getElementById('commission-slider' + suffix);
            if (!driversSlider || !commissionSlider) return;

            function updateCalculator() {
                const drivers = parseInt(driversSlider.value);
                const commission = parseFloat(commissionSlider.value);

                const monthlyVolume = drivers * avgPayoutPerDriver;
                const yearlyVolume = monthlyVolume * 12;
                const monthlyProfit = monthlyVolume * (commission / 100);
                const yearlyProfit = yearlyVolume * (commission / 100);

                // Get elements
                const driversValue = document.getElementById('drivers-value' + suffix);
                const commissionValue = document.getElementById('commission-value' + suffix);
                const monthlyVolumeEl = document.getElementById('monthly-volume' + suffix);
                const volumeNoteEl = document.getElementById('volume-note' + suffix);
                const monthlyProfitEl = document.getElementById('monthly-profit' + suffix);
                const annualProfitEl = document.getElementById('annual-profit' + suffix);
                const contextDriversEl = document.getElementById('context-drivers' + suffix);
                const contextVolumeEl = document.getElementById('context-volume' + suffix);
                const contextAnnualEl = document.getElementById('context-annual' + suffix);

                // Format drivers number
                const driversFormatted = drivers.toLocaleString();
                const driversK = Math.round(drivers / 1000) + 'K';

                // Update displayed values
                if (driversValue) {
                    driversValue.textContent = driversFormatted;
                }

                if (commissionValue) {
                    commissionValue.textContent = commission < 1 ? '<1%' : `${commission.toFixed(1)}%`;
                }

                if (monthlyVolumeEl) {
                    monthlyVolumeEl.textContent = formatCurrency(monthlyVolume, isRussian);
                }

                if (volumeNoteEl) {
                    volumeNoteEl.textContent = isRussian
                        ? `${driversK} водителей x 400K KZT`
                        : `${driversK} drivers x 400K KZT avg`;
                }

                if (monthlyProfitEl) {
                    monthlyProfitEl.textContent = formatCurrency(monthlyProfit, isRussian);
                }

                if (annualProfitEl) {
                    annualProfitEl.textContent = formatCurrency(yearlyProfit, isRussian);
                }

                // Update context section
                if (contextDriversEl) {
                    contextDriversEl.textContent = driversFormatted + '+';
                }
                if (contextVolumeEl) {
                    contextVolumeEl.textContent = formatCurrency(monthlyVolume, isRussian);
                }
                if (contextAnnualEl) {
                    contextAnnualEl.textContent = formatCurrency(yearlyVolume, isRussian);
                }
            }

            driversSlider.addEventListener('input', updateCalculator);
            commissionSlider.addEventListener('input', updateCalculator);
            updateCalculator(); // Initial calculation
        }

        // Setup both English and Russian calculators
        setupCalc('', false);      // English
        setupCalc('-ru', true);    // Russian
    }

    function formatCurrency(value, isRussian) {
        if (value >= 1000000000) {
            const billions = (value / 1000000000).toFixed(1);
            return isRussian ? `${billions} млрд KZT` : `${billions}B KZT`;
        } else if (value >= 1000000) {
            const millions = Math.round(value / 1000000);
            return isRussian ? `${millions} млн KZT` : `${millions}M KZT`;
        }
        return `${value.toLocaleString()} KZT`;
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

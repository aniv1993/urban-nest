/* ============================================ */
/* URBAN NEST — JavaScript                      */
/* Concept B: Bold Disruptor                    */
/* ============================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ---- 0. Lenis Smooth Scroll ---- //
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        smoothWheel: true,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);


    // ---- 0.5 Custom Cursor ---- //
    const cursorDot = document.getElementById('cursor-dot');
    const cursorRing = document.getElementById('cursor-ring');

    if (cursorDot && cursorRing && window.matchMedia('(hover: hover)').matches && window.innerWidth > 768) {
        let mouseX = 0, mouseY = 0;
        let ringX = 0, ringY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            // Dot follows instantly
            cursorDot.style.transform = `translate(${mouseX - 3}px, ${mouseY - 3}px)`;
        });

        // Ring follows with smooth lag
        function animateCursor() {
            ringX += (mouseX - ringX) * 0.25;
            ringY += (mouseY - ringY) * 0.25;
            cursorRing.style.transform = `translate(${ringX}px, ${ringY}px)`;
            requestAnimationFrame(animateCursor);
        }
        animateCursor();

        // Hover effect on interactive elements
        const hoverTargets = document.querySelectorAll('a, button, .house-card, .experience-card, .region-tab, input, select, textarea');
        hoverTargets.forEach(el => {
            el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
            el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
        });

        // Hide cursor when leaving window
        document.addEventListener('mouseleave', () => {
            cursorDot.style.opacity = '0';
            cursorRing.style.opacity = '0';
        });
        document.addEventListener('mouseenter', () => {
            cursorDot.style.opacity = '1';
            cursorRing.style.opacity = '1';
        });
    }

    // ---- 1. Header Scroll Effect ---- //
    const header = document.getElementById('header');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;
        if (currentScroll > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        lastScroll = currentScroll;
    }, { passive: true });


    // ---- 2. Mobile Menu ---- //
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-nav-link');

    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        header.classList.toggle('menu-open');
        document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
    });

    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            mobileMenu.classList.remove('active');
            header.classList.remove('menu-open');
            document.body.style.overflow = '';
        });
    });

    // Logo click also closes mobile menu
    const logoLink = document.getElementById('logo-link');
    logoLink.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        mobileMenu.classList.remove('active');
        header.classList.remove('menu-open');
        document.body.style.overflow = '';
    });


    // ---- 3. Smooth Scroll (via Lenis) ---- //
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                lenis.scrollTo(target, { offset: -80 });
            }
        });
    });


    // ---- 4. Scroll Reveal (Intersection Observer) ---- //
    const revealElements = document.querySelectorAll('.reveal-up');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));


    // ---- 5. Hero Parallax (smooth rAF) ---- //
    const heroImage = document.querySelector('.hero-parallax');

    if (heroImage && window.innerWidth > 768) {
        let ticking = false;
        let currentTranslate = 0;
        let targetTranslate = 0;

        // Initial scale
        heroImage.style.transform = 'translateY(0px) scale(1.1)';

        window.addEventListener('scroll', () => {
            const heroSection = document.getElementById('hero');
            const heroHeight = heroSection.offsetHeight;
            if (window.scrollY < heroHeight) {
                targetTranslate = window.scrollY * 0.3;
            }
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(updateParallax);
            }
        }, { passive: true });

        function updateParallax() {
            // Lerp for extra smoothness
            currentTranslate += (targetTranslate - currentTranslate) * 0.15;

            // Snap if close enough
            if (Math.abs(targetTranslate - currentTranslate) < 0.5) {
                currentTranslate = targetTranslate;
            }

            heroImage.style.transform = `translateY(${currentTranslate}px) scale(1.1)`;

            if (Math.abs(targetTranslate - currentTranslate) > 0.5) {
                requestAnimationFrame(updateParallax);
            } else {
                ticking = false;
            }
        }
    }


    // ---- 6. Region Tabs ---- //
    const regionTabs = document.querySelectorAll('.region-tab');
    const moscowGrid = document.getElementById('houses-moscow');
    const spbGrid = document.getElementById('houses-spb');

    regionTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active tab
            regionTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const region = tab.dataset.region;

            if (region === 'moscow') {
                moscowGrid.classList.remove('hidden');
                spbGrid.classList.add('hidden');
            } else {
                spbGrid.classList.remove('hidden');
                moscowGrid.classList.add('hidden');
            }

            // Re-trigger reveal animations for newly visible cards
            const newCards = document.querySelectorAll(`#houses-${region} .reveal-up`);
            newCards.forEach(card => {
                card.classList.remove('visible');
                setTimeout(() => {
                    card.classList.add('visible');
                }, 50);
            });
        });
    });


    // ---- 7. House Modal ---- //
    const housesData = {
        'forest-light': {
            title: 'Лесной Свет',
            subtitle: 'Классический лесной дом · 25 м² · до 2 гостей · Московская обл.',
            description: 'Уютный дом из натурального дерева в окружении хвойного леса. Большое окно с видом на сосны, тёплый пол, кингсайз кровать, мини-кухня с кофемашиной. Идеален для романтических выходных вдвоём. Рядом — тропа для прогулок и беседка с мангалом.',
            price: '17 800 ₽ / ночь',
            image: 'images/forest-light.png'
        },
        'glass-house': {
            title: 'Панорамный',
            subtitle: 'А-фрейм с панорамными окнами · 35 м² · до 2 гостей · Московская обл.',
            description: 'Дом в стиле А-фрейм с панорамными окнами от пола до потолка. Тёмное дерево, тёплая подсветка, просторная терраса с шезлонгами. Вечером — мягкий свет сквозь стекло и звуки леса. Наш флагман и самый фотогеничный дом коллекции.',
            price: '25 000 ₽ / ночь',
            image: 'images/glass-house.png'
        },
        'pine-cabin': {
            title: 'Сосновый Домик',
            subtitle: 'Скандинавский стиль · 22 м² · до 2 гостей · Московская обл.',
            description: 'Компактный и стильный домик в скандинавском духе. Светлое дерево, минимализм, уютная веранда с двумя креслами. Простота, которая вдохновляет. Книжная полка, камин и горячий шоколад включены.',
            price: '15 000 ₽ / ночь',
            image: 'images/pine-cabin.png'
        },
        'horizon': {
            title: 'Горизонт',
            subtitle: 'С террасой и видом · 30 м² · до 3 гостей · Московская обл.',
            description: 'Дом на возвышенности с просторной деревянной террасой и панорамным видом на лесную долину. Идеален для тех, кто ценит пространство и закаты. Раскладной диван позволяет разместить третьего гостя.',
            price: '21 800 ₽ / ночь',
            image: 'images/horizon.png'
        },
        'moss-retreat': {
            title: 'Кедровый',
            subtitle: 'Уютный дом из кедра · 20 м² · до 2 гостей · Московская обл.',
            description: 'Компактный дом из натурального кедра с тёплой атмосферой и ароматом хвои. Крытая веранда с двумя креслами, мягкое освещение, тёплый пол. Идеален для тех, кто ценит тишину и простоту. Wi-Fi по запросу — здесь принято отдыхать от экранов.',
            price: '18 400 ₽ / ночь',
            image: 'images/moss-retreat.png'
        },
        'oak-studio': {
            title: 'Дубовая Студия',
            subtitle: 'Workation-студия · 40 м² · до 2 гостей · Московская обл.',
            description: 'Самый просторный дом в коллекции. Зонирован на рабочую и жилую часть. Эргономичный стол, быстрый Wi-Fi (100 Мбит/с), панорамные окна для максимума естественного света. Продуктивность среди сосен.',
            price: '23 600 ₽ / ночь',
            image: 'images/oak-studio.png'
        },
        'lake-view': {
            title: 'Озёрный',
            subtitle: 'Дом у озера · 30 м² · до 2 гостей · Ленинградская обл.',
            description: 'Дом на берегу тихого лесного озера. Собственный причал, каяк в комплекте. Панорамные окна с видом на воду, открытая терраса. Утренний туман над озером — это зрелище, ради которого стоит проснуться раньше.',
            price: '23 000 ₽ / ночь',
            image: 'images/lake-view.png'
        },
        'birch-house': {
            title: 'Берёзовый Дом',
            subtitle: 'Берёзовая роща · 25 м² · до 2 гостей · Ленинградская обл.',
            description: 'Светлый дом в белой берёзовой роще. Фасад из светлого дерева гармонирует с корой берёз. Осенью здесь золото, весной — первая зелень. Камин, пледы и чай с чабрецом.',
            price: '17 800 ₽ / ночь',
            image: 'images/birch-house.png'
        },
        'nordic-shell': {
            title: 'Северная Раковина',
            subtitle: 'Минималистичный · 28 м² · до 2 гостей · Ленинградская обл.',
            description: 'Архитектурная жемчужина с изогнутой формой крыши. Бетон и дерево, органические линии, единственное большое окно — как рамка для пейзажа. Для ценителей современной архитектуры.',
            price: '19 600 ₽ / ночь',
            image: 'images/nordic-shell.png'
        },
        'aurora-loft': {
            title: 'Аврора Лофт',
            subtitle: 'С мансардой · 38 м² · до 3 гостей · Ленинградская обл.',
            description: 'Двухуровневый дом с уютной мансардной спальней. Внизу — гостиная и кухня, наверху — кровать под скошенным потолком с окном в небо. Вечером свет настолько мягкий, что кажется, дом светится изнутри.',
            price: '26 400 ₽ / ночь',
            image: 'images/aurora-loft.png'
        }
    };

    const modal = document.getElementById('house-modal');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalClose = document.getElementById('modal-close');
    const modalBook = document.getElementById('modal-book');
    const houseCards = document.querySelectorAll('.house-card');

    function openModal(houseId) {
        const data = housesData[houseId];
        if (!data) return;

        document.getElementById('modal-title').textContent = data.title;
        document.getElementById('modal-subtitle').textContent = data.subtitle;
        document.getElementById('modal-description').textContent = data.description;
        document.getElementById('modal-price').textContent = data.price;

        const imgContainer = document.getElementById('modal-image');
        imgContainer.innerHTML = `<img src="${data.image}" alt="${data.title}" class="w-full h-full object-cover">`;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    houseCards.forEach(card => {
        card.addEventListener('click', () => {
            openModal(card.dataset.house);
        });
    });

    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    modalBook.addEventListener('click', () => {
        closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });


    // ---- 8. Booking Form ---- //
    const bookingForm = document.getElementById('booking-form');
    const bookingSuccess = document.getElementById('booking-success');
    const bookingSubmit = document.getElementById('booking-submit');

    if (bookingForm) {
        bookingForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Basic validation
            const name = document.getElementById('name').value.trim();
            const contact = document.getElementById('contact').value.trim();
            const date = document.getElementById('date').value;

            if (!name || !contact || !date) {
                // Shake animation on button
                bookingSubmit.style.animation = 'none';
                bookingSubmit.offsetHeight; // Trigger reflow
                bookingSubmit.style.animation = 'shake 0.5s ease';
                return;
            }

            // Simulate form submission
            bookingSubmit.textContent = 'Отправляем...';
            bookingSubmit.disabled = true;

            // Build mailto link
            const guests = document.getElementById('guests').value;
            const region = document.getElementById('region').value;
            const house = document.getElementById('house').value;
            const message = document.getElementById('message').value;

            const subject = encodeURIComponent(`Заявка на бронирование — Urban Nest`);
            const body = encodeURIComponent(
                `Имя: ${name}\n` +
                `Контакт: ${contact}\n` +
                `Дата заезда: ${date}\n` +
                `Гостей: ${guests}\n` +
                `Регион: ${region || 'Любой'}\n` +
                `Дом: ${house || 'Любой'}\n` +
                `Пожелания: ${message || '-'}\n`
            );

            // Open mailto
            window.location.href = `mailto:hello@urbannest.ru?subject=${subject}&body=${body}`;

            // Show success
            setTimeout(() => {
                bookingForm.querySelector('.grid').style.display = 'none';
                bookingForm.querySelector('div.mb-8').style.display = 'none';
                bookingSubmit.style.display = 'none';
                bookingForm.querySelector('p.text-center').style.display = 'none';
                bookingSuccess.classList.remove('hidden');
            }, 1000);
        });
    }

    // Set min date to today
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
    }


    // ---- 9. Counter Animation ---- //
    const counters = document.querySelectorAll('[data-count]');

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.getAttribute('data-count'));
                animateCounter(entry.target, target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => counterObserver.observe(counter));

    function animateCounter(el, target) {
        let current = 0;
        const increment = target / 50;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                el.textContent = target;
                clearInterval(timer);
            } else {
                el.textContent = Math.floor(current);
            }
        }, 30);
    }


    // ---- 10. Nav Link Active State ---- //
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            if (window.scrollY >= sectionTop) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('text-accent-gold');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('text-accent-gold');
            }
        });
    }, { passive: true });


    // ---- 11. Dynamic Blog Posts ---- //
    async function loadBlogPosts() {
        const container = document.getElementById('blog-posts');
        if (!container) return;

        try {
            const res = await fetch('/api/posts');
            if (!res.ok) throw new Error('Failed to fetch');
            const posts = await res.json();

            // Filter published only, sort by date desc
            const published = posts
                .filter(p => p.published)
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            if (published.length === 0) {
                container.innerHTML = '<p class="text-charcoal/50 text-center col-span-3 py-12">Статьи скоро появятся</p>';
                return;
            }

            container.innerHTML = published.map((post, i) => {
                const delayClass = `delay-${(i % 3) + 1}`;
                return `
                    <article class="group cursor-pointer reveal-up ${delayClass}">
                        <div class="overflow-hidden rounded-2xl mb-5 aspect-[4/3]">
                            <img src="${post.image}" alt="${escapeHtml(post.title)} — статья Urban Nest"
                                 class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                 loading="lazy">
                        </div>
                        <div class="flex items-center gap-2 mb-2">
                            <span class="font-accent text-xs text-accent-gold uppercase tracking-wider">${escapeHtml(post.category)}</span>
                            <span class="text-charcoal/30 text-xs">·</span>
                            <time datetime="${post.date}" class="font-accent text-xs text-charcoal/50">${formatBlogDate(post.date)}</time>
                        </div>
                        <h3 class="font-display font-semibold text-xl text-deep-forest mb-3 group-hover:text-accent-gold transition-colors duration-300">${escapeHtml(post.title)}</h3>
                        <p class="text-charcoal/60 text-sm leading-relaxed">${escapeHtml(post.excerpt)}</p>
                    </article>
                `;
            }).join('');

            // Re-observe new elements for reveal animation
            container.querySelectorAll('.reveal-up').forEach(el => {
                revealObserver.observe(el);
            });

        } catch (err) {
            // If API unavailable, keep shimmer placeholders
            console.warn('Blog posts: API unavailable, keeping placeholders');
        }
    }

    function formatBlogDate(dateStr) {
        if (!dateStr) return '';
        const months = [
            'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
            'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
        ];
        const d = new Date(dateStr + 'T00:00:00');
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    // Load blog posts
    loadBlogPosts();

});

// ---- Shake Animation (for form validation) ---- //
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

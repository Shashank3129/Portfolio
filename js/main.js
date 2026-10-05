(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hasGSAP = Boolean(window.gsap && window.ScrollTrigger);
    const animate = hasGSAP && !reduce;
    const $ = (sel, scope = document) => scope.querySelector(sel);
    const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];

    // Shared with the WebGL hero (js/hero3d.js)
    const state = (window.portfolio = window.portfolio || { heroProgress: 0, velocity: 0, introAt: 0 });

    if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

    /* ---------- Text splitting ---------- */
    function splitWords(el, withChars = false) {
        const words = el.textContent.trim().split(/\s+/);
        el.textContent = '';
        words.forEach((word, i) => {
            const mask = document.createElement('span');
            mask.className = 'wm';
            const inner = document.createElement('span');
            inner.className = 'wi';
            if (withChars) {
                [...word].forEach((c) => {
                    const ch = document.createElement('span');
                    ch.className = 'ch';
                    ch.textContent = c;
                    inner.appendChild(ch);
                });
            } else {
                inner.textContent = word;
            }
            mask.appendChild(inner);
            el.appendChild(mask);
            if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
        });
        return el;
    }

    function splitChars(el) {
        const text = el.textContent;
        el.textContent = '';
        [...text].forEach((c) => {
            const ch = document.createElement('span');
            ch.className = 'ch';
            ch.textContent = c;
            el.appendChild(ch);
        });
        return $$('.ch', el);
    }

    /* ---------- Smooth scroll ---------- */
    let lenis = null;
    if (animate && window.Lenis) {
        lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
    }

    function scrollToTarget(target) {
        if (lenis) {
            lenis.scrollTo(target, { duration: 1.4 });
        } else if (target === 0) {
            window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
        } else {
            target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
        }
    }

    $$('a[href^="#"]').forEach((link) => {
        link.addEventListener('click', (e) => {
            const id = link.getAttribute('href');
            if (id === '#' || id === '#main') return;
            const target = id === '#top' ? 0 : $(id);
            if (target === null) return;
            e.preventDefault();
            closeMenu();
            scrollToTarget(target);
        });
    });

    /* ---------- Toast ---------- */
    let toastTimer;
    function showNotification(message) {
        const toast = $('#notification');
        $('#notification-text').textContent = message;
        toast.classList.add('is-on');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('is-on'), 3200);
    }

    /* ---------- Theme toggle with circular reveal ---------- */
    function applyTheme(theme) {
        root.setAttribute('data-theme', theme);
        try { localStorage.setItem('theme', theme); } catch (e) { /* storage blocked */ }
        const meta = $('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a0b0f' : '#f5f6f8');
        document.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
    }

    let themeTransition = null;
    $('#theme-toggle').addEventListener('click', (e) => {
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        // A click during a running reveal finishes it at once, then switches again
        if (themeTransition) themeTransition.skipTransition();
        if (!document.startViewTransition || reduce) {
            applyTheme(next);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX || rect.left + rect.width / 2;
        const y = e.clientY || rect.top + rect.height / 2;
        const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        const transition = document.startViewTransition(() => applyTheme(next));
        themeTransition = transition;
        transition.finished.finally(() => { if (themeTransition === transition) themeTransition = null; });
        transition.ready.then(() => {
            root.animate(
                { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
                { duration: 600, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', pseudoElement: '::view-transition-new(root)' }
            );
        }).catch(() => {});
    });

    /* ---------- Mobile menu ---------- */
    const menu = $('#mobile-menu');
    const menuBtn = $('#mobile-menu-btn');
    function openMenu() {
        menu.classList.add('is-open');
        menuBtn.setAttribute('aria-expanded', 'true');
        if (lenis) lenis.stop();
        if (animate) {
            gsap.fromTo($$('.menu__link', menu),
                { y: 24, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.6, stagger: 0.04, delay: 0.08, ease: 'expo.out' });
            gsap.fromTo('.menu__foot', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.3, ease: 'expo.out' });
        }
        setTimeout(() => $('#mobile-menu-close').focus(), 50);
    }
    function closeMenu() {
        if (!menu.classList.contains('is-open')) return;
        menu.classList.remove('is-open');
        menuBtn.setAttribute('aria-expanded', 'false');
        if (lenis) lenis.start();
        menuBtn.focus({ preventScroll: true });
    }
    menuBtn.addEventListener('click', openMenu);
    $('#mobile-menu-close').addEventListener('click', closeMenu);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

    /* ---------- Resume, email copy, contact form ---------- */
    $$('.resume-link').forEach((a) => a.addEventListener('click', () => showNotification('Opening resume')));

    const copyBtn = $('#copy-email');
    copyBtn.addEventListener('click', () => {
        const text = copyBtn.dataset.copy;
        const done = () => {
            copyBtn.textContent = 'Copied';
            showNotification('Email address copied');
            setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
        };
        const fallback = () => {
            const range = document.createRange();
            range.selectNodeContents($('#email-text'));
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            showNotification('Address selected, ready to copy');
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, fallback);
        } else {
            fallback();
        }
    });

    const form = $('#contact-form');
    const messages = {
        senderName: 'Add your name so I know who is writing.',
        senderEmail: 'Enter an email I can reply to, like name@company.com.',
        emailSubject: 'Add a short subject line.',
        emailMessage: 'Write a message before sending.',
    };
    function validateField(input) {
        const field = input.closest('.field');
        const ok = input.value.trim() !== '' && input.checkValidity();
        field.classList.toggle('is-invalid', !ok);
        input.setAttribute('aria-invalid', String(!ok));
        $('.field__error', field).textContent = ok ? '' : messages[input.id];
        return ok;
    }
    $$('input, textarea', form).forEach((input) => {
        input.addEventListener('blur', () => { if (input.value) validateField(input); });
        input.addEventListener('input', () => { if (input.closest('.field').classList.contains('is-invalid')) validateField(input); });
    });
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputs = $$('input, textarea', form);
        const results = inputs.map(validateField);
        if (results.includes(false)) {
            inputs[results.indexOf(false)].focus();
            return;
        }
        const name = $('#senderName').value.trim();
        const email = $('#senderEmail').value.trim();
        const subject = $('#emailSubject').value.trim();
        const message = $('#emailMessage').value.trim();
        const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
        window.location.href = `mailto:singh.03shashank@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        showNotification('Email client opened. Hit send to deliver.');
        form.reset();
    });

    /* ---------- Generated visuals ---------- */
    // Pantheon council ring: the ring spins, each seat counter-rotates to keep facing the viewer
    const spin = $('#council-spin');
    const seats = ['St', 'Ec', 'Bu', 'De', 'Sk', 'Op', 'Hi', 'Ph', 'Ma', 'Le', 'Da', 'Ps'];
    seats.forEach((label, i) => {
        const seat = document.createElement('div');
        seat.className = 'council__seat' + (i % 4 === 0 ? ' is-hot' : '');
        const a = (i / seats.length) * Math.PI * 2;
        seat.style.transform = `translate(${Math.cos(a) * 46}cqw, ${Math.sin(a) * 46}cqw)`;
        seat.innerHTML = `<span>${label}</span>`;
        spin.appendChild(seat);
    });
    const council = $('#council');
    if (!reduce) {
        const spinTiming = { duration: 32000, iterations: Infinity };
        spin.animate([{ transform: 'rotateZ(0deg)' }, { transform: 'rotateZ(360deg)' }], spinTiming);
        $$('.council__seat span', spin).forEach((s) => {
            s.animate(
                [{ transform: 'rotateZ(0deg) rotateX(-68deg)' }, { transform: 'rotateZ(-360deg) rotateX(-68deg)' }],
                spinTiming
            );
        });
    }

    // DineFlow QR grid (finder squares in three corners, deterministic fill)
    const qr = $('#qr');
    const N = 11;
    const isFinder = (r, c) => (r < 3 && c < 3) || (r < 3 && c > N - 4) || (r > N - 4 && c < 3);
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            const cell = document.createElement('i');
            const lr = r < 3 ? r : r - (N - 3);
            const lc = c < 3 ? c : c - (N - 3);
            const separator = (r === 3 && (c < 4 || c > N - 5)) || (c === 3 && (r < 4 || r > N - 5)) ||
                (r === N - 4 && c < 4) || (c === N - 4 && r < 4);
            if (isFinder(r, c)) {
                if (lr === 1 && lc === 1) cell.className = 'eye';
            } else if (separator || ((r * 7 + c * 13 + r * c) % 5) < 2) {
                cell.className = 'off';
            }
            qr.appendChild(cell);
        }
    }

    // Marquee: clone the group so the loop is seamless
    const marqueeTrack = $('#marquee-track');
    const group = $('.marquee__group', marqueeTrack);
    const clone = group.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    marqueeTrack.appendChild(clone);

    /* ---------- Pointer effects (fine pointers only) ---------- */
    if (finePointer && !reduce && hasGSAP) {
        // Magnetic pull uses the independent `translate` property so :active scale still works
        $$('.magnetic').forEach((el) => {
            let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
            const step = () => {
                cx += (tx - cx) * 0.14;
                cy += (ty - cy) * 0.14;
                el.style.translate = `${cx.toFixed(2)}px ${cy.toFixed(2)}px`;
                raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.1 ? requestAnimationFrame(step) : 0;
            };
            const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                tx = (e.clientX - (r.left + r.width / 2)) * 0.2;
                ty = (e.clientY - (r.top + r.height / 2)) * 0.3;
                kick();
            });
            el.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
        });

        $$('.tilt').forEach((el) => {
            gsap.set(el, { transformPerspective: 1000 });
            const rx = gsap.quickTo(el, 'rotationX', { duration: 0.8, ease: 'power3.out' });
            const ry = gsap.quickTo(el, 'rotationY', { duration: 0.8, ease: 'power3.out' });
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                rx(((e.clientY - r.top) / r.height - 0.5) * -7);
                ry(((e.clientX - r.left) / r.width - 0.5) * 9);
            });
            el.addEventListener('pointerleave', () => { rx(0); ry(0); });
        });
    }

    // Colour spotlight follows the pointer across cards
    if (finePointer) {
        $$('.glow').forEach((el) => {
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                el.style.setProperty('--mx', `${e.clientX - r.left}px`);
                el.style.setProperty('--my', `${e.clientY - r.top}px`);
            });
        });
    }

    /* ---------- Page tint follows the section in view ---------- */
    const wash = $('#bg-wash');
    const navLinksAll = $$('.nav__link');
    function setTint(n) {
        wash.style.setProperty('--wash', n ? `var(--t${n})` : 'var(--t0)');
        navLinksAll.forEach((l) => l.style.setProperty('--nav-k', n ? `var(--c${n})` : 'var(--fg)'));
    }
    const tintSections = $$('[data-tint]');
    const tintIO = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) setTint(entry.target.dataset.tint); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    tintSections.forEach((s) => tintIO.observe(s));
    setTint(1);

    /* ---------- One-off visual animations when they come into view ---------- */
    function onVisible(el, fn, threshold = 0.35) {
        const io = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) { fn(); io.disconnect(); }
        }, { threshold });
        io.observe(el);
    }

    if (animate) {
        const scoreBar = $('#score-bar');
        const scoreNum = $('#score-num');
        scoreBar.setAttribute('stroke-dashoffset', '100');
        scoreNum.textContent = '0';
        gsap.set('.score__tag', { opacity: 0, y: 10 });
        onVisible($('#score'), () => {
            gsap.to(scoreBar, { attr: { 'stroke-dashoffset': 14 }, duration: 1.8, ease: 'expo.out' });
            const o = { v: 0 };
            gsap.to(o, { v: 86, duration: 1.8, ease: 'expo.out', onUpdate: () => { scoreNum.textContent = Math.round(o.v); } });
            gsap.to('.score__tag', { opacity: 1, y: 0, duration: 0.7, stagger: 0.12, delay: 0.5, ease: 'expo.out' });
        });

        gsap.set('#qr i', { scale: 0.5, opacity: 0 });
        gsap.set('.order', { yPercent: 80, opacity: 0 });
        onVisible(qr, () => {
            gsap.to('#qr i', { scale: 1, opacity: 1, duration: 0.6, ease: 'expo.out', stagger: { grid: [N, N], from: 'center', amount: 0.8 } });
            gsap.to('.order', { yPercent: 0, opacity: 1, duration: 0.8, delay: 0.8, ease: 'expo.out' });
        });

        gsap.set('.council__seat span', { opacity: 0 });
        onVisible(council, () => {
            gsap.to('.council__seat span', { opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power2.out' });
            gsap.from('.council__core', { scale: 0.9, opacity: 0, duration: 1, ease: 'expo.out' });
        });
    }

    if (!animate) return;

    /* =================================================================
       GSAP choreography (skipped for reduced motion or missing libs)
       ================================================================= */

    // Hero entrance: words rise softly, then the supporting copy
    const heroWords = [];
    $$('#hero-title [data-split]').forEach((el) => {
        splitWords(el);
        heroWords.push(...$$('.wi', el));
    });
    const rotatorWords = $$('.rotator__word');
    gsap.set(heroWords, { yPercent: 110 });
    gsap.set(rotatorWords[0], { yPercent: 110 });
    gsap.set('.hero-fade', { y: 18, opacity: 0 });
    gsap.set('#navbar', { y: -16, opacity: 0 });

    state.introAt = performance.now();
    document.dispatchEvent(new CustomEvent('hero:intro'));
    gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.15 })
        .to('#navbar', { y: 0, opacity: 1, duration: 1, clearProps: 'transform,opacity' }, 0)
        .to('.hero__intro', { y: 0, opacity: 1, duration: 1 }, 0.1)
        .to(heroWords, { yPercent: 0, duration: 1.2, stagger: 0.07 }, 0.2)
        .to(rotatorWords[0], { yPercent: 0, duration: 1.2 }, 0.48)
        .to('.hero__sub, .hero__ctas', { y: 0, opacity: 1, duration: 1, stagger: 0.1 }, 0.6)
        .add(startRotator, 2);

    // The slot eases to each word's width so the centred line stays balanced
    const rotator = $('#word-rotator');
    const fitRotator = (word) => { rotator.style.width = `${word.offsetWidth}px`; };
    fitRotator(rotatorWords[0]);
    if (document.fonts) document.fonts.ready.then(() => fitRotator(rotatorWords[0]));

    function startRotator() {
        let i = 0;
        setInterval(() => {
            if (document.hidden) return;
            const prev = rotatorWords[i];
            i = (i + 1) % rotatorWords.length;
            const next = rotatorWords[i];
            fitRotator(next);
            gsap.to(prev, { yPercent: -40, opacity: 0, filter: 'blur(6px)', duration: 0.6, ease: 'power2.in' });
            gsap.fromTo(next,
                { yPercent: 40, opacity: 0, filter: 'blur(6px)' },
                { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 0.8, delay: 0.25, ease: 'expo.out' });
        }, 2800);
    }

    // Hero scroll: copy lifts away, the pearl rises (3D), the caption arrives
    gsap.timeline({
        scrollTrigger: {
            trigger: '.hero',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.6,
            onUpdate: (self) => { state.heroProgress = self.progress; },
        },
    })
        .to('#hero-copy', { y: -80, autoAlpha: 0, ease: 'power1.in', duration: 0.45 }, 0)
        .fromTo('#hero-caption', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }, 0.55)
        .to({}, { duration: 0.15 });

    // Page-wide: progress bar, nav state, scroll velocity
    const navbar = $('#navbar');
    gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
    ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: (self) => {
            const y = self.scroll();
            state.velocity = self.getVelocity();
            navbar.classList.toggle('is-scrolled', y > 24);
            const menuOpen = menu.classList.contains('is-open');
            navbar.classList.toggle('is-hidden', !menuOpen && y > innerHeight * 2.2 && self.direction === 1);
        },
    });

    // Active section pill in the nav
    const navLinks = $$('.nav__link');
    const pill = $('.nav__pill');
    function setActive(id) {
        let activeLink = null;
        navLinks.forEach((link) => {
            const on = link.getAttribute('href') === '#' + id;
            link.classList.toggle('is-active', on);
            if (on) activeLink = link;
        });
        if (!activeLink) { pill.style.opacity = '0'; return; }
        pill.style.width = `${activeLink.offsetWidth}px`;
        pill.style.transform = `translateX(${activeLink.offsetLeft}px)`;
        pill.style.opacity = '1';
    }
    ['products', 'experience', 'skills', 'achievements', 'writing', 'contact'].forEach((id) => {
        ScrollTrigger.create({
            trigger: '#' + id,
            start: 'top 55%',
            end: 'bottom 55%',
            onToggle: (self) => { if (self.isActive) setActive(id); },
        });
    });
    ScrollTrigger.create({ trigger: '#products', start: 'top 55%', onLeaveBack: () => setActive(null) });

    // Masked word reveals for headings
    $$('[data-reveal]').forEach((el) => {
        splitWords(el);
        gsap.from($$('.wi', el), {
            yPercent: 110,
            duration: 1.1,
            stagger: 0.06,
            ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
    });

    // Soft rise for supporting blocks
    function rise(targets, vars = {}) {
        $$(targets).forEach((el) => {
            gsap.from(el, {
                y: 36, opacity: 0, duration: 1.1, ease: 'expo.out',
                scrollTrigger: { trigger: el, start: 'top 90%', once: true },
                clearProps: 'transform,opacity,translate,rotate,scale',
                ...vars,
            });
        });
    }
    rise('.head .lede, .contact__lede, .contact__actions, .links, .form, .marquee__label');
    rise('.tile', { y: 70, scale: 0.97, duration: 1.3 });
    rise('.essay', { y: 60, duration: 1.2 });
    rise('.win', { y: 40 });

    // Skills: groups rise, list items follow
    $$('.skillset__group').forEach((g, i) => {
        gsap.from([$('h3', g), ...$$('li', g)], {
            y: 24, opacity: 0, duration: 0.9, stagger: 0.05, delay: i * 0.08, ease: 'expo.out',
            scrollTrigger: { trigger: g, start: 'top 85%', once: true },
            clearProps: 'transform,opacity,translate,rotate,scale',
        });
    });

    // Statement: words light up as you scroll, then the ledger counts up
    const storyText = $('#story-text');
    const keyWords = new Map([['build', 'var(--c2)'], ['thing', 'var(--c4)'], ['myself.', 'var(--c1)']]);
    splitWords(storyText);
    const storyWords = $$('.wi', storyText);
    storyWords.forEach((w) => {
        w.classList.add('story__word');
        if (keyWords.has(w.textContent)) {
            w.classList.add('is-key');
            w.style.setProperty('--kc', keyWords.get(w.textContent));
        }
    });
    const counters = $$('.counter');
    counters.forEach((c) => { c.textContent = '0'; });
    let counted = false;
    function runCounters() {
        if (counted) return;
        counted = true;
        counters.forEach((c) => {
            const o = { v: 0 };
            gsap.to(o, { v: +c.dataset.target, duration: 1.6, ease: 'expo.out', onUpdate: () => { c.textContent = Math.round(o.v); } });
        });
    }
    gsap.set('.ledger__item', { y: 30, opacity: 0 });
    gsap.timeline({ scrollTrigger: { trigger: '#story', start: 'top top', end: 'bottom bottom', scrub: 0.5 } })
        .to(storyWords, { opacity: 1, stagger: 0.12, ease: 'none', duration: 0.3 })
        .to('.ledger__item', { y: 0, opacity: 1, stagger: 0.12, duration: 0.5, ease: 'power2.out' }, '-=0.2')
        .call(runCounters)
        .to({}, { duration: 0.6 });

    // Showcase: the Pantheon window tilts up into place
    $$('.callout').forEach((c, i) => gsap.set(c, { z: [90, 140, 60][i], y: 30, opacity: 0 }));
    gsap.timeline({ scrollTrigger: { trigger: '#showcase', start: 'top top', end: 'bottom bottom', scrub: 0.8 } })
        .fromTo('#zoom-stage',
            { rotateX: 48, scale: 0.7, yPercent: 26 },
            { rotateX: 0, scale: 1, yPercent: 6, duration: 3, ease: 'power2.inOut' })
        .to('#showcase-intro', { opacity: 0, y: -40, duration: 0.8 }, 1.4)
        .to('.callout', { opacity: 1, y: 0, duration: 0.6, stagger: 0.35, ease: 'power3.out' }, 2.3)
        .to({}, { duration: 0.5 });

    // Experience: rail fills, the year in the aside follows the active role
    gsap.to('#timeline-fill', {
        scaleY: 1,
        ease: 'none',
        scrollTrigger: { trigger: '#timeline', start: 'top 60%', end: 'bottom 60%', scrub: 0.4 },
    });
    const roles = $$('.role');
    const yearEl = $('#xp-year');
    const companyEl = $('#xp-company');
    const yearState = { v: 2025 };
    const xpNow = $('.xp__now');
    function showRole(role) {
        const c = (role.className.match(/role--(c\d)/) || [])[1];
        if (c) xpNow.style.color = `var(--${c})`;
        gsap.to(yearState, { v: +role.dataset.year, duration: 0.8, ease: 'power3.out', onUpdate: () => { yearEl.textContent = Math.round(yearState.v); } });
        if (companyEl.textContent !== role.dataset.company) {
            gsap.fromTo(companyEl, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'expo.out' });
            companyEl.textContent = role.dataset.company;
        }
    }
    roles.forEach((role, i) => {
        gsap.from($$(':scope > :not(.role__dot)', role), {
            y: 28, opacity: 0, duration: 1, stagger: 0.05, ease: 'expo.out',
            scrollTrigger: { trigger: role, start: 'top 85%', once: true },
        });
        ScrollTrigger.create({
            trigger: role,
            start: 'top 60%',
            onEnter: () => { role.classList.add('is-on'); showRole(role); },
            onLeaveBack: () => {
                role.classList.remove('is-on');
                if (roles[i - 1]) showRole(roles[i - 1]);
            },
        });
    });

    // Marquee: steady drift, nudged by scroll speed
    const loop = gsap.to(marqueeTrack, { xPercent: -50, duration: 40, ease: 'none', repeat: -1 });
    ScrollTrigger.create({
        trigger: '.marquee',
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
            const boost = Math.min(Math.abs(self.getVelocity()) / 400, 3);
            gsap.to(loop, { timeScale: 1 + boost, duration: 0.2, overwrite: true });
            gsap.to(loop, { timeScale: 1, duration: 1.4, delay: 0.2, ease: 'power2.out' });
        },
    });

    // Contact headline: words rise
    const contactTitle = $('#contact-title');
    contactTitle.setAttribute('aria-label', contactTitle.textContent.trim());
    splitWords(contactTitle);
    $$('.wm', contactTitle).forEach((w) => {
        w.setAttribute('aria-hidden', 'true');
        if (w.textContent === 'great') w.classList.add('c2');
        if (w.textContent === 'together.') w.classList.add('c1');
    });
    gsap.from($$('.wi', contactTitle), {
        yPercent: 110,
        duration: 1.2,
        stagger: 0.07,
        ease: 'expo.out',
        scrollTrigger: { trigger: contactTitle, start: 'top 85%', once: true },
    });

    // Footer wordmark
    const wordmark = $('#wordmark');
    const dot = $('.wordmark__dot', wordmark);
    dot.remove();
    const wordChars = splitChars(wordmark);
    wordmark.appendChild(dot);
    dot.classList.add('ch');
    wordChars.push(dot);
    gsap.from(wordChars, {
        yPercent: 100,
        duration: 1.2,
        stagger: 0.04,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.footer', start: 'top 85%', once: true },
        clearProps: 'transform,translate,rotate,scale',
    });

    // Hero colour fields drift on their own and lean toward the pointer
    $$('.blob').forEach((b, i) => {
        gsap.to(b, {
            x: () => (i % 2 ? -1 : 1) * innerWidth * 0.06,
            y: () => (i < 2 ? 1 : -1) * innerHeight * 0.06,
            scale: 1.15,
            duration: 9 + i * 2,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
        });
    });
    if (finePointer) {
        const blobWrap = $('.hero__blobs');
        const bx = gsap.quickTo(blobWrap, 'x', { duration: 1.6, ease: 'power3.out' });
        const by = gsap.quickTo(blobWrap, 'y', { duration: 1.6, ease: 'power3.out' });
        window.addEventListener('pointermove', (e) => {
            bx((e.clientX / innerWidth - 0.5) * 60);
            by((e.clientY / innerHeight - 0.5) * 40);
        }, { passive: true });
    }

    // Kinetic band: rows slide in opposite directions as you scroll, and lean with speed
    const band = $('#kinetic');
    const bandRows = $$('.kinetic__row', band);
    bandRows.forEach((row) => {
        const dir = +row.dataset.dir;
        gsap.fromTo(row,
            { x: () => (dir < 0 ? 0 : -(row.scrollWidth - innerWidth)) },
            {
                x: () => (dir < 0 ? -(row.scrollWidth - innerWidth) : 0),
                ease: 'none',
                scrollTrigger: { trigger: band, start: 'top bottom', end: 'bottom top', scrub: 0.6, invalidateOnRefresh: true },
            });
    });
    const skewTo = bandRows.map((row) => gsap.quickTo(row, 'skewX', { duration: 0.5, ease: 'power3.out' }));
    ScrollTrigger.create({
        trigger: band,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
            const skew = gsap.utils.clamp(-10, 10, self.getVelocity() / -250);
            skewTo.forEach((fn) => fn(skew));
            clearTimeout(band._settle);
            band._settle = setTimeout(() => skewTo.forEach((fn) => fn(0)), 120);
        },
    });

    // Parallax: product visuals drift inside their frames
    $$('.tile__visual').forEach((v) => {
        const inner = v.firstElementChild;
        gsap.fromTo(inner, { y: 40 }, {
            y: -40,
            ease: 'none',
            scrollTrigger: { trigger: v, start: 'top bottom', end: 'bottom top', scrub: true },
        });
        gsap.fromTo(v, { clipPath: 'inset(100% 0% 0% 0% round 12px)' }, {
            clipPath: 'inset(0% 0% 0% 0% round 12px)',
            duration: 1.3,
            ease: 'expo.inOut',
            scrollTrigger: { trigger: v, start: 'top 88%', once: true },
        });
    });

    // Section headings drift slightly slower than the page (wider screens only)
    gsap.matchMedia().add('(min-width: 768px)', () => {
        $$('.head .h2').forEach((h) => {
            gsap.fromTo(h, { y: 24 }, {
                y: -24,
                ease: 'none',
                scrollTrigger: { trigger: h, start: 'top bottom', end: 'bottom top', scrub: true },
            });
        });
    });

    // Contact colour fields breathe
    $$('.contact__blobs i').forEach((b, i) => {
        gsap.to(b, { xPercent: i % 2 ? -12 : 12, yPercent: i ? 10 : -10, scale: 1.12, duration: 8 + i * 2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    });

    // Re-measure after fonts and images settle
    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener('load', () => ScrollTrigger.refresh());
})();

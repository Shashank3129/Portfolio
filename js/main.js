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

    if (!animate) root.classList.remove('is-loading');
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
        lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
    }

    function scrollToTarget(target) {
        if (lenis) {
            lenis.scrollTo(target, { offset: target === 0 ? 0 : -8, duration: 1.4 });
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
        if (meta) meta.setAttribute('content', theme === 'light' ? '#eef0eb' : '#0b100e');
        document.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
    }

    $('#theme-toggle').addEventListener('click', (e) => {
        const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        if (!document.startViewTransition || reduce) {
            applyTheme(next);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX || rect.left + rect.width / 2;
        const y = e.clientY || rect.top + rect.height / 2;
        const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        const transition = document.startViewTransition(() => applyTheme(next));
        transition.ready.then(() => {
            root.animate(
                { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
                { duration: 750, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', pseudoElement: '::view-transition-new(root)' }
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
                { yPercent: 60, opacity: 0 },
                { yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.05, delay: 0.18, ease: 'expo.out' });
            gsap.fromTo('.menu__foot', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.45, ease: 'expo.out' });
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
            range.selectNodeContents(copyBtn.previousElementSibling);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            showNotification('Selected. Press copy to save it.');
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
            if (animate) gsap.fromTo(form, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
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

    /* ---------- Skill tabs ---------- */
    const tabs = $$('.tab');
    function selectTab(tab) {
        tabs.forEach((t) => {
            const on = t === tab;
            t.setAttribute('aria-selected', String(on));
            t.tabIndex = on ? 0 : -1;
            $('#' + t.getAttribute('aria-controls')).hidden = !on;
        });
        const panel = $('#' + tab.getAttribute('aria-controls'));
        if (animate) {
            gsap.fromTo($$('li', panel), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.05, ease: 'expo.out' });
        }
    }
    tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => selectTab(tab));
        tab.addEventListener('keydown', (e) => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
            next.focus();
            selectTab(next);
        });
    });

    /* ---------- Generated visuals ---------- */
    // Pantheon council ring
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
    // The ring spins; each seat counter-rotates so its label keeps facing the viewer
    if (!reduce) {
        const spinTiming = { duration: 26000, iterations: Infinity };
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

    // Skills sphere
    const sphere = $('#sphere');
    const tagWords = [
        ['Discovery', 0], ['Roadmaps', 0], ['PRDs', 0], ['Prioritization', 0], ['Agile', 0], ['Stakeholders', 0],
        ['SQL', 0], ['Funnels', 0], ['A/B tests', 0], ['Unit economics', 0], ['React', 0], ['TypeScript', 0],
        ['FastAPI', 0], ['LLMs', 0], ['Prompt design', 0], ['Jira', 1], ['Figma', 1], ['GA4', 1], ['Power BI', 1],
        ['Tableau', 1], ['Postman', 1], ['Notion', 1], ['Mixpanel', 1], ['Claude', 1], ['Supabase', 1], ['Obsidian', 1],
    ];
    const points = tagWords.map(([word, tool], i) => {
        const el = document.createElement('span');
        el.className = 'sphere__tag' + (tool ? ' is-tool' : '');
        el.textContent = word;
        sphere.appendChild(el);
        // Fibonacci sphere distribution
        const y = 1 - (i / (tagWords.length - 1)) * 2;
        const rad = Math.sqrt(1 - y * y);
        const theta = Math.PI * (3 - Math.sqrt(5)) * i;
        return { el, x: Math.cos(theta) * rad, y, z: Math.sin(theta) * rad, w: 0, h: 0 };
    });
    let rotX = 0.35, rotY = 0, velX = 0.0012, velY = 0.0042, dragging = false, lastPX = 0, lastPY = 0;
    function measureSphere() { points.forEach((p) => { p.w = p.el.offsetWidth; p.h = p.el.offsetHeight; }); }
    function renderSphere() {
        const R = sphere.clientWidth * 0.36;
        const cx = Math.cos(rotX), sx = Math.sin(rotX), cy = Math.cos(rotY), sy = Math.sin(rotY);
        points.forEach((p) => {
            const x1 = p.x * cy + p.z * sy;
            const z1 = -p.x * sy + p.z * cy;
            const y2 = p.y * cx - z1 * sx;
            const z2 = p.y * sx + z1 * cx;
            const scale = 0.62 + (z2 + 1) * 0.26;
            p.el.style.transform = `translate(${x1 * R - p.w / 2}px, ${y2 * R - p.h / 2}px) scale(${scale.toFixed(3)})`;
            p.el.style.opacity = (0.22 + (z2 + 1) * 0.39).toFixed(3);
            p.el.style.zIndex = String(Math.round((z2 + 1) * 100));
        });
    }
    measureSphere();
    renderSphere();
    let sphereVisible = false;
    if (!reduce) {
        new IntersectionObserver(([entry]) => { sphereVisible = entry.isIntersecting; }).observe(sphere);
        const tick = () => {
            if (sphereVisible) {
                if (!dragging) {
                    velY += (0.0042 - velY) * 0.02;
                    velX += (0.0012 - velX) * 0.02;
                }
                rotY += velY;
                rotX += velX * Math.cos(rotY * 0.5);
                renderSphere();
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }
    sphere.addEventListener('pointerdown', (e) => {
        dragging = true;
        lastPX = e.clientX;
        lastPY = e.clientY;
        sphere.setPointerCapture(e.pointerId);
    });
    sphere.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        velY = (e.clientX - lastPX) * 0.004;
        velX = (e.clientY - lastPY) * -0.004;
        lastPX = e.clientX;
        lastPY = e.clientY;
        if (reduce) { rotY += velY; rotX += velX; renderSphere(); }
    });
    const endDrag = () => { dragging = false; };
    sphere.addEventListener('pointerup', endDrag);
    sphere.addEventListener('pointercancel', endDrag);
    window.addEventListener('resize', () => { measureSphere(); renderSphere(); });
    document.fonts && document.fonts.ready.then(() => { measureSphere(); renderSphere(); });

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
                cx += (tx - cx) * 0.16;
                cy += (ty - cy) * 0.16;
                el.style.translate = `${cx.toFixed(2)}px ${cy.toFixed(2)}px`;
                raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.1 ? requestAnimationFrame(step) : 0;
            };
            const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                tx = (e.clientX - (r.left + r.width / 2)) * 0.28;
                ty = (e.clientY - (r.top + r.height / 2)) * 0.35;
                kick();
            });
            el.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
        });

        $$('.tilt').forEach((el) => {
            gsap.set(el, { transformPerspective: 900 });
            const rx = gsap.quickTo(el, 'rotationX', { duration: 0.7, ease: 'power3.out' });
            const ry = gsap.quickTo(el, 'rotationY', { duration: 0.7, ease: 'power3.out' });
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                rx(((e.clientY - r.top) / r.height - 0.5) * -10);
                ry(((e.clientX - r.left) / r.width - 0.5) * 12);
            });
            el.addEventListener('pointerleave', () => { rx(0); ry(0); });
        });
    }
    if (finePointer) {
        $$('.spot').forEach((el) => {
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                el.style.setProperty('--mx', `${e.clientX - r.left}px`);
                el.style.setProperty('--my', `${e.clientY - r.top}px`);
            });
        });
    }

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
        onVisible($('#score'), () => {
            gsap.to(scoreBar, { attr: { 'stroke-dashoffset': 14 }, duration: 1.8, ease: 'expo.out' });
            const o = { v: 0 };
            gsap.to(o, { v: 86, duration: 1.8, ease: 'expo.out', onUpdate: () => { scoreNum.textContent = Math.round(o.v); } });
            gsap.from('.score__tag', { opacity: 0, y: 14, scale: 0.95, duration: 0.6, stagger: 0.12, delay: 0.5, ease: 'expo.out' });
        });

        gsap.set('#qr i', { scale: 0.4, opacity: 0 });
        gsap.set('.order', { yPercent: 120, opacity: 0 });
        onVisible(qr, () => {
            gsap.to('#qr i', { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)', stagger: { grid: [N, N], from: 'center', amount: 0.9 } });
            gsap.to('.order', { yPercent: 0, opacity: 1, duration: 0.8, delay: 0.9, ease: 'expo.out' });
        });

        gsap.set('.council__seat span', { opacity: 0 });
        onVisible(council, () => {
            gsap.to('.council__seat span', { opacity: 1, duration: 0.6, stagger: 0.06, ease: 'power2.out' });
            gsap.from('.council__core', { scale: 0.85, opacity: 0, duration: 1, ease: 'expo.out' });
        });
    }

    if (!animate) return;

    /* =================================================================
       GSAP choreography (skipped for reduced motion or missing libs)
       ================================================================= */

    // Hero split
    const heroChars = [];
    $$('#hero-title [data-split]').forEach((el) => {
        splitWords(el, true);
        heroChars.push(...$$('.ch', el));
    });
    const rotatorWords = $$('.rotator__word');
    gsap.set(heroChars, { yPercent: 115, rotateX: -80, opacity: 0, transformOrigin: '50% 100%' });
    gsap.set(rotatorWords[0], { yPercent: 115, opacity: 0 });
    gsap.set('.hero-fade', { y: 24, opacity: 0 });
    gsap.set('#navbar', { yPercent: -100, opacity: 0 });

    function heroIntro() {
        state.introAt = performance.now();
        document.dispatchEvent(new CustomEvent('hero:intro'));
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
        tl.to(heroChars, { yPercent: 0, rotateX: 0, opacity: 1, duration: 1.1, stagger: 0.028 }, 0.1)
            .to(rotatorWords[0], { yPercent: 0, opacity: 1, duration: 1.1 }, 0.55)
            .to('.hero-fade', { y: 0, opacity: 1, duration: 0.9, stagger: 0.08 }, 0.7)
            .to('#navbar', { yPercent: 0, opacity: 1, duration: 0.9, clearProps: 'transform,opacity' }, 0.5)
            .add(startRotator, 1.6);
    }

    function startRotator() {
        let i = 0;
        gsap.set(rotatorWords.slice(1), { rotateX: -90, opacity: 0 });
        setInterval(() => {
            if (document.hidden) return;
            const prev = rotatorWords[i];
            i = (i + 1) % rotatorWords.length;
            const next = rotatorWords[i];
            gsap.to(prev, { rotateX: 90, opacity: 0, duration: 0.7, ease: 'power3.inOut' });
            gsap.fromTo(next, { rotateX: -90, opacity: 0 }, { rotateX: 0, opacity: 1, duration: 0.7, ease: 'power3.inOut' });
        }, 2400);
    }

    // Preloader
    const preloader = $('#preloader');
    if (root.classList.contains('is-loading')) {
        if (lenis) lenis.stop();
        const count = { v: 0 };
        const countEl = $('#preloader-count');
        gsap.timeline({
            onComplete: () => {
                root.classList.remove('is-loading');
                try { sessionStorage.setItem('intro-seen', '1'); } catch (e) { /* storage blocked */ }
                if (lenis) lenis.start();
                ScrollTrigger.refresh();
            },
        })
            .from('.preloader__name span', { yPercent: 100, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'expo.out' }, 0)
            .to(count, { v: 100, duration: 1.3, ease: 'power2.inOut', onUpdate: () => { countEl.textContent = Math.round(count.v); } }, 0)
            .to('.preloader__bar', { scaleX: 1, duration: 1.3, ease: 'power2.inOut' }, 0)
            .to(preloader, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, 1.4)
            .add(heroIntro, 1.75);
    } else {
        heroIntro();
    }

    // Hero scroll-out, and progress shared with the 3D scene
    gsap.to('#hero-inner', {
        yPercent: -18,
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
            trigger: '.hero',
            start: 'top top',
            end: 'bottom top',
            scrub: true,
            onUpdate: (self) => { state.heroProgress = self.progress; },
        },
    });

    // Page-wide: progress bar, nav state, scroll velocity
    const navbar = $('#navbar');
    gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
    ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: (self) => {
            const y = self.scroll();
            state.velocity = self.getVelocity();
            navbar.classList.toggle('is-scrolled', y > 40);
            const menuOpen = menu.classList.contains('is-open');
            navbar.classList.toggle('is-hidden', !menuOpen && y > innerHeight * 0.6 && self.direction === 1);
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
    ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom 55%', onEnterBack: () => setActive(null) });

    // Masked word reveals for headings
    $$('[data-reveal]').forEach((el) => {
        splitWords(el);
        gsap.from($$('.wi', el), {
            yPercent: 110,
            rotate: 4,
            duration: 1.1,
            stagger: 0.06,
            ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        });
    });

    // Generic rise for ledes and small blocks
    $$('.lede, .tabs, .essay__text, .form, .links, .contact__resume').forEach((el) => {
        gsap.from(el, { y: 32, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });

    // Story: words light up as you scroll, then the ledger counts up
    const storyText = $('#story-text');
    const keyWords = new Set(['build', 'thing', 'myself.']);
    const storyWords = splitWords(storyText) && $$('.wi', storyText);
    storyWords.forEach((w) => {
        w.classList.add('story__word');
        if (keyWords.has(w.textContent)) w.classList.add('is-key');
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
    gsap.set('.ledger__item', { y: 40, opacity: 0 });
    gsap.timeline({ scrollTrigger: { trigger: '#story', start: 'top top', end: 'bottom bottom', scrub: 0.5 } })
        .to(storyWords, { opacity: 1, stagger: 0.12, ease: 'none', duration: 0.3 })
        .to('.ledger__item', { y: 0, opacity: 1, stagger: 0.15, duration: 0.6, ease: 'power2.out' }, '-=0.2')
        .call(runCounters)
        .to({}, { duration: 0.6 });

    // Showcase: the Pantheon window unfolds in 3D
    $$('.callout').forEach((c, i) => gsap.set(c, { z: [90, 140, 60][i], y: 30, opacity: 0 }));
    gsap.timeline({ scrollTrigger: { trigger: '#showcase', start: 'top top', end: 'bottom bottom', scrub: 0.8 } })
        .fromTo('#zoom-stage',
            { rotateX: 62, rotateZ: -6, scale: 0.6, yPercent: 30 },
            { rotateX: 0, rotateZ: 0, scale: 1, yPercent: 6, duration: 3, ease: 'power2.inOut' })
        .to('#showcase-intro', { opacity: 0, y: -50, duration: 0.8 }, 1.3)
        .to('.callout', { opacity: 1, y: 0, duration: 0.6, stagger: 0.35, ease: 'power3.out' }, 2.3)
        .to({}, { duration: 0.5 });

    // Products: horizontal pan on desktop, rising cards elsewhere
    const mm = gsap.matchMedia();
    const productsSection = $('#products');
    const track = $('#products-track');
    const products = $$('.product', track);
    mm.add('(min-width: 1024px)', () => {
        productsSection.classList.add('is-pan');
        const distance = () => track.scrollWidth - innerWidth;
        const pan = gsap.to(track, {
            x: () => -distance(),
            ease: 'none',
            scrollTrigger: {
                trigger: '.products__pin',
                pin: true,
                start: 'top top',
                end: () => '+=' + distance(),
                scrub: 1,
                invalidateOnRefresh: true,
                onUpdate: (self) => gsap.set('#products-meter', { scaleX: self.progress }),
            },
        });
        products.forEach((p, i) => {
            if (i === 0) return;
            gsap.fromTo(p, { rotateY: -18, scale: 0.88, opacity: 0.4, transformPerspective: 1600, transformOrigin: '0% 50%' }, {
                rotateY: 0, scale: 1, opacity: 1, ease: 'none',
                scrollTrigger: { trigger: p, containerAnimation: pan, start: 'left right', end: 'left 35%', scrub: true },
            });
        });
        return () => {
            productsSection.classList.remove('is-pan');
            gsap.set(track, { clearProps: 'transform' });
        };
    });
    mm.add('(max-width: 1023px)', () => {
        products.forEach((p) => {
            gsap.from(p, {
                y: 80, rotateX: 10, scale: 0.94, opacity: 0, transformPerspective: 1200, transformOrigin: '50% 0%',
                duration: 1.2, ease: 'expo.out',
                scrollTrigger: { trigger: p, start: 'top 88%', once: true },
            });
        });
    });

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
    function showRole(role) {
        gsap.to(yearState, { v: +role.dataset.year, duration: 0.8, ease: 'power3.out', onUpdate: () => { yearEl.textContent = Math.round(yearState.v); } });
        if (companyEl.textContent !== role.dataset.company) {
            gsap.fromTo(companyEl, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'expo.out' });
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

    // Skills sphere entrance
    gsap.from('#sphere', { scale: 0.8, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '#sphere', start: 'top 85%', once: true } });
    gsap.from('.panel:not([hidden]) li', {
        y: 24, opacity: 0, duration: 0.8, stagger: 0.06, ease: 'expo.out',
        scrollTrigger: { trigger: '.panel', start: 'top 88%', once: true },
    });

    // Marquee reacts to scroll speed and direction
    const loop = gsap.to(marqueeTrack, { xPercent: -50, duration: 32, ease: 'none', repeat: -1 });
    let marqueeDir = 1;
    ScrollTrigger.create({
        trigger: '.marquee',
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
            marqueeDir = self.direction;
            const boost = Math.min(Math.abs(self.getVelocity()) / 250, 5);
            gsap.to(loop, { timeScale: marqueeDir * (1 + boost), duration: 0.2, overwrite: true });
            gsap.to(loop, { timeScale: marqueeDir, duration: 1.2, delay: 0.2, ease: 'power2.out' });
        },
    });

    // Achievements: cards stack, earlier ones recede in 3D
    const cards = $$('.stack__card');
    cards.forEach((card, i) => {
        gsap.from($$('.stack__title, .stack__text', card), {
            y: 50, opacity: 0, duration: 1.1, stagger: 0.08, ease: 'expo.out',
            scrollTrigger: { trigger: card, start: 'top 80%', once: true },
        });
        const next = cards[i + 1];
        if (!next) return;
        const recede = { trigger: next, start: 'top bottom', end: 'top 25%', scrub: true };
        gsap.to(card, { scale: 0.9, rotateX: 8, transformPerspective: 1200, ease: 'none', scrollTrigger: recede });
        gsap.to($('.stack__shade', card), { opacity: 0.65, ease: 'none', scrollTrigger: { ...recede } });
    });

    // Writing: rules draw across
    $$('.essay__rule').forEach((rule) => {
        gsap.from(rule, { scaleX: 0, duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: rule, start: 'top 90%', once: true } });
    });

    // Contact headline: characters rise word by word
    const contactTitle = $('#contact-title');
    contactTitle.setAttribute('aria-label', contactTitle.textContent.trim());
    splitWords(contactTitle, true);
    $$('.wm', contactTitle).forEach((w) => w.setAttribute('aria-hidden', 'true'));
    gsap.from($$('.ch', contactTitle), {
        yPercent: 120,
        rotate: 8,
        duration: 1,
        stagger: 0.018,
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
        stagger: 0.05,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.footer', start: 'top 85%', once: true },
    });

    // Re-measure after fonts and images settle
    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener('load', () => ScrollTrigger.refresh());
})();

lucide.createIcons();

// Theme toggle
document.getElementById('theme-toggle').addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.theme = isDark ? 'dark' : 'light';
});

// Scroll reveal
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

// Animated counters
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.target, 10);
        const duration = 1600;
        const start = performance.now();
        const tick = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            el.textContent = Math.floor((1 - Math.pow(1 - progress, 3)) * target);
            if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        counterObserver.unobserve(el);
    });
}, { threshold: 0.5 });
document.querySelectorAll('.counter').forEach((el) => counterObserver.observe(el));

// 3D tilt on hover (desktop pointers only)
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.tilt').forEach((card) => {
        card.addEventListener('mousemove', (e) => {
            const r = card.getBoundingClientRect();
            const rx = ((e.clientY - r.top) / r.height - 0.5) * -6;
            const ry = ((e.clientX - r.left) / r.width - 0.5) * 6;
            card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-3px)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}

// Navbar background and scroll progress bar
const navbar = document.getElementById('navbar');
const progressBar = document.getElementById('scroll-progress');
window.addEventListener('scroll', () => {
    navbar.classList.toggle('nav-scrolled', window.scrollY > 40);
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    progressBar.style.width = (max > 0 ? (doc.scrollTop / max) * 100 : 0) + '%';
    if (window.scrollY < 200) {
        document.querySelectorAll('.nav-link.active').forEach((l) => l.classList.remove('active'));
    }
}, { passive: true });

// Rising particles in the hero
const particleHost = document.getElementById('particles');
for (let i = 0; i < 24; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    const size = Math.random() * 4 + 2;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (Math.random() * 12 + 10) + 's';
    p.style.animationDelay = (Math.random() * 12) + 's';
    p.style.opacity = Math.random() * 0.5 + 0.2;
    particleHost.appendChild(p);
}

// Cursor spotlight (desktop pointers only)
if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const spotlight = document.getElementById('spotlight');
    document.addEventListener('mousemove', (e) => {
        spotlight.style.setProperty('--mx', e.clientX + 'px');
        spotlight.style.setProperty('--my', e.clientY + 'px');
    }, { passive: true });
}

// Active nav link highlighting
const sectionIds = ['products', 'experience', 'skills', 'achievements', 'writing', 'contact'];
const navLinks = document.querySelectorAll('.nav-link');
const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
        });
    });
}, { rootMargin: '-40% 0px -55% 0px' });
sectionIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) sectionObserver.observe(el);
});

// Mobile menu
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
mobileMenuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => mobileMenu.classList.add('hidden'));
});

// Toast
function showNotification(message) {
    const toast = document.getElementById('notification');
    document.getElementById('notification-text').textContent = message;
    toast.classList.remove('translate-y-24', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-24', 'opacity-0'), 4000);
}

// Resume, hosted on Google Drive
function downloadResume() {
    window.open('https://drive.google.com/file/d/1mXUNZkbzMPZu5fDIAiXEY95HeJ7bUFOY/view?usp=sharing', '_blank');
    showNotification('Opening resume…');
}

// Contact form opens the visitor's email client, pre-filled
function handleContactSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('senderName').value;
    const email = document.getElementById('senderEmail').value;
    const subject = document.getElementById('emailSubject').value;
    const message = document.getElementById('emailMessage').value;
    const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
    window.location.href = `mailto:singh.03shashank@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    showNotification('Email client opened. Hit send to deliver.');
    e.target.reset();
}

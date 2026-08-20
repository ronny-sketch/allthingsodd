// Scroll-triggered fade-up for any element carrying `.reveal` — see styles/motion.css.
const io: IntersectionObserver | null =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('in');
              io?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15 },
      )
    : null;

document.querySelectorAll('.reveal').forEach((el) => io?.observe(el));

export {};

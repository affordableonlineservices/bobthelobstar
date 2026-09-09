/**
 * Affordable Computer Services AZ
 * Modern, optimized JavaScript - no dependencies
 */

// ========== Mobile Menu Toggle ==========
function initMenuToggle() {
  const menuBtn = document.getElementById('menuBtn');
  const menu = document.getElementById('menu');

  if (!menuBtn || !menu) return;

  // Toggle menu on button click
  menuBtn.addEventListener('click', () => {
    menu.classList.toggle('active');
  });

  // Close menu when clicking a link
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('active');
    });
  });

  // Close menu when clicking outside (on larger screens)
  document.addEventListener('click', (e) => {
    if (!e.target.closest('header')) {
      menu.classList.remove('active');
    }
  });
}

// ========== Scroll Arrow Button Handler ==========
function initScrollButton() {
  const scrollBtn = document.getElementById('scrollBtn');
  if (!scrollBtn) return;

  // Show/hide button on scroll
  window.addEventListener('scroll', debounce(() => {
    const scrollPosition = window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;
    const windowHeight = window.innerHeight;
    
    // Show button if scrolled down more than 300px
    if (scrollPosition > 300) {
      scrollBtn.classList.add('show');
    } else {
      scrollBtn.classList.remove('show');
    }
    
    // Check if near bottom (within 500px)
    const isNearBottom = (scrollPosition + windowHeight) >= (documentHeight - 500);
    
    if (isNearBottom) {
      scrollBtn.classList.add('at-top');
    } else {
      scrollBtn.classList.remove('at-top');
    }
  }, 100));

  // Handle button click
  scrollBtn.addEventListener('click', () => {
    const scrollPosition = window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;
    const windowHeight = window.innerHeight;
    const isNearBottom = (scrollPosition + windowHeight) >= (documentHeight - 500);

    if (isNearBottom) {
      // Scroll to top
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } else {
      // Scroll to bottom
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
      });
    }
  });
}

// ========== Form Handler ==========
function initFormHandler() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  // Initialize EmailJS
  emailjs.init({
    publicKey: 'BI-QbmaWFu1RIaSA2',
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const messageDiv = document.getElementById('formMessage');

    // Disable button and show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    messageDiv.style.display = 'none';

    try {
      // Send email via EmailJS
      const result = await emailjs.sendForm(
        'service_dnnwurd',
        'template_fdiazno',
        form
      );

      if (result.status === 200) {
        // Success
        messageDiv.className = 'alert alert-success';
        messageDiv.textContent = '✓ Message sent successfully! We\'ll get back to you shortly.';
        messageDiv.style.display = 'block';
        form.reset();
      }
    } catch (error) {
      // Error
      messageDiv.className = 'alert alert-error';
      messageDiv.textContent = '✗ Failed to send message. Please try again or call (480) 604-5005.';
      messageDiv.style.display = 'block';
      console.error('EmailJS Error:', error);
    } finally {
      // Reset button
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    }
  });
}

// ========== Video Error Handling ==========
function initVideoHandler() {
  const video = document.getElementById('heroVideo');
  if (!video) return;

  // Log when video starts playing
  video.addEventListener('play', () => {
    console.log('✓ Video is playing');
  });

  // Handle video loading errors
  video.addEventListener('error', (e) => {
    console.error('✗ Video failed to load:', e);
    console.error('Video source attempted:', video.src);
    // Add visual feedback
    video.style.display = 'none';
    console.warn('Video hidden - using fallback gradient background');
  });

  // Check if video file exists by testing the source
  const source = video.querySelector('source');
  if (source) {
    console.log('Video source path:', source.src);
    console.log('Full URL would be:', new URL(source.src, window.location.href).href);
  }
}

// ========== Analytics (Optional) ==========
function initAnalytics() {
  // Track page views and form submissions
  const trackEvent = (eventName, eventData = {}) => {
    if (typeof gtag === 'function') {
      gtag('event', eventName, eventData);
    }
  };

  // Track form submissions
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', () => {
      trackEvent('form_submission', { form_name: 'contact' });
    });
  }

  // Return for external use
  window.trackEvent = trackEvent;
}

// ========== Initialize Everything ==========
document.addEventListener('DOMContentLoaded', () => {
  initMenuToggle();
  initScrollButton();
  initFormHandler();
  initSmoothScroll();
  initAnalytics();
  initVideoHandler();
  
  console.log('✓ Affordable Computer Services initialized');
});

// ========== Helper: Add to Favorites (PWA-ready) ==========
function addToHome() {
  if ('beforeinstallprompt' in window) {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      const installButton = document.getElementById('installApp');
      if (installButton) {
        installButton.style.display = 'block';
        installButton.addEventListener('click', () => {
          e.prompt();
        });
      }
    });
  }
}

// ========== Utility: Check if Mobile ==========
function isMobile() {
  return window.innerWidth <= 768;
}

// ========== Utility: Debounce Function ==========
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

// Example: Responsive handler
window.addEventListener('resize', debounce(() => {
  if (!isMobile()) {
    document.getElementById('menu').classList.remove('active');
  }
}, 250));

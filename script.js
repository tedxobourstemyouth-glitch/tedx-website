﻿document.addEventListener('DOMContentLoaded', () => {
  // --- Preloader ---
  const preloader = document.getElementById('preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        preloader.classList.add('hidden');
      }, 600); // Small delay for cinematic feel
    });
      // Fallback: Hide preloader after 3 seconds if network is slow
      setTimeout(() => preloader.classList.add('hidden'), 3000);
  }

  // --- Reveal on scroll animations ---
  // This makes elements with class "reveal" fade in when you scroll to them
  const revealElements = document.querySelectorAll('.reveal');
  if (typeof IntersectionObserver !== 'undefined') {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
        }
      });
    }, {
      threshold: 0.1
    });

    revealElements.forEach(el => {
      observer.observe(el);
    });
  }

  // --- Nav scroll effect ---
  // This adds a "scrolled" class to the nav when you scroll down
  const nav = document.getElementById('nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    });
  }

  // --- Interactive Mouse Parallax (Hero Section) ---
  const heroCopy = document.getElementById('hero-copy-parallax');
  const heroPhoto = document.getElementById('hero-photo-parallax');
  if (heroCopy && heroPhoto) {
    let ticking = false;
    document.addEventListener('mousemove', (e) => {
<<<<<<< HEAD
      if (window.innerWidth <= 1100) return; // Disable effect on mobile to improve performance
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Calculate mouse position relative to center of screen (-1 to 1)
          const x = (e.clientX / window.innerWidth - 0.5);
          const y = (e.clientY / window.innerHeight - 0.5);
          heroCopy.style.transform = `translate(${x * 15}px, ${y * 15}px)`;
          heroPhoto.style.transform = `translate(${x * -20}px, ${y * -20}px)`;
          ticking = false;
        });
        ticking = true;
      }
=======
      // Calculate mouse position relative to center of screen (-1 to 1)
      const x = (e.clientX / window.innerWidth - 0.5);
      const y = (e.clientY / window.innerHeight - 0.5);

      // Apply subtle translations (opposite directions for depth)
      heroCopy.style.transform = `translate(${x * 15}px, ${y * 15}px)`;
      heroPhoto.style.transform = `translate(${x * -20}px, ${y * -20}px)`;
>>>>>>> bfc33ded4f6f67306f813e41a8d216bc70149855
    });
  }

  // --- Mobile Menu Toggle ---
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  const navItems = document.querySelectorAll('.nav-link');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      document.body.classList.toggle('nav-open');
    });
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        document.body.classList.remove('nav-open');
      });
    });
  }

  // --- Ticket Form Logic ---
  const ticketForm = document.getElementById('ticket-request-form'); // The form itself
  const fullscreenSuccess = document.getElementById('fullscreen-success'); // The new success overlay
  const newRequestBtnFullscreen = document.getElementById('new-request-button-fullscreen'); // The button on the new overlay

  if (ticketForm && fullscreenSuccess) {
    // --- Conditional Payment Fields Logic ---
    const paymentMethodSelect = document.getElementById('payment-method-select');
    const walletProviderField = document.getElementById('wallet-provider-field');
    const walletProviderSelect = document.getElementById('wallet-provider-select');

    if (paymentMethodSelect) {
      paymentMethodSelect.addEventListener('change', () => {
        if (paymentMethodSelect.value === 'Mobile Wallet') {
          walletProviderField.style.display = 'block';
          walletProviderSelect.required = true;
        } else {
          walletProviderField.style.display = 'none';
          walletProviderSelect.required = false;
          walletProviderSelect.value = '';
        }
      });
    }

    // --- Form Submission Handling ---
    const submitBtn = ticketForm.querySelector('.form-submit');

    ticketForm.addEventListener('submit', async (e) => {
      e.preventDefault(); // Prevent page refresh

      // Collect data from the form
      const formData = new FormData(ticketForm);

      // Show loading state then success message
      submitBtn.innerHTML = 'Submitting...';
      submitBtn.disabled = true;

      try {
<<<<<<< HEAD
        // Smart routing: Direct local testing to the correct server port
        const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
        const isWrongPort = window.location.port === '5500' || window.location.port === '5501';
        const submitUrl = (window.location.protocol === 'file:' || (isLocal && isWrongPort)) 
          ? 'http://localhost:3001/submit' 
          : '/submit';

        const response = await fetch(submitUrl, {
=======
        // Relative path: works on whatever domain the site is served from
        const response = await fetch('/submit', {
>>>>>>> bfc33ded4f6f67306f813e41a8d216bc70149855
          method: 'POST',
          body: formData
        });

        let responseText = await response.text();
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          throw new Error('Local server is down. Please open Terminal and run "node server.js" first!');
        }

        if (response.ok) {
          // Show the new fullscreen success screen
          fullscreenSuccess.hidden = false;
          document.body.classList.add('success-open');
        } else {
          alert('Error: ' + (responseData.message || 'Please try again.'));
        }
      } catch (error) {
        console.error('Error:', error);
        let userMessage = 'An unknown error occurred. Please try again.';
        if (error.message.includes('Failed to fetch')) {
            userMessage = 'Server connection failed! 😫\n\nPlease ensure:\n1. The server is running via Terminal command: node server.js\n2. No Antivirus is blocking the connection.';
        } else {
            userMessage = error.message;
        }
        alert(userMessage);
      } finally {
        submitBtn.innerHTML = 'Submit Request <span class="arr">↗</span>';
        // Fix freeze issue: Re-enable the button if an error occurs
        if (fullscreenSuccess.hidden) {
          submitBtn.disabled = false;
        }
      }
    });

    // Handle "Submit another request" button
    if (newRequestBtnFullscreen) {
      newRequestBtnFullscreen.addEventListener('click', () => {
        fullscreenSuccess.hidden = true;
        document.body.classList.remove('success-open');
        ticketForm.reset();
        submitBtn.disabled = false; // Re-enable the submit button
        // Reset conditional fields
        walletProviderField.style.display = 'none';
        walletProviderSelect.required = false;
      });
    }
  }
});
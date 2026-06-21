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
    const requiredValidation = {
      full_name: 'Full Name is required.',
      email: 'Email Address is required.',
      phone: 'Mobile Number is required.',
      payment_date: 'Payment Date is required.',
      transfer_source: 'Transfer Phone / Account No. is required.',
      payment_screenshot: 'Transfer Screenshot is required.'
    };

    const getField = (fieldName) => ticketForm.querySelector(`[name="${fieldName}"]`);
    const getErrorNode = (fieldName) => ticketForm.querySelector(`[data-error-for="${fieldName}"]`);
    const setFieldError = (fieldName, message) => {
      const field = getField(fieldName);
      const errorNode = getErrorNode(fieldName);
      if (field) field.classList.toggle('input-error', Boolean(message));
      if (errorNode) errorNode.textContent = message || '';
    };
    const clearFieldError = (fieldName) => setFieldError(fieldName, '');
    const clearAllFieldErrors = () => {
      Object.keys(requiredValidation).forEach(clearFieldError);
    };
    const validateRequiredFields = () => {
      const errors = {};
      Object.entries(requiredValidation).forEach(([fieldName, message]) => {
        const field = getField(fieldName);
        if (!field) return;
        const value = field.type === 'file' ? field.files.length : field.value.trim();
        if (!value) errors[fieldName] = message;
      });
      return errors;
    };

    // --- Conditional Payment Fields Logic ---
    const paymentMethodSelect = document.getElementById('payment-method-select');
    const walletProviderField = document.getElementById('wallet-provider-field');
    const walletProviderSelect = document.getElementById('wallet-provider-select');
    const quantityField = document.querySelector('[name="quantity"]');
    const promoCodeField = document.querySelector('[name="promo_code"]');
    const summaryQuantity = document.getElementById('summary-quantity');
    const summaryPayment = document.getElementById('summary-payment');
    const summaryTrack = document.getElementById('summary-track');
    const summaryStatus = document.getElementById('summary-status');
    const quantityPriceNote = document.getElementById('quantity-price-note');

    const updateTicketSummary = () => {
      if (!summaryQuantity || !summaryPayment || !summaryTrack || !summaryStatus) return;

      const quantity = Math.max(parseInt(quantityField?.value || '1', 10) || 1, 1);
      const paymentMethod = paymentMethodSelect?.value || 'Not selected';
      const hasPromo = Boolean((promoCodeField?.value || '').trim());
      const track = quantity > 1 && hasPromo ? 'Promo Group'
        : hasPromo ? 'Promo Regular'
        : 'Regular';
      const pricePerTicket = quantity > 1 && hasPromo ? 250 : hasPromo ? 300 : 350;
      const totalPrice = quantity * pricePerTicket;
      const pricingText = `${pricePerTicket} EGP each • ${totalPrice} EGP total`;
      const requiredFilled = Object.keys(requiredValidation).every((fieldName) => {
        const field = getField(fieldName);
        if (!field) return false;
        return field.type === 'file' ? field.files.length > 0 : Boolean(field.value.trim());
      });

      summaryQuantity.textContent = `${quantity} ${quantity === 1 ? 'ticket' : 'tickets'}`;
      summaryPayment.textContent = paymentMethod;
      summaryTrack.textContent = `${track} • ${pricingText}`;
      if (quantityPriceNote) {
        quantityPriceNote.textContent = `${pricingText}${track === 'Promo Group' ? ' • Promo code applied' : track === 'Promo Regular' ? ' • Promo code applied' : ''}`;
      }
      summaryStatus.textContent = requiredFilled
        ? 'Ready to submit'
        : 'Ready when required fields are complete';
    };

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
        updateTicketSummary();
      });
    }

    // --- Form Submission Handling ---
    const submitBtn = ticketForm.querySelector('.form-submit');

    Object.keys(requiredValidation).forEach((fieldName) => {
      const field = getField(fieldName);
      if (!field) return;
      const eventName = field.type === 'file' || field.tagName === 'SELECT' ? 'change' : 'input';
      field.addEventListener(eventName, () => {
        clearFieldError(fieldName);
        updateTicketSummary();
      });
    });

    [quantityField, promoCodeField, walletProviderSelect].forEach((field) => {
      if (!field) return;
      const eventName = field.tagName === 'SELECT' ? 'change' : 'input';
      field.addEventListener(eventName, updateTicketSummary);
    });

    updateTicketSummary();

    ticketForm.addEventListener('submit', async (e) => {
      e.preventDefault(); // Prevent page refresh
      clearAllFieldErrors();

      const clientErrors = validateRequiredFields();
      if (Object.keys(clientErrors).length > 0) {
        Object.entries(clientErrors).forEach(([fieldName, message]) => setFieldError(fieldName, message));
        const firstInvalidField = getField(Object.keys(clientErrors)[0]);
        if (firstInvalidField) firstInvalidField.focus();
        return;
      }

      // Collect data from the form
      const formData = new FormData(ticketForm);

      // Show loading state then success message
      submitBtn.innerHTML = 'Submitting...';
      submitBtn.disabled = true;

      try {
        // Smart routing: Direct local testing to the correct server port
        const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
        const isWrongPort = window.location.port === '5500' || window.location.port === '5501';
        const submitUrl = (window.location.protocol === 'file:' || (isLocal && isWrongPort)) 
          ? 'http://localhost:3001/submit' 
          : '/submit';

        const response = await fetch(submitUrl, {
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
          if (responseData.fieldErrors) {
            Object.entries(responseData.fieldErrors).forEach(([fieldName, message]) => setFieldError(fieldName, message));
            const firstInvalidField = getField(Object.keys(responseData.fieldErrors)[0]);
            if (firstInvalidField) firstInvalidField.focus();
          }
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
        clearAllFieldErrors();
        // Reset conditional fields
        walletProviderField.style.display = 'none';
        walletProviderSelect.required = false;
        updateTicketSummary();
      });
    }
  }
});

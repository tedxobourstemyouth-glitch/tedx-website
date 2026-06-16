﻿document.addEventListener('DOMContentLoaded', () => {
  // --- Preloader ---
  const preloader = document.getElementById('preloader');
  if (preloader) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        preloader.classList.add('hidden');
      }, 600); // Small delay for cinematic feel
    });
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
    document.addEventListener('mousemove', (e) => {
      // Calculate mouse position relative to center of screen (-1 to 1)
      const x = (e.clientX / window.innerWidth - 0.5);
      const y = (e.clientY / window.innerHeight - 0.5);

      // Apply subtle translations (opposite directions for depth)
      heroCopy.style.transform = `translate(${x * 15}px, ${y * 15}px)`;
      heroPhoto.style.transform = `translate(${x * -20}px, ${y * -20}px)`;
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
  const ticketForm = document.getElementById('ticket-request-form');
  if (ticketForm) {
    const isGroupCheckbox = document.getElementById('is-group-booking');
    const groupNameInput = document.getElementById('group-name');
    const groupMembersTextarea = document.getElementById('group-members');
    const groupMembersField = document.getElementById('group-members-field'); // The whole label/textarea block

    // Function to show/hide group fields based on checkbox
    const toggleGroupFields = () => {
      const isChecked = isGroupCheckbox.checked;

      // Enable/disable the inputs so they are only submitted if visible
      groupNameInput.disabled = !isChecked;
      groupMembersTextarea.disabled = !isChecked;

      // Show/hide the fields visually
      groupNameInput.closest('.form-field').style.display = isChecked ? 'inline-flex' : 'none';
      groupMembersField.style.display = isChecked ? 'block' : 'none';
    };

    // Set the initial state when the page loads
    toggleGroupFields();

    // Add event listener to run the function whenever the checkbox is clicked
    isGroupCheckbox.addEventListener('change', toggleGroupFields);

    // --- Form Submission Handling ---
    const successScreen = document.getElementById('ticket-success');
    const newRequestBtn = document.getElementById('new-request-button');
    const submitBtn = ticketForm.querySelector('.form-submit');

    ticketForm.addEventListener('submit', async (e) => {
      e.preventDefault(); // Prevent page refresh

      // Strict validation: check if required fields are empty
      if (!ticketForm.checkValidity()) {
        ticketForm.reportValidity();
        return;
      }

      // Collect data from the form
      const formData = new FormData(ticketForm);

      // Show loading state then success message
      submitBtn.innerHTML = 'Submitting...';
      submitBtn.disabled = true;

      try {
        // Send data directly to localhost so it works even if the file is opened directly
        const response = await fetch(`${process.env.BASE_URL}/submit`, {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          ticketForm.style.display = 'none';
          successScreen.hidden = false;
        } else {
          const errorData = await response.json();
          alert('Error: ' + (errorData.message || 'Please try again.'));
        }
      } catch (error) {
        console.error('Error:', error);
        alert('Could not connect to the server. Is the local server running?');
      } finally {
        submitBtn.innerHTML = 'Submit Request <span class="arr">↗</span>';
        submitBtn.disabled = false;
      }
    });

    // Handle "Submit another request" button
    if (newRequestBtn) {
      newRequestBtn.addEventListener('click', () => {
        successScreen.hidden = true;
        ticketForm.reset();
        ticketForm.style.display = 'block';
        toggleGroupFields(); // Reset group fields
      });
    }
  }
});
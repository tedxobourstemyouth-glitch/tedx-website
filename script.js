document.addEventListener('DOMContentLoaded', () => {
  const normalizePromoCode = (value) => String(value || '').trim();
  const isApprovedPromoCode = (value) => /^[A-Za-z]+\d{2}$/.test(normalizePromoCode(value));
  const languageStorageKey = 'tedx-language';
  const page = document.body?.dataset.page || 'home';
  let currentLang = localStorage.getItem(languageStorageKey) || 'en';

  if (!['en', 'ar'].includes(currentLang)) {
    currentLang = 'en';
  }

  const setText = (selector, value) => {
    if (value === undefined) return;
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value;
    });
  };

  const setHtml = (selector, value) => {
    if (value === undefined) return;
    document.querySelectorAll(selector).forEach((node) => {
      node.innerHTML = value;
    });
  };

  const setAttr = (selector, attribute, value) => {
    if (value === undefined) return;
    document.querySelectorAll(selector).forEach((node) => {
      node.setAttribute(attribute, value);
    });
  };

  const getRequiredValidation = (lang) => ({
    full_name: lang === 'ar' ? 'الاسم الكامل مطلوب.' : 'Full Name is required.',
    email: lang === 'ar' ? 'البريد الإلكتروني مطلوب.' : 'Email Address is required.',
    phone: lang === 'ar' ? 'رقم الموبايل مطلوب.' : 'Mobile Number is required.',
    payment_date: lang === 'ar' ? 'تاريخ الدفع مطلوب.' : 'Payment Date is required.',
    transfer_source: lang === 'ar' ? 'رقم التحويل أو رقم الحساب مطلوب.' : 'Transfer Phone / Account No. is required.',
    payment_screenshot: lang === 'ar' ? 'صورة التحويل مطلوبة.' : 'Transfer Screenshot is required.'
  });

  const uiText = {
    en: {
      submit: 'Submit Request <span class="arr">↗</span>',
      submitting: 'Submitting...',
      localServerDown: 'Local server is down. Please open Terminal and run "node server.js" first!',
      errorPrefix: 'Error: ',
      tryAgain: 'Please try again.',
      unknownError: 'An unknown error occurred. Please try again.',
      failedToFetch: 'Server connection failed!\n\nPlease ensure:\n1. The server is running via Terminal command: node server.js\n2. No Antivirus is blocking the connection.'
    },
    ar: {
      submit: 'إرسال الطلب <span class="arr">↗</span>',
      submitting: 'جاري الإرسال...',
      localServerDown: 'السيرفر المحلي متوقف. افتح التيرمنال وشغّل: node server.js',
      errorPrefix: 'خطأ: ',
      tryAgain: 'حاول مرة أخرى.',
      unknownError: 'حدث خطأ غير معروف. حاول مرة أخرى.',
      failedToFetch: 'فشل الاتصال بالسيرفر.\n\nتأكد من:\n1. تشغيل السيرفر من التيرمنال بالأمر: node server.js\n2. عدم وجود برنامج حماية يمنع الاتصال.'
    }
  };

  const applyLanguage = (lang) => {
    currentLang = lang;
    localStorage.setItem(languageStorageKey, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('lang-ar', lang === 'ar');

    document.querySelectorAll('.lang-btn').forEach((button) => {
      button.classList.toggle('active', button.dataset.lang === lang);
    });

    if (page === 'home') {
      if (lang === 'ar') {
        setText('.nav-links .nav-link:nth-child(1)', 'عن الفعالية');
        setText('.nav-links .nav-link:nth-child(2)', 'الثيم');
        setText('.nav-links .nav-link:nth-child(3)', 'المتحدثون');
        setText('.nav-links .nav-link:nth-child(4)', 'الفريق');
        setHtml('.nav-cta', 'احجز التذاكر <span class="arr">↗</span>');
        setHtml('.hero-eyebrow', '<span class="dot"></span> النسخة الثانية · <span>السادس من أكتوبر</span>');
        setHtml('.hero-copy h1', 'غيّر<br><span class="em">زاويتك.</span><br><span class="stroke">واكشف</span><br>المجهول.');
        setText('.hero-tag', 'نسخة TEDx Obour STEM Youth الثانية تستكشف المنظور كأداة. حين تغيّر موضعك، تظهر لك حقائق لم تكن تراها من قبل.');
        setText('#about .countdown-single-line', 'انتظروا التحول.');
        setText('.hero-countdown-unit:nth-child(1) span', 'يوم');
        setText('.hero-countdown-unit:nth-child(2) span', 'ساعة');
        setText('.hero-countdown-unit:nth-child(3) span', 'دقيقة');
        setText('.hero-countdown-unit:nth-child(4) span', 'ثانية');
        setText('#about .eyebrow', 'عن الفصل');
        setHtml('#about .display', 'مدرسة <span class="em">تصنع</span><br>TED الخاص بها.');
        setText('#about .lead', 'TEDx Obour STEM Youth هو فصل طلابي في نسخته الثانية، صُمم ليحوّل الفضول إلى مسرح حي للأفكار.');
        setText('#about .body', 'الفعالية تُبنى بالكامل بأيدي الطلاب: من اختيار الأفكار، والإنتاج، وتجهيز المتحدثين، والهوية البصرية، وحتى تجربة الحضور داخل القاعة.');
        setText('#about .stat:nth-child(1) .lab', 'منظم طلابي');
        setText('#about .stat:nth-child(2) .lab', 'مقعد في القاعة');
        setText('#theme .section-num', '§ 02 / الثيم');
        setText('#theme .eyebrow', 'ثيم هذا العام · النسخة الثانية');
        setHtml('.theme-main-copy .desc', 'فعالية عن المنظور كأداة. الفكرة المركزية: <em>مكان وقوفك يحدد ما تراه</em>، والتحرك بوعي يكشف حقائق كانت مخفية. كل حديث يطرح سؤالًا أساسيًا: ماذا يتغير عندما تغيّر موضعك؟');
        setText('.theme-tags .tag:nth-child(1)', 'المنظور');
        setText('.theme-tags .tag:nth-child(2)', 'النماذج الذهنية');
        setText('.theme-tags .tag:nth-child(3)', 'الملاحظة');
        setText('.theme-tags .tag:nth-child(4)', 'زوايا مختلفة');
        setText('.theme-tags .tag:nth-child(5)', 'حقائق مخفية');
        setText('.theme-focus-kicker', 'الفكرة الأساسية');
        setText('.theme-focus-card p', 'غيّر موضعك. غيّر ما تراه.');
        setText('#speakers .section-num', '§ 03 / المتحدثون');
        setText('#speakers .eyebrow', 'زوايا الرؤية');
        setHtml('#speakers .display', 'أصوات<br><span class="em">Parallax.</span>');
        setText('.speaker-section-copy', 'الأصوات التي تشكّل هذه النسخة.');
        setText('.speaker-stage-word', 'قائمة المتحدثين');
        document.querySelectorAll('.speaker .field').forEach((node) => { node.textContent = 'متحدث'; });
        setText('.m-question', 'ما الحقيقة التي لا تراها؟');
        setAttr('.m-question', 'data-text', 'ما الحقيقة التي لا تراها؟');
        setText('.m-answer', 'تلك التي ترفض أن تتحرك نحوها.');
        setText('.why .section-num', '§ 04 / لماذا تحضر');
        setText('.why .eyebrow', 'لماذا يجب أن تكون في القاعة');
        setHtml('.why .display', 'أربع أسباب<br>و<span class="em">شعور واحد</span>.');
        setText('#organizers .section-num', '§ 05 / الإدارة');
        setText('.board-mark', 'الفريق القيادي وراء النسخة الثانية');
        setHtml('#organizers .display', '<span class="board-line">مجلس</span><span class="board-line em">الإدارة.</span>');
        setText('.board-copy', 'ثلاثة قادة يقودون الفصل من أول التخطيط حتى لحظة الضوء.');
        document.querySelectorAll('.role-badge, .role-blank').forEach((node) => {
          if (node.textContent.includes('President')) node.textContent = 'الرئيس';
          if (node.textContent.includes('Vice President')) node.textContent = 'نائب الرئيس';
        });
      } else {
        setText('.nav-links .nav-link:nth-child(1)', 'About');
        setText('.nav-links .nav-link:nth-child(2)', 'Theme');
        setText('.nav-links .nav-link:nth-child(3)', 'Speakers');
        setText('.nav-links .nav-link:nth-child(4)', 'Team');
        setHtml('.nav-cta', 'Buy Tickets <span class="arr">↗</span>');
        setHtml('.hero-eyebrow', '<span class="dot"></span> Edition 02 · <span>6th of October</span>');
        setHtml('.hero-copy h1', 'Shift your<br><span class="em">perspective.</span><br><span class="stroke">Reveal the</span><br>Unseen.');
        setText('.hero-tag', 'The second TEDx Obour STEM Youth edition explores perspective as a tool. Moving deliberately reveals truths that were invisible before.');
        setText('#about .countdown-single-line', 'Await the shift.');
        setText('.hero-countdown-unit:nth-child(1) span', 'Days');
        setText('.hero-countdown-unit:nth-child(2) span', 'Hours');
        setText('.hero-countdown-unit:nth-child(3) span', 'Min');
        setText('.hero-countdown-unit:nth-child(4) span', 'Sec');
        setText('#about .eyebrow', 'About the Chapter');
        setHtml('#about .display', 'A school <span class="em">runs</span><br>its own TED.');
        setText('#about .lead', 'TEDx Obour STEM Youth is a second-edition, student-led chapter built to turn curiosity into a live public stage.');
        setText('#about .body', 'The event is shaped by students from the first idea to the final cue: curation, production, speaker preparation, visual identity, and the experience inside the room.');
        setText('#about .stat:nth-child(1) .lab', 'Student Organizers');
        setText('#about .stat:nth-child(2) .lab', 'Seats In The Room');
        setText('#theme .section-num', '§ 02 / THEME');
        setText('#theme .eyebrow', "This Year's Theme · Edition 02");
        setHtml('.theme-main-copy .desc', 'An event about perspective as a tool. The central argument: <em>where you stand determines what you see</em>, and moving deliberately reveals truths that were invisible before. Every talk asks one fundamental question: what changes when you shift position?');
        setText('.theme-tags .tag:nth-child(1)', 'Perspective');
        setText('.theme-tags .tag:nth-child(2)', 'Mental Models');
        setText('.theme-tags .tag:nth-child(3)', 'Observation');
        setText('.theme-tags .tag:nth-child(4)', 'Shifted Views');
        setText('.theme-tags .tag:nth-child(5)', 'Hidden Truths');
        setText('.theme-focus-kicker', 'Core Thought');
        setText('.theme-focus-card p', 'Change your position. Change what you see.');
        setText('#speakers .section-num', '§ 03 / SPEAKERS');
        setText('#speakers .eyebrow', 'The Vantage Points');
        setHtml('#speakers .display', 'Voices of<br><span class="em">Parallax.</span>');
        setText('.speaker-section-copy', 'The voices behind this edition.');
        setText('.speaker-stage-word', 'Live Lineup');
        document.querySelectorAll('.speaker .field').forEach((node) => { node.textContent = 'Speaker'; });
        setText('.m-question', 'WHAT TRUTH ARE YOU MISSING?');
        setAttr('.m-question', 'data-text', 'WHAT TRUTH ARE YOU MISSING?');
        setText('.m-answer', 'THE ONE YOU REFUSE TO WALK TOWARD.');
        setText('.why .section-num', '§ 04 / WHY');
        setText('.why .eyebrow', 'Why Be In The Room');
        setHtml('.why .display', 'Four reasons<br>and <span class="em">one feeling</span>.');
        setText('#organizers .section-num', '§ 05 / BOARD');
        setText('.board-mark', 'Leadership team behind the second edition');
        setHtml('#organizers .display', '<span class="board-line">Management</span><span class="board-line em">Board.</span>');
        setText('.board-copy', 'Three leads holding the standard of the chapter from planning table to spotlight.');
        document.querySelectorAll('.role-badge, .role-blank').forEach((node) => {
          if (node.textContent.includes('الرئيس')) node.textContent = 'President';
          if (node.textContent.includes('نائب الرئيس')) node.textContent = 'Vice President';
        });
      }
    }

    if (page === 'tickets') {
      if (lang === 'ar') {
        setText('.nav-links .nav-link:nth-child(1)', 'عن الفعالية');
        setText('.nav-links .nav-link:nth-child(2)', 'الثيم');
        setText('.nav-links .nav-link:nth-child(3)', 'المتحدثون');
        setText('.nav-links .nav-link:nth-child(4)', 'الفريق');
        setHtml('.nav-cta', 'العودة للرئيسية <span class="arr">↗</span>');
        setText('.ticket-copy .eyebrow', 'التذاكر');
        setHtml('.ticket-title', 'أكمل<br><span class="em">طلب التذكرة.</span>');
        setText('.ticket-lead', 'اختر التذكرة، أضف إثبات الدفع، ثم أرسل الطلب.');
        setHtml('.ticket-actions .btn', 'ابدأ الطلب <span class="arr">↓</span>');
        setText('.ticket-form-copy .eyebrow', 'خطوات الحجز');
        setText('.ticket-form-copy > p', 'أربع خطوات سريعة.');
        setText('.ticket-form-kicker', 'إرسال آمن');
        setText('.ticket-form-head-copy h3', 'بيانات الحضور والدفع');
        setText('.ticket-form-head-copy p', 'أدخل البيانات وارفع إثبات الدفع.');
        setText('.ticket-form-tag:nth-child(1)', 'الحقول المطلوبة فقط');
        setText('.ticket-form-tag:nth-child(2)', 'مراجعة يدوية');
        setText('.ticket-form-badge', 'يتم التحقق قبل الإرسال');
        setText('.attendee-grid .form-field:nth-child(1) > span', 'الاسم الكامل');
        setAttr('[name="full_name"]', 'placeholder', 'اكتب اسمك الكامل');
        setText('.attendee-grid .form-field:nth-child(2) > span', 'البريد الإلكتروني');
        setText('.attendee-grid .form-field:nth-child(3) > span', 'رقم الموبايل');
        setText('.attendee-grid .form-field:nth-child(4) > span', 'المحافظة');
        setAttr('[name="governorate"]', 'placeholder', 'محافظتك');
        setText('.attendee-grid .form-field:nth-child(5) > span', 'اسم المدرسة');
        setAttr('[name="school_name"]', 'placeholder', 'اسم المدرسة');
        setText('.attendee-grid .form-field:nth-child(6) > span', 'رقم التحويل / رقم الحساب');
        setAttr('[name="transfer_source"]', 'placeholder', 'الرقم أو الحساب الذي تم الدفع منه');
        setText('.pricing-grid .form-field:nth-child(1) > span', 'تاريخ الدفع');
        setText('.pricing-grid .form-field:nth-child(2) > span', 'وقت الدفع');
        setText('.pricing-grid .form-field:nth-child(3) > span', 'برومو كود (اختياري)');
        setAttr('[name="promo_code"]', 'placeholder', 'اكتب الكود لو موجود');
        setText('.pricing-grid .form-field:nth-child(4) > span', 'العدد');
        setText('.ticket-form-stage:nth-child(3) h4', 'بيانات الدفع');
        setText('.payment-account-card:nth-child(1) .payment-account-kicker', 'محفظة إلكترونية');
        setText('.payment-account-card:nth-child(2) .payment-account-kicker', 'إنستا باي');
        setText('.payment-grid .form-field:nth-child(1) > span', 'طريقة الدفع');
        setText('#payment-method-select option:nth-child(1)', 'اختر الطريقة...');
        setText('#payment-method-select option:nth-child(2)', 'محفظة إلكترونية');
        setText('#payment-method-select option:nth-child(3)', 'إنستا باي');
        setText('#wallet-provider-field > span', 'مزود المحفظة');
        setText('#wallet-provider-select option:nth-child(1)', 'اختر المزود...');
        setText('.form-check span', 'حجز جروب');
        setText('.ticket-form-side-note strong', 'دليل الرفع');
        setText('.ticket-form-side-note p', 'ارفع سكرين شوت واضح بالكامل يظهر المرسل وحالة نجاح التحويل.');
        setText('.upload-field > span', 'سكرين شوت التحويل');
        setText('.final-stage h4', 'ملاحظة أخيرة');
        setText('.final-stage .form-field > span', 'ملاحظات لفريق التنظيم');
        setAttr('[name="notes"]', 'placeholder', 'أي شيء يحتاج فريق التذاكر معرفته؟');
        setHtml('.form-submit', 'إرسال الطلب <span class="arr">↗</span>');
        setText('.ticket-info-card:nth-child(1) .eyebrow', 'قبل الإرسال');
        setText('.ticket-info-card:nth-child(2) .eyebrow', 'تحتاج مساعدة؟');
        setText('.ticket-help', 'تواصل مع الفريق مباشرة.');
        setText('.success-title', 'شكرًا لتسجيلك.');
        setText('.success-message', 'تم استلام طلبك. ستبدأ مراجعة الدفع خلال وقت قصير.');
        setText('.success-footer', 'نتطلع لرؤيتك في TEDx Obour STEM Youth.');
        setText('#new-request-button-fullscreen', 'إرسال طلب جديد');
      } else {
        setText('.nav-links .nav-link:nth-child(1)', 'About');
        setText('.nav-links .nav-link:nth-child(2)', 'Theme');
        setText('.nav-links .nav-link:nth-child(3)', 'Speakers');
        setText('.nav-links .nav-link:nth-child(4)', 'Team');
        setHtml('.nav-cta', 'Back Home <span class="arr">↗</span>');
        setText('.ticket-copy .eyebrow', 'Ticketing');
        setHtml('.ticket-title', 'Complete your<br><span class="em">ticket request.</span>');
        setText('.ticket-lead', 'Choose your ticket, add payment proof, and submit.');
        setHtml('.ticket-actions .btn', 'Start Request <span class="arr">↓</span>');
        setText('.ticket-form-copy .eyebrow', 'Booking Flow');
        setText('.ticket-form-copy > p', 'Four quick steps.');
        setText('.ticket-form-kicker', 'Secure Submission');
        setText('.ticket-form-head-copy h3', 'Attendee & payment details');
        setText('.ticket-form-head-copy p', 'Enter details and upload proof.');
        setText('.ticket-form-tag:nth-child(1)', 'Required fields only');
        setText('.ticket-form-tag:nth-child(2)', 'Manual review');
        setText('.ticket-form-badge', 'Validated before submit');
        setText('.attendee-grid .form-field:nth-child(1) > span', 'Full Name');
        setAttr('[name="full_name"]', 'placeholder', 'Your full name');
        setText('.attendee-grid .form-field:nth-child(2) > span', 'Email Address');
        setText('.attendee-grid .form-field:nth-child(3) > span', 'Mobile Number');
        setText('.attendee-grid .form-field:nth-child(4) > span', 'Governorate');
        setAttr('[name="governorate"]', 'placeholder', 'Your governorate (e.g. Cairo, Giza)');
        setText('.attendee-grid .form-field:nth-child(5) > span', 'School Name');
        setAttr('[name="school_name"]', 'placeholder', 'Your school name');
        setText('.attendee-grid .form-field:nth-child(6) > span', 'Transfer Phone / Account No.');
        setAttr('[name="transfer_source"]', 'placeholder', 'The number or account you paid from');
        setText('.pricing-grid .form-field:nth-child(1) > span', 'Payment Date');
        setText('.pricing-grid .form-field:nth-child(2) > span', 'Payment Time');
        setText('.pricing-grid .form-field:nth-child(3) > span', 'Promo Code (Optional)');
        setAttr('[name="promo_code"]', 'placeholder', 'Enter your code for discount');
        setText('.pricing-grid .form-field:nth-child(4) > span', 'Quantity');
        setText('.ticket-form-stage:nth-child(3) h4', 'Payment details');
        setText('.payment-account-card:nth-child(1) .payment-account-kicker', 'Mobile Wallet');
        setText('.payment-account-card:nth-child(2) .payment-account-kicker', 'InstaPay');
        setText('.payment-grid .form-field:nth-child(1) > span', 'Payment Method');
        setText('#payment-method-select option:nth-child(1)', 'Select method...');
        setText('#payment-method-select option:nth-child(2)', 'Mobile Wallet');
        setText('#payment-method-select option:nth-child(3)', 'InstaPay');
        setText('#wallet-provider-field > span', 'Wallet Provider');
        setText('#wallet-provider-select option:nth-child(1)', 'Select provider...');
        setText('.form-check span', 'Group booking');
        setText('.ticket-form-side-note strong', 'Upload guide');
        setText('.ticket-form-side-note p', 'Use a clear full screenshot that shows sender and success state.');
        setText('.upload-field > span', 'Transfer Screenshot');
        setText('.final-stage h4', 'Final note');
        setText('.final-stage .form-field > span', 'Notes for the Team');
        setAttr('[name="notes"]', 'placeholder', 'Anything the ticket team should know?');
        setHtml('.form-submit', 'Submit Request <span class="arr">↗</span>');
        setText('.ticket-info-card:nth-child(1) .eyebrow', 'Before You Submit');
        setText('.ticket-info-card:nth-child(2) .eyebrow', 'Need Help?');
        setText('.ticket-help', 'Contact the chapter directly.');
        setText('.success-title', 'Thank you for registering.');
        setText('.success-message', 'Your request has been received. Payment review will start shortly.');
        setText('.success-footer', 'We look forward to seeing you at TEDx Obour STEM Youth.');
        setText('#new-request-button-fullscreen', 'Submit Another Request');
      }
    }
  };

  document.querySelectorAll('.lang-btn').forEach((button) => {
    button.addEventListener('click', () => {
      applyLanguage(button.dataset.lang || 'en');
    });
  });

  applyLanguage(currentLang);

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

  // --- Event Countdown ---
  const countdownRoots = document.querySelectorAll('[data-countdown]');
  countdownRoots.forEach((countdownRoot) => {
    const daysNode = countdownRoot.querySelector('[data-countdown-days]');
    const hoursNode = countdownRoot.querySelector('[data-countdown-hours]');
    const minutesNode = countdownRoot.querySelector('[data-countdown-minutes]');
    const secondsNode = countdownRoot.querySelector('[data-countdown-seconds]');
    const countdownTarget = new Date(countdownRoot.getAttribute('data-countdown'));
    const countdownUnits = {
      days: daysNode,
      hours: hoursNode,
      minutes: minutesNode,
      seconds: secondsNode
    };
    const previousValues = {};

    const updateUnit = (key, value) => {
      const node = countdownUnits[key];
      if (!node) return;

      const formattedValue = String(value).padStart(2, '0');
      if (previousValues[key] !== formattedValue) {
        node.textContent = formattedValue;
        previousValues[key] = formattedValue;
        const unitCard = node.closest('.hero-countdown-unit');
        if (unitCard) {
          unitCard.classList.remove('is-changing');
          window.requestAnimationFrame(() => {
            unitCard.classList.add('is-changing');
            window.setTimeout(() => unitCard.classList.remove('is-changing'), 420);
          });
        }
      }
    };

    const renderCountdown = () => {
      const remainingMs = countdownTarget.getTime() - Date.now();
      if (remainingMs <= 0) {
        updateUnit('days', 0);
        updateUnit('hours', 0);
        updateUnit('minutes', 0);
        updateUnit('seconds', 0);
        return;
      }

      const totalSeconds = Math.floor(remainingMs / 1000);
      const days = Math.floor(totalSeconds / (60 * 60 * 24));
      const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
      const seconds = totalSeconds % 60;

      updateUnit('days', days);
      updateUnit('hours', hours);
      updateUnit('minutes', minutes);
      updateUnit('seconds', seconds);
    };

    if (window.innerWidth > 1100) {
      let countdownTicking = false;
      countdownRoot.addEventListener('mousemove', (event) => {
        if (countdownTicking) return;
        countdownTicking = true;
        window.requestAnimationFrame(() => {
          const bounds = countdownRoot.getBoundingClientRect();
          const x = ((event.clientX - bounds.left) / bounds.width) - 0.5;
          const y = ((event.clientY - bounds.top) / bounds.height) - 0.5;
          countdownRoot.style.setProperty('--countdown-parallax-x', `${x * 14}px`);
          countdownRoot.style.setProperty('--countdown-parallax-y', `${y * 14}px`);
          countdownTicking = false;
        });
      });
      countdownRoot.addEventListener('mouseleave', () => {
        countdownRoot.style.setProperty('--countdown-parallax-x', '0px');
        countdownRoot.style.setProperty('--countdown-parallax-y', '0px');
      });
    }

    renderCountdown();
    window.setInterval(renderCountdown, secondsNode ? 1000 : 30000);
  });

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
    const getActiveRequiredValidation = () => getRequiredValidation(currentLang);

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
      Object.keys(getActiveRequiredValidation()).forEach(clearFieldError);
    };
    const validateRequiredFields = () => {
      const errors = {};
      Object.entries(getActiveRequiredValidation()).forEach(([fieldName, message]) => {
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
      const promoCode = normalizePromoCode(promoCodeField?.value || '');
      const hasValidPromo = isApprovedPromoCode(promoCode);
      const isGoldPromo = hasValidPromo && quantity >= 5;
      const track = isGoldPromo
        ? 'TEDX Gold'
        : hasValidPromo
          ? 'Promo Regular'
          : 'Regular';
      const pricePerTicket = isGoldPromo ? 250 : hasValidPromo ? 300 : 350;
      const totalPrice = quantity * pricePerTicket;
      const pricingText = `${pricePerTicket} EGP each • ${totalPrice} EGP total`;
      const requiredFilled = Object.keys(getActiveRequiredValidation()).every((fieldName) => {
        const field = getField(fieldName);
        if (!field) return false;
        return field.type === 'file' ? field.files.length > 0 : Boolean(field.value.trim());
      });

      summaryQuantity.textContent = `${quantity} ${quantity === 1 ? 'ticket' : 'tickets'}`;
      summaryPayment.textContent = paymentMethod;
      summaryTrack.textContent = `${track} • ${pricingText}`;
      if (quantityPriceNote) {
        const promoNote = isGoldPromo
          ? ' • Group of 5 offer applied'
          : hasValidPromo
            ? ' • Promo code applied'
            : '';
        quantityPriceNote.textContent = `${pricingText}${promoNote}`;
      }
      summaryStatus.textContent = requiredFilled
        ? currentLang === 'ar' ? 'جاهز للإرسال' : 'Ready to submit'
        : currentLang === 'ar' ? 'جاهز عند اكتمال الحقول المطلوبة' : 'Ready when required fields are complete';
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

    Object.keys(getActiveRequiredValidation()).forEach((fieldName) => {
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
        submitBtn.innerHTML = uiText[currentLang].submitting;
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
          throw new Error(uiText[currentLang].localServerDown);
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
          alert(uiText[currentLang].errorPrefix + (responseData.message || uiText[currentLang].tryAgain));
        }
      } catch (error) {
        console.error('Error:', error);
        let userMessage = uiText[currentLang].unknownError;
        if (error.message.includes('Failed to fetch')) {
            userMessage = uiText[currentLang].failedToFetch;
        } else {
            userMessage = error.message;
        }
        alert(userMessage);
      } finally {
        submitBtn.innerHTML = uiText[currentLang].submit;
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

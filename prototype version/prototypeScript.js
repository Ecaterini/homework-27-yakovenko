// Prototype version of the slider component
(function () {
  function SliderProto(options) {
    options = options || {};
    this.sliderEl        = document.querySelector('.slider');           // section.slider
    this.sliderContainer = document.querySelector('.slider__wrapper');  // visible viewport
    this.sliderTrack     = document.querySelector('.slider__track');    // track
    this.slides          = Array.prototype.slice.call(document.querySelectorAll('.slide'));

    this.prevBtn   = document.querySelector('.slider__btn--prev') || null;
    this.nextBtn   = document.querySelector('.slider__btn--next') || null;
    this.indicatorsContainer = null;
    this.pauseBtn  = null;
    this.playIcon  = null;
    this.pauseIcon = null;
    this.controlText = null;

    this.autoPlayDelay = options.autoPlayDelay || 3000;
    this.pauseOnHover  = typeof options.pauseOnHover !== 'undefined' ? options.pauseOnHover : true;

    // State
    this.currentSlide  = 0;
    this.totalSlides   = this.slides.length;
    this.isAutoPlaying = true;
    this.autoPlayTimer = null;

    // Drag state
    this.isDragging       = false;
    this.startPos         = 0;
    this.currentTranslate = 0; // in px now
    this.prevTranslate    = 0; // in px now
    this.animationID      = 0;
    this.currentIndex     = 0;

    // bound handlers
    var self = this;
    this._onPrev = function () { self.prevSlide(); };
    this._onNext = function () { self.nextSlide(); };
    this._onPauseClick = function () { self.toggleAutoPlay(); };
    this._onKey = function (e) { self.handleKeyboard(e); };
    this._touchStart = function (e) { self.touchStart(e); };
    this._touchMove  = function (e) { self.touchMove(e); };
    this._touchEnd   = function () { self.touchEnd(); };
    this._onMouseLeave = function () { if (self.isAutoPlaying) self.startAutoPlay(); };

    this.init();
  }

  // init
  SliderProto.prototype.init = function () {
    if (!this.sliderTrack || this.slides.length === 0) return;


    this.sliderTrack.style.willChange = 'transform';

  // создаем UI элементы(индикаторы, кнопки управления)
    this.createUI();

    // инициализируем слайдер
    this.updateSlider(); //вычислит ширину и установит преобразование в пикселях
    this.addEventListeners();
    this.startAutoPlay();

    var self = this;
    window.addEventListener('resize', function () { self.setPositionByIndex(); });
  };

  // создаем индикаторы и контролс динамично
  SliderProto.prototype.createUI = function () {
    var parent = this.sliderEl || this.sliderContainer || document.body;

    if (!this.prevBtn) {
      this.prevBtn = document.createElement('button');
      this.prevBtn.className = 'slider__btn slider__btn--prev';
      this.prevBtn.setAttribute('aria-label', 'Previous slide');
      this.prevBtn.innerText = '‹';
      parent.appendChild(this.prevBtn);
    }
    if (!this.nextBtn) {
      this.nextBtn = document.createElement('button');
      this.nextBtn.className = 'slider__btn slider__btn--next';
      this.nextBtn.setAttribute('aria-label', 'Next slide');
      this.nextBtn.innerText = '›';
      parent.appendChild(this.nextBtn);
    }

    var existingIndicators = parent.querySelector('.indicators');
    if (existingIndicators) existingIndicators.parentNode.removeChild(existingIndicators);

    this.indicatorsContainer = document.createElement('div');
    this.indicatorsContainer.className = 'indicators';

    for (var i = 0; i < this.totalSlides; i++) {
      var dot = document.createElement('span');
      dot.className = 'indicator';
      dot.setAttribute('data-slide', String(i));
      dot.setAttribute('role', 'button');
      dot.setAttribute('tabindex', '0');
      dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
      if (i === this.currentSlide) dot.classList.add('active');
      this.indicatorsContainer.appendChild(dot);
    }

    if (this.sliderContainer && this.sliderContainer.parentNode) {
      this.sliderContainer.parentNode.insertBefore(this.indicatorsContainer, this.sliderContainer.nextSibling);
    } else {
      parent.appendChild(this.indicatorsContainer);
    }

    var existingControls = parent.querySelector('.controls');
    if (existingControls) existingControls.parentNode.removeChild(existingControls);

    var controls = document.createElement('div');
    controls.className = 'controls';

    var pauseBtn = document.createElement('button');
    pauseBtn.className = 'control-btn pause-btn';
    pauseBtn.setAttribute('aria-label', 'Pause/Resume autoplay');
    pauseBtn.setAttribute('type', 'button');

    var playSvg = '<svg class="play-icon hidden" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    var pauseSvg = '<svg class="pause-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
    var textSpan = document.createElement('span');
    textSpan.className = 'control-text';
    textSpan.textContent = 'Pause';

    pauseBtn.innerHTML = playSvg + pauseSvg;
    pauseBtn.appendChild(textSpan);

    controls.appendChild(pauseBtn);

    if (this.indicatorsContainer && this.indicatorsContainer.parentNode) {
      this.indicatorsContainer.parentNode.insertBefore(controls, this.indicatorsContainer.nextSibling);
    } else {
      parent.appendChild(controls);
    }

    this.pauseBtn = pauseBtn;
    this.playIcon = this.pauseBtn.querySelector('.play-icon');
    this.pauseIcon = this.pauseBtn.querySelector('.pause-icon');
    this.controlText = textSpan;
  };

  // добавляем обработчики событий(слушатели)
  SliderProto.prototype.addEventListeners = function () {
    if (this.prevBtn) this.prevBtn.addEventListener('click', this._onPrev);
    if (this.nextBtn) this.nextBtn.addEventListener('click', this._onNext);
    if (this.pauseBtn) this.pauseBtn.addEventListener('click', this._onPauseClick);

    var dots = Array.prototype.slice.call(this.indicatorsContainer.querySelectorAll('.indicator'));
    var self = this;
    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { self.goToSlide(i); });
      dot.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          self.goToSlide(i);
        }
      });
    });

    document.addEventListener('keydown', this._onKey);

    if (this.sliderContainer) {
      this.sliderContainer.addEventListener('touchstart', this._touchStart, {passive: true});
      this.sliderContainer.addEventListener('touchmove', this._touchMove, {passive: true});
      this.sliderContainer.addEventListener('touchend', this._touchEnd);

      this.sliderContainer.addEventListener('mousedown', this._touchStart);
      this.sliderContainer.addEventListener('mousemove', this._touchMove);
      this.sliderContainer.addEventListener('mouseup', this._touchEnd);
      this.sliderContainer.addEventListener('mouseleave', this._touchEnd);

      if (this.pauseOnHover) {
        var self2 = this;
        this.sliderContainer.addEventListener('mouseenter', function () { if (self2.isAutoPlaying) self2.pauseAutoPlay(); });
        this.sliderContainer.addEventListener('mouseleave', this._onMouseLeave);
      }
    }
  };

  // навигация слайдера
  SliderProto.prototype.nextSlide = function () {
    this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
    this.updateSlider();
    this.resetAutoPlay();
  };

  SliderProto.prototype.prevSlide = function () {
    this.currentSlide = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
    this.updateSlider();
    this.resetAutoPlay();
  };

  SliderProto.prototype.goToSlide = function (index) {
    this.currentSlide = Math.max(0, Math.min(index, this.totalSlides - 1));
    this.updateSlider();
    this.resetAutoPlay();
  };

  SliderProto.prototype.updateSlider = function () {
    var cw = this.sliderContainer ? this.sliderContainer.offsetWidth : 0;
    var translateXpx = -this.currentSlide * cw;

    this.sliderTrack.style.transition = 'transform 0.45s ease';
    this.sliderTrack.style.transform = 'translateX(' + translateXpx + 'px)';

    for (var i = 0; i < this.slides.length; i++) {
      if (i === this.currentSlide) this.slides[i].classList.add('active');
      else this.slides[i].classList.remove('active');
    }

    var dots = this.indicatorsContainer ? Array.prototype.slice.call(this.indicatorsContainer.querySelectorAll('.indicator')) : [];
    for (var j = 0; j < dots.length; j++) {
      if (j === this.currentSlide) dots[j].classList.add('active');
      else dots[j].classList.remove('active');
    }

    // sync drag state in px
    this.prevTranslate = translateXpx;
    this.currentTranslate = this.prevTranslate;
    this.currentIndex = this.currentSlide;
  };

  // автоплей
  SliderProto.prototype.startAutoPlay = function () {
    this.clearAutoPlay();
    if (!this.isAutoPlaying) return;
    var self = this;
    this.autoPlayTimer = setInterval(function () { self.nextSlide(); }, this.autoPlayDelay);

    if (this.playIcon && this.pauseIcon) {
      this.playIcon.classList.add('hidden');
      this.pauseIcon.classList.remove('hidden');
      if (this.controlText) this.controlText.textContent = 'Pause';
    }
  };

  SliderProto.prototype.pauseAutoPlay = function () {
    this.clearAutoPlay();
    if (this.playIcon && this.pauseIcon) {
      this.playIcon.classList.remove('hidden');
      this.pauseIcon.classList.add('hidden');
      if (this.controlText) this.controlText.textContent = 'Resume';
    }
  };

  SliderProto.prototype.clearAutoPlay = function () {
    if (this.autoPlayTimer) {
      clearInterval(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
  };

  SliderProto.prototype.toggleAutoPlay = function () {
    this.isAutoPlaying = !this.isAutoPlaying;
    if (this.isAutoPlaying) this.startAutoPlay();
    else this.pauseAutoPlay();
  };

  SliderProto.prototype.resetAutoPlay = function () {
    if (!this.isAutoPlaying) return;
    this.pauseAutoPlay();
    this.startAutoPlay();
  };

  SliderProto.prototype.handleKeyboard = function (e) {
    if (e.key === 'ArrowLeft') this.prevSlide();
    if (e.key === 'ArrowRight') this.nextSlide();
  };

  SliderProto.prototype.getPositionX = function (event) {
    if (event.type && event.type.indexOf('mouse') === 0) return event.pageX;
    if (event.touches && event.touches[0]) return event.touches[0].clientX;
    if (event.changedTouches && event.changedTouches[0]) return event.changedTouches[0].clientX;
    return 0;
  };

  SliderProto.prototype.touchStart = function (event) {
    if (event.target && event.target.closest &&
      (event.target.closest('.slider__btn') ||
       event.target.closest('.control-btn') ||
       event.target.closest('.indicator'))) {
      return;
    }
    this.isDragging = true;
    this.startPos = this.getPositionX(event);
    var self = this;
    this.animationID = requestAnimationFrame(function () { self.animation(); });
    this.sliderTrack.classList.add('no-transition');
    if (this.isAutoPlaying) this.pauseAutoPlay();
  };

  SliderProto.prototype.touchMove = function (event) {
    if (!this.isDragging) return;
    var currentPosition = this.getPositionX(event);

    this.currentTranslate = this.prevTranslate + (currentPosition - this.startPos);
  };

  SliderProto.prototype.touchEnd = function () {
    if (!this.isDragging) return;
    this.isDragging = false;
    cancelAnimationFrame(this.animationID);

    var movedBy = this.currentTranslate - this.prevTranslate;
    var cw = this.sliderContainer ? this.sliderContainer.offsetWidth : 0;
    var threshold = cw * 0.2;

    if (movedBy < -threshold && this.currentIndex < this.totalSlides - 1) this.currentIndex += 1;
    if (movedBy > threshold && this.currentIndex > 0) this.currentIndex -= 1;

    this.currentSlide = this.currentIndex;
    this.setPositionByIndex();

    this.sliderTrack.classList.remove('no-transition');
    if (this.isAutoPlaying) this.startAutoPlay();
  };

  SliderProto.prototype.animation = function () {
    if (!this.isDragging) return;
    this.setSliderPosition();
    var self = this;
    this.animationID = requestAnimationFrame(function () { self.animation(); });
  };

  // set transform using px (currentTranslate already in px)
  SliderProto.prototype.setSliderPosition = function () {
    this.sliderTrack.style.transform = 'translateX(' + this.currentTranslate + 'px)';
  };

  SliderProto.prototype.setPositionByIndex = function () {
    var cw = this.sliderContainer ? this.sliderContainer.offsetWidth || 0 : 0;
    this.currentTranslate = -this.currentIndex * cw;
    this.prevTranslate = this.currentTranslate;
    this.updateSlider();
  };

  // init on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function () {
    window.sliderInstancePrototype = new SliderProto({ autoPlayDelay: 3000, pauseOnHover: true });
  });
})();

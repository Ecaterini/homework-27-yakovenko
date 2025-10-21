// Class version of the slider component
class Slider {
  constructor(options = {}) {
    // DOM elements
    this.sliderEl = document.querySelector('.slider');
    this.sliderContainer = document.querySelector('.slider__wrapper');
    this.sliderTrack = document.querySelector('.slider__track');
    this.slides = Array.from(document.querySelectorAll('.slide'));

    //элементы управления
    this.prevBtn = document.querySelector('.slider__btn--prev') || null;
    this.nextBtn = document.querySelector('.slider__btn--next') || null;
    this.indicatorsContainer = null;
    this.pauseBtn = null;
    this.playIcon = null;
    this.pauseIcon = null;
    this.controlText = null;

    // options
    this.autoPlayDelay = options.autoPlayDelay || 3000;
    this.pauseOnHover = options.pauseOnHover !== undefined ? options.pauseOnHover : true;

    // state
    this.currentSlide = 0;
    this.totalSlides = this.slides.length;
    this.isAutoPlaying = true;
    this.autoPlayTimer = null;

    // drag state (in px)
    this.isDragging = false;
    this.startPos = 0;
    this.currentTranslate = 0;
    this.prevTranslate = 0;
    this.animationID = 0;
    this.currentIndex = 0;

    // bound handlers
    this._onPrev = this.prevSlide.bind(this);
    this._onNext = this.nextSlide.bind(this);
    this._onPause = this.toggleAutoPlay.bind(this);
    this._onKey = this.handleKeyboard.bind(this);
    this._ts = this.touchStart.bind(this);
    this._tm = this.touchMove.bind(this);
    this._te = this.touchEnd.bind(this);
    this._onMouseLeave = this._onMouseLeaveHandler.bind(this);

    this.init();
  }

  init() {
    if (!this.sliderTrack || this.totalSlides === 0) return;

    // для плавной анимации
    this.sliderTrack.style.willChange = 'transform';

    //  // создаем UI элементы(индикаторы, кнопки управления)
    this.createUI();

    // инициализируем слайдер
    this.updateSlider(); // use px transforms
    this.addEventListeners();
    this.startAutoPlay();

    window.addEventListener('resize', () => this.setPositionByIndex());
  }

  createUI() {
    const parent = this.sliderEl || this.sliderContainer || document.body;

    // создаем индикаторы и контролс динамично
    if (!this.prevBtn) {
      this.prevBtn = document.createElement('button');
      this.prevBtn.className = 'slider__btn slider__btn--prev';
      this.prevBtn.setAttribute('aria-label', 'Previous slide');
      this.prevBtn.type = 'button';
      this.prevBtn.innerText = '‹';
      parent.appendChild(this.prevBtn);
    }
    if (!this.nextBtn) {
      this.nextBtn = document.createElement('button');
      this.nextBtn.className = 'slider__btn slider__btn--next';
      this.nextBtn.setAttribute('aria-label', 'Next slide');
      this.nextBtn.type = 'button';
      this.nextBtn.innerText = '›';
      parent.appendChild(this.nextBtn);
    }

    // удаляем существующие индикаторы, если есть
    const existingIndicators = parent.querySelector('.indicators');
    if (existingIndicators) existingIndicators.remove();

    this.indicatorsContainer = document.createElement('div');
    this.indicatorsContainer.className = 'indicators';

    for (let i = 0; i < this.totalSlides; i++) {
      const dot = document.createElement('span');
      dot.className = 'indicator';
      dot.setAttribute('data-slide', String(i));
      dot.setAttribute('role', 'button');
      dot.setAttribute('tabindex', '0');
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      if (i === this.currentSlide) dot.classList.add('active');
      this.indicatorsContainer.appendChild(dot);
    }

    // вставляем индикаторы после слайдера
    if (this.sliderContainer && this.sliderContainer.parentNode) {
      this.sliderContainer.parentNode.insertBefore(this.indicatorsContainer, this.sliderContainer.nextSibling);
    } else {
      parent.appendChild(this.indicatorsContainer);
    }

    // controls:удаляем существующие контролы, если есть
    const existingControls = parent.querySelector('.controls');
    if (existingControls) existingControls.remove();

    const controls = document.createElement('div');
    controls.className = 'controls';

    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'control-btn pause-btn';
    pauseBtn.setAttribute('aria-label', 'Pause/Resume autoplay');
    pauseBtn.type = 'button';

    const playSvg = '<svg class="play-icon hidden" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
    const pauseSvg = '<svg class="pause-icon" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
    const textSpan = document.createElement('span');
    textSpan.className = 'control-text';
    textSpan.textContent = 'Pause';

    pauseBtn.innerHTML = playSvg + pauseSvg;
    pauseBtn.appendChild(textSpan);
    controls.appendChild(pauseBtn);

    // кладем контролы после индикаторов
    if (this.indicatorsContainer && this.indicatorsContainer.parentNode) {
      this.indicatorsContainer.parentNode.insertBefore(controls, this.indicatorsContainer.nextSibling);
    } else {
      parent.appendChild(controls);
    }


    this.pauseBtn = pauseBtn;
    this.playIcon = this.pauseBtn.querySelector('.play-icon');
    this.pauseIcon = this.pauseBtn.querySelector('.pause-icon');
    this.controlText = textSpan;
  }

  addEventListeners() {
    if (this.prevBtn) this.prevBtn.addEventListener('click', this._onPrev);
    if (this.nextBtn) this.nextBtn.addEventListener('click', this._onNext);
    if (this.pauseBtn) this.pauseBtn.addEventListener('click', this._onPause);

    // indicators events
    const dots = Array.from(this.indicatorsContainer.querySelectorAll('.indicator'));
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => this.goToSlide(i));
      dot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.goToSlide(i);
        }
      });
    });

    document.addEventListener('keydown', this._onKey);

    if (!this.sliderContainer) return;

    // touch/mouse
    this.sliderContainer.addEventListener('touchstart', this._ts, { passive: true });
    this.sliderContainer.addEventListener('touchmove', this._tm, { passive: true });
    this.sliderContainer.addEventListener('touchend', this._te);

    this.sliderContainer.addEventListener('mousedown', this._ts);
    this.sliderContainer.addEventListener('mousemove', this._tm);
    this.sliderContainer.addEventListener('mouseup', this._te);
    this.sliderContainer.addEventListener('mouseleave', this._te);

    // pause on hover
    if (this.pauseOnHover) {
      this.sliderContainer.addEventListener('mouseenter', () => {
        if (this.isAutoPlaying) this.pauseAutoPlay();
      });
      this.sliderContainer.addEventListener('mouseleave', this._onMouseLeave);
    }
  }

  _onMouseLeaveHandler() {
    if (this.isAutoPlaying) this.startAutoPlay();
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
    this.updateSlider();
    this.resetAutoPlay();
  }

  prevSlide() {
    this.currentSlide = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
    this.updateSlider();
    this.resetAutoPlay();
  }

  goToSlide(index) {
    this.currentSlide = Math.max(0, Math.min(index, this.totalSlides - 1));
    this.updateSlider();
    this.resetAutoPlay();
  }

  // use pixel-based transforms (reliable)
  updateSlider() {
    const cw = this.sliderContainer ? this.sliderContainer.offsetWidth : 0;
    const translateXpx = -this.currentSlide * cw;
    this.sliderTrack.style.transition = 'transform 0.45s ease';
    this.sliderTrack.style.transform = `translateX(${translateXpx}px)`;

    this.slides.forEach((s, i) => s.classList.toggle('active', i === this.currentSlide));

    const dots = Array.from(this.indicatorsContainer.querySelectorAll('.indicator'));
    dots.forEach((d, i) => d.classList.toggle('active', i === this.currentSlide));

    this.prevTranslate = translateXpx;
    this.currentTranslate = this.prevTranslate;
    this.currentIndex = this.currentSlide;
  }

  startAutoPlay() {
    this.clearAutoPlay();
    if (!this.isAutoPlaying) return;
    this.autoPlayTimer = setInterval(() => this.nextSlide(), this.autoPlayDelay);
    if (this.playIcon && this.pauseIcon) {
      this.playIcon.classList.add('hidden');
      this.pauseIcon.classList.remove('hidden');
      if (this.controlText) this.controlText.textContent = 'Pause';
    }
  }

  pauseAutoPlay() {
    this.clearAutoPlay();
    if (this.playIcon && this.pauseIcon) {
      this.playIcon.classList.remove('hidden');
      this.pauseIcon.classList.add('hidden');
      if (this.controlText) this.controlText.textContent = 'Resume';
    }
  }

  clearAutoPlay() {
    if (this.autoPlayTimer) {
      clearInterval(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
  }

  toggleAutoPlay() {
    this.isAutoPlaying = !this.isAutoPlaying;
    if (this.isAutoPlaying) this.startAutoPlay();
    else this.pauseAutoPlay();
  }

  resetAutoPlay() {
    if (!this.isAutoPlaying) return;
    this.pauseAutoPlay();
    this.startAutoPlay();
  }

  handleKeyboard(e) {
    if (e.key === 'ArrowLeft') this.prevSlide();
    if (e.key === 'ArrowRight') this.nextSlide();
  }

  getPositionX(event) {
    if (!event) return 0;
    if (event.type && event.type.indexOf('mouse') === 0) return event.pageX;
    if (event.touches && event.touches[0]) return event.touches[0].clientX;
    if (event.changedTouches && event.changedTouches[0]) return event.changedTouches[0].clientX;
    return 0;
  }

  touchStart(event) {
    //игнорируем клики по кнопкам управления и индикаторам
    if (event.target && event.target.closest &&
      (event.target.closest('.slider__btn') ||
        event.target.closest('.control-btn') ||
        event.target.closest('.indicator'))) {
      return;
    }
    this.isDragging = true;
    this.startPos = this.getPositionX(event);
    this.animationID = requestAnimationFrame(() => this.animation());
    this.sliderTrack.classList.add('no-transition');
    if (this.isAutoPlaying) this.pauseAutoPlay();
  }

  touchMove(event) {
    if (!this.isDragging) return;
    const currentPosition = this.getPositionX(event);
    this.currentTranslate = this.prevTranslate + (currentPosition - this.startPos);
  }

  touchEnd() {
    if (!this.isDragging) return;
    this.isDragging = false;
    cancelAnimationFrame(this.animationID);

    const movedBy = this.currentTranslate - this.prevTranslate;
    const cw = this.sliderContainer ? this.sliderContainer.offsetWidth : 0;
    const threshold = cw * 0.2;

    if (movedBy < -threshold && this.currentIndex < this.totalSlides - 1) this.currentIndex += 1;
    if (movedBy > threshold && this.currentIndex > 0) this.currentIndex -= 1;

    this.currentSlide = this.currentIndex;
    this.setPositionByIndex();

    this.sliderTrack.classList.remove('no-transition');
    if (this.isAutoPlaying) this.startAutoPlay();
  }

  animation() {
    if (!this.isDragging) return;
    this.setSliderPosition();
    this.animationID = requestAnimationFrame(() => this.animation());
  }

  setSliderPosition() {
    this.sliderTrack.style.transform = `translateX(${this.currentTranslate}px)`;
  }

  setPositionByIndex() {
    const cw = this.sliderContainer ? this.sliderContainer.offsetWidth || 0 : 0;
    this.currentTranslate = -this.currentIndex * cw;
    this.prevTranslate = this.currentTranslate;
    this.updateSlider();
  }
}

// init
document.addEventListener('DOMContentLoaded', () => {
  window.sliderInstanceClass = new Slider({ autoPlayDelay: 3000, pauseOnHover: true });
});

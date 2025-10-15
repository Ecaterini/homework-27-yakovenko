class Slider {
  constructor() {
    // DOM Elements
    this.sliderContainer = document.querySelector('.slider__wrapper');
    this.sliderTrack     = document.querySelector('.slider__track');
    this.slides          = document.querySelectorAll('.slide');
    this.prevBtn         = document.querySelector('.slider__btn--prev');
    this.nextBtn         = document.querySelector('.slider__btn--next');
    this.indicators      = document.querySelectorAll('.indicator');
    this.pauseBtn        = document.querySelector('.pause-btn');
    this.playIcon        = document.querySelector('.play-icon');
    this.pauseIcon       = document.querySelector('.pause-icon');
    this.controlText     = document.querySelector('.control-text');

    // State
    this.currentSlide     = 0;
    this.totalSlides      = this.slides.length;
    this.isAutoPlaying    = true;
    this.autoPlayInterval = null;
    this.autoPlayDelay    = 3000; // 3 seconds

    // Touch/Drag state
    this.isDragging       = false;
    this.startPos         = 0;
    this.currentTranslate = 0;
    this.prevTranslate    = 0;
    this.animationID      = 0;
    this.currentIndex     = 0;

    // Initialize
    this.init();
  }

  init() {
    this.updateSlider();
    this.addEventListeners();
    this.startAutoPlay();
  }

  addEventListeners() {
    // Навигация
    this.prevBtn.addEventListener('click', () => this.prevSlide());
    this.nextBtn.addEventListener('click', () => this.nextSlide());

    // Пауза/Плей
    this.pauseBtn.addEventListener('click', () => this.toggleAutoPlay());

    // Индикаторы
    this.indicators.forEach((indicator, index) => {
      indicator.addEventListener('click', () => this.goToSlide(index));
    });

    // Клавиатура
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));

    // Touch
    this.sliderContainer.addEventListener('touchstart', (e) => this.touchStart(e));
    this.sliderContainer.addEventListener('touchmove',  (e) => this.touchMove(e));
    this.sliderContainer.addEventListener('touchend',   () => this.touchEnd());

    // Mouse (drag)
    this.sliderContainer.addEventListener('mousedown',  (e) => this.touchStart(e));
    this.sliderContainer.addEventListener('mousemove',  (e) => this.touchMove(e));
    this.sliderContainer.addEventListener('mouseup',    () => this.touchEnd());
    this.sliderContainer.addEventListener('mouseleave', () => this.touchEnd());

    // Ховер — пауза автоплея
    this.sliderContainer.addEventListener('mouseenter', () => {
      if (this.isAutoPlaying) this.pauseAutoPlay();
    });
    this.sliderContainer.addEventListener('mouseleave', () => {
      if (this.isAutoPlaying && !this.isDragging) this.startAutoPlay();
    });
  }

  // Навигация
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
    this.currentSlide = index;
    this.updateSlider();
    this.resetAutoPlay();
  }

  updateSlider() {
    const translateX = -this.currentSlide * 100;
    this.sliderTrack.style.transform = `translateX(${translateX}%)`;

    this.slides.forEach((slide, i) => {
      if (i === this.currentSlide) slide.classList.add('active');
      else slide.classList.remove('active');
    });

    this.indicators.forEach((dot, i) => {
      if (i === this.currentSlide) dot.classList.add('active');
      else dot.classList.remove('active');
    });

    this.currentIndex = this.currentSlide;

    // синхронизируем drag-смещения с текущим индексом
    const containerWidth = this.sliderContainer.offsetWidth || 0;
    this.prevTranslate    = -this.currentSlide * containerWidth;
    this.currentTranslate = this.prevTranslate;
  }

  // Автоплей
  startAutoPlay() {
    if (!this.isAutoPlaying) return;
    if (this.autoPlayInterval) clearInterval(this.autoPlayInterval);
    this.autoPlayInterval = setInterval(() => this.nextSlide(), this.autoPlayDelay);
  }

  pauseAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }

  toggleAutoPlay() {
    this.isAutoPlaying = !this.isAutoPlaying;
    if (this.isAutoPlaying) {
      this.startAutoPlay();
      this.playIcon.classList.add('hidden');
      this.pauseIcon.classList.remove('hidden');
      this.controlText.textContent = 'Pause';
    } else {
      this.pauseAutoPlay();
      this.playIcon.classList.remove('hidden');
      this.pauseIcon.classList.add('hidden');
      this.controlText.textContent = 'Resume';
    }
  }

  resetAutoPlay() {
    if (this.isAutoPlaying) {
      this.pauseAutoPlay();
      this.startAutoPlay();
    }
  }

  // Клавиатура
  handleKeyboard(e) {
    if (e.key === 'ArrowLeft')  this.prevSlide();
    if (e.key === 'ArrowRight') this.nextSlide();
  }

  // Drag/Swipe
  getPositionX(event) {
    return event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
  }

  touchStart(event) {
    // игнор кликов по контролам
    if (event.target.closest('.slider__btn') ||
        event.target.closest('.control-btn') ||
        event.target.closest('.indicator')) {
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

    const movedBy   = this.currentTranslate - this.prevTranslate;
    const cw        = this.sliderContainer.offsetWidth || 0;
    const threshold = cw * 0.2;

    if (movedBy < -threshold && this.currentIndex < this.totalSlides - 1) this.currentIndex += 1;
    if (movedBy >  threshold && this.currentIndex > 0)                   this.currentIndex -= 1;

    this.currentSlide = this.currentIndex;
    this.setPositionByIndex();

    this.sliderTrack.classList.remove('no-transition');
    if (this.isAutoPlaying) this.startAutoPlay();
  }

  animation() {
    if (this.isDragging) {
      this.setSliderPosition();
      requestAnimationFrame(() => this.animation());
    }
  }

  setSliderPosition() {
    const cw = this.sliderContainer.offsetWidth || 1;
    const translateXPercent = (this.currentTranslate / cw) * 100;
    this.sliderTrack.style.transform = `translateX(${translateXPercent}%)`;
  }

  setPositionByIndex() {
    const cw = this.sliderContainer.offsetWidth || 0;
    this.currentTranslate = -this.currentIndex * cw;
    this.prevTranslate    = this.currentTranslate;
    this.updateSlider();
  }
}

// Initialize slider when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new Slider();
});

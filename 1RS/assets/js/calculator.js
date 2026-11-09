/**
 * 1RS Tattoo Studio — Interactive Price & Session Calculator
 */

(function() {
  const sizeOptions = document.querySelectorAll('[data-calc-size]');
  const detailOptions = document.querySelectorAll('[data-calc-detail]');
  const colorOptions = document.querySelectorAll('[data-calc-color]');
  const placeOptions = document.querySelectorAll('[data-calc-place]');

  const priceOutput = document.getElementById('calc-price-output');
  const timeOutput = document.getElementById('calc-time-output');
  const bookCalcBtn = document.getElementById('btn-book-with-calc');

  if (!priceOutput) return;

  const currentSelection = {
    size: 'medium',   // mini, medium, large, sleeve
    detail: 'medium', // outline, medium, high
    color: 'bw',      // bw, color
    place: 'standard' // standard, sensitive, complex
  };

  const pricingMatrix = {
    size: {
      mini: { baseMin: 3500, baseMax: 5000, hours: '1 – 1.5 ч.' },
      medium: { baseMin: 7000, baseMax: 11000, hours: '2 – 3.5 ч.' },
      large: { baseMin: 14000, baseMax: 22000, hours: '4 – 6 ч. (1-2 сеанса)' },
      sleeve: { baseMin: 45000, baseMax: 80000, hours: 'от 4 сеансов' }
    },
    detail: {
      outline: 1.0,
      medium: 1.25,
      high: 1.55
    },
    color: {
      bw: 1.0,
      color: 1.3
    },
    place: {
      standard: 1.0,
      sensitive: 1.15,
      complex: 1.3
    }
  };

  function updateCalculation() {
    const sizeData = pricingMatrix.size[currentSelection.size];
    const multiplier = 
      pricingMatrix.detail[currentSelection.detail] * 
      pricingMatrix.color[currentSelection.color] * 
      pricingMatrix.place[currentSelection.place];

    const minPrice = Math.round((sizeData.baseMin * multiplier) / 500) * 500;
    const maxPrice = Math.round((sizeData.baseMax * multiplier) / 500) * 500;

    priceOutput.innerHTML = `<span>от</span> ${minPrice.toLocaleString('ru-RU')} <span>до</span> ${maxPrice.toLocaleString('ru-RU')} ₽`;
    timeOutput.textContent = `Ориентировочное время работы: ${sizeData.hours}`;
  }

  function setupOptionGroup(elements, key) {
    elements.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSelection[key] = btn.getAttribute(`data-calc-${key}`);
        updateCalculation();
      });
    });
  }

  setupOptionGroup(sizeOptions, 'size');
  setupOptionGroup(detailOptions, 'detail');
  setupOptionGroup(colorOptions, 'color');
  setupOptionGroup(placeOptions, 'place');

  if (bookCalcBtn) {
    bookCalcBtn.addEventListener('click', () => {
      // Scroll to booking form and populate comment
      const commentInput = document.getElementById('booking-comment');
      const contactSection = document.getElementById('contact');
      if (commentInput) {
        commentInput.value = `Расчет с калькулятора: Размер: ${currentSelection.size}, Детализация: ${currentSelection.detail}, Цвет: ${currentSelection.color}, Зона: ${currentSelection.place}`;
      }
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  updateCalculation();
})();

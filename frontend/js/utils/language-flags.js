// Обработчик для обновления флага при изменении языка
function updateLanguageFlag() {
    const select = document.getElementById('language-select');
    const flagIcon = document.querySelector('.language-select .flag-icon');
    
    if (select && flagIcon) {
        const selectedOption = select.options[select.selectedIndex];
        const flagCode = selectedOption.getAttribute('data-flag');
        
        // Сбросить все классы флага
        flagIcon.className = 'flag-icon';
        
        // Добавить соответствующие классы для текущего языка
        flagIcon.classList.add('fi', `fi-${flagCode}`);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('language-select');
    
    if (select) {
        // Установить начальное состояние флага
        updateLanguageFlag();
        
        // Добавить обработчик изменения языка
        select.addEventListener('change', updateLanguageFlag);
    }
});
# FlowTest 2.0 - Новая система отчетов

## 🎉 Что изменилось

Страница отчетов FlowTest 2.0 была полностью переделана в стиле оригинального FlowTest с современным подходом и улучшенным пользовательским опытом.

### ✨ Основные изменения

#### До (старая версия):
- Статический список типов отчетов
- Таблица с готовыми отчетами
- Простые формы генерации
- Ограниченные возможности кастомизации

#### После (новая версия):
- **Drag & Drop интерфейс** как в FlowTest
- **Визуальный холст** для построения отчетов
- **Панель метрик** с готовыми компонентами
- **Шаблоны отчетов** с возможностью сохранения
- **Интерактивные графики** с реальными данными
- **Адаптивный дизайн** для всех устройств

## 🏗️ Архитектура

### Структура файлов
```
frontend/
├── reports.html                     # Новая главная страница
├── reports-old.html                 # Бэкап старой версии
├── css/
│   └── reports-flowtest.css         # Стили в стиле FlowTest
├── js/
│   ├── pages/
│   │   └── reports-flowtest.js      # Основная логика
│   ├── utils/
│   │   └── chart-utils.js           # Утилиты для графиков
│   └── config/
│       └── reports-config.js        # Конфигурация и константы
└── REPORTS_README.md                # Подробная документация
```

### Компоненты

#### 1. **Sidebar с шаблонами** (левая панель)
- Список доступных шаблонов отчетов
- Поиск по шаблонам
- Кнопка создания нового шаблона
- Действия: дублирование, удаление

#### 2. **Toolbar** (верхняя панель)
- Название текущего шаблона
- Кнопки: Preview, Save, Generate Report
- Статус редактирования

#### 3. **Canvas** (центральная область)
- Визуальный холст для размещения метрик
- Drag & Drop из панели метрик
- Интерактивные элементы с графиками
- Возможность перемещения и изменения размеров

#### 4. **Metrics Panel** (правая панель)
- Категории метрик: Execution, Coverage, Performance, Quality
- Готовые компоненты для перетаскивания
- Описание каждой метрики

## 🎨 Дизайн

### Цветовая схема
- **Основной цвет**: `#FF7F50` (Coral) - как в оригинальном FlowTest
- **Успех**: `#10B981` (Зеленый)
- **Предупреждение**: `#F59E0B` (Желтый)
- **Ошибка**: `#EF4444` (Красный)
- **Информация**: `#3B82F6` (Синий)

### Типографика
- **Шрифт**: Inter - современный, читаемый
- **Размеры**: Адаптивные, от 11px до 24px
- **Вес**: 300-700 для различных элементов

### Анимации
- Плавные переходы (0.2s ease)
- Hover эффекты
- Slide-in анимации для модальных окон
- Пульсация для loading состояний

## 📊 Типы метрик

### Test Execution (Выполнение тестов)
1. **Test Summary** - Круговая диаграмма Pass/Fail/Skip
2. **Execution Trend** - Линейный график успешности во времени
3. **Test Duration** - Столбчатая диаграмма времени выполнения

### Coverage Analysis (Анализ покрытия)
4. **Feature Coverage** - Покрытие функций приложения
5. **Requirement Coverage** - Покрытие бизнес-требований

### Performance (Производительность)
6. **Performance Trend** - Тренд производительности
7. **Bottlenecks** - Горизонтальная диаграмма узких мест

### Quality Metrics (Метрики качества)
8. **Defect Density** - Плотность дефектов по модулям
9. **Quality Trend** - Радиальная диаграмма качества

## 🚀 Как использовать

### 1. Создание нового шаблона
```
1. Нажмите "New Template" в sidebar
2. Заполните форму:
   - Название
   - Описание
   - Тип (Execution, Coverage, Performance, Defects, Custom)
3. Нажмите "Create Template"
```

### 2. Редактирование шаблона
```
1. Выберите шаблон из списка
2. Перетащите метрики из правой панели на холст
3. Расположите элементы как нужно
4. Измените размеры, потянув за углы
5. Сохраните изменения (Ctrl+S)
```

### 3. Генерация отчета
```
1. Выберите настроенный шаблон
2. Нажмите "Generate Report"
3. Заполните параметры:
   - Название отчета
   - Проект
   - Формат (PDF/HTML/Excel)
   - Диапазон дат
4. Нажмите "Generate"
```

## ⌨️ Горячие клавиши

- `Ctrl/Cmd + S` - Сохранить шаблон
- `Ctrl/Cmd + N` - Новый шаблон
- `Delete/Backspace` - Удалить выбранный элемент
- `Esc` - Закрыть модальные окна

## 🔧 Настройка интеграции

### API Endpoints
Обновите endpoints в `reports-config.js`:

```javascript
API_ENDPOINTS: {
    TEMPLATES: '/api/report-templates/',
    GENERATE_REPORT: '/api/reports/generate/',
    PROJECTS: '/api/projects/',
    METRICS_DATA: '/api/metrics/',
    EXPORT_REPORT: '/api/reports/export/'
}
```

### Backend модели
Убедитесь, что у вас есть соответствующие Django модели:

```python
class ReportTemplate(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField()
    type = models.CharField(max_length=50)
    layout = models.JSONField()
    created_by = models.ForeignKey(User, on_delete=CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

class Report(models.Model):
    name = models.CharField(max_length=255)
    template = models.ForeignKey(ReportTemplate, on_delete=CASCADE)
    project = models.ForeignKey(Project, on_delete=CASCADE)
    format = models.CharField(max_length=20)
    date_from = models.DateField()
    date_to = models.DateField()
    generated_at = models.DateTimeField(auto_now_add=True)
    file_path = models.CharField(max_length=500)
```

## 📱 Адаптивность

### Desktop (>1024px)
- Полная раскладка с 3 панелями
- Drag & Drop работает оптимально
- Все функции доступны

### Tablet (768px - 1024px)
- Компактная раскладка
- Панели могут скрываться
- Основной функционал сохранен

### Mobile (<768px)
- Стековая раскладка
- Панели превращаются в табы
- Упрощенный интерфейс

## 🎯 Следующие шаги

### Планируемые улучшения
1. **Экспорт/импорт шаблонов** в JSON формате
2. **Совместное редактирование** в реальном времени
3. **Версионирование шаблонов** с историей изменений
4. **Планировщик отчетов** для автоматической генерации
5. **Больше типов графиков** (scatter, bubble, treemap)
6. **Пользовательские SQL запросы** для кастомных метрик

### Интеграции
- **Email уведомления** о готовых отчетах
- **Slack/Teams боты** для отправки отчетов
- **Dashboard экраны** для мониторинга в реальном времени
- **API для внешних систем** BI/Analytics

## 🐛 Troubleshooting

### Частые проблемы

**Графики не отображаются**
```javascript
// Проверьте загрузку Chart.js
console.log(typeof Chart); // должен быть 'function'

// Проверьте canvas элементы
const canvases = document.querySelectorAll('canvas');
console.log(canvases.length); // должно быть > 0
```

**Drag & Drop не работает**
```javascript
// Проверьте атрибут draggable
const cards = document.querySelectorAll('.metric-card');
cards.forEach(card => {
    console.log(card.getAttribute('draggable')); // должно быть 'true'
});
```

**Модальные окна не открываются**
```javascript
// Проверьте обработчики событий
const btn = document.getElementById('newTemplateBtn');
console.log(btn.onclick); // должен быть function
```

## 📞 Поддержка

Если у вас возникли вопросы или проблемы:

1. Проверьте консоль браузера на ошибки
2. Убедитесь, что все файлы загружены корректно
3. Проверьте совместимость с вашим браузером
4. Обратитесь к документации API

---

**Автор**: FlowTest Team  
**Версия**: 2.0  
**Дата**: 2025  
**Лицензия**: MIT
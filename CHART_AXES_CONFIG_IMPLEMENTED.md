# Chart Axes Configuration Implemented

## Overview
Added functionality to configure metrics on chart axes (X and Y) in the reports editor.

## Changes Made

### 1. Added Chart Configuration Modal (reports.html)
- New modal dialog for configuring chart axes
- X-axis configuration:
  - Time-based (with day/week/month grouping)
  - Category-based
  - Metric-based
- Y-axis configuration:
  - Multiple metrics selection
  - Dynamic add/remove of metrics
- Chart title configuration

### 2. JavaScript Implementation (reports.js)

#### New Functions Added:
- `openChartConfigModal(elementId)` - Opens configuration modal for a chart
- `handleXAxisTypeChange(type)` - Handles X-axis type selection changes
- `addYAxisMetricField(value)` - Adds new Y-axis metric selector
- `applyChartConfiguration(elementId, config)` - Applies configuration to chart
- `renderChartWithConfig(chartElement, config)` - Renders chart with Chart.js
- `getChartDataForConfig(config)` - Generates chart data based on configuration
- `initChartConfigModal()` - Initializes modal event listeners

#### Features:
- Drag charts from toolbar to canvas
- Click settings icon to configure axes
- Select X-axis type (time, category, or metric)
- Select multiple Y-axis metrics
- Real-time chart rendering with Chart.js
- Configuration persistence in dataset attributes

### 3. Supported Metrics
- **Tests**: passed, failed, skipped, total, success rate
- **Time**: average, min, max duration, total execution time
- **Coverage**: code, feature, requirement coverage
- **Quality**: defect count, defect density, quality score

## Usage

1. **Add Chart to Canvas**
   - Drag a chart type from the toolbar to the canvas

2. **Configure Chart**
   - Click the settings icon on the chart element
   - Select X-axis configuration:
     - Time: displays data over time periods
     - Category: displays data by categories
     - Metric: uses a metric value as X-axis
   - Select Y-axis metrics (can add multiple)
   - Enter optional chart title
   - Click "Apply"

3. **View Chart**
   - Chart renders automatically with selected configuration
   - Multiple metrics show as different series
   - Legend displays for multiple series

## Example Configurations

### Time Series Chart
- X-axis: Time (days)
- Y-axis: Tests Passed, Tests Failed
- Shows test results trend over last 7 days

### Comparison Chart
- X-axis: Category
- Y-axis: Code Coverage, Feature Coverage
- Shows coverage comparison by category

### Single Metric Display
- X-axis: Metric (current value)
- Y-axis: Quality Score
- Shows single quality score value

## Technical Details

- Uses Chart.js for rendering
- Configurations stored as JSON in data attributes
- Supports line, bar, pie, area, and scatter charts
- Responsive and theme-aware (light/dark mode)
- Real-time data updates when metrics refresh
/**
 * Multilingual PDF Export for Reports
 * Supports both English and Russian (with transliteration)
 */

import ToastManager from '../utils/toast.js';
import { transliterate, translateToEnglish } from '../utils/pdf-cyrillic.js';

/**
 * Export report to PDF with language support
 * @param {Object} options - Export options
 * @param {string} options.language - Language to use ('en' or 'ru')
 * @param {boolean} options.useTransliteration - Use transliteration for Russian
 */
export async function exportReportToPDFMultilang(options = {}) {
    const { language = 'en', useTransliteration = true } = options;
    
    try {
        // Show loading
        ToastManager.info(language === 'ru' ? 'Генерация PDF...' : 'Generating PDF...');
        
        // Get report content
        const reportContent = document.getElementById('reportContent') || document.getElementById('reportCanvas');
        
        // Get jsPDF from window
        const { jsPDF } = window.jspdf;
        
        // Create new PDF document
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // Helper function to add text based on language
        const addText = (text, x, y) => {
            if (language === 'ru' && useTransliteration) {
                pdf.text(transliterate(text), x, y);
            } else if (language === 'ru') {
                // This may show garbled text without proper font
                pdf.text(text, x, y);
            } else {
                pdf.text(text, x, y);
            }
        };
        
        // Language-specific content
        const content = {
            en: {
                dateLabel: 'Date:',
                projectLabel: 'Project:',
                allProjects: 'All Projects',
                defaultReport: 'Test Report',
                reportElements: 'Report Elements',
                chart: 'Chart',
                metrics: 'Metrics:',
                indicators: 'Indicators',
                metricsSummary: 'Metrics Summary',
                testing: 'Testing:',
                totalTests: 'Total tests:',
                passed: 'Passed:',
                failed: 'Failed:',
                skipped: 'Skipped:',
                successRate: 'Success rate:',
                coverage: 'Coverage:',
                codeCoverage: 'Code coverage:',
                featureCoverage: 'Feature coverage:',
                requirementCoverage: 'Requirement coverage:',
                quality: 'Quality:',
                defectCount: 'Defect count:',
                defectDensity: 'Defect density:',
                qualityScore: 'Quality score:',
                successMsg: 'PDF saved successfully',
                errorMsg: 'Error exporting to PDF'
            },
            ru: {
                dateLabel: 'Дата создания:',
                projectLabel: 'Проект:',
                allProjects: 'Все проекты',
                defaultReport: 'Отчет по тестированию',
                reportElements: 'Элементы отчета',
                chart: 'График',
                metrics: 'Метрики:',
                indicators: 'Показатели',
                metricsSummary: 'Сводка метрик',
                testing: 'Тестирование:',
                totalTests: 'Всего тестов:',
                passed: 'Успешных:',
                failed: 'Провалено:',
                skipped: 'Пропущено:',
                successRate: 'Процент успеха:',
                coverage: 'Покрытие:',
                codeCoverage: 'Покрытие кода:',
                featureCoverage: 'Покрытие функций:',
                requirementCoverage: 'Покрытие требований:',
                quality: 'Качество:',
                defectCount: 'Количество дефектов:',
                defectDensity: 'Плотность дефектов:',
                qualityScore: 'Оценка качества:',
                successMsg: 'PDF успешно сохранен',
                errorMsg: 'Ошибка при экспорте в PDF'
            }
        };
        
        const t = content[language];
        
        // Set fonts and colors
        pdf.setFont('helvetica');
        
        // Add header
        pdf.setFontSize(20);
        pdf.setTextColor(255, 127, 80); // Coral color
        pdf.text('FlowTest Report', 20, 20);
        
        // Add metadata
        pdf.setFontSize(12);
        pdf.setTextColor(100, 100, 100);
        const reportTitle = document.getElementById('reportTitle')?.textContent || t.defaultReport;
        const reportDate = new Date().toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US');
        
        addText(reportTitle || t.defaultReport, 20, 35);
        addText(`${t.dateLabel} ${reportDate}`, 20, 42);
        
        // Add project info if available
        const state = window.state || {};
        const projectName = document.getElementById('reportProject')?.textContent || 
                           (state.selectedProject && state.projects?.find(p => p.id === state.selectedProject)?.name) || 
                           t.allProjects;
        addText(`${t.projectLabel} ${projectName}`, 20, 49);
        
        // Draw separator line
        pdf.setDrawColor(200, 200, 200);
        pdf.line(20, 55, 190, 55);
        
        // Add content based on what's available
        let yPos = 65;
        const pageHeight = pdf.internal.pageSize.height;
        const maxY = pageHeight - 20;
        
        // Add report elements if any
        const chartElements = reportContent ? reportContent.querySelectorAll('[data-chart-type]') : [];
        if (chartElements.length > 0) {
            pdf.setFontSize(14);
            pdf.setTextColor(0, 0, 0);
            addText(t.reportElements, 20, yPos);
            yPos += 10;
            
            pdf.setFontSize(11);
            pdf.setTextColor(60, 60, 60);
            
            chartElements.forEach((element, index) => {
                if (yPos > maxY - 15) {
                    pdf.addPage();
                    yPos = 20;
                }
                
                const chartType = element.dataset.chartType;
                const chartTitle = element.querySelector('h3')?.textContent || `${t.chart} ${index + 1}`;
                
                addText(`• ${chartTitle}`, 25, yPos);
                yPos += 6;
            });
        }
        
        // Add metrics summary
        if (state.metricsData) {
            pdf.addPage();
            pdf.setFontSize(16);
            pdf.setTextColor(0, 0, 0);
            addText(t.metricsSummary, 20, 20);
            
            pdf.setFontSize(11);
            let y = 35;
            const lineHeight = 7;
            
            // Testing section
            pdf.setTextColor(0, 0, 0);
            addText(t.testing, 20, y);
            y += lineHeight;
            
            pdf.setTextColor(100, 100, 100);
            addText(`• ${t.totalTests} ${state.metricsData.tests_total || 0}`, 25, y);
            y += lineHeight;
            addText(`• ${t.passed} ${state.metricsData.tests_passed || 0}`, 25, y);
            y += lineHeight;
            addText(`• ${t.failed} ${state.metricsData.tests_failed || 0}`, 25, y);
            y += lineHeight;
            addText(`• ${t.skipped} ${state.metricsData.tests_skipped || 0}`, 25, y);
            y += lineHeight;
            addText(`• ${t.successRate} ${state.metricsData.test_success_rate || 0}%`, 25, y);
            y += lineHeight * 2;
            
            // Coverage section
            pdf.setTextColor(0, 0, 0);
            addText(t.coverage, 20, y);
            y += lineHeight;
            
            pdf.setTextColor(100, 100, 100);
            addText(`• ${t.codeCoverage} ${state.metricsData.code_coverage || 0}%`, 25, y);
            y += lineHeight;
            addText(`• ${t.featureCoverage} ${state.metricsData.feature_coverage || 0}%`, 25, y);
            y += lineHeight;
            addText(`• ${t.requirementCoverage} ${state.metricsData.requirement_coverage || 0}%`, 25, y);
            y += lineHeight * 2;
            
            // Quality section
            pdf.setTextColor(0, 0, 0);
            addText(t.quality, 20, y);
            y += lineHeight;
            
            pdf.setTextColor(100, 100, 100);
            addText(`• ${t.defectCount} ${state.metricsData.defect_count || 0}`, 25, y);
            y += lineHeight;
            addText(`• ${t.defectDensity} ${state.metricsData.defect_density || 0}`, 25, y);
            y += lineHeight;
            addText(`• ${t.qualityScore} ${state.metricsData.quality_score || 0}/100`, 25, y);
        }
        
        // Save PDF
        const filename = `flowtest-report-${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(filename);
        
        ToastManager.success(t.successMsg);
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        ToastManager.error(content[language].errorMsg);
    }
}

// Export default English version
export async function exportReportToPDFEnglish() {
    return exportReportToPDFMultilang({ language: 'en' });
}

// Export Russian version with transliteration
export async function exportReportToPDFRussian() {
    return exportReportToPDFMultilang({ language: 'ru', useTransliteration: true });
}
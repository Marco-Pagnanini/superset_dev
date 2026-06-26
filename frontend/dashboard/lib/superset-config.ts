/**
 * Configurazione UI passata all'embedded SDK (`dashboardUiConfig`).
 *
 * Oltre alle opzioni note dell'SDK (nascondi titolo/tab, mostra filtri, emetti i
 * dataMask...), il campo `css` inietta CSS **dentro l'iframe** di Superset per
 * uniformare l'aspetto dei chart al resto della dashboard (card arrotondate,
 * hover, tabelle, font Plus Jakarta Sans).
 *
 * Portato 1:1 da frontend/test/src/constant/SupersetCss.js.
 */
export const SUPERSET_UI_CONFIG = {
  hideTitle: true,
  hideTab: true,
  hideChartControls: false,
  emitDataMasks: true,
  filters: { visible: true, expanded: true },
  css: `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

    h2 { color: white; font-size: 52px; }
    .navbar { box-shadow: none; transition: opacity 0.5s ease; opacity: 0.05; }
    .navbar:hover { opacity: 1; }
    .chart-header .header { font-weight: normal; font-size: 12px; }
    .nvd3 text { font-size: 12px; font-family: inherit; }
    * { font-family: 'Plus Jakarta Sans', sans-serif !important; }

    :root {
      --c-bg-page:      #f0f2f5;
      --c-bg-card:      #ffffff;
      --c-border:       #e2e8f0;
      --c-shadow:       0 2px 8px rgba(0,0,0,0.08);
      --c-shadow-hover: 0 20px 40px rgba(0,0,0,0.16);
      --c-text:         #1a202c;
      --c-text-muted:   #718096;
      --c-border-hover: #a0aec0;
      --c-thead:        #f7fafc;
      --c-row:          rgba(0,0,0,0.06);
    }

    .resizable-container {
      padding: 8px !important;
      box-sizing: border-box !important;
    }

    .dashboard-component-chart-holder {
      background-color: var(--c-bg-card) !important;
      border: 1px solid var(--c-border) !important;
      border-radius: 24px !important;
      padding: 20px !important;
      box-shadow: var(--c-shadow) !important;
      transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1),
                  box-shadow 0.28s ease,
                  border-color 0.28s ease !important;
      overflow: visible !important;
      position: relative !important;
      height: 100% !important;
      box-sizing: border-box !important;
    }

    .dashboard-component-chart-holder:hover {
      transform: translateY(-8px) !important;
      box-shadow: var(--c-shadow-hover) !important;
      border-color: var(--c-border-hover) !important;
      z-index: 100 !important;
    }

    .dashboard-component-chart-holder *:not(iframe):not(svg) {
      color: var(--c-text) !important;
    }
    .dashboard-component-chart-holder text,
    .dashboard-component-chart-holder tspan,
    .superset-legacy-chart-big-number .header-line {
      fill: var(--c-text) !important;
      color: var(--c-text) !important;
    }

    .dashboard-component-chart-holder tr,
    .dashboard-component-chart-holder td,
    .dashboard-component-chart-holder th {
      background: transparent !important;
      background-color: transparent !important;
      border-bottom: 1px solid var(--c-row) !important;
      color: var(--c-text) !important;
    }
    .table-striped > tbody > tr:nth-of-type(odd),
    .table-striped > tbody > tr:nth-of-type(even) {
      background: transparent !important;
    }
    .dashboard-component-chart-holder thead th {
      background-color: var(--c-thead) !important;
      color: var(--c-text-muted) !important;
      border-bottom: 1px solid var(--c-border) !important;
      font-weight: 600 !important;
      font-size: 11px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.05em !important;
    }

    .chart-container, .slice_container, .chart-slice {
      background: transparent !important;
      background-color: transparent !important;
    }

    .dragdroppable--edit-mode::after { display: none !important; }
  `,
};

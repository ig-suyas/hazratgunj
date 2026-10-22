// The one chart library (ECharts, canvas renderer), with only the parts the
// reports use. Imported only by the lazily loaded reports code.
import { BarChart, HeatmapChart, LineChart, PieChart } from "echarts/charts";
import { AriaComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  LegendComponent,
  AriaComponent,
  CanvasRenderer,
]);

export { echarts };
export type { EChartsCoreOption as ChartOption, ECharts } from "echarts/core";

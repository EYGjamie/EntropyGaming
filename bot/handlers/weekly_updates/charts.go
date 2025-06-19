package weekly_updates

import (
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"os"
	"path/filepath"
	"sort"

	"golang.org/x/image/font"
	"golang.org/x/image/font/basicfont"
	"golang.org/x/image/math/fixed"
)

// ChartService handles chart generation
type ChartService struct {
	reportsDir string
}

// NewChartService creates a new ChartService
func NewChartService(reportsDir string) *ChartService {
	return &ChartService{
		reportsDir: reportsDir,
	}
}

// Chart colors
var chartColors = []color.RGBA{
	{0, 100, 200, 255},   // Blue
	{200, 50, 50, 255},   // Red
	{50, 150, 50, 255},   // Green
	{255, 165, 0, 255},   // Orange
	{128, 0, 128, 255},   // Purple
}

// ensureReportsDir creates the reports directory if it doesn't exist
func (cs *ChartService) ensureReportsDir() error {
	return os.MkdirAll(cs.reportsDir, 0755)
}

// GenerateWeeklyDistribution creates the weekly distribution chart
func (cs *ChartService) GenerateWeeklyDistribution(data ChartData) error {
	if err := cs.ensureReportsDir(); err != nil {
		return err
	}

	labels, values := cs.extractData(data.Counts)
	total := cs.sum(values)
	
	if total == 0 {
		return fmt.Errorf("no data to display")
	}

	dateRange := fmt.Sprintf("%s bis %s", 
		FormatDate(data.TimeRange.Start), 
		FormatDate(data.TimeRange.End))
	
	title := fmt.Sprintf("%s\n%s", data.TimeRange.Label, dateRange)

	// Create absolute chart
	absPath := filepath.Join(cs.reportsDir, "weekly_distribution_abs.png")
	err := cs.createSingleBarChart(
		labels, 
		values, 
		fmt.Sprintf("%s - Absolute Verteilung (Gesamt: %d)", title, total),
		false,
		absPath,
	)
	if err != nil {
		return err
	}

	// Create relative chart  
	percentages := cs.toPercentages(values, total)
	relPath := filepath.Join(cs.reportsDir, "weekly_distribution_rel.png")
	return cs.createSingleBarChart(
		labels,
		percentages,
		fmt.Sprintf("%s - Relative Verteilung (%%)", title),
		true,
		relPath,
	)
}

// GenerateComparison creates comparison charts
func (cs *ChartService) GenerateComparison(comp ComparisonData) error {
	if err := cs.ensureReportsDir(); err != nil {
		return err
	}

	// Get all unique labels
	allLabels := cs.getAllLabels(comp.DataA, comp.DataB)
	
	// Calculate percentages for both datasets
	totalA := cs.sumMap(comp.DataA)
	totalB := cs.sumMap(comp.DataB)
	
	if totalA == 0 && totalB == 0 {
		return fmt.Errorf("no data to compare")
	}

	var valuesA, valuesB, deltas []float64
	for _, label := range allLabels {
		var percA, percB float64
		if totalA > 0 {
			percA = float64(comp.DataA[label]) / float64(totalA) * 100
		}
		if totalB > 0 {
			percB = float64(comp.DataB[label]) / float64(totalB) * 100
		}
		valuesA = append(valuesA, percA)
		valuesB = append(valuesB, percB)
		
		// Calculate relative change (percentage change from A to B)
		var delta float64
		if percA > 0 {
			// Relative change: ((new - old) / old) * 100
			delta = ((percB - percA) / percA) * 100
		} else if percB > 0 {
			// If A was 0 but B has value, it's infinite increase (show as 100%)
			delta = 100
		} else {
			// Both are 0
			delta = 0
		}
		deltas = append(deltas, delta)
	}

	dateRange := fmt.Sprintf("%s bis %s vs. %s bis %s",
		FormatDate(comp.TimeA.Start), FormatDate(comp.TimeA.End),
		FormatDate(comp.TimeB.Start), FormatDate(comp.TimeB.End))
	
	title := fmt.Sprintf("%s vs. %s\n%s", comp.TimeA.Label, comp.TimeB.Label, dateRange)

	path := filepath.Join(cs.reportsDir, comp.Filename)
	return cs.createComparisonChart(
		allLabels, 
		valuesA, 
		valuesB, 
		deltas,
		comp.TimeA.Label, 
		comp.TimeB.Label, 
		title,
		path,
	)
}

// GenerateOverview creates the overview chart
func (cs *ChartService) GenerateOverview(data ChartData) error {
	if err := cs.ensureReportsDir(); err != nil {
		return err
	}

	labels, values := cs.extractData(data.Counts)
	total := cs.sum(values)
	
	if total == 0 {
		return fmt.Errorf("no data to display")
	}

	dateRange := fmt.Sprintf("%s bis %s", 
		FormatDate(data.TimeRange.Start), 
		FormatDate(data.TimeRange.End))
	
	title := fmt.Sprintf("Gesamtübersicht\n%s - Gesamt: %d", dateRange, total)

	path := filepath.Join(cs.reportsDir, data.Filename)
	return cs.createSingleBarChart(
		labels,
		values,
		title,
		false,
		path,
	)
}

// createSingleBarChart creates a single bar chart with values in bars
func (cs *ChartService) createSingleBarChart(labels []string, values []float64, title string, isPercentage bool, path string) error {
	width, height := 800, 600
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	
	// Fill background with white
	draw.Draw(img, img.Bounds(), &image.Uniform{color.RGBA{255, 255, 255, 255}}, image.Point{}, draw.Src)
	
	// Chart area
	chartX, chartY := 100, 80
	chartWidth, chartHeight := width-200, height-200
	
	// Draw title
	cs.drawText(img, width/2, 30, title, color.RGBA{0, 0, 0, 255}, true)
	
	if len(values) == 0 {
		return fmt.Errorf("no data to display")
	}
	
	// Find max value for scaling
	maxValue := 0.0
	for _, v := range values {
		if v > maxValue {
			maxValue = v
		}
	}
	
	// Ensure minimum scale
	if maxValue == 0 {
		maxValue = 1
	}
	
	barWidth := chartWidth / len(labels)
	if barWidth > 100 {
		barWidth = 100
	}
	
	spacing := (chartWidth - (barWidth * len(labels))) / (len(labels) + 1)
	
	// Draw bars
	for i, label := range labels {
		value := values[i]
		
		// Calculate bar height (minimum 5 pixels for visibility)
		barHeight := int(float64(chartHeight) * value / maxValue)
		if value > 0 && barHeight < 5 {
			barHeight = 5
		}
		
		x := chartX + spacing + i*(barWidth+spacing)
		y := chartY + chartHeight - barHeight
		
		// Draw bar
		barColor := chartColors[i%len(chartColors)]
		cs.drawRect(img, x, y, barWidth, barHeight, barColor)
		
		// Draw value in bar
		var valueText string
		if isPercentage {
			valueText = fmt.Sprintf("%.1f%%", value)
		} else {
			valueText = fmt.Sprintf("%.0f", value)
		}
		
		textY := y + barHeight/2
		if barHeight < 25 {
			textY = y - 10 // Place above bar if too small
		}
		cs.drawText(img, x+barWidth/2, textY, valueText, color.RGBA{255, 255, 255, 255}, true)
		
		// Draw label below bar
		cs.drawText(img, x+barWidth/2, chartY+chartHeight+20, label, color.RGBA{0, 0, 0, 255}, true)
	}
	
	// Draw Y-axis
	cs.drawLine(img, chartX, chartY, chartX, chartY+chartHeight, color.RGBA{0, 0, 0, 255})
	
	// Draw X-axis
	cs.drawLine(img, chartX, chartY+chartHeight, chartX+chartWidth, chartY+chartHeight, color.RGBA{0, 0, 0, 255})
	
	return cs.saveImage(img, path)
}

// createComparisonChart creates a comparison chart with delta values
func (cs *ChartService) createComparisonChart(labels []string, valuesA, valuesB, deltas []float64, labelA, labelB, title, path string) error {
	width, height := 1000, 700
	img := image.NewRGBA(image.Rect(0, 0, width, height))
	
	// Fill background with white
	draw.Draw(img, img.Bounds(), &image.Uniform{color.RGBA{255, 255, 255, 255}}, image.Point{}, draw.Src)
	
	// Chart area
	chartX, chartY := 120, 100
	chartWidth, chartHeight := width-240, height-250
	
	// Draw title
	cs.drawText(img, width/2, 30, title, color.RGBA{0, 0, 0, 255}, true)
	
	if len(valuesA) == 0 {
		return fmt.Errorf("no data to display")
	}
	
	// Find max value for scaling
	maxValue := 0.0
	for i := range valuesA {
		if valuesA[i] > maxValue {
			maxValue = valuesA[i]
		}
		if valuesB[i] > maxValue {
			maxValue = valuesB[i]
		}
	}
	
	if maxValue == 0 {
		maxValue = 1
	}
	
	groupWidth := chartWidth / len(labels)
	barWidth := groupWidth / 3 // Leave space for two bars and gap
	
	// Draw legend
	cs.drawRect(img, 50, 70, 15, 15, chartColors[0])
	cs.drawText(img, 75, 82, labelA, color.RGBA{0, 0, 0, 255}, false)
	cs.drawRect(img, 200, 70, 15, 15, chartColors[1])
	cs.drawText(img, 225, 82, labelB, color.RGBA{0, 0, 0, 255}, false)
	
	// Draw bars
	for i, label := range labels {
		valueA, valueB := valuesA[i], valuesB[i]
		
		// Calculate bar heights
		barHeightA := int(float64(chartHeight) * valueA / maxValue)
		barHeightB := int(float64(chartHeight) * valueB / maxValue)
		
		// Minimum height for visibility
		if valueA > 0 && barHeightA < 5 {
			barHeightA = 5
		}
		if valueB > 0 && barHeightB < 5 {
			barHeightB = 5
		}
		
		baseX := chartX + i*groupWidth + groupWidth/6
		
		// Bar A
		xA := baseX
		yA := chartY + chartHeight - barHeightA
		cs.drawRect(img, xA, yA, barWidth, barHeightA, chartColors[0])
		
		// Value in bar A
		valueTextA := fmt.Sprintf("%.1f%%", valueA)
		textYA := yA + barHeightA/2
		if barHeightA < 25 {
			textYA = yA - 10
		}
		cs.drawText(img, xA+barWidth/2, textYA, valueTextA, color.RGBA{255, 255, 255, 255}, true)
		
		// Bar B
		xB := baseX + barWidth + 5
		yB := chartY + chartHeight - barHeightB
		cs.drawRect(img, xB, yB, barWidth, barHeightB, chartColors[1])
		
		// Value in bar B
		valueTextB := fmt.Sprintf("%.1f%%", valueB)
		textYB := yB + barHeightB/2
		if barHeightB < 25 {
			textYB = yB - 10
		}
		cs.drawText(img, xB+barWidth/2, textYB, valueTextB, color.RGBA{255, 255, 255, 255}, true)
		
		// Delta value above bars
		delta := deltas[i]
		deltaText := fmt.Sprintf("Δ %.1f%%", delta)
		deltaColor := color.RGBA{0, 150, 0, 255} // Green for positive
		if delta < 0 {
			deltaColor = color.RGBA{200, 0, 0, 255} // Red for negative
		}
		
		maxBarY := yA
		if yB < yA {
			maxBarY = yB
		}
		cs.drawText(img, baseX+barWidth, maxBarY-15, deltaText, deltaColor, true)
		
		// Label below bars
		cs.drawText(img, baseX+barWidth, chartY+chartHeight+30, label, color.RGBA{0, 0, 0, 255}, true)
	}
	
	// Draw axes
	cs.drawLine(img, chartX, chartY, chartX, chartY+chartHeight, color.RGBA{0, 0, 0, 255})
	cs.drawLine(img, chartX, chartY+chartHeight, chartX+chartWidth, chartY+chartHeight, color.RGBA{0, 0, 0, 255})
	
	return cs.saveImage(img, path)
}

// Helper drawing functions
func (cs *ChartService) drawRect(img *image.RGBA, x, y, width, height int, col color.RGBA) {
	for i := 0; i < width; i++ {
		for j := 0; j < height; j++ {
			if x+i < img.Bounds().Max.X && y+j < img.Bounds().Max.Y {
				img.Set(x+i, y+j, col)
			}
		}
	}
}

func (cs *ChartService) drawLine(img *image.RGBA, x1, y1, x2, y2 int, col color.RGBA) {
	// Simple line drawing (horizontal or vertical)
	if x1 == x2 {
		// Vertical line
		for y := y1; y <= y2; y++ {
			if x1 < img.Bounds().Max.X && y < img.Bounds().Max.Y {
				img.Set(x1, y, col)
			}
		}
	} else {
		// Horizontal line
		for x := x1; x <= x2; x++ {
			if x < img.Bounds().Max.X && y1 < img.Bounds().Max.Y {
				img.Set(x, y1, col)
			}
		}
	}
}

func (cs *ChartService) drawText(img *image.RGBA, x, y int, text string, col color.RGBA, centered bool) {
	if centered {
		x -= len(text) * 3 // Rough centering
	}
	
	d := &font.Drawer{
		Dst:  img,
		Src:  &image.Uniform{col},
		Face: basicfont.Face7x13,
		Dot:  fixed.Point26_6{X: fixed.I(x), Y: fixed.I(y)},
	}
	d.DrawString(text)
}

// Helper methods
func (cs *ChartService) extractData(counts map[string]int) ([]string, []float64) {
	var labels []string
	var values []float64
	
	// Sort labels for consistent ordering
	for label := range counts {
		labels = append(labels, label)
	}
	sort.Strings(labels)
	
	for _, label := range labels {
		values = append(values, float64(counts[label]))
	}
	
	return labels, values
}

func (cs *ChartService) toPercentages(values []float64, total int) []float64 {
	var percentages []float64
	for _, value := range values {
		if total > 0 {
			percentages = append(percentages, value/float64(total)*100)
		} else {
			percentages = append(percentages, 0)
		}
	}
	return percentages
}

func (cs *ChartService) sum(values []float64) int {
	var total float64
	for _, v := range values {
		total += v
	}
	return int(total)
}

func (cs *ChartService) sumMap(data map[string]int) int {
	var total int
	for _, v := range data {
		total += v
	}
	return total
}

func (cs *ChartService) getAllLabels(dataA, dataB map[string]int) []string {
	labelSet := make(map[string]bool)
	
	for label := range dataA {
		labelSet[label] = true
	}
	for label := range dataB {
		labelSet[label] = true
	}
	
	var labels []string
	for label := range labelSet {
		labels = append(labels, label)
	}
	
	sort.Strings(labels)
	return labels
}

func (cs *ChartService) saveImage(img *image.RGBA, path string) error {
	f, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("failed to create file %s: %w", path, err)
	}
	defer f.Close()
	
	return png.Encode(f, img)
}
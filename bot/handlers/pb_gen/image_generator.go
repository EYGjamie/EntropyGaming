package pb_gen

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"io"
	"os"

	"golang.org/x/image/font"
	"golang.org/x/image/font/opentype"
	"golang.org/x/image/math/fixed"
)

// ImageGenerator handles the generation of profile pictures
type ImageGenerator struct{}

// NewImageGenerator creates a new ImageGenerator
func NewImageGenerator() *ImageGenerator {
	return &ImageGenerator{}
}

// GenerateAvatar erstellt ein Avatar-Bild basierend auf den gegebenen Parametern
func (ig *ImageGenerator) GenerateAvatar(data AvatarData) (io.Reader, error) {
	// Hintergrundbild laden (ORIGINAL HINTERGRUNDBILDER WERDEN VERWENDET)
	backgroundPath := data.BackgroundType.GetBackgroundPath()
	backgroundImg, err := ig.loadImage(backgroundPath)
	if err != nil {
		return nil, fmt.Errorf("fehler beim Laden des Hintergrundbildes: %w", err)
	}

	// Font abhängig vom Typ laden (dynamische Größe folgt unten)
	fontPath := data.BackgroundType.GetFontPath()

	var canvas *image.RGBA

	switch data.BackgroundType {
	case TypeBanner, TypeESportBanner:
		canvas, err = ig.generateBanner(backgroundImg, fontPath, data.Nickname)
	case TypeDark:
		canvas, err = ig.generateDarkProfile(backgroundImg, fontPath, data.Nickname)
	default:
		canvas, err = ig.generateDefaultProfile(backgroundImg, fontPath, data.Nickname)
	}

	if err != nil {
		return nil, fmt.Errorf("fehler beim Generieren des Bildes: %w", err)
	}

	// Bild als PNG in Buffer encodieren
	return ig.encodeToPNG(canvas)
}

// ---------- I/O ----------

func (ig *ImageGenerator) loadImage(path string) (image.Image, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("fehler beim Öffnen der Datei %s: %w", path, err)
	}
	defer file.Close()

	img, _, err := image.Decode(file)
	if err != nil {
		return nil, fmt.Errorf("fehler beim Dekodieren der Bilddatei %s: %w", path, err)
	}
	return img, nil
}

func (ig *ImageGenerator) loadFontFace(ttfPath string, size float64) (font.Face, error) {
	ttfBytes, err := os.ReadFile(ttfPath)
	if err != nil {
		return nil, fmt.Errorf("fehler beim Lesen der Font-Datei %s: %w", ttfPath, err)
	}
	ft, err := opentype.Parse(ttfBytes)
	if err != nil {
		return nil, fmt.Errorf("fehler beim Parsen der Font-Datei %s: %w", ttfPath, err)
	}
	face, err := opentype.NewFace(ft, &opentype.FaceOptions{
		Size:    size,
		DPI:     72,
		Hinting: font.HintingFull,
	})
	if err != nil {
		return nil, fmt.Errorf("fehler beim Erstellen des Font-Face: %w", err)
	}
	return face, nil
}

// ---------- Banner ----------

func (ig *ImageGenerator) generateBanner(background image.Image, fontPath string, nickname string) (*image.RGBA, error) {
	bounds := background.Bounds()
	canvasWidth, canvasHeight := bounds.Dx(), bounds.Dy()

	canvas := image.NewRGBA(bounds)
	draw.Draw(canvas, bounds, background, bounds.Min, draw.Src)

	// Dynamische Schriftgröße: max 40pt, <= 50% der Bannerbreite
	maxFontSize := 40.0
	minFontSize := 10.0
	letterSpacing := BannerLetterSpacing

	var face font.Face
	var err error
	fontSize := maxFontSize

	for {
		face, err = ig.loadFontFace(fontPath, fontSize)
		if err != nil {
			return nil, err
		}
		textWidth := ig.calculateTextWidthWithSpacing(face, nickname, letterSpacing)
		if float64(textWidth) <= float64(canvasWidth)*0.5 || fontSize <= minFontSize {
			break
		}
		fontSize -= 2.0
	}

	textWidth := ig.calculateTextWidthWithSpacing(face, nickname, letterSpacing)
	anchorX := int(float64(canvasWidth) * BannerAnchorX)
	textX := anchorX - textWidth
	textY := int(float64(canvasHeight) * BannerTextY)

	ig.drawTextWithSpacing(canvas, face, nickname, textX, textY, letterSpacing, White)

	return canvas, nil
}

// ---------- Default/Dark ----------

func (ig *ImageGenerator) generateDefaultProfile(background image.Image, fontPath string, nickname string) (*image.RGBA, error) {
	canvas := image.NewRGBA(image.Rect(0, 0, DefaultCanvasWidth, DefaultCanvasHeight))

	// Hintergrund skalieren und zeichnen
	backgroundResized := ig.resizeImage(background, DefaultCanvasWidth, DefaultCanvasHeight)
	draw.Draw(canvas, canvas.Bounds(), backgroundResized, image.Point{}, draw.Src)

	// Dynamische Schriftgröße: max 450pt, bis maxWidth passt
	maxFontSize := 375.0
	minFontSize := 10.0
	maxWidth := DefaultCanvasWidth - 500

	var face font.Face
	var err error
	fontSize := maxFontSize

	for {
		face, err = ig.loadFontFace(fontPath, fontSize)
		if err != nil {
			return nil, err
		}
		tw := ig.calculateTextWidth(face, nickname)
		if tw <= maxWidth || fontSize <= minFontSize {
			break
		}
		fontSize -= 2.0
	}

	// Zentrierung + Y-Shift wie in Python
	textWidth := ig.calculateTextWidth(face, nickname)
	textX := (DefaultCanvasWidth - textWidth) / 2
	textY := DefaultTextY - int(float64(500-fontSize)/5.0)

	ig.drawText(canvas, face, nickname, textX, textY, White)

	return canvas, nil
}

func (ig *ImageGenerator) generateDarkProfile(background image.Image, fontPath string, nickname string) (*image.RGBA, error) {
	// gleiche Logik wie Default, aber mit anderem Font (kommt über fontPath aus types.go)
	return ig.generateDefaultProfile(background, fontPath, nickname)
}

// ---------- Text-Metriken & Zeichnen ----------

func (ig *ImageGenerator) calculateTextWidth(face font.Face, text string) int {
	if text == "" {
		return 0
	}
	// BoundString nutzt die Glyphen-Bounds des ganzen Strings
	bounds, _ := font.BoundString(face, text)
	return (bounds.Max.X - bounds.Min.X).Ceil()
}

func (ig *ImageGenerator) calculateTextWidthWithSpacing(face font.Face, text string, spacing int) int {
	if len(text) == 0 {
		return 0
	}
	total := 0
	for _, r := range text {
		b, _ := font.BoundString(face, string(r))
		total += (b.Max.X - b.Min.X).Ceil()
	}
	total += spacing * (len([]rune(text)) - 1)
	return total
}

func (ig *ImageGenerator) drawText(dst *image.RGBA, face font.Face, text string, x, y int, c color.RGBA) {
	d := &font.Drawer{
		Dst:  dst,
		Src:  &image.Uniform{C: c},
		Face: face,
		Dot:  fixed.P(x, y),
	}
	d.DrawString(text)
}

func (ig *ImageGenerator) drawTextWithSpacing(dst *image.RGBA, face font.Face, text string, x, y, spacing int, c color.RGBA) {
	currentX := x
	for _, r := range text {
		d := &font.Drawer{
			Dst:  dst,
			Src:  &image.Uniform{C: c},
			Face: face,
			Dot:  fixed.P(currentX, y),
		}
		d.DrawString(string(r))
		b, _ := font.BoundString(face, string(r))
		charWidth := (b.Max.X - b.Min.X).Ceil()
		currentX += charWidth + spacing
	}
}

// ---------- Skalierung & Encoding ----------

func (ig *ImageGenerator) resizeImage(src image.Image, width, height int) *image.RGBA {
	dst := image.NewRGBA(image.Rect(0, 0, width, height))
	b := src.Bounds()

	scaleX := float64(b.Dx()) / float64(width)
	scaleY := float64(b.Dy()) / float64(height)

	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			srcX := int(float64(x)*scaleX) + b.Min.X
			srcY := int(float64(y)*scaleY) + b.Min.Y
			dst.Set(x, y, src.At(srcX, srcY))
		}
	}
	return dst
}

func (ig *ImageGenerator) encodeToPNG(img *image.RGBA) (io.Reader, error) {
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}
	return &buf, nil
}

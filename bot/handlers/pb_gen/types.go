package pb_gen

import (
	"image/color"
)

// ProfilePictureType definiert die verfügbaren Hintergrund-Typen
type ProfilePictureType string

const (
	TypeDefault      ProfilePictureType = "default"
	TypeDark         ProfilePictureType = "dark"
	TypeBanner       ProfilePictureType = "banner"
	TypeESportBanner ProfilePictureType = "esport-banner"
)

// AvatarData enthält alle Informationen für die Avatar-Generierung
type AvatarData struct {
	Nickname       string
	BackgroundType ProfilePictureType
}

// Konstanten für Dateipfade
const (
	FontUserLogo = "data/fonts/squer1.ttf"
	FontBanner   = "data/fonts/squer1.ttf"
	FontTeamLogo = "data/fonts/Cyberthrone.ttf"

	BGUserLogo     = "data/bg/SpielerProfilbild.png"
	BGBanner       = "data/bg/SpielerBanner.png"
	BGTeamLogo     = "data/bg/TeamProfilbildOld.png"
	BGESportBanner = "data/bg/entropy_banner.png"
)

// Konstanten für Canvas-Größen
const (
	DefaultCanvasWidth  = 1500
	DefaultCanvasHeight = 1500
	DefaultTextY        = 1180

	BannerLetterSpacing = 18
	BannerAnchorX       = 0.60
	BannerTextY         = 0.625
)

// Farben
var (
	White = color.RGBA{255, 255, 255, 255}
	Black = color.RGBA{0, 0, 0, 255}
)

// GetBackgroundPath gibt den Pfad zur entsprechenden Hintergrunddatei zurück
func (t ProfilePictureType) GetBackgroundPath() string {
	switch t {
	case TypeDefault:
		return BGUserLogo
	case TypeDark:
		return BGTeamLogo
	case TypeBanner:
		return BGBanner
	case TypeESportBanner:
		return BGESportBanner
	default:
		return BGUserLogo
	}
}

// GetFontPath gibt den Pfad zur entsprechenden Font-Datei zurück
func (t ProfilePictureType) GetFontPath() string {
	switch t {
	case TypeDefault:
		return FontUserLogo
	case TypeDark:
		return FontTeamLogo
	case TypeBanner:
		return FontBanner
	case TypeESportBanner:
		return FontBanner
	default:
		return FontUserLogo
	}
}

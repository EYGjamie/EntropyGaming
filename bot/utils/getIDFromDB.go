package utils

import (
	"bot/database"
	"fmt"
	"os"

	"github.com/bwmarrin/discordgo"
)

// represents a constant entry in the database
type BotConstant struct {
	ID          int    `json:"id"`
	ConstKey    string `json:"const_key"`
	ProdValue   string `json:"prod_value"`
	TestValue   string `json:"test_value"`
	Description string `json:"description"`
	Category    string `json:"category"`
	IsActive    bool   `json:"is_active"`
}

// Gives the value of the constant based on the environment (prod/test)
// If the constant is not found or an error occurs, it logs the error and returns an empty string
// It also notifies the admins about the error
func GetIdFromDB(bot *discordgo.Session, constKey string) (string) {
	constant, err := GetConstantEntryFromDB(bot, constKey)
	if err != nil {
		LogAndNotifyAdmins(bot, "critical", "Database Error", "Func:GetIDFromDB", true, err, fmt.Sprintf("Failed to get constant with key: %s", constKey))
		return ""
	}
	value := selectValue(constant)
	return value
}

// gets const Entry from db table bot_const_ids (ID, const_key, prod_value, test_value, description, category, is_active)
func GetConstantEntryFromDB(bot *discordgo.Session, constKey string) (*BotConstant, error) {
	query := `
			SELECT 
				id, 
				const_key, 
				COALESCE(prod_value, ''), 
				COALESCE(test_value, ''), 
				COALESCE(description, ''), 
				COALESCE(category, ''), 
				is_active 
			FROM bot_const_ids 
			WHERE const_key = ? AND is_active = true 
			LIMIT 1
			`
	row := database.DB.QueryRow(query, constKey)
	var constant BotConstant
	err := row.Scan(
		&constant.ID,
		&constant.ConstKey,
		&constant.ProdValue,
		&constant.TestValue,
		&constant.Description,
		&constant.Category,
		&constant.IsActive,
	)
	if err != nil {
		LogAndNotifyAdmins(bot, "critical", "Database Error", "Func:GetConstantEntryFromDB", true, err, fmt.Sprintf("Failed to get constant with key: %s", constKey))
		return nil, nil
	}
	return &constant, nil
}

// selects the value based on the environment
// If IS_PROD is set to true or 1, it returns the ProdValue
// If IS_PROD is not set or set to false, it returns the TestValue if it is set, otherwise it returns the ProdValue as a fallback
func selectValue(constant *BotConstant) string {
	if os.Getenv("IS_PROD") == "true" || os.Getenv("IS_PROD") == "1" {
		return constant.ProdValue
	} else {
		if constant.TestValue != "" {
			return constant.TestValue
		}
		return constant.ProdValue // Fallback auf Prod-Wert, wenn Test-Wert nicht gesetzt ist
	}
}
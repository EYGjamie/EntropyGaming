package discord_administration_channel_voice

import (
	"database/sql"
	"fmt"
	"strings"

	"bot/utils"

	"github.com/bwmarrin/discordgo"
)

type CreateVoiceTracker struct {
	db              *sql.DB
	personalChannels map[string]string 
	channelOwners    map[string]string 
	createChannels   []string          
}

func NewCreateVoiceTracker(db *sql.DB) *CreateVoiceTracker {
	return &CreateVoiceTracker{
		db:              db,
		personalChannels: make(map[string]string),
		channelOwners:    make(map[string]string),
		createChannels:   []string{},
	}
}

func (cvt *CreateVoiceTracker) OnVoiceStateUpdate(bot *discordgo.Session, voiceState *discordgo.VoiceStateUpdate) {
	// Lade Create Voice Channel IDs aus der DB
	cvt.loadCreateChannels(bot)
	
	userID := voiceState.UserID
	newChannelID := voiceState.ChannelID
	oldChannelID := ""
	
	// Finde alten Channel des Users
	if oldChan, exists := cvt.personalChannels[userID]; exists {
		oldChannelID = oldChan
	}
	
	// Handle User joining a channel
	if newChannelID != "" {
		cvt.handleUserJoin(bot, voiceState, userID, newChannelID)
	}
	
	// Handle User leaving a channel (cleanup leere persönliche Channels)
	if oldChannelID != "" {
		cvt.handleUserLeave(bot, userID, oldChannelID)
	}
}

// Lädt die Create Voice Channel IDs aus der Datenbank
func (cvt *CreateVoiceTracker) loadCreateChannels(bot *discordgo.Session) {
	createChannelsStr := utils.GetIdFromDB(bot, "CREATE_VOICE_CHANNELS")
	if createChannelsStr == "" {
		return
	}
	cvt.createChannels = strings.Split(createChannelsStr, ",")
	for i, channelID := range cvt.createChannels {
		cvt.createChannels[i] = strings.TrimSpace(channelID)
	}
}

// Prüft ob ein Channel ein Create Voice Channel ist
func (cvt *CreateVoiceTracker) isCreateChannel(channelID string) bool {
	for _, createChanID := range cvt.createChannels {
		if createChanID == channelID {
			return true
		}
	}
	return false
}

// Behandelt das Beitreten eines Users zu einem Channel
func (cvt *CreateVoiceTracker) handleUserJoin(bot *discordgo.Session, voiceState *discordgo.VoiceStateUpdate, userID, channelID string) {
	// Prüfe ob User einem Create Voice Channel beitritt
	if cvt.isCreateChannel(channelID) {
		cvt.createPersonalChannel(bot, voiceState, userID, channelID)
		return
	}
	cvt.personalChannels[userID] = channelID
}

// Erstellt einen persönlichen Voice Channel für den User
func (cvt *CreateVoiceTracker) createPersonalChannel(bot *discordgo.Session, voiceState *discordgo.VoiceStateUpdate, userID, createChannelID string) {
	guildID := voiceState.GuildID
	
	// Hole User-Informationen
	user, err := bot.User(userID)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "medium", "Error", "create_voice.go", false, err, "Error getting user info for personal channel creation")
		return
	}
	
	// Hole Create Channel Info für Parent-Kategorie
	createChannel, err := bot.Channel(createChannelID)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "medium", "Error", "create_voice.go", false, err, "Error getting create channel info")
		return
	}
	
	// Erstelle persönlichen Channel Namen
	channelName := fmt.Sprintf("🔊・%s's Channel", user.Username)
	
	// Erstelle den persönlichen Voice Channel
	personalChannel, err := bot.GuildChannelCreateComplex(guildID, discordgo.GuildChannelCreateData{
		Name:     channelName,
		Type:     discordgo.ChannelTypeGuildVoice,
		ParentID: createChannel.ParentID, // Gleiche Kategorie wie Create Channel
	})
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "medium", "Error", "create_voice.go", true, err, "Error creating personal voice channel")
		return
	}
	
	// Setze Berechtigungen für den Channel-Owner
	err = bot.ChannelPermissionSet(
		personalChannel.ID,
		userID,
		discordgo.PermissionOverwriteTypeMember,
		discordgo.PermissionVoiceConnect|discordgo.PermissionVoiceSpeak|discordgo.PermissionVoiceMoveMembers|discordgo.PermissionVoiceMuteMembers|discordgo.PermissionVoiceDeafenMembers|discordgo.PermissionManageChannels,
		0,
	)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "low", "Error", "create_voice.go", false, err, "Error setting permissions for personal channel owner")
	}
	
	// Move User zu seinem persönlichen Channel
	err = bot.GuildMemberMove(guildID, userID, &personalChannel.ID)
	if err != nil {
		utils.LogAndNotifyAdmins(bot, "low", "Error", "create_voice.go", false, err, "Error moving user to personal channel")
	}
	
	// Update Tracking
	cvt.personalChannels[userID] = personalChannel.ID
	cvt.channelOwners[personalChannel.ID] = userID
	
	utils.LogAndNotifyAdmins(bot, "info", "Info", "create_voice.go", false, nil, fmt.Sprintf("Personal voice channel created for user %s (%s)", user.Username, userID))
}

// Behandelt das Verlassen eines Users von einem Channel
func (cvt *CreateVoiceTracker) handleUserLeave(bot *discordgo.Session, userID, oldChannelID string) {
	delete(cvt.personalChannels, userID)
	if ownerID, isPersonal := cvt.channelOwners[oldChannelID]; isPersonal {
		cvt.checkAndDeleteEmptyChannel(bot, oldChannelID, ownerID)
	}
}

// Prüft ob ein persönlicher Channel leer ist und löscht ihn gegebenenfalls
func (cvt *CreateVoiceTracker) checkAndDeleteEmptyChannel(bot *discordgo.Session, channelID, ownerID string) {
	userCount := 0
	for _, trackedChannelID := range cvt.personalChannels {
		if trackedChannelID == channelID {
			userCount++
		}
	}
	if userCount == 0 {
		_, err := bot.ChannelDelete(channelID)
		if err != nil {
			utils.LogAndNotifyAdmins(bot, "low", "Error", "create_voice.go", false, err, "Error deleting empty personal channel")
			return
		}
		delete(cvt.channelOwners, channelID)
		user, err := bot.User(ownerID)
		username := "Unknown"
		if err == nil {
			username = user.Username
		}		
		utils.LogAndNotifyAdmins(bot, "info", "Info", "create_voice.go", false, nil, fmt.Sprintf("Empty personal voice channel deleted for user %s (%s)", username, ownerID))
	}
}
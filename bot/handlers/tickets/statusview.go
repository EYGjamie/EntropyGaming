package tickets

import (
    "database/sql"
    "fmt"
    "log"
    "time"

    "github.com/bwmarrin/discordgo"
)

/*--------------------------------------------------------------------------------------------------------------------------*/

type Ticket struct {
    ID          int
    Status      string
    Bereich     string
    ChannelID   int64
    BearbeiterID sql.NullInt64
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// StartTicketStatusUpdater starts a goroutine that updates the ticket status view every minute
func StartTicketStatusUpdater(s *discordgo.Session, db *sql.DB, channelID string) {
    ticker := time.NewTicker(1 * time.Minute)
    go func() {
        var messageID string
        for {
            <-ticker.C
            if messageID == "" {
                messageID = sendInitialMessage(s, channelID)
            }
            updateTicketStatusView(s, db, channelID, messageID)
        }
    }()
}

/*--------------------------------------------------------------------------------------------------------------------------*/

func sendInitialMessage(s *discordgo.Session, channelID string) string {

    // Cleanup of old message
    purgeChannel(s, channelID)

    // send Initiale Nachricht
    msg, err := s.ChannelMessageSend(channelID, "# Ticket Status Updates")
    if err != nil {
        log.Printf("Fehler beim Senden der initialen Nachricht: %v", err)
        return ""
    }
    return msg.ID
}

/*--------------------------------------------------------------------------------------------------------------------------*/

func purgeChannel(s *discordgo.Session, channelID string) {
    // Nachrichten in Batches von 100 (max. erlaubt) abrufen und löschen
    var beforeID string
    for {
        msgs, err := s.ChannelMessages(channelID, 100, beforeID, "", "")
        if err != nil {
            log.Printf("Fehler beim Abrufen der Nachrichten: %v", err)
            return
        }
        if len(msgs) == 0 {
            break
        }
        for _, msg := range msgs {
            s.ChannelMessageDelete(channelID, msg.ID)
        }
        beforeID = msgs[len(msgs)-1].ID
    }
}

/*--------------------------------------------------------------------------------------------------------------------------*/

func updateTicketStatusView(s *discordgo.Session, db *sql.DB, channelID, messageID string) {
    // Get all tickets from the database
    tickets, err := fetchTickets(db)
    if err != nil {
        log.Printf("Fehler beim Abrufen der Tickets: %v", err)
        return
    }

    // create a map to group tickets by area
    // and check if the channel exists
    ticketBereiche := map[string][]string{}
    for _, ticket := range tickets {
        // check if the channel exists
        if !channelExists(s, ticket.ChannelID) {
            markTicketAsDeleted(db, ticket.ID)
            continue
        }

        bearbeiter := ""
        if ticket.BearbeiterID.Valid {
            bearbeiter = fmt.Sprintf(" Bearbeiter: <@%d> - ", ticket.BearbeiterID.Int64)
        }
        entry := fmt.Sprintf("#%d - %s - %s<#%d> \n", ticket.ID, ticket.Status, bearbeiter, ticket.ChannelID)
        ticketBereiche[ticket.Bereich] = append(ticketBereiche[ticket.Bereich], entry)
    }

    // Create View
    fields := []*discordgo.MessageEmbedField{}
    for bereich, entries := range ticketBereiche {
        fields = append(fields, &discordgo.MessageEmbedField{
            Name:  getTicketAreaForTicket(bereich),
            Value: formatEntries(entries),
        })
    }

    embed := &discordgo.MessageEmbed{
        Title:  "Ticket Status Updates",
        Fields: fields,
        Color:  0x3498db, // Blue
    }

    // Update the message with the new embed
    _, err = s.ChannelMessageEditEmbed(channelID, messageID, embed)
    if err != nil {
        log.Printf("Fehler beim Aktualisieren der Status-View: %v", err)
    }
}

/*--------------------------------------------------------------------------------------------------------------------------*/

// fetchTickets retrieves all tickets from the database that are not marked as "Deleted"
func fetchTickets(db *sql.DB) ([]Ticket, error) {
    rows, err := db.Query("SELECT ticket_id, ticket_status, ticket_bereich, ticket_channel_id, ticket_bearbeiter_id FROM tickets WHERE ticket_status != ?", "Deleted")
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var tickets []Ticket
    for rows.Next() {
        var ticket Ticket
        err := rows.Scan(&ticket.ID, &ticket.Status, &ticket.Bereich, &ticket.ChannelID, &ticket.BearbeiterID)
        if err != nil {
            return nil, err
        }
        tickets = append(tickets, ticket)
    }
    return tickets, nil
}

/*--------------------------------------------------------------------------------------------------------------------------*/

func markTicketAsDeleted(db *sql.DB, ticketID int) {
    _, err := db.Exec("UPDATE tickets SET ticket_status = ? WHERE ticket_id = ?", "Deleted", ticketID)
    if err != nil {
        log.Printf("Fehler beim Markieren des Tickets als Deleted: %v", err)
    }
}

/*--------------------------------------------------------------------------------------------------------------------------*/

func channelExists(s *discordgo.Session, channelID int64) bool {
    _, err := s.Channel(fmt.Sprintf("%d", channelID))
    return err == nil
}

/*--------------------------------------------------------------------------------------------------------------------------*/

func formatEntries(entries []string) string {
    if len(entries) == 0 {
        return "Keine Tickets"
    }
    return fmt.Sprintf("%s", entries)
}

/*--------------------------------------------------------------------------------------------------------------------------*/

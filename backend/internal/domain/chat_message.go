package domain

import (
	"strings"
	"time"
)

type ChatMessage struct {
	ID           int    `json:"idMensagem"`
	FromUserID   int    `json:"idRemetente"`
	ToUserID     int    `json:"idDestinatario"`
	PropertyID   int    `json:"idImovel,omitempty"`
	Content      string `json:"conteudo"`
	CreatedAt    string `json:"dataCriacao"`
}

func (m *ChatMessage) Normalize() {
	m.Content = strings.TrimSpace(m.Content)
	m.CreatedAt = strings.TrimSpace(m.CreatedAt)
	if m.CreatedAt == "" {
		m.CreatedAt = time.Now().Format(time.RFC3339)
	}
}

func (m ChatMessage) Validate() error {
	if m.FromUserID <= 0 || m.ToUserID <= 0 {
		return ErrInvalidEntity
	}
	if m.FromUserID == m.ToUserID {
		return ErrInvalidEntity
	}
	if strings.TrimSpace(m.Content) == "" {
		return ErrInvalidEntity
	}
	if strings.TrimSpace(m.CreatedAt) == "" {
		return ErrInvalidEntity
	}
	return nil
}

package handler

import (
	"backend/internal/domain"
	chatuc "backend/internal/usecase/chat"
	"encoding/json"
	"net/http"
	"strconv"
)

type createChatMessageRequest struct {
	FromUserID int    `json:"idRemetente"`
	ToUserID   int    `json:"idDestinatario"`
	PropertyID int    `json:"idImovel,omitempty"`
	Content    string `json:"conteudo"`
}

type ChatHandler struct {
	svc chatuc.Service
}

func NewChatHandler(svc chatuc.Service) *ChatHandler {
	return &ChatHandler{svc: svc}
}

func (h *ChatHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, err := strconv.Atoi(r.URL.Query().Get("userId"))
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}

	var withUserID *int
	if raw := r.URL.Query().Get("withUserId"); raw != "" {
		parsed, parseErr := strconv.Atoi(raw)
		if parseErr != nil {
			respondError(w, http.StatusBadRequest, parseErr)
			return
		}
		withUserID = &parsed
	}

	var propertyID *int
	if raw := r.URL.Query().Get("propertyId"); raw != "" {
		parsed, parseErr := strconv.Atoi(raw)
		if parseErr != nil {
			respondError(w, http.StatusBadRequest, parseErr)
			return
		}
		propertyID = &parsed
	}

	items, err := h.svc.ListForUser(userID, withUserID, propertyID)
	if err != nil {
		respondDomainError(w, err)
		return
	}

	respondJSON(w, http.StatusOK, items)
}

func (h *ChatHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createChatMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}

	created, err := h.svc.Send(domain.ChatMessage{
		FromUserID: req.FromUserID,
		ToUserID:   req.ToUserID,
		PropertyID: req.PropertyID,
		Content:    req.Content,
	})
	if err != nil {
		respondDomainError(w, err)
		return
	}

	respondJSON(w, http.StatusCreated, created)
}

func (h *ChatHandler) ListContacts(w http.ResponseWriter, r *http.Request) {
	userID, err := strconv.Atoi(r.URL.Query().Get("userId"))
	if err != nil {
		respondError(w, http.StatusBadRequest, err)
		return
	}

	contacts, err := h.svc.ListAllowedContacts(userID)
	if err != nil {
		respondDomainError(w, err)
		return
	}

	respondJSON(w, http.StatusOK, contacts)
}

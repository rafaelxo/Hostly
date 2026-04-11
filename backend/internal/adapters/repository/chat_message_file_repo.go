package repository

import (
	"backend/internal/domain"
	chatuc "backend/internal/usecase/chat"
)

type ChatMessageFileRepository struct {
	store *binaryEntityStore[domain.ChatMessage]
}

func NewChatMessageFileRepository(path string) (*ChatMessageFileRepository, error) {
	store, err := newBinaryEntityStore(
		path,
		func(m domain.ChatMessage) int { return m.ID },
		func(m *domain.ChatMessage, id int) { m.ID = id },
		chatMessagePayloadCodec(),
	)
	if err != nil {
		return nil, err
	}
	return &ChatMessageFileRepository{store: store}, nil
}

func (r *ChatMessageFileRepository) Create(item domain.ChatMessage) (domain.ChatMessage, error) {
	return r.store.Create(item)
}

func (r *ChatMessageFileRepository) GetByID(id int) (domain.ChatMessage, error) {
	return r.store.GetByID(id)
}

func (r *ChatMessageFileRepository) GetAll() ([]domain.ChatMessage, error) {
	return r.store.GetAll()
}

func (r *ChatMessageFileRepository) Update(id int, item domain.ChatMessage) (domain.ChatMessage, error) {
	return r.store.Update(id, item)
}

func (r *ChatMessageFileRepository) Delete(id int) error {
	return r.store.Delete(id)
}

var _ chatuc.Repository = (*ChatMessageFileRepository)(nil)

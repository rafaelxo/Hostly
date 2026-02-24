package domain

import "errors"

var (
	ErrNotFound      = errors.New("Registro não encontrado")
	ErrInvalidEntity = errors.New("Entidade inválida")
)
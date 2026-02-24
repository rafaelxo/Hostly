package repository

import (
	"bytes"
	"encoding/binary"
	"fmt"

	"backend/internal/domain"
)

func propertyPayloadCodec() payloadCodec[domain.Property] {
	return payloadCodec[domain.Property]{
		encode: encodeProperty,
		decode: decodeProperty,
	}
}

func userPayloadCodec() payloadCodec[domain.User] {
	return payloadCodec[domain.User]{
		encode: encodeUser,
		decode: decodeUser,
	}
}

func reservationPayloadCodec() payloadCodec[domain.Reservation] {
	return payloadCodec[domain.Reservation]{
		encode: encodeReservation,
		decode: decodeReservation,
	}
}

func encodeProperty(item domain.Property) ([]byte, error) {
	buf := &bytes.Buffer{}

	if err := writeInt32(buf, int32(item.ID)); err != nil {
		return nil, err
	}
	if err := writeInt32(buf, int32(item.UserID)); err != nil {
		return nil, err
	}
	if err := writeString(buf, item.Title); err != nil {
		return nil, err
	}
	if err := writeString(buf, item.Description); err != nil {
		return nil, err
	}
	if err := writeString(buf, item.City); err != nil {
		return nil, err
	}
	if err := writeFloat64(buf, item.DailyRate); err != nil {
		return nil, err
	}
	if err := writeString(buf, item.CreatedAt); err != nil {
		return nil, err
	}

	if err := writeUint32(buf, uint32(len(item.Photos))); err != nil {
		return nil, err
	}
	for _, photo := range item.Photos {
		if err := writeString(buf, photo); err != nil {
			return nil, err
		}
	}

	if err := writeBool(buf, item.Active); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

func decodeProperty(payload []byte) (domain.Property, error) {
	reader := bytes.NewReader(payload)
	var item domain.Property

	id, err := readInt32(reader)
	if err != nil {
		return domain.Property{}, err
	}
	item.ID = int(id)

	userID, err := readInt32(reader)
	if err != nil {
		return domain.Property{}, err
	}
	item.UserID = int(userID)

	item.Title, err = readString(reader)
	if err != nil {
		return domain.Property{}, err
	}
	item.Description, err = readString(reader)
	if err != nil {
		return domain.Property{}, err
	}
	item.City, err = readString(reader)
	if err != nil {
		return domain.Property{}, err
	}
	item.DailyRate, err = readFloat64(reader)
	if err != nil {
		return domain.Property{}, err
	}
	item.CreatedAt, err = readString(reader)
	if err != nil {
		return domain.Property{}, err
	}

	photosCount, err := readUint32(reader)
	if err != nil {
		return domain.Property{}, err
	}
	item.Photos = make([]string, 0, photosCount)
	for i := uint32(0); i < photosCount; i++ {
		photo, err := readString(reader)
		if err != nil {
			return domain.Property{}, err
		}
		item.Photos = append(item.Photos, photo)
	}

	item.Active, err = readBool(reader)
	if err != nil {
		return domain.Property{}, err
	}

	return item, nil
}

func encodeUser(item domain.User) ([]byte, error) {
	buf := &bytes.Buffer{}

	if err := writeInt32(buf, int32(item.ID)); err != nil {
		return nil, err
	}
	if err := writeString(buf, item.Name); err != nil {
		return nil, err
	}
	if err := writeString(buf, item.Email); err != nil {
		return nil, err
	}
	if err := writeString(buf, item.Password); err != nil {
		return nil, err
	}
	if err := writeString(buf, string(item.Type)); err != nil {
		return nil, err
	}
	if err := writeBool(buf, item.Active); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

func decodeUser(payload []byte) (domain.User, error) {
	reader := bytes.NewReader(payload)
	var item domain.User

	id, err := readInt32(reader)
	if err != nil {
		return domain.User{}, err
	}
	item.ID = int(id)

	item.Name, err = readString(reader)
	if err != nil {
		return domain.User{}, err
	}
	item.Email, err = readString(reader)
	if err != nil {
		return domain.User{}, err
	}
	item.Password, err = readString(reader)
	if err != nil {
		return domain.User{}, err
	}
	t, err := readString(reader)
	if err != nil {
		return domain.User{}, err
	}
	item.Type = domain.UserType(t)
	item.Active, err = readBool(reader)
	if err != nil {
		return domain.User{}, err
	}

	return item, nil
}

func encodeReservation(item domain.Reservation) ([]byte, error) {
	buf := &bytes.Buffer{}

	if err := writeInt32(buf, int32(item.ID)); err != nil {
		return nil, err
	}
	if err := writeInt32(buf, int32(item.PropertyID)); err != nil {
		return nil, err
	}
	if err := writeInt32(buf, int32(item.GuestID)); err != nil {
		return nil, err
	}
	if err := writeString(buf, item.StartDate); err != nil {
		return nil, err
	}
	if err := writeString(buf, item.EndDate); err != nil {
		return nil, err
	}
	if err := writeFloat64(buf, item.TotalValue); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

func decodeReservation(payload []byte) (domain.Reservation, error) {
	reader := bytes.NewReader(payload)
	var item domain.Reservation

	id, err := readInt32(reader)
	if err != nil {
		return domain.Reservation{}, err
	}
	item.ID = int(id)

	propertyID, err := readInt32(reader)
	if err != nil {
		return domain.Reservation{}, err
	}
	item.PropertyID = int(propertyID)

	guestID, err := readInt32(reader)
	if err != nil {
		return domain.Reservation{}, err
	}
	item.GuestID = int(guestID)

	item.StartDate, err = readString(reader)
	if err != nil {
		return domain.Reservation{}, err
	}
	item.EndDate, err = readString(reader)
	if err != nil {
		return domain.Reservation{}, err
	}
	item.TotalValue, err = readFloat64(reader)
	if err != nil {
		return domain.Reservation{}, err
	}

	return item, nil
}

func writeString(buf *bytes.Buffer, value string) error {
	bytesValue := []byte(value)
	if err := writeUint32(buf, uint32(len(bytesValue))); err != nil {
		return err
	}
	_, err := buf.Write(bytesValue)
	return err
}

func readString(reader *bytes.Reader) (string, error) {
	size, err := readUint32(reader)
	if err != nil {
		return "", err
	}

	if uint64(size) > uint64(reader.Len()) {
		return "", fmt.Errorf("tamanho de string invalido")
	}

	data := make([]byte, size)
	if _, err := reader.Read(data); err != nil {
		return "", err
	}

	return string(data), nil
}

func writeBool(buf *bytes.Buffer, value bool) error {
	if value {
		return buf.WriteByte(1)
	}
	return buf.WriteByte(0)
}

func readBool(reader *bytes.Reader) (bool, error) {
	value, err := reader.ReadByte()
	if err != nil {
		return false, err
	}
	return value == 1, nil
}

func writeInt32(buf *bytes.Buffer, value int32) error {
	return binary.Write(buf, binary.LittleEndian, value)
}

func readInt32(reader *bytes.Reader) (int32, error) {
	var value int32
	if err := binary.Read(reader, binary.LittleEndian, &value); err != nil {
		return 0, err
	}
	return value, nil
}

func writeUint32(buf *bytes.Buffer, value uint32) error {
	return binary.Write(buf, binary.LittleEndian, value)
}

func readUint32(reader *bytes.Reader) (uint32, error) {
	var value uint32
	if err := binary.Read(reader, binary.LittleEndian, &value); err != nil {
		return 0, err
	}
	return value, nil
}

func writeFloat64(buf *bytes.Buffer, value float64) error {
	return binary.Write(buf, binary.LittleEndian, value)
}

func readFloat64(reader *bytes.Reader) (float64, error) {
	var value float64
	if err := binary.Read(reader, binary.LittleEndian, &value); err != nil {
		return 0, err
	}
	return value, nil
}

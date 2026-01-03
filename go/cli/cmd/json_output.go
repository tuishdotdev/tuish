package cmd

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
)

type jsonError struct {
	Error string `json:"error"`
}

type jsonSuccess struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
}

type jsonNotImplemented struct {
	Status  string `json:"status"`
	Title   string `json:"title"`
	Message string `json:"message"`
}

func writeJSON(w io.Writer, payload any) error {
	data, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return err
	}
	_, err = fmt.Fprintln(w, string(data))
	return err
}

func writeJSONError(err error) {
	_ = writeJSON(os.Stderr, jsonError{Error: err.Error()})
}

func writeJSONSuccess(message string) error {
	return writeJSON(os.Stdout, jsonSuccess{Success: true, Message: message})
}

func writeJSONNotImplemented(title, message string) {
	_ = writeJSON(os.Stdout, jsonNotImplemented{
		Status:  "not_implemented",
		Title:   title,
		Message: message,
	})
}

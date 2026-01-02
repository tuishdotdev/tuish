package tuish

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const (
	defaultAPIURL     = "https://tuish-api-production.doug-lance.workers.dev"
	defaultTimeout    = 30 * time.Second
)

// APIError represents an API error response.
type APIError struct {
	StatusCode int
	Code       string
	Message    string
	Details    map[string]any
}

func (e *APIError) Error() string {
	if e.Code != "" {
		return fmt.Sprintf("%s: %s (status %d)", e.Code, e.Message, e.StatusCode)
	}
	return fmt.Sprintf("%s (status %d)", e.Message, e.StatusCode)
}

// apiResponse wraps API responses.
type apiResponse[T any] struct {
	Success bool           `json:"success"`
	Data    T              `json:"data"`
	Error   *apiErrorBody  `json:"error,omitempty"`
}

type apiErrorBody struct {
	Code    string         `json:"code"`
	Message string         `json:"message"`
	Details map[string]any `json:"details,omitempty"`
}

// Client is the HTTP client for the tuish API.
type Client struct {
	baseURL       string
	apiKey        string
	identityToken string
	httpClient    *http.Client
	debug         bool
}

// NewClient creates a new API client.
func NewClient(baseURL, apiKey string, debug bool) *Client {
	if baseURL == "" {
		baseURL = defaultAPIURL
	}

	return &Client{
		baseURL: baseURL,
		apiKey:  apiKey,
		httpClient: &http.Client{
			Timeout: defaultTimeout,
		},
		debug: debug,
	}
}

// SetIdentityToken sets the identity token for authenticated requests.
func (c *Client) SetIdentityToken(token string) {
	c.identityToken = token
}

// ClearIdentityToken clears the identity token.
func (c *Client) ClearIdentityToken() {
	c.identityToken = ""
}

// request makes an HTTP request to the API.
func (c *Client) request(ctx context.Context, method, path string, body any, useAPIKey, useIdentityToken bool, result any) error {
	url := c.baseURL + path

	var bodyReader io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("marshal request body: %w", err)
		}
		bodyReader = bytes.NewReader(jsonBody)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	if useAPIKey && c.apiKey != "" {
		req.Header.Set("X-API-Key", c.apiKey)
	}

	if useIdentityToken && c.identityToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.identityToken)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		var apiResp apiResponse[any]
		if err := json.Unmarshal(respBody, &apiResp); err == nil && apiResp.Error != nil {
			return &APIError{
				StatusCode: resp.StatusCode,
				Code:       apiResp.Error.Code,
				Message:    apiResp.Error.Message,
				Details:    apiResp.Error.Details,
			}
		}
		return &APIError{
			StatusCode: resp.StatusCode,
			Message:    fmt.Sprintf("request failed with status %d", resp.StatusCode),
		}
	}

	if result != nil {
		// Try to unmarshal as wrapped response first
		var wrapped struct {
			Success bool            `json:"success"`
			Data    json.RawMessage `json:"data"`
		}
		if err := json.Unmarshal(respBody, &wrapped); err == nil && wrapped.Data != nil {
			return json.Unmarshal(wrapped.Data, result)
		}

		// Fall back to direct unmarshal
		return json.Unmarshal(respBody, result)
	}

	return nil
}

// CreateCheckoutSession creates a browser checkout session.
func (c *Client) CreateCheckoutSession(ctx context.Context, productID, email string) (*CheckoutSessionResult, error) {
	body := map[string]string{
		"productId": productID,
	}
	if email != "" {
		body["email"] = email
	}

	var result CheckoutSessionResult
	err := c.request(ctx, "POST", "/v1/checkout/init", body, true, false, &result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

// GetCheckoutStatus checks checkout session status.
func (c *Client) GetCheckoutStatus(ctx context.Context, sessionID string) (*CheckoutStatus, error) {
	var result CheckoutStatus
	err := c.request(ctx, "GET", "/v1/checkout/status/"+sessionID, nil, false, false, &result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

// RequestLoginOtp requests an OTP for login.
func (c *Client) RequestLoginOtp(ctx context.Context, email string) (*OtpRequestResult, error) {
	body := map[string]string{
		"email": email,
	}

	var result OtpRequestResult
	err := c.request(ctx, "POST", "/v1/auth/login/init", body, false, false, &result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

// VerifyLogin verifies an OTP and logs in.
func (c *Client) VerifyLogin(ctx context.Context, email, otpID, otp, deviceFingerprint string) (*LoginResult, error) {
	body := map[string]string{
		"email":             email,
		"otpId":             otpID,
		"otp":               otp,
		"deviceFingerprint": deviceFingerprint,
	}

	var result LoginResult
	err := c.request(ctx, "POST", "/v1/auth/login/verify", body, false, false, &result)
	if err != nil {
		return nil, err
	}

	// Store the identity token
	c.identityToken = result.IdentityToken
	return &result, nil
}

// InitPurchase initializes a terminal purchase.
func (c *Client) InitPurchase(ctx context.Context, productID string) (*PurchaseInitResult, error) {
	body := map[string]string{
		"productId": productID,
	}

	var result PurchaseInitResult
	err := c.request(ctx, "POST", "/v1/purchase/init", body, false, true, &result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

// RequestPurchaseOtp requests an OTP for purchase confirmation.
func (c *Client) RequestPurchaseOtp(ctx context.Context) (*struct {
	OtpID     string `json:"otpId"`
	ExpiresIn int    `json:"expiresIn"`
}, error) {
	var result struct {
		OtpID     string `json:"otpId"`
		ExpiresIn int    `json:"expiresIn"`
	}
	err := c.request(ctx, "POST", "/v1/purchase/otp", nil, false, true, &result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

// ConfirmPurchase confirms a purchase with OTP.
func (c *Client) ConfirmPurchase(ctx context.Context, productID, cardID, otpID, otp string) (*PurchaseConfirmResult, error) {
	body := map[string]string{
		"productId": productID,
		"cardId":    cardID,
		"otpId":     otpID,
		"otp":       otp,
	}

	var result PurchaseConfirmResult
	err := c.request(ctx, "POST", "/v1/purchase/confirm", body, false, true, &result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

// ValidateLicense validates a license online.
func (c *Client) ValidateLicense(ctx context.Context, licenseKey, machineFingerprint string) (*ValidateResponse, error) {
	body := ValidateRequest{
		LicenseKey:         licenseKey,
		MachineFingerprint: machineFingerprint,
	}

	var result ValidateResponse
	err := c.request(ctx, "POST", "/v1/licenses/validate", body, true, false, &result)
	if err != nil {
		return nil, err
	}
	return &result, nil
}

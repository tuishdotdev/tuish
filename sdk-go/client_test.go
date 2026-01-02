package tuish

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestClientCreateCheckoutSession(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.URL.Path != "/v1/checkout/init" {
			http.NotFound(w, r)
			return
		}

		// Check API key header
		if r.Header.Get("X-API-Key") != "test_api_key" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		json.NewEncoder(w).Encode(map[string]any{
			"sessionId":   "sess_123",
			"checkoutUrl": "https://checkout.stripe.com/pay/cs_123",
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "test_api_key", false)

	result, err := client.CreateCheckoutSession(context.Background(), "prod_test", "test@example.com")
	if err != nil {
		t.Fatalf("CreateCheckoutSession failed: %v", err)
	}

	if result.SessionID != "sess_123" {
		t.Errorf("expected sessionId sess_123, got %s", result.SessionID)
	}

	if result.CheckoutURL != "https://checkout.stripe.com/pay/cs_123" {
		t.Errorf("unexpected checkoutUrl: %s", result.CheckoutURL)
	}
}

func TestClientGetCheckoutStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" || r.URL.Path != "/v1/checkout/status/sess_123" {
			http.NotFound(w, r)
			return
		}

		json.NewEncoder(w).Encode(map[string]any{
			"status":     "complete",
			"licenseKey": "header.payload.signature",
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "", false)

	result, err := client.GetCheckoutStatus(context.Background(), "sess_123")
	if err != nil {
		t.Fatalf("GetCheckoutStatus failed: %v", err)
	}

	if result.Status != "complete" {
		t.Errorf("expected status complete, got %s", result.Status)
	}

	if result.LicenseKey != "header.payload.signature" {
		t.Errorf("expected licenseKey, got %s", result.LicenseKey)
	}
}

func TestClientValidateLicense(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.URL.Path != "/v1/licenses/validate" {
			http.NotFound(w, r)
			return
		}

		// Check API key
		if r.Header.Get("X-API-Key") != "test_key" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		var req ValidateRequest
		json.NewDecoder(r.Body).Decode(&req)

		if req.LicenseKey == "valid_license" {
			json.NewEncoder(w).Encode(map[string]any{
				"valid": true,
				"license": map[string]any{
					"id":        "lic_123",
					"productId": "prod_test",
					"features":  []string{"feature1"},
					"status":    "active",
					"issuedAt":  time.Now().UnixMilli(),
					"expiresAt": time.Now().UnixMilli() + 86400000,
				},
			})
		} else {
			json.NewEncoder(w).Encode(map[string]any{
				"valid":  false,
				"reason": "not_found",
			})
		}
	}))
	defer server.Close()

	client := NewClient(server.URL, "test_key", false)

	// Valid license
	result, err := client.ValidateLicense(context.Background(), "valid_license", "fingerprint")
	if err != nil {
		t.Fatalf("ValidateLicense failed: %v", err)
	}

	if !result.Valid {
		t.Error("expected valid=true")
	}

	if result.License == nil {
		t.Fatal("expected license details")
	}

	if result.License.ID != "lic_123" {
		t.Errorf("expected license ID lic_123, got %s", result.License.ID)
	}

	// Invalid license
	result, err = client.ValidateLicense(context.Background(), "invalid_license", "fingerprint")
	if err != nil {
		t.Fatalf("ValidateLicense failed: %v", err)
	}

	if result.Valid {
		t.Error("expected valid=false")
	}

	if result.Reason != "not_found" {
		t.Errorf("expected reason not_found, got %s", result.Reason)
	}
}

func TestClientRequestLoginOtp(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.URL.Path != "/v1/auth/login/init" {
			http.NotFound(w, r)
			return
		}

		json.NewEncoder(w).Encode(map[string]any{
			"otpId":       "otp_123",
			"phoneMasked": "+1***5678",
			"expiresIn":   300,
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "", false)

	result, err := client.RequestLoginOtp(context.Background(), "test@example.com")
	if err != nil {
		t.Fatalf("RequestLoginOtp failed: %v", err)
	}

	if result.OtpID != "otp_123" {
		t.Errorf("expected otpId otp_123, got %s", result.OtpID)
	}

	if result.PhoneMasked != "+1***5678" {
		t.Errorf("expected phoneMasked +1***5678, got %s", result.PhoneMasked)
	}

	if result.ExpiresIn != 300 {
		t.Errorf("expected expiresIn 300, got %d", result.ExpiresIn)
	}
}

func TestClientVerifyLogin(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.URL.Path != "/v1/auth/login/verify" {
			http.NotFound(w, r)
			return
		}

		json.NewEncoder(w).Encode(map[string]any{
			"identityToken": "jwt_token_123",
			"licenses":      []any{},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "", false)

	result, err := client.VerifyLogin(context.Background(), "test@example.com", "otp_123", "123456", "fingerprint")
	if err != nil {
		t.Fatalf("VerifyLogin failed: %v", err)
	}

	if result.IdentityToken != "jwt_token_123" {
		t.Errorf("expected identityToken jwt_token_123, got %s", result.IdentityToken)
	}

	// Check that identity token is stored
	if client.identityToken != "jwt_token_123" {
		t.Error("expected identity token to be stored in client")
	}
}

func TestClientAPIError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]any{
			"error": map[string]any{
				"code":    "INVALID_REQUEST",
				"message": "Product not found",
			},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "test_key", false)

	_, err := client.CreateCheckoutSession(context.Background(), "invalid_product", "")
	if err == nil {
		t.Fatal("expected error")
	}

	apiErr, ok := err.(*APIError)
	if !ok {
		t.Fatalf("expected APIError, got %T", err)
	}

	if apiErr.StatusCode != 400 {
		t.Errorf("expected status 400, got %d", apiErr.StatusCode)
	}

	if apiErr.Code != "INVALID_REQUEST" {
		t.Errorf("expected code INVALID_REQUEST, got %s", apiErr.Code)
	}

	if apiErr.Message != "Product not found" {
		t.Errorf("expected message 'Product not found', got %s", apiErr.Message)
	}
}

func TestClientWrappedResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Return a wrapped response
		json.NewEncoder(w).Encode(map[string]any{
			"success": true,
			"data": map[string]any{
				"sessionId":   "sess_wrapped",
				"checkoutUrl": "https://checkout.example.com",
			},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "test_key", false)

	result, err := client.CreateCheckoutSession(context.Background(), "prod_test", "")
	if err != nil {
		t.Fatalf("CreateCheckoutSession failed: %v", err)
	}

	if result.SessionID != "sess_wrapped" {
		t.Errorf("expected sessionId sess_wrapped, got %s", result.SessionID)
	}
}

func TestClientSetIdentityToken(t *testing.T) {
	client := NewClient("https://example.com", "", false)

	if client.identityToken != "" {
		t.Error("expected empty identity token initially")
	}

	client.SetIdentityToken("test_token")
	if client.identityToken != "test_token" {
		t.Error("expected identity token to be set")
	}

	client.ClearIdentityToken()
	if client.identityToken != "" {
		t.Error("expected identity token to be cleared")
	}
}

func TestClientInitPurchase(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.URL.Path != "/v1/purchase/init" {
			http.NotFound(w, r)
			return
		}

		// Check identity token
		auth := r.Header.Get("Authorization")
		if auth != "Bearer test_token" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		json.NewEncoder(w).Encode(map[string]any{
			"cards": []any{
				map[string]any{
					"id":          "card_123",
					"brand":       "visa",
					"last4":       "4242",
					"expiryMonth": 12,
					"expiryYear":  2025,
				},
			},
			"amount":      1999,
			"currency":    "usd",
			"phoneMasked": "+1***5678",
			"productName": "Test Product",
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "", false)
	client.SetIdentityToken("test_token")

	result, err := client.InitPurchase(context.Background(), "prod_test")
	if err != nil {
		t.Fatalf("InitPurchase failed: %v", err)
	}

	if len(result.Cards) != 1 {
		t.Fatalf("expected 1 card, got %d", len(result.Cards))
	}

	if result.Cards[0].ID != "card_123" {
		t.Errorf("expected card ID card_123, got %s", result.Cards[0].ID)
	}

	if result.Amount != 1999 {
		t.Errorf("expected amount 1999, got %d", result.Amount)
	}

	if result.Currency != "usd" {
		t.Errorf("expected currency usd, got %s", result.Currency)
	}
}

func TestClientConfirmPurchase(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || r.URL.Path != "/v1/purchase/confirm" {
			http.NotFound(w, r)
			return
		}

		json.NewEncoder(w).Encode(map[string]any{
			"success":    true,
			"license":    "header.payload.signature",
			"receiptUrl": "https://receipt.stripe.com/123",
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "", false)
	client.SetIdentityToken("test_token")

	result, err := client.ConfirmPurchase(context.Background(), "prod_test", "card_123", "otp_123", "123456")
	if err != nil {
		t.Fatalf("ConfirmPurchase failed: %v", err)
	}

	if !result.Success {
		t.Error("expected success=true")
	}

	if result.License != "header.payload.signature" {
		t.Errorf("expected license key, got %s", result.License)
	}

	if result.ReceiptURL != "https://receipt.stripe.com/123" {
		t.Errorf("expected receipt URL, got %s", result.ReceiptURL)
	}
}

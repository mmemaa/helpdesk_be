#!/usr/bin/env bash
# Test script za Helpdesk API
# Pokrenite sa: bash api-tests.sh

API_URL="http://localhost:3000"

# Boje za output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper funkcija za testiranje
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local expected_status=$4
  local description=$5
  
  echo -e "${BLUE}Testing: ${description}${NC}"
  echo -e "  ${method} ${endpoint}"
  
  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
      -H "Content-Type: application/json")
  else
    response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "$expected_status" ]; then
    echo -e "  ${GREEN}✓ PASSED${NC} (HTTP $http_code)"
    ((PASSED++))
  else
    echo -e "  ${RED}✗ FAILED${NC} (Expected $expected_status, got $http_code)"
    echo "  Response: $body"
    ((FAILED++))
  fi
  echo ""
}

echo -e "${YELLOW}=== Helpdesk API Tests ===${NC}\n"

# 1. GET / - Test root endpoint
test_endpoint "GET" "/" "" "200" "Root endpoint"

# 2. POST /tickets - Create ticket
create_ticket_data='
{
  "title": "API Test Ticket",
  "description": "This is a test ticket from API tests",
  "priority": "high",
  "statusId": 1,
  "queueId": 1,
  "createdById": 1,
  "dueAt": "2026-01-05T10:00:00Z"
}
'
test_endpoint "POST" "/tickets" "$create_ticket_data" "201" "Create new ticket"

# 3. GET /tickets - Get all tickets
test_endpoint "GET" "/tickets" "" "200" "Get all tickets"

# 4. GET /tickets/1 - Get single ticket (assume ID 1 exists)
test_endpoint "GET" "/tickets/1" "" "200" "Get single ticket"

# 5. GET /tickets/1/sla-status - Get SLA status
test_endpoint "GET" "/tickets/1/sla-status" "" "200" "Get SLA status"

# 6. PUT /tickets/1 - Update ticket
update_ticket_data='
{
  "title": "Updated from API Test",
  "priority": "low"
}
'
test_endpoint "PUT" "/tickets/1" "$update_ticket_data" "200" "Update ticket"

# 7. PUT /tickets/1/assign/1 - Assign ticket
test_endpoint "PUT" "/tickets/1/assign/1" "" "200" "Assign ticket to user"

# 8. GET /tickets/sla/breached - Get breached tickets
test_endpoint "GET" "/tickets/sla/breached" "" "200" "Get breached tickets"

# 9. POST /tickets/sla/monitor - Monitor SLA breaches
test_endpoint "POST" "/tickets/sla/monitor" "" "201" "Monitor SLA breaches"

# 10. Test invalid ticket ID (should return 400 or 404)
test_endpoint "GET" "/tickets/invalid" "" "400" "Get ticket with invalid ID"

# 11. Test non-existent ticket (should return 404)
test_endpoint "GET" "/tickets/999999" "" "404" "Get non-existent ticket"

# Summary
echo -e "${YELLOW}=== Test Summary ===${NC}"
echo -e "  ${GREEN}Passed: $PASSED${NC}"
echo -e "  ${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
fi

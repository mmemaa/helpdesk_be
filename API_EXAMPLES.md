# Helpdesk API - cURL Examples

## Setup
```bash
export API_URL="http://localhost:3000"
```

## 1. GET / - Test Root Endpoint
```bash
curl -X GET "$API_URL/"
```

## 2. POST /tickets - Create New Ticket
```bash
curl -X POST "$API_URL/tickets" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Bug Report: Login fails",
    "description": "Users cannot login with valid credentials",
    "priority": "high",
    "statusId": 1,
    "queueId": 1,
    "createdById": 1,
    "dueAt": "2026-01-05T10:00:00Z"
  }'
```

## 3. GET /tickets - Get All Tickets
```bash
curl -X GET "$API_URL/tickets"
```

## 4. GET /tickets/:id - Get Single Ticket
```bash
curl -X GET "$API_URL/tickets/1"
```

## 5. GET /tickets/:id/sla-status - Get SLA Status
```bash
curl -X GET "$API_URL/tickets/1/sla-status"
```

## 6. PUT /tickets/:id - Update Ticket
```bash
curl -X PUT "$API_URL/tickets/1" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated: Bug Report - Login fails",
    "priority": "low",
    "description": "Issue resolved in latest build"
  }'
```

## 7. PUT /tickets/:id/assign/:userId - Assign Ticket to User
```bash
curl -X PUT "$API_URL/tickets/1/assign/2"
```

## 8. PUT /tickets/:id/close - Close Ticket
```bash
curl -X PUT "$API_URL/tickets/1/close"
```

## 9. DELETE /tickets/:id - Delete Ticket
```bash
curl -X DELETE "$API_URL/tickets/1"
```

## 10. GET /tickets/sla/breached - Get Breached SLA Tickets
```bash
curl -X GET "$API_URL/tickets/sla/breached"
```

## 11. POST /tickets/sla/monitor - Monitor SLA Breaches
```bash
curl -X POST "$API_URL/tickets/sla/monitor"
```

## Error Cases

### Get Non-Existent Ticket (should return 404)
```bash
curl -X GET "$API_URL/tickets/999999"
```

### Create Ticket with Missing Fields (should return 400)
```bash
curl -X POST "$API_URL/tickets" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Incomplete Ticket"
  }'
```

### Get Ticket with Invalid ID Format (should return 400)
```bash
curl -X GET "$API_URL/tickets/invalid"
```

## Batch Test Script

Save this as `test-all.sh` and run with `bash test-all.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:3000"

echo "1. Testing GET /"
curl -X GET "$API_URL/"
echo -e "\n---\n"

echo "2. Testing POST /tickets"
TICKET=$(curl -X POST "$API_URL/tickets" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Ticket",
    "description": "Testing",
    "priority": "medium",
    "statusId": 1,
    "queueId": 1,
    "createdById": 1
  }')
echo $TICKET
TICKET_ID=$(echo $TICKET | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo -e "\n---\n"

echo "3. Testing GET /tickets"
curl -X GET "$API_URL/tickets"
echo -e "\n---\n"

echo "4. Testing GET /tickets/$TICKET_ID"
curl -X GET "$API_URL/tickets/$TICKET_ID"
echo -e "\n---\n"

echo "5. Testing GET /tickets/$TICKET_ID/sla-status"
curl -X GET "$API_URL/tickets/$TICKET_ID/sla-status"
echo -e "\n---\n"

echo "6. Testing PUT /tickets/$TICKET_ID"
curl -X PUT "$API_URL/tickets/$TICKET_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Test Ticket",
    "priority": "high"
  }'
echo -e "\n---\n"

echo "7. Testing PUT /tickets/$TICKET_ID/assign/1"
curl -X PUT "$API_URL/tickets/$TICKET_ID/assign/1"
echo -e "\n---\n"

echo "8. Testing GET /tickets/sla/breached"
curl -X GET "$API_URL/tickets/sla/breached"
echo -e "\n---\n"

echo "9. Testing POST /tickets/sla/monitor"
curl -X POST "$API_URL/tickets/sla/monitor"
echo -e "\n---\n"

echo "10. Testing PUT /tickets/$TICKET_ID/close"
curl -X PUT "$API_URL/tickets/$TICKET_ID/close"
echo -e "\n---\n"

echo "All tests completed!"
```

## Response Examples

### Successful Ticket Creation (201 Created)
```json
{
  "id": 1,
  "title": "Bug Report: Login fails",
  "description": "Users cannot login with valid credentials",
  "priority": "high",
  "statusId": 1,
  "queueId": 1,
  "createdById": 1,
  "assignedToId": null,
  "createdAt": "2026-01-04T10:00:00.000Z",
  "updatedAt": "2026-01-04T10:00:00.000Z",
  "dueAt": "2026-01-05T10:00:00.000Z",
  "slaBreached": false,
  "slaNotified": false
}
```

### Get All Tickets (200 OK)
```json
[
  {
    "id": 1,
    "title": "Bug Report: Login fails",
    "description": "Users cannot login with valid credentials",
    "priority": "high",
    ...
  },
  {
    "id": 2,
    "title": "Feature Request: Dark Mode",
    "description": "Add dark mode support",
    "priority": "low",
    ...
  }
]
```

### SLA Status Response (200 OK)
```json
{
  "ticketId": 1,
  "slaBreached": false,
  "remainingTime": 82800,
  "dueAt": "2026-01-05T10:00:00.000Z"
}
```

### Error Response - Not Found (404)
```json
{
  "statusCode": 404,
  "message": "Cannot find ticket with id 999999",
  "error": "Not Found"
}
```

### Error Response - Bad Request (400)
```json
{
  "statusCode": 400,
  "message": [
    "title should not be empty",
    "statusId must be a number"
  ],
  "error": "Bad Request"
}
```

## Testing Tips

1. **Save Response to File:**
   ```bash
   curl -X GET "$API_URL/tickets" > tickets.json
   ```

2. **Pretty Print JSON Response:**
   ```bash
   curl -X GET "$API_URL/tickets" | jq .
   ```

3. **Follow Redirects:**
   ```bash
   curl -L -X GET "$API_URL/tickets"
   ```

4. **Add Custom Headers:**
   ```bash
   curl -X GET "$API_URL/tickets" \
     -H "Authorization: Bearer token"
   ```

5. **Verbose Output (see all details):**
   ```bash
   curl -v -X GET "$API_URL/tickets"
   ```

6. **Time the Request:**
   ```bash
   curl -w "Time: %{time_total}s\n" -X GET "$API_URL/tickets"
   ```

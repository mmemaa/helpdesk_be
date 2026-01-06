# File Upload Implementation Guide

## Overview
File upload functionality has been implemented for ticket creation. Users can now attach up to 5 files when creating a ticket.

## Technical Details

### Database Schema
Added `TicketAttachment` model with the following fields:
- `id`: Auto-incrementing primary key
- `ticketId`: Foreign key to Ticket (cascade delete)
- `filename`: System-generated unique filename
- `originalName`: Original filename from upload
- `mimeType`: File MIME type
- `size`: File size in bytes
- `path`: File system path
- `createdAt`: Timestamp

### API Usage

#### Create Ticket with Attachments
**Endpoint:** `POST /tickets`

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `title` (string, required)
- `description` (string, required)
- `priority` (string, optional): "low", "medium", or "high"
- `status` (string, required): "Open", "In Progress", "Closed", or "Waiting"
- `queueId` (number, required)
- `createdById` (number, required)
- `assignedToId` (number, optional)
- `dueAt` (date, optional)
- `attachments` (files, optional): Up to 5 files, max 10MB each

**Example using curl:**
```bash
curl -X POST http://localhost:3000/tickets \
  -F "title=Problem with internet" \
  -F "description=Connection keeps dropping" \
  -F "priority=high" \
  -F "status=Open" \
  -F "queueId=1" \
  -F "createdById=1" \
  -F "attachments=@/path/to/screenshot.png" \
  -F "attachments=@/path/to/logs.txt"
```

**Example using JavaScript/Fetch:**
```javascript
const formData = new FormData();
formData.append('title', 'Problem with internet');
formData.append('description', 'Connection keeps dropping');
formData.append('priority', 'high');
formData.append('status', 'Open');
formData.append('queueId', '1');
formData.append('createdById', '1');

// Add files
const fileInput = document.querySelector('input[type="file"]');
for (let file of fileInput.files) {
  formData.append('attachments', file);
}

const response = await fetch('http://localhost:3000/tickets', {
  method: 'POST',
  body: formData
});

const data = await response.json();
```

### File Storage
- Files are stored in the `./uploads` directory
- Filenames are automatically generated with random 32-character hexadecimal names
- Original filenames are preserved in the database

### Limitations
- Maximum 5 files per ticket
- Maximum file size: 10MB per file
- Files are stored on the local filesystem

### Response
The API response includes the complete ticket object with an `attachments` array containing all uploaded file metadata.

## Testing
You can test the file upload using the provided curl command or Postman by setting the request body type to "form-data" and adding files to the "attachments" field.
